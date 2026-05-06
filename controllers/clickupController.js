const express = require("express");
const User = require("../models/userModel");
const Achievement = require("../models/achievementModel");
const expressAsyncHandler = require("express-async-handler");
const { default: axios } = require("axios");
const { getCache, setCache, CACHE_EXPIRY } = require("../utils/Cacheutils");

const CLICKUP_TOKEN = process.env.VITE_CLICKUP_API_TOKEN;
const TEAM_ID = "9014733918";
const LIST_ID = process.env.CLICKUP_CLIENT_LIST_ID || "901413612297";

// Escape user input for safe usage in RegExp
function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const clickupController = {
  getTime: expressAsyncHandler(async (req, res) => {
    try {
      const now = Date.now();
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
      const user_id = 88409188;
      const url = `https://api.clickup.com/api/v2/team/${TEAM_ID}/time_entries?start_date=${thirtyDaysAgo}&end_date=${now}&assignee=${user_id}`;
      const clickupRes = await axios.get(url, {
        headers: { Authorization: CLICKUP_TOKEN },
      });
      const worksDone = clickupRes.data.data.length;

      const user = clickupRes.data.data[0]?.user;
      const timeEntries = clickupRes.data.data || [];
      const totalMilliseconds = timeEntries.reduce(
        (sum, entry) => sum + (Number(entry.duration) || 0),
        0
      );
      const totalSeconds = totalMilliseconds / 1000;
      const totalMinutes = totalSeconds / 60;
      const totalHours = totalMinutes / 60;
      res.json({
        totalHours,
        user,
        worksDone,
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }),

  testClickUp: expressAsyncHandler(async (req, res) => {
    try {
      console.log("🧪 Testing ClickUp Connection...");
      console.log("Token:", CLICKUP_TOKEN ? "✓ Present" : "✗ Missing");
      console.log("LIST_ID:", LIST_ID);
      console.log("TEAM_ID:", TEAM_ID);

      // Test 1: Get list info
      const listUrl = `https://api.clickup.com/api/v2/list/${LIST_ID}`;
      console.log("Testing URL:", listUrl);

      const listResponse = await axios.get(listUrl, {
        headers: { Authorization: CLICKUP_TOKEN },
        timeout: 5000
      });

      console.log("✅ List retrieved successfully:", {
        listId: listResponse.data.id,
        name: listResponse.data.name,
        space_id: listResponse.data.space?.id
      });

      res.json({
        success: true,
        message: "ClickUp connection test successful",
        list: {
          id: listResponse.data.id,
          name: listResponse.data.name,
          space_id: listResponse.data.space?.id
        },
        config: {
          token: CLICKUP_TOKEN ? "✓ Present" : "✗ Missing",
          listId: LIST_ID,
          teamId: TEAM_ID
        }
      });
    } catch (error) {
      console.error("❌ Test Error:", error.response?.data || error.message);
      res.status(500).json({
        success: false,
        error: error.response?.data || error.message,
        config: {
          token: CLICKUP_TOKEN ? "✓ Present" : "✗ Missing",
          listId: LIST_ID,
          teamId: TEAM_ID
        }
      });
    }
  }),

  getTasks: expressAsyncHandler(async (req, res) => {
    try {
      const result = await getWorkedTasksLast30Days();
      res.json(result); // { totalTasksWorked: N, taskIds: [ ... ] }
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }),

  getTasksById: expressAsyncHandler(async (req, res) => {
    try {
      const result = await getTasksWorkedByMemberLast30Days();
      res.json(result); // { member: ..., totalTasksWorked: N, taskIds: [...] }
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }),

  getUserDetails: expressAsyncHandler(async (req, res) => {
    try {
      const userName = req.query.name;
      if (!userName) {
        return res.status(400).json({ message: "User name not provided" });
      }

      const includeSensitive = String(req.query.includeSensitive).toLowerCase() === "true";

      // Redis Cache Check (only for non-sensitive requests)
      const cacheKey = `user:details:${userName.toLowerCase().trim()}`;
      if (!includeSensitive) {
        const cachedData = await getCache(cacheKey);
        if (cachedData) {
          console.log(`[Redis] Cache HIT for user details: ${userName}`);
          return res.json({ ...cachedData, source: "cache" });
        }
      }

      console.log(`[Redis] Cache MISS for user details: ${userName}`);
      console.log("Fetching details for user:", userName);

      const query = User.findOne({
        name: { $regex: new RegExp(`^${escapeRegex(userName.trim())}$`, "i") }
      })
        .populate([
          {
            path: "tools",
            select: "toolName url icon description -_id"
          },
          {
            path: "clients",
            select: "name website logo -_id"
          },
          {
            path: "reviews",
            select: "name company review rating createdAt -_id",
            match: { approved: true }
          },
          {
            path: "achievements",
            select: "title description image createdAt"
          }
        ]);

      if (includeSensitive) {
        query.select("+password");
      }

      const user = await query.lean().exec();

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Fallback: If achievements array is empty in user doc, check the Achievement collection directly
      if (!user.achievements || user.achievements.length === 0) {
        const directAchievements = await Achievement.find({ user: user._id })
          .select("title description image createdAt")
          .lean();
        if (directAchievements.length > 0) {
          user.achievements = directAchievements;
        }
      }

      // Remove password unless explicitly requested
      if (!includeSensitive && user.password) {
        delete user.password;
      }

      // Determine ClickUp assignee id to query
      const clickupId = user.clickupId || null;

      let clickupPayload = null;

      if (clickupId) {
        // Fetch ClickUp time entries for last 30 days for that assignee
        const now = Date.now();
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
        const entriesUrl = `https://api.clickup.com/api/v2/team/${TEAM_ID}/time_entries?start_date=${thirtyDaysAgo}&end_date=${now}&assignee=${clickupId}`;

        try {
          const clickupRes = await axios.get(entriesUrl, {
            headers: { Authorization: CLICKUP_TOKEN },
            timeout: 5000 // Add timeout to prevent hanging
          });

          const timeEntries = clickupRes.data?.data || [];

          // Compute totals
          const totalMilliseconds = timeEntries.reduce(
            (sum, entry) => sum + (Number(entry.duration) || 0),
            0
          );
          const totalSeconds = totalMilliseconds / 1000;
          const totalMinutes = totalSeconds / 60;
          const totalHours = totalMinutes / 60;
          const worksDone = timeEntries.length;

          const uniqueTaskIds = [
            ...new Set(timeEntries.map((entry) => entry.task?.id || entry.task).filter(Boolean)),
          ];

          clickupPayload = {
            assignee: clickupId,
            worksDone,
            totalMilliseconds,
            totalSeconds,
            totalMinutes,
            totalHours,
            uniqueTaskIds,
            tasks: uniqueTaskIds.length,
          };
        } catch (clickupErr) {
          console.error(`ClickUp API Error for user ${userName}:`, clickupErr.message);
          // Don't fail the whole request if ClickUp fails
          clickupPayload = { error: "ClickUp service temporarily unavailable" };
        }
      }

      const responseData = { user, clickup: clickupPayload };

      // Cache the result (only for non-sensitive data)
      if (!includeSensitive) {
        await setCache(cacheKey, responseData, CACHE_EXPIRY.USER_DATA);
      }

      return res.json({ ...responseData, source: "origin" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error", error: err.message });
    }
  }),

  createTask: expressAsyncHandler(async (req, res) => {
    try {
      const { clientName, clientCompany, status, dueDate, priority } = req.body;

      if (!clientName) {
        return res.status(400).json({ success: false, message: "Client name is required" });
      }

      console.log("\n📋 ============ CLICKUP TASK CREATION ============");
      console.log("📋 Input Data:", { clientName, clientCompany, status, dueDate, priority });
      console.log("📋 LIST_ID:", LIST_ID);
      console.log("📋 TOKEN Present:", !!CLICKUP_TOKEN);

      const taskTitle = `Client: ${clientName}${clientCompany ? ` - ${clientCompany}` : ''}`;
      const taskDescription = `New client inquiry\n\nName: ${clientName}\nCompany: ${clientCompany || 'N/A'}\nStatus: ${status || 'New'}`;

      // Build minimal task payload - only include required/standard fields
      const taskPayload = {
        name: taskTitle,
        description: taskDescription
      };

      // Add priority if provided (ClickUp uses 1-4 scale, but can be null)
      if (priority) {
        taskPayload.priority = priority;
      }

      // Add due date if provided (ClickUp expects milliseconds)
      if (dueDate) {
        const dueMs = new Date(dueDate).getTime();
        taskPayload.due_date = dueMs;
        console.log("📋 Due date (ms):", dueMs);
      }

      // Assign to team member (optional - remove if causing issues)
      taskPayload.assignees = [88409188];

      console.log("📋 Final Payload:", JSON.stringify(taskPayload, null, 2));

      const url = `https://api.clickup.com/api/v2/list/${LIST_ID}/task`;
      console.log("📋 POST URL:", url);
      console.log("📋 Authorization Header Length:", CLICKUP_TOKEN?.length);

      const response = await axios.post(url, taskPayload, {
        headers: {
          Authorization: CLICKUP_TOKEN,
          "Content-Type": "application/json"
        },
        timeout: 10000
      });

      console.log("✅ Task Created!");
      console.log("✅ Task ID:", response.data.id);
      console.log("✅ Task URL:", response.data.url);
      console.log("📋 ============ SUCCESS ============\n");

      return res.json({
        success: true,
        message: "ClickUp task created successfully",
        taskId: response.data.id,
        taskUrl: response.data.url,
        taskName: response.data.name
      });

    } catch (error) {
      console.error("\n❌ ============ ERROR ============");
      console.error("❌ Status:", error.response?.status);
      console.error("❌ Status Text:", error.response?.statusText);
      console.error("❌ Error Data:", JSON.stringify(error.response?.data, null, 2));
      console.error("❌ Message:", error.message);

      // Log the request that was sent
      if (error.config) {
        console.error("❌ Request Data:", error.config.data);
        console.error("❌ Request URL:", error.config.url);
      }
      console.error("📋 ============ END ERROR ============\n");

      const errorMessage = error.response?.data?.err || error.response?.data?.message || error.message;

      return res.status(error.response?.status || 500).json({
        success: false,
        message: "Failed to create ClickUp task",
        error: errorMessage,
        details: {
          status: error.response?.status,
          data: error.response?.data
        }
      });
    }
  }),

};

module.exports = clickupController;

// --- helper functions kept for other endpoints ---

async function getWorkedTasksLast30Days() {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const url = `https://api.clickup.com/api/v2/team/${TEAM_ID}/time_entries?start_date=${thirtyDaysAgo}&end_date=${now}`;
  const clickupRes = await axios.get(url, {
    headers: { Authorization: CLICKUP_TOKEN },
  });
  const timeEntries = clickupRes.data.data || [];
  const uniqueTaskIds = [
    ...new Set(timeEntries.map((entry) => entry.task?.id || entry.task).filter(Boolean)),
  ];
  return {
    totalTasksWorked: uniqueTaskIds.length,
    taskIds: uniqueTaskIds,
  };
}

async function getTasksWorkedByMemberLast30Days() {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const user_id = 88409188;
  const url = `https://api.clickup.com/api/v2/team/${TEAM_ID}/time_entries?start_date=${thirtyDaysAgo}&end_date=${now}&assignee=${user_id}`;
  const clickupRes = await axios.get(url, {
    headers: { Authorization: CLICKUP_TOKEN },
  });
  const timeEntries = clickupRes.data.data || [];
  const uniqueTaskIds = [
    ...new Set(timeEntries.map((entry) => entry.task?.id || entry.task).filter(Boolean)),
  ];
  return {
    member: user_id,
    totalTasksWorked: uniqueTaskIds.length,
    taskIds: uniqueTaskIds,
  };
}
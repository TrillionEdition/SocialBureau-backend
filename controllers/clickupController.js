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
        return res.status(400).json({ message: "Client name is required" });
      }

      console.log("📋 Creating ClickUp Task with data:", { clientName, clientCompany, status, dueDate, priority });
      console.log("📋 Using LIST_ID:", LIST_ID);
      console.log("📋 Using TOKEN:", CLICKUP_TOKEN ? "✓ Present" : "✗ Missing");

      const taskTitle = `${clientName} - ${clientCompany || 'No Company'}`;
      const taskDescription = `Follow up with client: ${clientName}\nCompany: ${clientCompany || 'N/A'}\nCurrent Status: ${status || 'N/A'}`;

      // Prepare ClickUp API request with MINIMAL required fields first
      const taskData = {
        name: taskTitle,
        description: taskDescription
      };

      // Add due date if provided (ClickUp expects milliseconds)
      if (dueDate) {
        const dueMs = new Date(dueDate).getTime();
        taskData.due_date = dueMs;
        console.log("📋 Due date set to:", new Date(dueMs).toISOString(), `(${dueMs}ms)`);
      }

      // Add priority if provided (1-4 scale)
      if (priority) {
        taskData.priority = priority;
      }

      console.log("📋 Task payload:", JSON.stringify(taskData, null, 2));

      const url = `https://api.clickup.com/api/v2/list/${LIST_ID}/task`;
      console.log("📋 POST URL:", url);
      console.log("📋 Headers:", { 
        "Authorization": CLICKUP_TOKEN ? `[TOKEN_LENGTH: ${CLICKUP_TOKEN.length}]` : "MISSING",
        "Content-Type": "application/json"
      });

      const response = await axios.post(url, taskData, {
        headers: {
          Authorization: CLICKUP_TOKEN,
          "Content-Type": "application/json"
        },
        timeout: 10000,
        validateStatus: function (status) {
          return status < 500; // Resolve only if the status code is less than 500
        }
      });

      console.log("📋 ClickUp Response Status:", response.status);
      console.log("📋 ClickUp Response Data:", JSON.stringify(response.data, null, 2));

      if (response.status >= 200 && response.status < 300) {
        console.log("✅ Task Created Successfully:", response.data);
        res.json({
          success: true,
          message: "ClickUp task created successfully",
          taskId: response.data.id,
          taskUrl: response.data.url,
          task: response.data
        });
      } else {
        console.error("❌ ClickUp Error Response:", response.status, response.data);
        throw new Error(response.data?.err || `HTTP ${response.status}: ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      const errorMsg = error.response?.data || error.message;
      console.error("❌ ClickUp Task Creation Error:", errorMsg);
      console.error("❌ Full Error:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        stack: error.stack
      });
      
      res.status(500).json({
        success: false,
        message: "Failed to create ClickUp task",
        error: errorMsg,
        details: error.response?.data?.err || error.message
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
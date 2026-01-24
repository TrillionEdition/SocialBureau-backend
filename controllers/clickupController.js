const express = require("express");
const User = require("../models/userModel");
const Achievement = require("../models/achievementModel");
const expressAsyncHandler = require("express-async-handler");
const { default: axios } = require("axios");

const CLICKUP_TOKEN = process.env.VITE_CLICKUP_API_TOKEN;
const TEAM_ID = "9014733918";

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
      const userName = req.query.name
      console.log("Fetching details for user:", userName);
      if (!userName) {
        return res.status(400).json({ message: "User name not provided" });
      }
      const includeSensitive =
        String(req.query.includeSensitive).toLowerCase() === "true";
      const query = User.findOne({
        name: { $regex: new RegExp(`^${userName.trim()}$`, "i") }
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

      console.log(`Final user achievements count for ${userName}: ${user?.achievements?.length || 0}`);

      // Remove password unless explicitly requested
      if (!includeSensitive && user.password) {
        delete user.password;
      }

      // Determine ClickUp assignee id to query
      const clickupId =
        user.clickupId || null;

      // If no ClickUp id available, return user with clickup: null
      if (!clickupId) {
        return res.json({ user, clickup: null });
      }

      // Fetch ClickUp time entries for last 30 days for that assignee
      const now = Date.now();
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
      const entriesUrl = `https://api.clickup.com/api/v2/team/${TEAM_ID}/time_entries?start_date=${thirtyDaysAgo}&end_date=${now}&assignee=${clickupId}`;

      const clickupRes = await axios.get(entriesUrl, {
        headers: { Authorization: CLICKUP_TOKEN },
      });

      const timeEntries = clickupRes.data?.data || [];

      // Compute totals (duration is in milliseconds according to ClickUp)
      const totalMilliseconds = timeEntries.reduce(
        (sum, entry) => sum + (Number(entry.duration) || 0),
        0
      );
      const totalSeconds = totalMilliseconds / 1000;
      const totalMinutes = totalSeconds / 60;
      const totalHours = totalMinutes / 60;
      const worksDone = timeEntries.length;

      // Get unique task IDs from time entries
      const uniqueTaskIds = [
        ...new Set(timeEntries.map((entry) => entry.task?.id || entry.task).filter(Boolean)),
      ];

      // Optionally fetch full task objects for each unique task id.
      // Be cautious: this performs one request per task. If you expect many tasks,
      // you may want to limit or batch these requests. Here we fetch them all.
      const taskFetches = uniqueTaskIds.map((taskId) =>
        axios
          .get(`https://api.clickup.com/api/v2/task/${taskId}`, {
            headers: { Authorization: CLICKUP_TOKEN },
          })
          .then((r) => r.data)
          .catch((err) => {
            // If a task fetch fails, return an object noting the failure instead of throwing.
            return { id: taskId, fetchError: err?.response?.data || err?.message };
          })
      );

      const tasks = await Promise.all(taskFetches);

      const clickupPayload = {
        assignee: clickupId,
        worksDone,
        totalMilliseconds,
        totalSeconds,
        totalMinutes,
        totalHours,
        uniqueTaskIds,
        tasks: tasks.length,
      };

      return res.json({ user, clickup: clickupPayload });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error", error: err.message });
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
const express = require("express");
const User = require("../models/userModel");
const Achievement = require("../models/achievementModel");
const TeamMember = require("../models/teamMemberModel");
const expressAsyncHandler = require("express-async-handler");
const { default: axios } = require("axios");
const { getCache, setCache, CACHE_EXPIRY } = require("../utils/Cacheutils");
const FormData = require('form-data');
const fs = require('fs');

const CLICKUP_TOKEN = process.env.VITE_CLICKUP_API_TOKEN;
const TEAM_ID = "9014733918";
const LIST_ID = process.env.CLICKUP_NEW_LIST_ID || process.env.CLICKUP_CLIENT_LIST_ID || "901413612297";



// Escape user input for safe usage in RegExp
function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const clickupController = {
  getTaskById: expressAsyncHandler(async (req, res) => {
    try {
      const { taskId } = req.params;
      const url = `https://api.clickup.com/api/v2/task/${taskId}`;
      console.log(`🔗 Fetching ClickUp Task [${taskId}]`);

      const response = await axios.get(url, {
        headers: { Authorization: CLICKUP_TOKEN },
      });

      // Map to our standard task format
      const task = response.data;
      const mappedTask = {
        id: task.id,
        title: task.name,
        status: task.status.status,
        statusColor: task.status.color,
        deadline: task.due_date ? new Date(parseInt(task.due_date)).toLocaleDateString() : 'No deadline',
        priority: task.priority?.priority || 'none',
        priorityColor: task.priority?.color || '#999',
        assignees: task.assignees.map(a => ({
          name: a.username,
          initials: a.initials,
          color: a.color
        })),
        progress: task.points || 0,
        timeSpent: task.time_spent ? (task.time_spent / 3600000).toFixed(2) + 'h' : '0h',
        description: task.description || 'No description provided.'
      };

      res.json({
        success: true,
        task: mappedTask
      });
    } catch (error) {
      console.error("❌ ClickUp API Error (getTaskById):", error.response?.data || error.message);
      res.status(500).json({ success: false, error: error.response?.data || error.message });
    }
  }),

  proxyClickUpImage: expressAsyncHandler(async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) return res.status(400).send("No URL provided");
      
      if (!CLICKUP_TOKEN) {
        console.error("❌ CLICKUP_TOKEN is missing in backend environment!");
        return res.status(500).send("Backend configuration error");
      }

      console.log(`🖼️ Proxying image: ${url}`);
      
      const response = await axios.get(url, {
        headers: { Authorization: CLICKUP_TOKEN },
        responseType: 'stream'
      });

      // Forward headers
      res.setHeader('Content-Type', response.headers['content-type']);
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

      response.data.pipe(res);
    } catch (error) {
      console.error("❌ Proxy Error:", error.message);
      res.status(500).send("Error proxying image");
    }
  }),

  uploadAttachment: expressAsyncHandler(async (req, res) => {
    try {
      const { viewId } = req.params;
      console.log(`📂 Upload request for View ID: ${viewId}`);
      
      if (!req.file) {
        console.error("❌ No file found in request");
        return res.status(400).json({ success: false, message: "No file uploaded" });
      }

      console.log(`📄 File info: ${req.file.originalname} (${req.file.mimetype}, ${req.file.size} bytes)`);

      const url = `https://api.clickup.com/api/v2/view/${viewId}/attachment`;
      console.log(`📤 Sending to ClickUp: ${url}`);

      const form = new FormData();
      form.append('attachment', fs.createReadStream(req.file.path), {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });

      const response = await axios.post(url, form, {
        headers: {
          ...form.getHeaders(),
          Authorization: CLICKUP_TOKEN,
        },
      });

      // Cleanup local temp file
      fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        attachment: response.data
      });
    } catch (error) {
      console.error("❌ ClickUp API Error (uploadAttachment):", error.response?.data || error.message);
      // Try to cleanup even on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ success: false, error: error.response?.data || error.message });
    }
  }),

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
      // 1. Fetch List Details to get ALL possible statuses
      const listUrl = `https://api.clickup.com/api/v2/list/${LIST_ID}`;
      const listRes = await axios.get(listUrl, { headers: { Authorization: CLICKUP_TOKEN } });
      const allStatuses = listRes.data.statuses || [];

      // 2. Fetch Tasks
      const url = `https://api.clickup.com/api/v2/list/${LIST_ID}/task?include_closed=true`;
      console.log(`🔗 Fetching from List [${LIST_ID}]:`, url);

      const response = await axios.get(url, {
        headers: { Authorization: CLICKUP_TOKEN },
      });


      const tasks = response.data.tasks.map(task => ({
        id: task.id,
        title: task.name,
        status: task.status.status,
        statusColor: task.status.color,
        deadline: task.due_date ? new Date(parseInt(task.due_date)).toLocaleDateString() : 'No deadline',
        priority: task.priority?.priority || 'none',
        priorityColor: task.priority?.color || '#999',
        assignees: task.assignees.map(a => ({
          name: a.username,
          initials: a.initials,
          color: a.color
        })),
        progress: task.points || 0,
        timeSpent: task.time_spent ? (task.time_spent / 3600000).toFixed(2) + 'h' : '0h',
        description: task.description || 'No description provided.'
      }));

      // Calculate Milestones & Velocity
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => ['closed', 'complete', 'done'].includes(t.status.toLowerCase())).length;

      const discoveryTasks = tasks.filter(t => t.title.toLowerCase().includes('discovery') || t.status.toLowerCase().includes('discovery'));
      const strategyTasks = tasks.filter(t => t.title.toLowerCase().includes('strategy') || t.status.toLowerCase().includes('strategy'));
      const implementationTasks = tasks.filter(t => t.title.toLowerCase().includes('implementation') || t.status.toLowerCase().includes('implementation'));

      const calcProgress = (taskGroup) => {
        if (taskGroup.length === 0) return 0;
        const done = taskGroup.filter(t => ['closed', 'complete', 'done'].includes(t.status.toLowerCase())).length;
        return Math.round((done / taskGroup.length) * 100);
      };

      const milestones = [
        { name: 'Phase 1: Discovery', progress: calcProgress(discoveryTasks) || 100 },
        { name: 'Phase 2: Strategy Design', progress: calcProgress(strategyTasks) || 0 },
        { name: 'Phase 3: Implementation', progress: calcProgress(implementationTasks) || 0 }
      ];

      // Default distribution if no specific phase data
      if (milestones.every(m => m.progress === 0 || m.progress === 100)) {
        const overall = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        milestones[1].progress = Math.min(overall * 1.5, 100);
        milestones[2].progress = Math.min(overall * 0.5, 100);
      }

      const velocity = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Comprehensive Status Breakdown (Dynamic)
      const statusBreakdown = {};
      
      // Initialize with all list statuses so they always appear in the chart/legend
      allStatuses.forEach(s => {
        statusBreakdown[s.status.toLowerCase()] = {
          name: s.status,
          count: 0,
          color: s.color || '#6366f1'
        };
      });

      // Increment counts based on actual tasks
      tasks.forEach(t => {
        const sName = t.status.toLowerCase();
        if (!statusBreakdown[sName]) {
          // Fallback just in case a task has a status not in the list settings
          statusBreakdown[sName] = {
            name: t.status,
            count: 0,
            color: t.statusColor || '#6366f1'
          };
        }
        statusBreakdown[sName].count += 1;
      });


      res.json({
        success: true,
        tasks,
        stats: {
          totalTasks,
          completedTasks,
          activeTasks: totalTasks - completedTasks,
          milestones,
          velocity: velocity || 78,
          statusBreakdown
        }
      });

    } catch (e) {
      console.error("❌ ClickUp Fetch Error:", e.response?.data || e.message);
      res.status(500).json({ success: false, error: e.message });
    }
  }),


  getTaskActivity: expressAsyncHandler(async (req, res) => {
    try {
      const { taskId } = req.params;
      if (!taskId) return res.status(400).json({ message: "Task ID is required" });

      console.log(`🔗 Fetching Activity for Task [${taskId}]`);

      // 1. Fetch Full Task Details (includes attachments)
      const taskUrl = `https://api.clickup.com/api/v2/task/${taskId}`;
      const taskRes = await axios.get(taskUrl, {
        headers: { Authorization: CLICKUP_TOKEN },
      });

      // 2. Fetch Time Entries (Team level but filtered by task)

      // Note: We need the team_id. Using the one from config.
      const timeEntriesUrl = `https://api.clickup.com/api/v2/team/${TEAM_ID}/time_entries?task_id=${taskId}`;
      const timeEntriesRes = await axios.get(timeEntriesUrl, {
        headers: { Authorization: CLICKUP_TOKEN },
      });

      // 3. Fetch Comments (optional but good for 'everything thya done')
      const commentsUrl = `https://api.clickup.com/api/v2/task/${taskId}/comment`;
      const commentsRes = await axios.get(commentsUrl, {
        headers: { Authorization: CLICKUP_TOKEN },
      });

      res.json({
        success: true,
        attachments: taskRes.data.attachments || [],
        timeEntries: (timeEntriesRes.data.data || []).map(entry => ({
          id: entry.id,
          start: new Date(parseInt(entry.start)).toLocaleString(),
          end: entry.end ? new Date(parseInt(entry.end)).toLocaleString() : 'Ongoing',
          duration: (parseInt(entry.duration) / 3600000).toFixed(2) + 'h',
          user: entry.user.username,
          initials: entry.user.initials
        })),
        comments: (commentsRes.data.comments || []).map(comment => ({
          id: comment.id,
          text: comment.comment_text || comment.commentContent || '',
          user: comment.user?.username || 'Unknown',
          date: new Date(parseInt(comment.date)).toLocaleString()
        }))
      });


    } catch (e) {
      console.error("❌ ClickUp Activity Fetch Error:", e.response?.data || e.message);
      res.status(500).json({ success: false, error: e.message });
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

  getMemberDetails: expressAsyncHandler(async (req, res) => {
    try {
      const { slug } = req.query;
      if (!slug) {
        return res.status(400).json({ message: "Slug not provided" });
      }

      console.log("Fetching details for team member slug:", slug);

      const member = await TeamMember.findOne({ slug })
        .populate({
          path: "user",
          populate: [
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
          ]
        });

      if (!member) {
        return res.status(404).json({ message: "Team member not found" });
      }

      if (member.user) {
        const u = member.user;
        if (!u.achievements || u.achievements.length === 0) {
          const directAchievements = await Achievement.find({ user: u._id })
            .select("title description image createdAt")
            .lean();
          if (directAchievements.length > 0) {
            u.achievements = directAchievements;
          }
        }
      }

      const clickupId = member.user?.clickupId || null;
      let clickupPayload = null;

      if (clickupId) {
        const now = Date.now();
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
        const entriesUrl = `https://api.clickup.com/api/v2/team/${TEAM_ID}/time_entries?start_date=${thirtyDaysAgo}&end_date=${now}&assignee=${clickupId}`;

        try {
          const clickupRes = await axios.get(entriesUrl, {
            headers: { Authorization: CLICKUP_TOKEN },
            timeout: 5000
          });

          const timeEntries = clickupRes.data?.data || [];

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

          let tasksWithDetails = [];
          if (uniqueTaskIds.length > 0) {
            const tasksToFetch = uniqueTaskIds.slice(0, 15);
            const taskPromises = tasksToFetch.map(async (taskId) => {
              try {
                const taskUrl = `https://api.clickup.com/api/v2/task/${taskId}`;
                const tRes = await axios.get(taskUrl, {
                  headers: { Authorization: CLICKUP_TOKEN },
                  timeout: 3000
                });
                return {
                  id: tRes.data.id,
                  title: tRes.data.name,
                  status: tRes.data.status?.status,
                  statusColor: tRes.data.status?.color,
                  description: tRes.data.description || "",
                  due: tRes.data.due_date ? new Date(parseInt(tRes.data.due_date)).toLocaleDateString() : null,
                  url: tRes.data.url
                };
              } catch (e) {
                return null;
              }
            });
            tasksWithDetails = (await Promise.all(taskPromises)).filter(Boolean);
          }

          clickupPayload = {
            assignee: clickupId,
            worksDone,
            totalMilliseconds,
            totalSeconds,
            totalMinutes,
            totalHours,
            uniqueTaskIds,
            tasksCount: uniqueTaskIds.length,
            tasks: tasksWithDetails
          };
        } catch (clickupErr) {
          console.error(`ClickUp API Error for member ${slug}:`, clickupErr.message);
          clickupPayload = { error: "ClickUp service temporarily unavailable" };
        }
      }

      return res.json({ member, clickup: clickupPayload });
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

  getChatComments: expressAsyncHandler(async (req, res) => {
    try {
      const { viewId } = req.params;
      const url = `https://api.clickup.com/api/v2/view/${viewId}/comment`;
      console.log(`🔗 Fetching Chat Comments from View [${viewId}]`);

      const response = await axios.get(url, {
        headers: { Authorization: CLICKUP_TOKEN },
      });

      res.json({
        success: true,
        comments: response.data.comments || []
      });
    } catch (error) {
      console.error("❌ ClickUp API Error (getChatComments):", error.response?.data || error.message);
      res.status(500).json({ success: false, error: error.response?.data || error.message });
    }
  }),

  postChatComment: expressAsyncHandler(async (req, res) => {
    try {
      const { viewId } = req.params;
      const { comment_text } = req.body;
      
      const url = `https://api.clickup.com/api/v2/view/${viewId}/comment`;
      console.log(`📝 Posting Comment to View [${viewId}]`);

      const response = await axios.post(url, {
        comment_text,
        notify_all: true
      }, {
        headers: { 
          Authorization: CLICKUP_TOKEN,
          'Content-Type': 'application/json'
        },
      });

      res.json({
        success: true,
        comment: response.data
      });
    } catch (error) {
      console.error("❌ ClickUp API Error (postChatComment):", error.response?.data || error.message);
      res.status(500).json({ success: false, error: error.response?.data || error.message });
    }
  })
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
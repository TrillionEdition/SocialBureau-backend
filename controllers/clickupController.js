const express = require("express");
const User = require("../models/userModel");
const Achievement = require("../models/achievementModel");
const expressAsyncHandler = require("express-async-handler");
const { default: axios } = require("axios");
const { getCache, setCache, CACHE_EXPIRY } = require("../utils/Cacheutils");
const FormData = require('form-data');
const fs = require('fs');

const CLICKUP_TOKEN = process.env.VITE_CLICKUP_API_TOKEN;
const TEAM_ID = "9014733918";
const LIST_ID = process.env.CLICKUP_NEW_LIST_ID || process.env.CLICKUP_CLIENT_LIST_ID || "901413612297";

// Helper to get user's ClickUp configuration
const getUserConfig = async (userId) => {
  const user = await User.findById(userId);
  return {
    listId: user?.clickupListId || LIST_ID,
    chatViewId: user?.clickupChatViewId || null,
    clickupId: user?.clickupId || null,
    teamId: TEAM_ID // Assuming same team for now, can be expanded
  };
};



// Escape user input for safe usage in RegExp
function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Helper to get or create a host task for view attachments
const getOrCreateHostTask = async (listId) => {
  try {
    // 1. Search for existing "Channel Media Host" task
    const searchUrl = `https://api.clickup.com/api/v2/list/${listId}/task?custom_task_ids=true&include_subtasks=true`;
    const response = await axios.get(searchUrl, {
      headers: { Authorization: CLICKUP_TOKEN }
    });

    const existingHost = response.data.tasks.find(t => t.name === "Channel Media Host");
    if (existingHost) return existingHost.id;

    // 2. Create if not found
    const createUrl = `https://api.clickup.com/api/v2/list/${listId}/task`;
    const createRes = await axios.post(createUrl, {
      name: "Channel Media Host",
      description: "This task holds attachments sent via the Client Portal Chat View.",
      status: "to do"
    }, {
      headers: { Authorization: CLICKUP_TOKEN }
    });

    return createRes.data.id;
  } catch (error) {
    console.error("❌ Error in getOrCreateHostTask:", error.response?.data || error.message);
    // Fallback: just return the first task ID if any
    try {
      const fallbackUrl = `https://api.clickup.com/api/v2/list/${listId}/task`;
      const fallbackRes = await axios.get(fallbackUrl, {
        headers: { Authorization: CLICKUP_TOKEN }
      });
      if (fallbackRes.data.tasks.length > 0) return fallbackRes.data.tasks[0].id;
    } catch (e) {}
    throw new Error("Could not find or create a host task for attachments");
  }
};

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
      let targetUrl = req.query.url;
      if (!targetUrl) return res.status(400).send("No URL provided");

      if (!CLICKUP_TOKEN) {
        console.error("❌ CLICKUP_TOKEN is missing in backend environment!");
        return res.status(500).send("Backend configuration error");
      }

      console.log(`🖼️ Proxying image: ${targetUrl}`);

      // Helper to determine if we should send the ClickUp token
      const shouldSendToken = (url) => {
        const isClickUpDomain = url.includes('clickup.com');
        const isSigned = url.includes('X-Amz-Signature') || url.includes('AWSAccessKeyId') || url.includes('Expires=');
        return isClickUpDomain && !isSigned;
      };

      const fetchWithRedirects = async (url, depth = 0) => {
        if (depth > 5) throw new Error("Too many redirects");

        const headers = {};
        if (shouldSendToken(url)) {
          headers.Authorization = CLICKUP_TOKEN;
        }

        const response = await axios.get(url, {
          headers,
          responseType: 'stream',
          maxRedirects: 0,
          validateStatus: (status) => (status >= 200 && status < 400)
        });

        if (response.status >= 300 && response.status < 400 && response.headers.location) {
          let nextUrl = response.headers.location;
          // Handle relative redirects
          if (nextUrl.startsWith('/')) {
            const urlObj = new URL(url);
            nextUrl = `${urlObj.protocol}//${urlObj.host}${nextUrl}`;
          }
          console.log(`↪️ [Depth ${depth}] Redirecting to: ${nextUrl}`);
          return fetchWithRedirects(nextUrl, depth + 1);
        }

        return response;
      };

      const finalResponse = await fetchWithRedirects(targetUrl);

      // Forward essential headers
      if (finalResponse.headers['content-type']) {
        res.setHeader('Content-Type', finalResponse.headers['content-type']);
      }
      res.setHeader('Cache-Control', 'public, max-age=3600'); 

      finalResponse.data.pipe(res);
    } catch (error) {
      console.error("❌ Proxy Error:", error.message);
      res.status(500).send(`Error proxying image: ${error.message}`);
    }
  }),

  uploadAttachment: expressAsyncHandler(async (req, res) => {
    try {
      let { viewId } = req.params;
      const config = await getUserConfig(req.user.id);
      
      // If viewId is a placeholder or not provided, use user's config
      if (!viewId || viewId === 'undefined' || viewId === 'null' || viewId === 'current') {
        viewId = config.chatViewId;
      }

      if (!viewId) {
        console.error("❌ Upload failed: No Chat View ID found");
        return res.status(400).json({ success: false, message: "No Chat View ID configured for this user" });
      }

      console.log(`📂 Upload request for View ID: ${viewId}`);

      if (!req.file) {
        console.error("❌ No file found in request");
        return res.status(400).json({ success: false, message: "No file uploaded" });
      }

      console.log(`📄 File info: ${req.file.originalname} (${req.file.mimetype}, ${req.file.size} bytes)`);

      console.log(`📄 File info: ${req.file.originalname} (${req.file.mimetype}, ${req.file.size} bytes)`);

      // Intelligently decide which endpoint to use.
      // ClickUp ONLY supports attachments on TASKS. 
      const isView = viewId.includes('-');
      let targetTaskId = viewId;
      
      if (isView) {
        console.log(`⚠️ View ID detected [${viewId}]. Redirecting attachment to host task...`);
        // If it's a view, we need to find or create a "Host Task" in the list to hold the attachment
        if (!config.listId) {
          return res.status(400).json({ success: false, message: "No List ID configured to host view attachments" });
        }
        
        targetTaskId = await getOrCreateHostTask(config.listId);
        console.log(`🎯 Using Host Task: ${targetTaskId}`);
      }

      const url = `https://api.clickup.com/api/v2/task/${targetTaskId}/attachment`;
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

      console.log("✅ ClickUp Upload Success:", response.data);

      // Cleanup local temp file
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

      // Auto-post a comment in the chat view containing a native rich-text attachment or image block
      try {
        const senderName = req.user?.name || "Client";
        const att = response.data;
        const ext = (att.extension || att.name?.split('.').pop() || '').toLowerCase();
        const isImg = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'svg'].includes(ext);

        const commentUrl = isView 
          ? `https://api.clickup.com/api/v2/view/${viewId}/comment`
          : `https://api.clickup.com/api/v2/task/${viewId}/comment`;

        console.log(`📝 Auto-posting native rich attachment comment to ${isView ? 'View' : 'Task'} [${viewId}]`);

        // Format a clean, attributed sender tag
        const senderTag = `[Sent by ${senderName}]: `;

        let commentBody = {};

        if (isImg) {
          // Create a native ClickUp image block comment!
          commentBody = {
            comment: [
              {
                text: senderTag
              },
              {
                type: "image",
                text: att.name || att.title || "Shared Image",
                image: {
                  id: att.id,
                  name: att.name || att.title,
                  title: att.title || att.name,
                  type: ext,
                  extension: `image/${ext}`,
                  thumbnail_large: att.thumbnail_large || att.url,
                  thumbnail_medium: att.thumbnail_medium || att.url,
                  thumbnail_small: att.thumbnail_small || att.url,
                  url: att.url,
                  uploaded: true
                },
                attributes: {
                  width: "300",
                  "data-id": att.id
                }
              },
              {
                text: "\n"
              }
            ],
            notify_all: true
          };
        } else {
          // Create a native ClickUp file/attachment block comment!
          commentBody = {
            comment: [
              {
                text: senderTag
              },
              {
                type: "attachment",
                text: att.name || att.title || "Shared File",
                attachment: {
                  id: att.id,
                  name: att.name || att.title,
                  title: att.title || att.name,
                  extension: ext,
                  thumbnail_large: att.thumbnail_large || att.url,
                  thumbnail_medium: att.thumbnail_medium || att.url,
                  thumbnail_small: att.thumbnail_small || att.url,
                  url: att.url,
                  uploaded: true
                },
                attributes: {
                  "data-id": att.id
                }
              },
              {
                text: "\n"
              }
            ],
            notify_all: true
          };
        }

        await axios.post(commentUrl, commentBody, {
          headers: {
            Authorization: CLICKUP_TOKEN,
            'Content-Type': 'application/json'
          },
        });
        console.log("✅ Auto-posted native rich attachment comment successfully!");
      } catch (commentErr) {
        console.error("⚠️ Failed to auto-post rich attachment comment:", commentErr.response?.data || commentErr.message);
      }

      res.json({
        success: true,
        attachment: response.data
      });
    } catch (error) {
      const errorData = error.response?.data;
      const status = error.response?.status;
      
      console.error(`❌ ClickUp API Error (uploadAttachment) [Status ${status}]:`, JSON.stringify(errorData, null, 2) || error.message);
      
      // Try to cleanup even on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      // If View attachment is not supported (404), explain why
      if (status === 404) {
        return res.status(404).json({ 
          success: false, 
          message: "ClickUp API Error: This chat view does not support direct attachments. Try uploading to a task instead.",
          details: errorData 
        });
      }

      res.status(status || 500).json({ 
        success: false, 
        message: "Failed to upload to ClickUp",
        error: errorData || error.message 
      });
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
      const config = await getUserConfig(req.user.id);
      const userListId = config.listId;

      // 1. Fetch List Details to get ALL possible statuses
      const listUrl = `https://api.clickup.com/api/v2/list/${userListId}`;
      const listRes = await axios.get(listUrl, { headers: { Authorization: CLICKUP_TOKEN } });
      const allStatuses = listRes.data.statuses || [];

      // 2. Fetch Tasks - Filter by assignee if clickupId is set
      let url = `https://api.clickup.com/api/v2/list/${userListId}/task?include_closed=true`;
      if (config.clickupId) {
        url += `&assignees[]=${config.clickupId}`;
      }
      console.log(`🔗 Fetching from List [${userListId}] (Filtered: ${!!config.clickupId}):`, url);

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

      const config = await getUserConfig(req.user.id);
      const userListId = config.listId;

      const url = `https://api.clickup.com/api/v2/list/${userListId}/task`;
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
      let { viewId } = req.params;
      const config = await getUserConfig(req.user.id);

      if (!viewId || viewId === 'undefined' || viewId === 'null' || viewId === 'current') {
        viewId = config.chatViewId;
      }

      if (!viewId) {
        return res.status(400).json({ success: false, message: "No Chat View ID configured for this user" });
      }

      // Detect if Task ID or View ID
      const isView = viewId.includes('-');
      const url = isView 
        ? `https://api.clickup.com/api/v2/view/${viewId}/comment`
        : `https://api.clickup.com/api/v2/task/${viewId}/comment`;

      console.log(`🔗 Fetching Chat Comments from ${isView ? 'View' : 'Task'} [${viewId}]`);

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
      let { viewId } = req.params;
      const { comment_text } = req.body;
      const config = await getUserConfig(req.user.id);

      if (!viewId || viewId === 'undefined' || viewId === 'null' || viewId === 'current') {
        viewId = config.chatViewId;
      }

      if (!viewId) {
        return res.status(400).json({ success: false, message: "No Chat View ID configured for this user" });
      }

      // Detect if Task ID or View ID
      const isView = viewId.includes('-');
      const url = isView 
        ? `https://api.clickup.com/api/v2/view/${viewId}/comment`
        : `https://api.clickup.com/api/v2/task/${viewId}/comment`;

      console.log(`📝 Posting Comment to ${isView ? 'View' : 'Task'} [${viewId}]`);

      const senderName = req.user.name || "Client";
      const attributionText = `[Sent by ${senderName}]: ${comment_text}`;

      const response = await axios.post(url, {
        comment_text: attributionText,
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
  }),

  getGeneralActivity: expressAsyncHandler(async (req, res) => {
    try {
      const config = await getUserConfig(req.user.id);
      const userListId = config.listId;

      console.log(`🔗 Fetching Combined Task Log & Activity for List [${userListId}]`);
      
      // 0. Dynamically find the Team ID (Workspace) to avoid 404s
      let dynamicTeamId = TEAM_ID;
      try {
        const teamRes = await axios.get('https://api.clickup.com/api/v2/team', { 
          headers: { Authorization: CLICKUP_TOKEN },
          timeout: 5000
        });
        if (teamRes.data.teams?.length > 0) {
          dynamicTeamId = teamRes.data.teams[0].id;
          console.log(`✅ Using Workspace ID: ${dynamicTeamId}`);
        }
      } catch (err) {
        console.warn("⚠️ Failed to fetch dynamic Team ID, falling back to hardcoded ID.");
      }

      // 1. Fetch ALL Tasks (Base Log)
      const tasksUrl = `https://api.clickup.com/api/v2/list/${userListId}/task?include_closed=true&subtasks=true&limit=60`;
      const tasksRes = await axios.get(tasksUrl, { headers: { Authorization: CLICKUP_TOKEN } });
      const tasks = tasksRes.data.tasks || [];

      let mergedActivity = [];

      // 2. Map Task Creations, Statuses, and Attachments (Baseline data)
      tasks.forEach(task => {
        try {
          const taskName = task.name || 'Project Task';
          const userName = task.creator?.username || 'Team Member';

          // A. Always add Creation Event
          if (task.date_created) {
            const createDate = new Date(parseInt(task.date_created));
            if (!isNaN(createDate.getTime())) {
              mergedActivity.push({
                id: `create-${task.id}`,
                user: userName,
                target: taskName,
                type: 'create',
                time: createDate.toISOString()
              });
            }
          }

          // B. Add "Completed" Event if task is currently closed/done
          const statusStr = (task.status?.status || '').toLowerCase();
          const isClosed = task.status?.type === 'closed' || statusStr.includes('complete') || statusStr.includes('done') || statusStr.includes('closed');
          
          if (isClosed && (task.date_done || task.date_updated)) {
            const doneDate = new Date(parseInt(task.date_done || task.date_updated));
            if (!isNaN(doneDate.getTime())) {
              mergedActivity.push({
                id: `done-static-${task.id}`,
                user: userName,
                target: taskName,
                type: 'complete',
                time: doneDate.toISOString()
              });
            }
          }

          // C. Add "In Progress" Event if task is currently active
          const isInProgress = task.status?.type === 'in-progress' || statusStr.includes('progress') || statusStr.includes('working') || statusStr.includes('active');
          if (isInProgress && task.date_updated) {
            const progressDate = new Date(parseInt(task.date_updated));
            if (!isNaN(progressDate.getTime())) {
              mergedActivity.push({
                id: `progress-static-${task.id}`,
                user: userName,
                target: taskName,
                type: 'in-progress',
                time: progressDate.toISOString()
              });
            }
          }

          // D. Add Historical Attachments
          if (task.attachments && Array.isArray(task.attachments)) {
            task.attachments.forEach(att => {
              if (att.date) {
                const attDate = new Date(parseInt(att.date));
                if (!isNaN(attDate.getTime())) {
                  const ext = att.extension || (att.url ? att.url.split('.').pop().split('?')[0].toLowerCase() : '');
                  mergedActivity.push({
                    id: `upload-${att.id}`,
                    user: userName,
                    target: taskName,
                    type: 'upload',
                    image: att.thumbnail_large || att.url,
                    url: att.url,
                    extension: ext,
                    time: attDate.toISOString()
                  });
                }
              }
            });
          }
        } catch (err) {
          console.warn(`⚠️ Error mapping task ${task.id}:`, err.message);
        }
      });


      // 3. Layer in Recent Team Activity (Live Events)
      try {
        const activityUrl = `https://api.clickup.com/api/v2/team/${dynamicTeamId}/activity?list_ids[]=${userListId}&limit=100`;
        const activityRes = await axios.get(activityUrl, { 
          headers: { Authorization: CLICKUP_TOKEN },
          timeout: 8000
        });
        
        const rawActivities = activityRes.data.activities || [];

        rawActivities.forEach(act => {
          try {
            let type = null;
            let image = null;
            let url = null;
            let extension = null;
            
            const after = act.details?.after;
            const afterStr = (typeof after === 'object' ? after?.status || after?.priority || JSON.stringify(after) : String(after || '')).toLowerCase();

            switch(act.type) {
              case 'statusUpdated':
                if (afterStr.includes('complete') || afterStr.includes('closed') || afterStr.includes('done')) {
                  type = 'complete';
                } else if (afterStr.includes('progress') || afterStr.includes('working') || afterStr.includes('active')) {
                  type = 'in-progress';
                }
                break;
              case 'priorityUpdated':
                if (afterStr === '1' || afterStr.includes('high') || afterStr.includes('urgent')) {
                  type = 'priority';
                }
                break;
              case 'taskDeleted':
                type = 'delete';
                break;
              case 'attachmentAdded':
                type = 'upload';
                const att = act.details?.attachment;
                image = att?.thumbnail_large || att?.url;
                url = att?.url;
                extension = att?.extension || (url ? url.split('.').pop().split('?')[0].toLowerCase() : '');
                break;
            }

            if (type && act.date) {
              const actDate = new Date(parseInt(act.date));
              if (!isNaN(actDate.getTime())) {
                mergedActivity.push({
                  id: `act-${act.id}`,
                  user: act.user?.username || 'Team Member',
                  target: act.task?.name || 'Project Task',
                  type,
                  image,
                  url,
                  extension,
                  time: actDate.toISOString()
                });
              }
            }
          } catch (itemErr) {
            console.warn("⚠️ Error mapping activity item:", itemErr.message);
          }
        });
      } catch (actError) {
        console.error("⚠️ Team Activity API Failed:", actError.response?.data || actError.message);
      }


      // 4. Deduplicate and Sort
      const finalActivity = Array.from(
        mergedActivity.reduce((map, item) => map.set(item.id, item), new Map()).values()
      ).sort((a, b) => new Date(b.time) - new Date(a.time))
       .slice(0, 50);

      res.json({
        success: true,
        activity: finalActivity
      });
    } catch (e) {
      console.error("❌ Fatal Activity Error:", e.response?.data || e.message);
      res.status(500).json({ success: false, error: e.message });
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
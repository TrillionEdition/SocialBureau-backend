const axios = require('axios');
require('dotenv').config({ path: 'c:/Users/webas/BC/SocialBureau-backend/.env' });

const CLICKUP_TOKEN = process.env.VITE_CLICKUP_API_TOKEN;
const LIST_ID = "901416201854";

async function listTasks() {
  try {
    const res = await axios.get(`https://api.clickup.com/api/v2/list/${LIST_ID}/task`, {
      headers: { Authorization: CLICKUP_TOKEN }
    });
    console.log("Tasks found:", res.data.tasks.map(t => ({ id: t.id, name: t.name })));
    
    if (res.data.tasks.length > 0) {
        const taskId = res.data.tasks[0].id;
        console.log(`\nTesting first task: ${taskId}`);
        
        try {
          const taskDetail = await axios.get(`https://api.clickup.com/api/v2/task/${taskId}`, {
            headers: { Authorization: CLICKUP_TOKEN }
          });
          console.log("✅ Task Details:", taskDetail.data.name);
          console.log("   - Attachments in task object:", taskDetail.data.attachments?.length);
          console.log("   - Comments count:", taskDetail.data.comment_count);
        } catch (e) {
          console.log("❌ Task Details failed:", e.response?.status, e.response?.data);
        }


        try {
          const teamId = "9014733918";
          const timeRes = await axios.get(`https://api.clickup.com/api/v2/team/${teamId}/time_entries?task_id=${taskId}`, {
            headers: { Authorization: CLICKUP_TOKEN }
          });
          console.log("✅ Time Entries:", timeRes.data.data?.length);
        } catch (e) {
          console.log("❌ Time Entries failed:", e.response?.status, e.response?.data);
        }

    }
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
  }
}

listTasks();

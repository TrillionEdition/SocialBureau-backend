const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const CLICKUP_TOKEN = process.env.VITE_CLICKUP_API_TOKEN;
const TEAM_ID = "9014733918";

async function run() {
  try {
    const tasksUrl = `https://api.clickup.com/api/v2/team/${TEAM_ID}/task?limit=5`;
    const res = await axios.get(tasksUrl, { headers: { Authorization: CLICKUP_TOKEN } });
    const tasks = res.data.tasks || [];
    if (tasks.length > 0) {
      const firstTask = tasks[0];
      console.log("Task keys:", Object.keys(firstTask));
      console.log("Task name:", firstTask.name);
      console.log("Task list:", firstTask.list);
      console.log("Task folder:", firstTask.folder);
      console.log("Task space:", firstTask.space);
      console.log("Task project:", firstTask.project);
    } else {
      console.log("No tasks found");
    }
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
  }
}

run();

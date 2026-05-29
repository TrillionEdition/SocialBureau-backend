const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const CLICKUP_TOKEN = process.env.VITE_CLICKUP_API_TOKEN;
const TEAM_ID = "9014733918";
const LIST_ID = "901413612297";
const ELIZEBATH_CLICKUP_ID = "88383388";

async function run() {
  try {
    const listUrl = `https://api.clickup.com/api/v2/list/${LIST_ID}/task?include_closed=true&assignees[]=${ELIZEBATH_CLICKUP_ID}&limit=100`;
    const res = await axios.get(listUrl, { headers: { Authorization: CLICKUP_TOKEN } });
    const tasks = res.data.tasks || [];
    console.log("Total tasks returned:", tasks.length);
    
    let hasEstimate = 0;
    let hasSpent = 0;
    let hasBoth = 0;
    let hasDueDate = 0;
    let statusCounts = {};

    tasks.forEach(task => {
      statusCounts[task.status?.status] = (statusCounts[task.status?.status] || 0) + 1;
      
      const estimate = task.time_estimate || 0;
      const spent = task.time_spent || 0;
      const due = task.due_date ? parseInt(task.due_date) : null;
      
      if (estimate > 0) hasEstimate++;
      if (spent > 0) hasSpent++;
      if (estimate > 0 && spent > 0) hasBoth++;
      if (due) hasDueDate++;
    });

    console.log("Status distribution:", statusCounts);
    console.log("Tasks with estimate:", hasEstimate);
    console.log("Tasks with time spent:", hasSpent);
    console.log("Tasks with BOTH estimate and time spent:", hasBoth);
    console.log("Tasks with due date:", hasDueDate);

  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
  }
}

run();

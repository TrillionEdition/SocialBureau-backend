const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const CLICKUP_TOKEN = process.env.VITE_CLICKUP_API_TOKEN;
const LIST_ID = "901413612297";
const ELIZEBATH_CLICKUP_ID = "88383388";

async function run() {
  const selectedMonth = 4; // May
  const selectedYear = 2026;

  const selectedDateStart = new Date(selectedYear, selectedMonth, 1).getTime();
  const selectedDateEnd = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999).getTime();

  console.log("Range in UTC:", new Date(selectedDateStart).toISOString(), "to", new Date(selectedDateEnd).toISOString());

  const tasksUrl = `https://api.clickup.com/api/v2/list/${LIST_ID}/task?include_closed=true&assignees[]=${ELIZEBATH_CLICKUP_ID}&limit=100`;
  const res = await axios.get(tasksUrl, { headers: { Authorization: CLICKUP_TOKEN } });
  
  const tasksWithDetails = (res.data.tasks || []).map(task => ({
    id: task.id,
    title: task.name,
    status: task.status?.status,
    closedDateMs: task.date_closed ? parseInt(task.date_closed) : null,
    dueDateMs: task.due_date ? parseInt(task.due_date) : null,
  }));

  console.log("Total tasks with details:", tasksWithDetails.length);

  const matchingTasks = tasksWithDetails.filter(task => {
    const isClosedStatus = task.status && ['closed', 'complete', 'done'].includes(task.status.toLowerCase());
    
    let isDateInRange = false;
    if (task.closedDateMs) {
      isDateInRange = task.closedDateMs >= selectedDateStart && task.closedDateMs <= selectedDateEnd;
    } else if (task.dueDateMs) {
      isDateInRange = task.dueDateMs >= selectedDateStart && task.dueDateMs <= selectedDateEnd;
    }

    if (isClosedStatus && isDateInRange) {
      console.log(`Matched task: "${task.title}" (Status: ${task.status}, Closed: ${task.closedDateMs ? new Date(task.closedDateMs).toISOString() : 'N/A'}, Due: ${task.dueDateMs ? new Date(task.dueDateMs).toISOString() : 'N/A'})`);
      return true;
    }
    return false;
  });

  console.log("Matching tasks count:", matchingTasks.length);
}

run();

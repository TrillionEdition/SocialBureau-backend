const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const CLICKUP_TOKEN = process.env.VITE_CLICKUP_API_TOKEN || "pk_88409188_D0Y7H1O1N6W5U4P2Z3Y2R1X0W9V8U7T6";
const TEAM_ID = "9014733918";
const KEERTHANA_ID = "88489814";

async function run() {
  try {
    const token = process.env.VITE_CLICKUP_API_TOKEN || CLICKUP_TOKEN;
    console.log("Token configured:", token ? "Yes" : "No");

    // Fetch 10 pages of tasks concurrently
    console.log("Fetching 10 pages of tasks concurrently...");
    const pages = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const requests = pages.map(page => {
      const url = `https://api.clickup.com/api/v2/team/${TEAM_ID}/task?include_closed=true&assignees[]=${KEERTHANA_ID}&limit=100&page=${page}`;
      return axios.get(url, { headers: { Authorization: token } }).catch(err => {
        console.error(`Page ${page} failed:`, err.message);
        return { data: { tasks: [] } };
      });
    });

    const responses = await Promise.all(requests);
    let allTasks = [];
    responses.forEach((res, idx) => {
      const pageTasks = res.data.tasks || [];
      console.log(`Page ${idx} returned ${pageTasks.length} tasks.`);
      allTasks = allTasks.concat(pageTasks);
    });

    // Deduplicate tasks by id
    const taskMap = new Map();
    allTasks.forEach(t => taskMap.set(t.id, t));
    const uniqueTasks = Array.from(taskMap.values());
    console.log(`Total unique tasks fetched: ${uniqueTasks.length}`);

    const dates = uniqueTasks.map(task => {
      return {
        id: task.id,
        name: task.name,
        status: task.status?.status,
        dueDateMs: task.due_date ? parseInt(task.due_date) : null,
        closedDateMs: task.date_closed ? parseInt(task.date_closed) : null,
        createdDateMs: task.date_created ? parseInt(task.date_created) : null,
      };
    });

    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY'];
    console.log("\nCalculating metrics for JAN - MAY 2026:");

    monthNames.forEach((mName, monthIdx) => {
      const year = 2026;
      const selectedDateStart = new Date(year, monthIdx, 1).getTime();
      const selectedDateEnd = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999).getTime();

      // Calculate completed tasks (worksDone)
      const worksDone = dates.filter(task => {
        if (!task.status || !['closed', 'complete', 'done'].includes(task.status.toLowerCase())) {
          return false;
        }
        if (task.closedDateMs) {
          return task.closedDateMs >= selectedDateStart && task.closedDateMs <= selectedDateEnd;
        }
        if (task.dueDateMs) {
          return task.dueDateMs >= selectedDateStart && task.dueDateMs <= selectedDateEnd;
        }
        return false;
      }).length;

      // Calculate total tasks irrespective of status
      const totalTasks = dates.filter(task => {
        if (task.closedDateMs) {
          return task.closedDateMs >= selectedDateStart && task.closedDateMs <= selectedDateEnd;
        }
        if (task.dueDateMs) {
          return task.dueDateMs >= selectedDateStart && task.dueDateMs <= selectedDateEnd;
        }
        if (task.createdDateMs) {
          return task.createdDateMs >= selectedDateStart && task.createdDateMs <= selectedDateEnd;
        }
        return false;
      }).length;

      console.log(`Month: ${mName} | Completed (worksDone): ${worksDone} | Total Tasks: ${totalTasks}`);
    });

  } catch (err) {
    console.error("Error details:", err.message);
  }
}

run();

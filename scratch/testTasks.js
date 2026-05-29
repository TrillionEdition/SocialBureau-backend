const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const CLICKUP_TOKEN = process.env.VITE_CLICKUP_API_TOKEN;
const TEAM_ID = "9014733918";
const LIST_ID = "901413612297";
const ELIZEBATH_CLICKUP_ID = "88383388";

async function run() {
  console.log("Token:", CLICKUP_TOKEN ? "Found" : "Missing");
  
  // 1. Test List tasks
  try {
    const listUrl = `https://api.clickup.com/api/v2/list/${LIST_ID}/task?include_closed=true&assignees[]=${ELIZEBATH_CLICKUP_ID}&limit=100`;
    console.log(`\nQuerying List Tasks URL: ${listUrl}`);
    const res = await axios.get(listUrl, { headers: { Authorization: CLICKUP_TOKEN } });
    console.log("List tasks success! Count:", res.data.tasks?.length);
    if (res.data.tasks?.length > 0) {
      console.log("Sample List Task name:", res.data.tasks[0].name);
    }
  } catch (err) {
    console.error("List tasks error:", err.response?.data || err.message);
  }

  // 2. Test Team tasks
  try {
    const teamUrl = `https://api.clickup.com/api/v2/team/${TEAM_ID}/task?include_closed=true&assignees[]=${ELIZEBATH_CLICKUP_ID}&limit=100`;
    console.log(`\nQuerying Team Tasks URL: ${teamUrl}`);
    const res = await axios.get(teamUrl, { headers: { Authorization: CLICKUP_TOKEN } });
    console.log("Team tasks success! Count:", res.data.tasks?.length);
    if (res.data.tasks?.length > 0) {
      console.log("Sample Team Task name:", res.data.tasks[0].name);
    }
  } catch (err) {
    console.error("Team tasks error:", err.response?.data || err.message);
  }
}

run();

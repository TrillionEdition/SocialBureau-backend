const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const CLICKUP_TOKEN = process.env.CLICKUP_API_TOKEN || process.env.CLICKUP_TOKEN;
const TEAM_ID = "9014733918";
const KEERTHANA_ID = "88489814";

async function run() {
  try {
    const token = CLICKUP_TOKEN;
    const now = Date.now();
    const start = now - 90 * 24 * 60 * 60 * 1000;
    const entriesUrl = `https://api.clickup.com/api/v2/team/${TEAM_ID}/time_entries?start_date=${start}&end_date=${now}&assignee=${KEERTHANA_ID}`;
    
    const entriesRes = await axios.get(entriesUrl, { headers: { Authorization: token } });
    const entries = entriesRes.data.data || [];
    console.log("Total entries retrieved:", entries.length);
    
    // Find some entries that have a task with a status or dates
    const entriesWithTask = entries.filter(e => e.task && typeof e.task === 'object');
    console.log("Entries with task objects:", entriesWithTask.length);
    
    if (entriesWithTask.length > 0) {
      console.log("\nSample Time Entry Task object:");
      console.log(JSON.stringify(entriesWithTask[0].task, null, 2));
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

run();

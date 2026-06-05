const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const axios = require('axios');

async function check() {
  try {
    const TEAM_ID = "9014733918";
    const CLICKUP_TOKEN = process.env.VITE_CLICKUP_API_TOKEN;
    const reshmaId = '94203257';

    const startOfMay = new Date(2026, 4, 1).getTime();
    const endOfMay = new Date(2026, 4, 31, 23, 59, 59, 999).getTime();

    const url = `https://api.clickup.com/api/v2/team/${TEAM_ID}/time_entries?start_date=${startOfMay}&end_date=${endOfMay}&assignee=${reshmaId}`;
    const res = await axios.get(url, {
      headers: { Authorization: CLICKUP_TOKEN }
    });
    console.log(`\n=== RAW TIME ENTRIES FOR RESHMA IN MAY 2026 ===`);
    const entries = res.data.data || [];
    console.log(`Total entries: ${entries.length}`);
    entries.forEach(e => {
      const startIST = new Date(parseInt(e.start) + 5.5 * 60 * 60 * 1000).toISOString();
      const durationHrs = (Number(e.duration) || 0) / 3600000;
      console.log(`ID: ${e.id} | Start (IST): ${startIST} | Duration: ${durationHrs.toFixed(2)}h | Task: ${e.task?.name || 'No Task'}`);
    });
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
  }
}

check();

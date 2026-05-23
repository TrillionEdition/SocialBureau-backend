const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const CLICKUP_TOKEN = process.env.VITE_CLICKUP_API_TOKEN || "pk_88409188_D0Y7H1O1N6W5U4P2Z3Y2R1X0W9V8U7T6";
const TEAM_ID = "9014733918";

// Let's inspect Elizabeth Thomas (88383388) and Reshma Vijayan (94203257)
const members = [
  { name: 'Elizebath Thomas', id: '88383388' },
  { name: 'Reshma Vijayan', id: '94203257' }
];

async function run() {
  for (const member of members) {
    try {
      console.log(`\n=================== Inspecting Time Entries for ${member.name} (ID: ${member.id}) ===================`);
      const now = Date.now();
      const hundredEightyDaysAgo = now - 180 * 24 * 60 * 60 * 1000;
      const url = `https://api.clickup.com/api/v2/team/${TEAM_ID}/time_entries?start_date=${hundredEightyDaysAgo}&end_date=${now}&assignee=${member.id}`;
      
      const res = await axios.get(url, { headers: { Authorization: CLICKUP_TOKEN } });
      const entries = res.data.data || [];
      console.log(`Total time entries fetched (180 days): ${entries.length}`);

      // Filter entries in Feb 2026
      const febStart = new Date(2026, 1, 1).getTime();
      const febEnd = new Date(2026, 2, 0, 23, 59, 59, 999).getTime();

      const febEntries = entries.filter(e => {
        const start = parseInt(e.start);
        return start >= febStart && start <= febEnd;
      });

      console.log(`Time entries in Feb 2026: ${febEntries.length}`);

      // Inspect duration and details of Feb entries
      let totalHours = 0;
      febEntries.forEach((e, idx) => {
        const startStr = new Date(parseInt(e.start)).toISOString();
        const durationMs = Number(e.duration) || 0;
        const hours = durationMs / 3600000;
        totalHours += hours;
        if (hours > 24 || idx < 5) {
          console.log(`Entry #${idx}: task_id=${e.task?.id || 'none'}, name=${e.task?.name || 'none'}, start=${startStr}, durationMs=${durationMs} (${hours.toFixed(2)} hours)`);
        }
      });
      console.log(`Calculated sum of Feb hours: ${totalHours.toFixed(2)}`);
      
    } catch (err) {
      console.error(`Error for ${member.name}:`, err.response?.data || err.message);
    }
  }
}

run();

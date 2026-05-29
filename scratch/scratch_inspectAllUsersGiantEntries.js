const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const CLICKUP_TOKEN = process.env.VITE_CLICKUP_API_TOKEN || "pk_88409188_D0Y7H1O1N6W5U4P2Z3Y2R1X0W9V8U7T6";
const TEAM_ID = "9014733918";

const users = [
  { name: 'Elizebath Thomas', id: '88383388' },
  { name: 'Reshma Vijayan', id: '94203257' },
  { name: 'Hasna', id: '88487129' },
  { name: 'Rachel Susan', id: '94209225' },
  { name: 'Keerthana', id: '88489814' },
  { name: 'Athira Rajesh', id: '88463855' },
  { name: 'Emil Joy', id: '100201105' },
  { name: 'Hajira', id: '95098012' }
];

async function run() {
  for (const user of users) {
    try {
      console.log(`\n=================== Inspecting ${user.name} ===================`);
      const now = Date.now();
      const hundredEightyDaysAgo = now - 180 * 24 * 60 * 60 * 1000;
      const url = `https://api.clickup.com/api/v2/team/${TEAM_ID}/time_entries?start_date=${hundredEightyDaysAgo}&end_date=${now}&assignee=${user.id}`;
      
      const res = await axios.get(url, { headers: { Authorization: CLICKUP_TOKEN } });
      const entries = res.data.data || [];
      
      const giantEntries = entries.filter(e => {
        const durationMs = Number(e.duration) || 0;
        return durationMs > 24 * 3600 * 1000; // greater than 24 hours
      });

      console.log(`Total entries: ${entries.length} | Giant entries (>24h): ${giantEntries.length}`);
      
      giantEntries.forEach((e, idx) => {
        const startStr = new Date(parseInt(e.start)).toISOString();
        const durationMs = Number(e.duration) || 0;
        const hours = durationMs / 3600000;
        console.log(`  [GIANT] id=${e.id}, task_id=${e.task?.id || 'none'}, name=${e.task?.name || 'none'}, start=${startStr}, hours=${hours.toFixed(2)}h`);
      });
      
    } catch (err) {
      console.error(`Error for ${user.name}:`, err.message);
    }
  }
}

run();

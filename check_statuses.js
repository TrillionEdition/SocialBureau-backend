const axios = require('axios');
require('dotenv').config({ path: 'c:/Users/webas/BC/SocialBureau-backend/.env' });

const CLICKUP_TOKEN = process.env.VITE_CLICKUP_API_TOKEN;
const LIST_ID = "901416201854";

async function checkStatuses() {
  try {
    const res = await axios.get(`https://api.clickup.com/api/v2/list/${LIST_ID}/task?include_closed=true`, {
      headers: { Authorization: CLICKUP_TOKEN }
    });
    
    console.log(`Total tasks: ${res.data.tasks.length}`);
    res.data.tasks.forEach(t => {
        console.log(`- Task: ${t.name} | Status: ${t.status.status} | Color: ${t.status.color}`);
    });

  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
  }
}

checkStatuses();

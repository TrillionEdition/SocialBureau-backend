const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const CLICKUP_TOKEN = process.env.VITE_CLICKUP_API_TOKEN || "pk_88409188_D0Y7H1O1N6W5U4P2Z3Y2R1X0W9V8U7T6";
const TEAM_ID = "9014733918";
const ENTRY_ID = "4949486658795603938";

async function run() {
  try {
    const url = `https://api.clickup.com/api/v2/team/${TEAM_ID}/time_entries/${ENTRY_ID}`;
    console.log("Fetching entry from:", url);
    const res = await axios.get(url, { headers: { Authorization: CLICKUP_TOKEN } });
    console.log("Response data:", JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
  }
}

run();

const axios = require('axios');
require('dotenv').config();

const CLICKUP_TOKEN = process.env.VITE_CLICKUP_API_TOKEN;
const LIST_ID = "901415541388";

async function findViews() {
    try {
        const url = `https://api.clickup.com/api/v2/list/${LIST_ID}/view`;
        const response = await axios.get(url, {
            headers: { Authorization: CLICKUP_TOKEN }
        });
        console.log("Views found:", JSON.stringify(response.data.views, null, 2));
    } catch (error) {
        console.error("Error fetching views:", error.response?.data || error.message);
    }
}

findViews();

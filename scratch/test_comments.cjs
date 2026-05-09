const axios = require('axios');
require('dotenv').config();

const CLICKUP_TOKEN = process.env.VITE_CLICKUP_API_TOKEN;
const VIEW_ID = "8cn3v2y-28474";

async function testComments() {
    try {
        const url = `https://api.clickup.com/api/v2/view/${VIEW_ID}/comment`;
        const response = await axios.get(url, {
            headers: { Authorization: CLICKUP_TOKEN }
        });
        console.log("Comments found:", JSON.stringify(response.data.comments, null, 2));
    } catch (error) {
        console.error("Error fetching comments:", error.response?.data || error.message);
    }
}

testComments();

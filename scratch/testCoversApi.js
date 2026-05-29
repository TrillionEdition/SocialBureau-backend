const axios = require('axios');

async function testApi() {
  try {
    const res = await axios.get('http://127.0.0.1:5000/clickup/public-member-details?slug=shamsk&month=4&year=2026');
    console.log("Full member data:", JSON.stringify(res.data.member, null, 2));
  } catch (err) {
    console.error("API error:", err.message);
  }
}

testApi();

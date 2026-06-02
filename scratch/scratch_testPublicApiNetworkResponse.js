const axios = require('axios');

async function test() {
  try {
    const res = await axios.get('http://localhost:5000/clickup/public-member-details?slug=reshma-vijayan');
    console.log("Success! Status:", res.status);
    console.log("Keys in response:", Object.keys(res.data));
    console.log("member keys:", Object.keys(res.data.member || {}));
    if (res.data.member) {
      console.log("socials object in response:", res.data.member.socials);
    }
  } catch (err) {
    console.error("Error fetching public member details:", err.message);
  }
}

test();

const axios = require('axios');

async function test() {
  try {
    const res = await axios.get('http://localhost:5000/clickup/public-member-details?slug=reshma-vijayan');
    console.log("Success! Status:", res.status);
    console.log("Keys in response:", Object.keys(res.data));
    console.log("member keys:", Object.keys(res.data.member || {}));
    if (res.data.member && res.data.member.user) {
      console.log("user keys:", Object.keys(res.data.member.user));
      console.log("workShowcase:", res.data.member.user.workShowcase);
      console.log("innovations:", res.data.member.user.innovations);
      console.log("hobbies:", res.data.member.user.hobbies);
      console.log("education:", res.data.member.user.education);
    } else {
      console.log("user property is missing or null!");
    }
  } catch (err) {
    console.error("Error fetching public member details:", err.message);
    if (err.response) {
      console.error("Response data:", err.response.data);
    }
  }
}

test();

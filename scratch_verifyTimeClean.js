const axios = require('axios');

async function run() {
  const slugs = ['elizebath-thomas', 'reshma-vijayan'];
  for (const slug of slugs) {
    try {
      console.log(`\n=================== Verifying Slug: ${slug} ===================`);
      const res = await axios.get(`http://127.0.0.1:5000/clickup/public-member-details?slug=${slug}&month=4&year=2026`);
      if (res.data && res.data.clickup) {
        console.log(`Works Done (May): ${res.data.clickup.worksDone}`);
        console.log(`Total Hours (May): ${res.data.clickup.totalHours.toFixed(2)}h`);
        console.log(`Working Hours History (Last 5 Months):`);
        console.log(res.data.clickup.workingHoursData);
      }
    } catch (err) {
      console.error(`Error:`, err.message);
    }
  }
}

run();

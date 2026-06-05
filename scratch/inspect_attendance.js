const axios = require('axios');

async function check() {
  try {
    const resReshma = await axios.get('http://localhost:5000/clickup/public-member-details?slug=reshma-vijayan&month=4&year=2026');
    const resAthira = await axios.get('http://localhost:5000/clickup/public-member-details?slug=athira-rajesh&month=4&year=2026');

    console.log("=== RESHMA MAY 2026 DAILY HOURS ===");
    resReshma.data.clickup.attendanceData.forEach(d => {
      console.log(`Day ${d.id + 1} (${d.date}): Status = ${d.status}, Hours = ${d.dailyHours}`);
    });

    console.log("\n=== ATHIRA MAY 2026 DAILY HOURS ===");
    resAthira.data.clickup.attendanceData.forEach(d => {
      console.log(`Day ${d.id + 1} (${d.date}): Status = ${d.status}, Hours = ${d.dailyHours}`);
    });
  } catch (err) {
    console.error("Error:", err.message);
  }
}

check();

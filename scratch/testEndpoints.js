const axios = require('axios');

const slugs = [
  'shamsk',
  'elizebath-thomas',
  'reshma-vijayan',
  'hasna',
  'rachel-susan',
  'keerthana',
  'athira-rajesh',
  'emil-joy',
  'alen-jacob',
  'hajira'
];

async function testAll() {
  for (const slug of slugs) {
    try {
      console.log(`\n=================== Testing Slug: ${slug} ===================`);
      const res = await axios.get(`http://127.0.0.1:5000/clickup/public-member-details?slug=${slug}&month=4&year=2026`);
      if (res.data) {
        console.log(`Success for ${slug}!`);
        console.log(`Member Name: ${res.data.member?.name}`);
        console.log(`ClickUp Payload:`, res.data.clickup ? {
          error: res.data.clickup.error,
          assignee: res.data.clickup.assignee,
          worksDone: res.data.clickup.worksDone,
          totalHours: res.data.clickup.totalHours,
          tasksCount: res.data.clickup.tasksCount,
          efficiency: res.data.clickup.efficiency,
          onTime: res.data.clickup.onTime,
          csat: res.data.clickup.csat
        } : 'null');
      }
    } catch (err) {
      console.error(`Error for ${slug}:`, err.response?.data || err.message);
    }
  }
}

testAll();

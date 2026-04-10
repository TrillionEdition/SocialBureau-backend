const { BetaAnalyticsDataClient } = require("@google-analytics/data");
const path = require("path");

const KEY_FILE_PATH = "c:\\SocialBureau\\SocialBureau-backend\\social-bureau-analytics-630a396efe7c.json";
const PROPERTY_ID = "498007004";

const client = new BetaAnalyticsDataClient({
  keyFilename: KEY_FILE_PATH,
});

async function runTest() {
  try {
    const [response] = await client.runReport({
      property: `properties/${PROPERTY_ID}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: "pagePath" }],
      metrics: [
        { name: "activeUsers" },
        { name: "eventCount" },
        { name: "newUsers" },
        { name: "conversions" },
        { name: "sessions" },
        { name: "averageSessionDuration" }
      ],
      dimensionFilter: {
        filter: {
          fieldName: "pagePath",
          stringFilter: {
            matchType: "BEGINS_WITH",
            value: "/partnership/Sivaprasad",
          },
        },
      },
    });
    console.log('Success! Rows found:', response.rows ? response.rows.length : 0);
    if (response.rows && response.rows.length > 0) {
      console.log('First row dimension values:', response.rows[0].dimensionValues.map(v => v.value));
      console.log('First row metric values:', response.rows[0].metricValues.map(v => v.value));
    }
  } catch (error) {

    console.error('GA4 API Error:', error.message);
    if (error.details) console.error('Details:', error.details);
  }
}

runTest();

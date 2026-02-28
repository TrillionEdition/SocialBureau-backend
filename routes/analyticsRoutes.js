const express = require("express");
const router = express.Router();
const { BetaAnalyticsDataClient } = require("@google-analytics/data");
const path = require("path");
const userAuthentication = require("../middlewares/userAuthentication");
const adminAuthentication = require("../middlewares/adminAuthentication");
const Partnership = require("../models/partnershipModel");

// Configuration
// Using the JSON file provided by the user for simplicity
const KEY_FILE_PATH = path.join(__dirname, "..", "social-bureau-analytics-630a396efe7c.json");
const PROPERTY_ID = "498007004"; 

const client = new BetaAnalyticsDataClient({
  keyFilename: KEY_FILE_PATH,
});

/**
 * @route GET /api/analytics
 * @desc Fetch Google Analytics 4 data for the dashboard
 */
router.get("/", userAuthentication, adminAuthentication, async (req, res) => {
  try {
    const range = req.query.range || "last30Days";
    const role = req.user.role?.toLowerCase();
    let filterParam = req.query.param;

    // Security: Restrict non-admins to their own partnership analytics
    if (role === 'partnership') {
      // Look up the partnership by matching the logged-in user's email
      const userEmail = req.user.email?.toLowerCase();
      console.log("[Analytics] Looking up partnership for email:", userEmail);

      const partner = await Partnership.findOne({ email: userEmail });

      console.log("[Analytics] Found partner:", partner ? `{ name: "${partner.name}", param: "${partner.param}" }` : "null");

      if (!partner || !partner.param) {
        console.log("[Analytics] No partnership found or no param set for email:", userEmail);
        return res.json({
          success: true,
          data: [],
          totals: {
            activeUsers: "0",
            eventCount: "0",
            newUsers: "0",
            keyEvents: "0",
            sessions: "0",
            avgDuration: "0.00"
          },
          message: "No partnership linked to this email"
        });
      }

      filterParam = partner.param;
      console.log("[Analytics] param:", filterParam);
    }

    const dimensionFilter = filterParam ? {
      filter: {
        fieldName: "pagePath",
        stringFilter: {
          matchType: "BEGINS_WITH",
          value: `/partnership/${filterParam}`,
        },
      },
    } : undefined;
    let startDate = req.query.startDate;
    let endDate = req.query.endDate || "today";

    if (!startDate) {
      const today = new Date();
      // Reset time to midnight for consistent calculations if needed
      // but toISOString().split('T')[0] works fine regardless.
      
      const formatDate = (date) => {
        const d = new Date(date);
        const month = '' + (d.getMonth() + 1);
        const day = '' + d.getDate();
        const year = d.getFullYear();
        return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
      };

      switch (range) {
        case "today":
          startDate = "today";
          endDate = "today";
          break;
        case "yesterday":
          startDate = "yesterday";
          endDate = "yesterday";
          break;
        case "thisWeek": {
          const start = new Date(today);
          start.setDate(today.getDate() - today.getDay());
          startDate = formatDate(start);
          break;
        }
        case "lastWeek": {
          const lastSat = new Date(today);
          lastSat.setDate(today.getDate() - today.getDay() - 1);
          const lastSun = new Date(lastSat);
          lastSun.setDate(lastSat.getDate() - 6);
          startDate = formatDate(lastSun);
          endDate = formatDate(lastSat);
          break;
        }
        case "thisMonth": {
          const start = new Date(today.getFullYear(), today.getMonth(), 1);
          startDate = formatDate(start);
          break;
        }
        case "lastMonth": {
          const firstOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const lastOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
          startDate = formatDate(firstOfLastMonth);
          endDate = formatDate(lastOfLastMonth);
          break;
        }
        case "last7Days":
          startDate = "7daysAgo";
          break;
        case "last28Days":
          startDate = "28daysAgo";
          break;
        case "last90Days":
          startDate = "90daysAgo";
          break;
        default:
          const days = parseInt(req.query.days) || 30;
          startDate = `${days}daysAgo`;
      }
    }

    // 1. Fetch Historical Data for Chart
    const [historicalResponse] = await client.runReport({
      property: `properties/${PROPERTY_ID}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "date" }],
      metrics: [
        { name: "activeUsers" },
        { name: "eventCount" },
        { name: "newUsers" },
        { name: "conversions" }, // Key Events in UI
        { name: "sessions" },
        { name: "averageSessionDuration" }
      ],
      orderBys: [
        { dimension: { dimensionName: "date" }, desc: false }
      ],
      metricAggregations: ['TOTAL'],
      dimensionFilter,
    });

    // 2. Fetch Realtime Data (Last 30 mins) for "Live Now" Active Users
    let realtimeActiveUsers = "0";
    try {
      const [realtimeResponse] = await client.runRealtimeReport({
        property: `properties/${PROPERTY_ID}`,
        metrics: [{ name: "activeUsers" }],
        dimensionFilter,
      });
      if (realtimeResponse.rows && realtimeResponse.rows.length > 0) {
        realtimeActiveUsers = realtimeResponse.rows[0].metricValues[0].value;
      }
    } catch (realtimeErr) {
      console.warn("⚠️ Google Analytics Realtime API Warn:", realtimeErr.message);
    }

    // Format historical data for charts
    const rows = historicalResponse.rows || [];
    const formattedData = rows.map(row => ({
      date: row.dimensionValues[0].value,
      activeUsers: parseInt(row.metricValues[0].value),
      eventCount: parseInt(row.metricValues[1].value),
      newUsers: parseInt(row.metricValues[2].value),
      keyEvents: parseInt(row.metricValues[3].value),
      sessions: parseInt(row.metricValues[4].value),
      avgDuration: parseFloat(row.metricValues[5].value).toFixed(2)
    }));

    // Calculate totals for stat cards
    let totals;
    if (historicalResponse.totals && historicalResponse.totals[0]) {
      const t = historicalResponse.totals[0];
      totals = {
        activeUsers: realtimeActiveUsers !== "0" ? realtimeActiveUsers : t.metricValues[0].value,
        eventCount: t.metricValues[1].value,
        newUsers: t.metricValues[2].value,
        keyEvents: t.metricValues[3].value,
        sessions: t.metricValues[4].value,
        avgDuration: parseFloat(t.metricValues[5].value).toFixed(2)
      };
    } else {
      // Manual fallback calculation
      const sumEvents = formattedData.reduce((acc, curr) => acc + curr.eventCount, 0);
      const sumNewUsers = formattedData.reduce((acc, curr) => acc + curr.newUsers, 0);
      const sumKeyEvents = formattedData.reduce((acc, curr) => acc + curr.keyEvents, 0);
      const sumSessions = formattedData.reduce((acc, curr) => acc + curr.sessions, 0);
      const avgDur = formattedData.length > 0 
        ? (formattedData.reduce((acc, curr) => acc + parseFloat(curr.avgDuration), 0) / formattedData.length).toFixed(2)
        : "0.00";
        
      totals = {
        activeUsers: realtimeActiveUsers,
        eventCount: sumEvents.toString(),
        newUsers: sumNewUsers.toString(),
        keyEvents: sumKeyEvents.toString(),
        sessions: sumSessions.toString(),
        avgDuration: avgDur
      };
    }

    res.json({
      success: true,
      data: formattedData,
      totals,
      isRealtime: realtimeActiveUsers !== "0"
    });

  } catch (error) {
    console.error("❌ Google Analytics API Error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch analytics data",
      message: error.message 
    });
  }
});

module.exports = router;

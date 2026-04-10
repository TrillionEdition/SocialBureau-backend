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

// Helper to format dates
const formatDate = (date) => {
  const d = new Date(date);
  const month = '' + (d.getMonth() + 1);
  const day = '' + d.getDate();
  const year = d.getFullYear();
  return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
};

// Helper to get start/end dates from range
const getDateRange = (range, reqStartDate, reqEndDate) => {
  let startDate = reqStartDate;
  let endDate = reqEndDate || "today";

  if (!startDate) {
    const today = new Date();
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
        startDate = "30daysAgo";
    }
  }
  return { startDate, endDate };
};

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
      const userEmail = req.user.email?.toLowerCase();
      const partner = await Partnership.findOne({ email: userEmail });

      if (!partner || !partner.param) {
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
    }

    const getFinalFilterValue = (param) => {
      if (!param) return null;
      if (param.startsWith('/partnership/')) return param;
      if (param.startsWith('/')) return `/partnership${param}`;
      return `/partnership/${param}`;
    };

    const dimensionFilter = filterParam ? {
      filter: {
        fieldName: "pagePath",
        stringFilter: {
          matchType: "BEGINS_WITH",
          value: getFinalFilterValue(filterParam),
        },
      },
    } : undefined;


    const { startDate, endDate } = getDateRange(range, req.query.startDate, req.query.endDate);

    // Calculate previous period for trends
    const calculatePreviousPeriod = (start, end) => {
      const s = new Date(start === "today" || start === "yesterday" || start.includes('daysAgo') ? new Date() : start);
      const e = new Date(end === "today" || end === "yesterday" || end.includes('daysAgo') ? new Date() : end);
      
      // Basic logic to offset start/end by the duration of the current period
      if (start.includes('daysAgo')) {
        const days = parseInt(start.match(/\d+/)[0]);
        return { prevStart: `${days * 2}daysAgo`, prevEnd: `${days}daysAgo` };
      }
      
      const diffTime = Math.abs(e - s);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
      
      const prevS = new Date(s);
      prevS.setDate(s.getDate() - diffDays);
      const prevE = new Date(e);
      prevE.setDate(e.getDate() - diffDays);
      
      return { prevStart: formatDate(prevS), prevEnd: formatDate(prevE) };
    };

    const { prevStart, prevEnd } = calculatePreviousPeriod(startDate, endDate);

    // 1. Fetch Historical Data (Current & Previous for Trends)
    const [historicalResponse] = await client.runReport({
      property: `properties/${PROPERTY_ID}`,
      dateRanges: [
        { startDate, endDate }, // Current
        { startDate: prevStart, endDate: prevEnd } // Previous
      ],
      dimensions: [{ name: "dateRange" }, { name: "date" }],
      metrics: [
        { name: "activeUsers" },
        { name: "eventCount" },
        { name: "newUsers" },
        { name: "conversions" },
        { name: "sessions" },
        { name: "averageSessionDuration" }
      ],
      orderBys: [{ dimension: { dimensionName: "date" }, desc: false }],
      metricAggregations: ['TOTAL'],
      dimensionFilter,
    });

    // 2. Fetch Detailed Realtime Data
    let realtimeData = { activeUsers: "0", topCountries: [] };
    try {
      const [realtimeResponse] = await client.runRealtimeReport({
        property: `properties/${PROPERTY_ID}`,
        dimensions: [{ name: "country" }],
        metrics: [{ name: "activeUsers" }],
        dimensionFilter,
      });
      
      // Get total from metricAggregations if possible, or sum rows
      if (realtimeResponse.rows && realtimeResponse.rows.length > 0) {
        realtimeData.activeUsers = realtimeResponse.rows.reduce((acc, row) => acc + (parseInt(row.metricValues?.[0]?.value) || 0), 0).toString();
        realtimeData.topCountries = realtimeResponse.rows.map(row => ({
          country: row.dimensionValues?.[0]?.value || "Unknown",
          count: parseInt(row.metricValues?.[0]?.value) || 0
        })).sort((a, b) => b.count - a.count).slice(0, 5);
      } else {
        // Fallback or explicit check for total if no rows (still could have active users if dimension filter hides them)
        // Note: For now, if rows are 0, we assume 0. But we add safety for undefined metricValues.
        realtimeData.activeUsers = "0";
      }
    } catch (realtimeErr) {
      console.warn("⚠️ GA Realtime API Warn:", realtimeErr.message);
    }

    // Format historical data
    const rows = historicalResponse.rows || [];
    // We only want the current period (date_range_0) for the chart
    const formattedData = rows
      .filter(row => row.dimensionValues[0].value === 'date_range_0')
      .map(row => ({
        date: row.dimensionValues[1].value,
        activeUsers: parseInt(row.metricValues[0].value),
        eventCount: parseInt(row.metricValues[1].value),
        newUsers: parseInt(row.metricValues[2].value),
        keyEvents: parseInt(row.metricValues[3].value),
        sessions: parseInt(row.metricValues[4].value),
      }));

    // Calculate totals and trends
    const getTrend = (curr, prev) => {
      if (!prev || prev === 0) return 0;
      return parseFloat((((curr - prev) / prev) * 100).toFixed(1));
    };

    let totals = {};
    let trends = {};

    if (historicalResponse.totals && historicalResponse.totals.length >= 2) {
      const t0 = historicalResponse.totals[0].metricValues;
      const t1 = historicalResponse.totals[1].metricValues;

      totals = {
        activeUsers: t0[0].value,
        eventCount: t0[1].value,
        newUsers: t0[2].value,
        keyEvents: t0[3].value,
        sessions: t0[4].value,
        avgDuration: parseFloat(t0[5].value).toFixed(2)
      };

      trends = {
        activeUsers: getTrend(parseInt(t0[0].value), parseInt(t1[0].value)),
        eventCount: getTrend(parseInt(t0[1].value), parseInt(t1[1].value)),
        newUsers: getTrend(parseInt(t0[2].value), parseInt(t1[2].value)),
        keyEvents: getTrend(parseInt(t0[3].value), parseInt(t1[3].value)),
      };
    }

    res.json({
      success: true,
      data: formattedData,
      totals,
      trends,
      realtime: realtimeData,
      isRealtime: realtimeData.activeUsers !== "0"
    });

  } catch (error) {
    console.error("❌ Google Analytics API Error:", error);
    // Use a local path for logging on Windows
    try {
      const fs = require('fs');
      const logMessage = `[${new Date().toISOString()}] /api/analytics error: ${error.message}\nStack: ${error.stack}\nQuery: ${JSON.stringify(req.query)}\nUser: ${JSON.stringify(req.user)}\n---\n`;
      fs.appendFileSync('analytics_error.log', logMessage);
    } catch (e) {
      console.error("Failed to write to log file:", e.message);
    }

    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch analytics data",
      message: error.message 
    });
  }
});

/**
 * @route GET /api/analytics/summary
 * @desc Fetch summary GA4 data for all partners (Admin only)
 */
router.get("/summary", userAuthentication, adminAuthentication, async (req, res) => {
  try {
    // Strictly restrict to admin role for the summary
    if (req.user.role?.toLowerCase() !== 'admin') {
      return res.status(403).json({ success: false, message: "Only admins can view the partnership summary" });
    }

    const range = req.query.range || "last30Days";
    const { startDate, endDate } = getDateRange(range, req.query.startDate, req.query.endDate);

    const [response] = await client.runReport({
      property: `properties/${PROPERTY_ID}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "pagePath" }],
      metrics: [
        { name: "activeUsers" },
        { name: "eventCount" },
        { name: "newUsers" },
        { name: "conversions" }
      ],
      dimensionFilter: {
        filter: {
          fieldName: "pagePath",
          stringFilter: {
            matchType: "BEGINS_WITH",
            value: "/partnership/",
          },
        },
      },
    });

    const rows = response.rows || [];
    const summary = rows.map(row => {
      const path = row.dimensionValues[0].value;
      const parts = path.split('/').filter(Boolean);
      const param = parts.length >= 2 ? parts[1].split('?')[0] : null;

      if (!param || param === 'undefined') return null;

      return {
        param,
        path,
        activeUsers: parseInt(row.metricValues[0].value),
        eventCount: parseInt(row.metricValues[1].value),
        newUsers: parseInt(row.metricValues[2].value),
        keyEvents: parseInt(row.metricValues[3].value)
      };
    }).filter(Boolean);

    const aggregatedSummary = summary.reduce((acc, curr) => {
      if (!acc[curr.param]) {
        acc[curr.param] = { 
          param: curr.param, 
          activeUsers: 0, 
          eventCount: 0, 
          newUsers: 0, 
          keyEvents: 0 
        };
      }
      acc[curr.param].activeUsers += curr.activeUsers;
      acc[curr.param].eventCount += curr.eventCount;
      acc[curr.param].newUsers += curr.newUsers;
      acc[curr.param].keyEvents += curr.keyEvents;
      return acc;
    }, {});

    res.json({
      success: true,
      data: Object.values(aggregatedSummary)
    });

  } catch (error) {
    console.error("❌ Google Analytics Summary API Error:", error);
    try {
      const fs = require('fs');
      const logMessage = `[${new Date().toISOString()}] /api/analytics/summary error: ${error.message}\nStack: ${error.stack}\n---\n`;
      fs.appendFileSync('analytics_error.log', logMessage);
    } catch (e) {
      console.error("Failed to write to log file:", e.message);
    }
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch analytics summary",
      message: error.message 
    });
  }
});

module.exports = router;



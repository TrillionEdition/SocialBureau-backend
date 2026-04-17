const { google } = require("googleapis");
const { v4: uuidv4 } = require("uuid");

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/calendar",
];

const privateKey = process.env.GOOGLE_PRIVATE_KEY
  ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n").replace(/^"|"$/g, "")
  : null;

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: privateKey,
  scopes: SCOPES,
});

const sheets = google.sheets({ version: "v4", auth });
const calendar = google.calendar({ version: "v3", auth });

/**
 * ✅ Append to Google Sheet
 */
const appendToSheet = async (data) => {
  try {
    if (!process.env.GOOGLE_SHEET_ID) return;

    const values = [[
      new Date().toLocaleString(),
      data.partnerName,
      data.userName,
      data.userEmail,
      data.selectedService,
      data.userDate,
      data.gmeetLink,
      data.partnerEmail,
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Sheet1!A:H",
      valueInputOption: "USER_ENTERED",
      resource: { values },
    });

    console.log("✅ Sheet updated");
  } catch (err) {
    console.error("❌ Sheet error:", err.message);
  }
};

/**
 * ✅ Create REAL Google Meet event
 */
const createCalendarEvent = async (data) => {
  try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.error("❌ Missing Google credentials");
      return "https://meet.google.com/new"; // safe fallback
    }

    const startTime = new Date(data.userDate);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

    const event = {
      summary: `Meeting with ${data.partnerName}`,
      description: `
Meeting with ${data.partnerName}

Client: ${data.userName} (${data.userEmail})
Service: ${data.selectedService}
Partner Email: ${data.partnerEmail}
      `,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: "Asia/Kolkata",
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: "Asia/Kolkata",
      },

      // ❗ IMPORTANT: Keep attendees empty if you don't want invites
      attendees: [],

      conferenceData: {
        createRequest: {
          requestId: uuidv4(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    };

    // STEP 1: Create event
    const response = await calendar.events.insert({
      calendarId: "primary",
      resource: event,
      conferenceDataVersion: 1,
    });

    const eventId = response.data.id;

    // STEP 2: Try to get Meet link
    let meetLink =
      response.data.hangoutLink ||
      response.data.conferenceData?.entryPoints?.[0]?.uri;

    // STEP 3: Retry fetch if missing (Google delay)
    if (!meetLink) {
      console.log("⏳ Waiting for Meet link...");
      await new Promise((r) => setTimeout(r, 2000));

      const refetch = await calendar.events.get({
        calendarId: "primary",
        eventId,
      });

      meetLink =
        refetch.data.hangoutLink ||
        refetch.data.conferenceData?.entryPoints?.[0]?.uri;
    }

    // STEP 4: Final validation
    if (!meetLink) {
      console.error("❌ Meet link not generated");
      return "https://meet.google.com/new"; // SAFE fallback
    }

    console.log("✅ REAL Meet link:", meetLink);
    return meetLink;

  } catch (error) {
    console.error("❌ Calendar error:", error.message);
    return "https://meet.google.com/new"; // SAFE fallback
  }
};

module.exports = {
  appendToSheet,
  createCalendarEvent,
};
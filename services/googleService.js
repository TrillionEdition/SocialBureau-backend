const { OAuth2Client, JWT } = require("google-auth-library");
const { sheets } = require("@googleapis/sheets");
const { calendar } = require("@googleapis/calendar");
const { v4: uuidv4 } = require("uuid");

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/calendar",
];

const privateKey = process.env.GOOGLE_PRIVATE_KEY
  ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n").replace(/^"|"$/g, "")
  : null;

// Initialize Auth
let auth;

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN) {
  auth = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });
  console.log("✅ Using OAuth2 for Google Services");
} else {
  auth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: SCOPES,
  });
  console.log("🤖 Using Service Account for Google Services");
}

const sheetsClient = sheets({ version: "v4", auth });
const calendarClient = calendar({ version: "v3", auth });
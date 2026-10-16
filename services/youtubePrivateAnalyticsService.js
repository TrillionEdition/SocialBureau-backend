const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");

const ANALYTICS_SCOPE = "https://www.googleapis.com/auth/yt-analytics.readonly";
const CHANNEL_READ_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";
const OAUTH_SCOPES = [ANALYTICS_SCOPE, CHANNEL_READ_SCOPE];
const METRICS = ["views", "estimatedMinutesWatched", "averageViewDuration", "subscribersGained", "subscribersLost"];

function getOAuthConfiguration() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL) throw new Error("youtube_oauth_not_configured");
  return { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET, redirectUri: GOOGLE_CALLBACK_URL };
}

function createOAuthClient() {
  const { clientId, clientSecret, redirectUri } = getOAuthConfiguration();
  return new OAuth2Client(clientId, clientSecret, redirectUri);
}

function getEncryptionKey() {
  const value = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || "";
  if (!/^[\da-fA-F]{64}$/.test(value)) throw new Error("youtube_token_encryption_not_configured");
  return Buffer.from(value, "hex");
}

function encryptRefreshToken(refreshToken) {
  if (!refreshToken) throw new Error("youtube_refresh_token_missing");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(refreshToken, "utf8"), cipher.final()]);
  return { ciphertext: ciphertext.toString("base64"), iv: iv.toString("base64"), authTag: cipher.getAuthTag().toString("base64") };
}

function decryptRefreshToken({ ciphertext, iv, authTag }) {
  const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]).toString("utf8");
}

function buildAuthorizationUrl(client, state) {
  return client.generateAuthUrl({
    access_type: "offline",
    include_granted_scopes: false,
    prompt: "consent",
    scope: OAUTH_SCOPES,
    state,
  });
}

async function verifyGoogleAuthorization(client, tokens, expectedChannelId, expectedVideoId) {
  if (!tokens.access_token) throw new Error("youtube_access_token_missing");
  client.setCredentials(tokens);
  const tokenInfo = await client.getTokenInfo(tokens.access_token);
  const grantedScopes = new Set(tokenInfo.scopes || []);
  if (!OAUTH_SCOPES.every((scope) => grantedScopes.has(scope))) throw new Error("youtube_required_scope_missing");

  let pageToken;
  let authorizedChannel;
  do {
    const channels = await client.request({
      url: "https://youtube.googleapis.com/youtube/v3/channels",
      params: { part: "id,snippet", mine: true, maxResults: 50, ...(pageToken ? { pageToken } : {}) },
    });
    authorizedChannel = (channels.data.items || []).find((channel) => channel.id === expectedChannelId);
    pageToken = channels.data.nextPageToken;
  } while (!authorizedChannel && pageToken);
  if (!authorizedChannel) throw new Error("youtube_channel_mismatch");
  const videos = await client.request({
    url: "https://youtube.googleapis.com/youtube/v3/videos",
    params: { part: "snippet", id: expectedVideoId },
  });
  const authorizedVideo = (videos.data.items || []).find((video) => video.id === expectedVideoId && video.snippet?.channelId === expectedChannelId);
  if (!authorizedVideo) throw new Error("youtube_video_mismatch");
  return { channelId: authorizedChannel.id, channelName: authorizedChannel.snippet?.title || "" };
}

function metricValue(row, index) {
  if (index < 0 || row[index] === null || row[index] === undefined || row[index] === "") return null;
  const value = Number(row[index]);
  return Number.isFinite(value) ? value : null;
}

function mapAnalyticsReport(report) {
  const headers = (report.columnHeaders || []).map((header) => header.name);
  const valueFor = (row, name) => metricValue(row, headers.indexOf(name));
  const rows = (report.rows || []).map((row) => ({
    day: String(row[headers.indexOf("day")]),
    views: valueFor(row, "views"),
    estimatedMinutesWatched: valueFor(row, "estimatedMinutesWatched"),
    averageViewDuration: valueFor(row, "averageViewDuration"),
    subscribersGained: valueFor(row, "subscribersGained"),
    subscribersLost: valueFor(row, "subscribersLost"),
  }));
  const sumMetric = (name) => {
    const values = rows.map((row) => row[name]).filter((value) => value !== null);
    return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
  };
  const views = sumMetric("views");
  const estimatedMinutesWatched = sumMetric("estimatedMinutesWatched");
  return {
    rows,
    views,
    estimatedMinutesWatched,
    averageViewDuration: views > 0 && estimatedMinutesWatched !== null ? estimatedMinutesWatched * 60 / views : null,
    subscribersGained: sumMetric("subscribersGained"),
    subscribersLost: sumMetric("subscribersLost"),
  };
}

async function fetchChannelAnalytics(client, startDate, endDate, videoId) {
  await client.getAccessToken();
  const response = await client.request({
    url: "https://youtubeanalytics.googleapis.com/v2/reports",
    params: {
      ids: "channel==MINE",
      startDate,
      endDate,
      metrics: METRICS.join(","),
      dimensions: "day",
      filters: `video==${videoId}`,
      sort: "day",
    },
  });
  return mapAnalyticsReport(response.data);
}

function isInvalidGrant(error) {
  return error?.response?.data?.error === "invalid_grant" || /invalid_grant/i.test(String(error?.message || ""));
}

module.exports = {
  ANALYTICS_SCOPE,
  CHANNEL_READ_SCOPE,
  OAUTH_SCOPES,
  METRICS,
  buildAuthorizationUrl,
  createOAuthClient,
  decryptRefreshToken,
  encryptRefreshToken,
  fetchChannelAnalytics,
  getEncryptionKey,
  isInvalidGrant,
  mapAnalyticsReport,
  verifyGoogleAuthorization,
};
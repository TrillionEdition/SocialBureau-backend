const crypto = require("crypto");
const Campaign = require("../models/Campaign");
const YouTubeConnection = require("../models/YouTubeConnection");
const YouTubeOAuthState = require("../models/YouTubeOAuthState");
const { extractYoutubeVideoId } = require("../services/youtubeAnalyticsService");
const {
  buildAuthorizationUrl,
  createOAuthClient,
  decryptRefreshToken,
  encryptRefreshToken,
  fetchChannelAnalytics,
  getEncryptionKey,
  isInvalidGrant,
  verifyGoogleAuthorization,
} = require("../services/youtubePrivateAnalyticsService");

const today = () => new Date().toISOString().slice(0, 10);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function ownershipQuery(user, campaignId) {
  const identifier = Campaign.db.base.isValidObjectId(campaignId) ? { _id: campaignId } : { bookingId: campaignId };
  const ownerClauses = [{ clientId: user.id }];
  if (user.email) ownerClauses.push({ clientId: null, clientEmail: user.email.toLowerCase().trim() });
  return { ...identifier, $or: ownerClauses };
}

async function ownedCampaign(user, campaignId) {
  return Campaign.findOne(ownershipQuery(user, campaignId));
}

function redirectToCampaign(campaignId, outcome) {
  const origin = process.env.FRONTEND_URL || "http://localhost:5173";
  const path = campaignId ? `/client/campaigns/${encodeURIComponent(campaignId)}/analytics` : "/client-dashboard";
  const target = new URL(path, origin);
  target.searchParams.set("youtube", outcome);
  return target.toString();
}

function safeOAuthReason(error) {
  if (["youtube_oauth_not_configured", "youtube_token_encryption_not_configured"].includes(error.message)) return "configuration";
  if (error.message === "youtube_channel_mismatch") return "channel_mismatch";
  if (error.message === "youtube_video_mismatch") return "video_mismatch";
  if (error.message === "youtube_refresh_token_missing") return "refresh_token_missing";
  if (error.message === "youtube_required_scope_missing") return "scope_missing";
  return "connection_failed";
}

exports.startOAuth = async (req, res) => {
  try {
    getEncryptionKey();
    const campaign = await ownedCampaign(req.user, req.params.campaignId);
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });
    if (!campaign.channelId) return res.status(409).json({ message: "This campaign has no YouTube channel ID to verify." });

    const state = crypto.randomBytes(32).toString("base64url");
    await YouTubeOAuthState.create({
      stateHash: crypto.createHash("sha256").update(state).digest("hex"),
      userId: req.user.id,
      clientEmail: req.user.email || "",
      campaignId: campaign._id,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    return res.redirect(buildAuthorizationUrl(createOAuthClient(), state));
  } catch (error) {
    return res.redirect(redirectToCampaign(req.params.campaignId, safeOAuthReason(error)));
  }
};

exports.oauthCallback = async (req, res) => {
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const stateHash = crypto.createHash("sha256").update(state).digest("hex");
  const oauthState = state ? await YouTubeOAuthState.findOneAndDelete({ stateHash, expiresAt: { $gt: new Date() } }) : null;
  const campaignId = oauthState ? String(oauthState.campaignId) : null;
  if (!oauthState) return res.redirect(redirectToCampaign(null, "invalid_state"));
  if (req.query.error || typeof req.query.code !== "string") return res.redirect(redirectToCampaign(campaignId, "authorization_denied"));

  try {
    const callbackOwner = { id: oauthState.userId, email: oauthState.clientEmail };
    const campaign = await Campaign.findOne(ownershipQuery(callbackOwner, String(oauthState.campaignId)));
    if (!campaign) return res.redirect(redirectToCampaign(campaignId, "campaign_unavailable"));
    getEncryptionKey();
    const client = createOAuthClient();
    const { tokens } = await client.getToken(req.query.code);
    const videoId = extractYoutubeVideoId(campaign.channelUrl);
    if (!videoId) throw new Error("youtube_video_mismatch");
    const verifiedChannel = await verifyGoogleAuthorization(client, tokens, campaign.channelId, videoId);
    const priorConnection = await YouTubeConnection.findOne({ userId: oauthState.userId, channelId: campaign.channelId })
      .select("+refreshTokenCiphertext +refreshTokenIv +refreshTokenAuthTag");
    const encrypted = tokens.refresh_token
      ? encryptRefreshToken(tokens.refresh_token)
      : priorConnection && {
        ciphertext: priorConnection.refreshTokenCiphertext,
        iv: priorConnection.refreshTokenIv,
        authTag: priorConnection.refreshTokenAuthTag,
      };
    if (!encrypted) return res.redirect(redirectToCampaign(campaignId, "refresh_token_missing"));

    await YouTubeConnection.findOneAndUpdate(
      { userId: oauthState.userId, channelId: verifiedChannel.channelId },
      { $set: {
        channelName: verifiedChannel.channelName,
        refreshTokenCiphertext: encrypted.ciphertext,
        refreshTokenIv: encrypted.iv,
        refreshTokenAuthTag: encrypted.authTag,
        connectedAt: new Date(),
      } },
      { upsert: true, new: true, runValidators: true },
    );
    await Campaign.updateMany({ clientId: oauthState.userId, channelId: campaign.channelId }, { $unset: { youtubePrivateAnalyticsCache: 1 } });
    return res.redirect(redirectToCampaign(campaignId, "connected"));
  } catch (error) {
    return res.redirect(redirectToCampaign(campaignId, safeOAuthReason(error)));
  }
};

exports.disconnect = async (req, res) => {
  const campaign = await ownedCampaign(req.user, req.params.campaignId);
  if (!campaign) return res.status(404).json({ message: "Campaign not found" });
  const connection = await YouTubeConnection.findOne({ userId: req.user.id, channelId: campaign.channelId })
    .select("+refreshTokenCiphertext +refreshTokenIv +refreshTokenAuthTag");
  if (connection) {
    try {
      const refreshToken = decryptRefreshToken({
        ciphertext: connection.refreshTokenCiphertext,
        iv: connection.refreshTokenIv,
        authTag: connection.refreshTokenAuthTag,
      });
      await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: refreshToken }),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // Local credentials are removed even if Google's revocation endpoint is unavailable.
    }
    await YouTubeConnection.deleteOne({ _id: connection._id, userId: req.user.id });
  }
  await Campaign.updateMany({ clientId: req.user.id, channelId: campaign.channelId }, { $unset: { youtubePrivateAnalyticsCache: 1 } });
  return res.json({ connected: false });
};

exports.getPrivateAnalytics = async (req, res) => {
  const campaign = await ownedCampaign(req.user, req.params.campaignId);
  if (!campaign) return res.status(404).json({ message: "Campaign not found" });
  const connection = await YouTubeConnection.findOne({ userId: req.user.id, channelId: campaign.channelId })
    .select("+refreshTokenCiphertext +refreshTokenIv +refreshTokenAuthTag");
  if (!connection) return res.json({ connected: false, status: "disconnected", metrics: null, rows: [], message: "Connect the Google account that owns this YouTube channel to view private analytics." });

  const currentDate = today();
  const campaignStart = new Date(campaign.campaignStartAt).toISOString().slice(0, 10);
  if (campaignStart > currentDate) return res.json({ connected: true, channelName: connection.channelName, status: "empty", metrics: null, rows: [], lastUpdatedAt: null, message: "Private analytics will be available after the campaign starts." });
  const startDate = req.query.startDate || campaignStart;
  const endDate = req.query.endDate || currentDate;
  const parsedStart = new Date(`${startDate}T00:00:00.000Z`);
  const parsedEnd = new Date(`${endDate}T00:00:00.000Z`);
  const dayCount = (parsedEnd.getTime() - parsedStart.getTime()) / 86400000;
  if (!datePattern.test(startDate) || !datePattern.test(endDate)
    || !Number.isFinite(parsedStart.getTime()) || !Number.isFinite(parsedEnd.getTime())
    || parsedStart.toISOString().slice(0, 10) !== startDate || parsedEnd.toISOString().slice(0, 10) !== endDate
    || startDate < campaignStart || endDate > currentDate || dayCount < 0 || dayCount > 365) {
    return res.status(400).json({ connected: true, message: "Choose a date range from the campaign start through today, no longer than 366 days." });
  }
  const cache = campaign.youtubePrivateAnalyticsCache;
  const cacheMatches = cache?.channelId === campaign.channelId && cache.startDate === startDate && cache.endDate === endDate;
  if (cacheMatches && Date.now() - new Date(cache.fetchedAt).getTime() < 30 * 60 * 1000 && req.query.refresh !== "1") {
    return res.json(privateAnalyticsResponse(connection, cache, "available"));
  }

  try {
    const client = createOAuthClient();
    client.setCredentials({ refresh_token: decryptRefreshToken({
      ciphertext: connection.refreshTokenCiphertext,
      iv: connection.refreshTokenIv,
      authTag: connection.refreshTokenAuthTag,
    }) });
    const videoId = extractYoutubeVideoId(campaign.channelUrl);
    if (!videoId) return res.json({ connected: true, channelName: connection.channelName, status: "unavailable", metrics: null, rows: [], lastUpdatedAt: null, message: "This campaign does not contain a valid YouTube video URL." });
    const report = await fetchChannelAnalytics(client, startDate, endDate, videoId);
    const fetchedAt = new Date();
    campaign.youtubePrivateAnalyticsCache = { channelId: campaign.channelId, startDate, endDate, fetchedAt, ...report };
    await campaign.save();
    await YouTubeConnection.updateOne({ _id: connection._id }, { $set: { lastUsedAt: fetchedAt } });
    return res.json(privateAnalyticsResponse(connection, campaign.youtubePrivateAnalyticsCache, report.rows.length ? "available" : "empty"));
  } catch (error) {
    if (isInvalidGrant(error)) {
      await YouTubeConnection.deleteOne({ _id: connection._id, userId: req.user.id });
      return res.json({ connected: false, status: "disconnected", metrics: null, rows: [], message: "Google authorization expired or was revoked. Connect the channel again." });
    }
    const stale = cacheMatches ? cache : null;
    return res.status(502).json(stale
      ? privateAnalyticsResponse(connection, stale, "stale", "YouTube Analytics could not refresh. Showing the last saved result.")
      : { connected: true, channelName: connection.channelName, status: "error", metrics: null, rows: [], lastUpdatedAt: null, message: "YouTube Analytics is temporarily unavailable. Please try again later." });
  }
};

function privateAnalyticsResponse(connection, cache, status, message = null) {
  const { views, estimatedMinutesWatched, averageViewDuration, subscribersGained, subscribersLost } = cache;
  return {
    connected: true,
    channelName: connection.channelName,
    status,
    metrics: { views: views ?? null, estimatedMinutesWatched: estimatedMinutesWatched ?? null, averageViewDuration: averageViewDuration ?? null, subscribersGained: subscribersGained ?? null, subscribersLost: subscribersLost ?? null },
    rows: cache.rows || [],
    lastUpdatedAt: cache.fetchedAt,
    message: message || (status === "empty" ? "No private YouTube Analytics data is available for these dates." : null),
  };
}
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  ANALYTICS_SCOPE,
  CHANNEL_READ_SCOPE,
  OAUTH_SCOPES,
  decryptRefreshToken,
  encryptRefreshToken,
  mapAnalyticsReport,
  verifyGoogleAuthorization,
} = require("./youtubePrivateAnalyticsService");

test("requests Analytics read-only access and read-only channel verification", () => {
  assert.ok(OAUTH_SCOPES.includes(ANALYTICS_SCOPE));
  assert.ok(OAUTH_SCOPES.includes(CHANNEL_READ_SCOPE));
});

test("verifies the authorized channel and the booked video's channel", async () => {
  const client = {
    setCredentials() {},
    getTokenInfo: async () => ({ scopes: OAUTH_SCOPES }),
    request: async ({ url }) => url.endsWith("/channels")
      ? { data: { items: [{ id: "channel_123", snippet: { title: "Authorized channel" } }] } }
      : { data: { items: [{ id: "video_123", snippet: { channelId: "channel_123" } }] } },
  };
  const channel = await verifyGoogleAuthorization(client, { access_token: "test-access-token" }, "channel_123", "video_123");
  assert.deepEqual(channel, { channelId: "channel_123", channelName: "Authorized channel" });
  await assert.rejects(verifyGoogleAuthorization(client, { access_token: "test-access-token" }, "channel_123", "other_video"), /youtube_video_mismatch/);
});

test("encrypts refresh tokens with authenticated encryption", () => {
  const previousKey = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = "ab".repeat(32);
  try {
    const encrypted = encryptRefreshToken("refresh-token-secret");
    assert.notEqual(encrypted.ciphertext, "refresh-token-secret");
    assert.equal(decryptRefreshToken(encrypted), "refresh-token-secret");
    assert.throws(() => decryptRefreshToken({ ...encrypted, authTag: Buffer.alloc(16).toString("base64") }));
  } finally {
    if (previousKey === undefined) delete process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
    else process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = previousKey;
  }
});

test("maps real report columns while representing missing metrics as unavailable", () => {
  const result = mapAnalyticsReport({
    columnHeaders: ["day", "views", "estimatedMinutesWatched", "subscribersGained", "subscribersLost"].map((name) => ({ name })),
    rows: [["2026-10-14", 120, 240, 5, 1]],
  });
  assert.deepEqual(result, {
    rows: [{ day: "2026-10-14", views: 120, estimatedMinutesWatched: 240, averageViewDuration: null, subscribersGained: 5, subscribersLost: 1 }],
    views: 120,
    estimatedMinutesWatched: 240,
    averageViewDuration: 120,
    subscribersGained: 5,
    subscribersLost: 1,
  });
});
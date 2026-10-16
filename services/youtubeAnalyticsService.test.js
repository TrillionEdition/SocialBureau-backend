const test = require("node:test");
const assert = require("node:assert/strict");
const { extractYoutubeVideoId, fetchPublicVideoStatistics } = require("./youtubeAnalyticsService");

test("extracts a video ID from supported YouTube video URLs only", () => {
  assert.equal(extractYoutubeVideoId("https://www.youtube.com/watch?v=video_123"), "video_123");
  assert.equal(extractYoutubeVideoId("https://youtu.be/short-123"), "short-123");
  assert.equal(extractYoutubeVideoId("https://youtube.com/live/live_123"), "live_123");
  assert.equal(extractYoutubeVideoId("https://youtube.com/channel/UCvideo123"), null);
  assert.equal(extractYoutubeVideoId("https://example.com/watch?v=video_123"), null);
});

test("fetches actual public video counters with the server API key", async () => {
  let requestedUrl;
  const result = await fetchPublicVideoStatistics("video_123", {
    apiKey: "server-key",
    fetchImpl: async (url) => {
      requestedUrl = new URL(url);
      return { ok: true, json: async () => ({ items: [{ statistics: { viewCount: "1200", likeCount: "18", commentCount: "4" } }] }) };
    },
  });
  assert.equal(requestedUrl.searchParams.get("id"), "video_123");
  assert.equal(requestedUrl.searchParams.get("key"), "server-key");
  assert.deepEqual(result, { available: true, views: 1200, likes: 18, comments: 4 });
});

test("reports missing API credentials without returning fabricated data", async () => {
  const result = await fetchPublicVideoStatistics("video_123", { apiKey: "" });
  assert.deepEqual(result, { available: false, reason: "missing_api_key" });
});
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be", "www.youtu.be"]);

function extractYoutubeVideoId(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(url.protocol) || !YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) return null;
  const segments = url.pathname.split("/").filter(Boolean);
  let videoId = null;
  if (["youtu.be", "www.youtu.be"].includes(url.hostname.toLowerCase())) videoId = segments[0];
  else if (url.pathname === "/watch") videoId = url.searchParams.get("v");
  else if (["live", "shorts", "embed"].includes(segments[0])) videoId = segments[1];
  return videoId && /^[\w-]{6,}$/.test(videoId) ? videoId : null;
}

async function fetchPublicVideoStatistics(videoId, options = {}) {
  const apiKey = options.apiKey ?? process.env.YOUTUBE_DATA_API_KEY;
  if (!apiKey) return { available: false, reason: "missing_api_key" };
  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = new URL("https://www.googleapis.com/youtube/v3/videos");
  endpoint.search = new URLSearchParams({ part: "statistics", id: videoId, key: apiKey }).toString();
  const response = await fetchImpl(endpoint, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`YouTube Data API returned ${response.status}`);
  const payload = await response.json();
  const statistics = payload.items?.[0]?.statistics;
  if (!statistics) return { available: false, reason: "statistics_unavailable" };
  const count = (value) => /^\d+$/.test(String(value ?? "")) ? Number(value) : null;
  return {
    available: true,
    views: count(statistics.viewCount),
    likes: count(statistics.likeCount),
    comments: count(statistics.commentCount),
  };
}

module.exports = { extractYoutubeVideoId, fetchPublicVideoStatistics };
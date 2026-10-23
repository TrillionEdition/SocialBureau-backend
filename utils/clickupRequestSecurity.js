function isClickUpApiUrl(requestUrl, baseUrl) {
  if (typeof requestUrl !== "string" || !URL.canParse(requestUrl, baseUrl)) return false;
  const parsedUrl = new URL(requestUrl, baseUrl);
  return parsedUrl.protocol === "https:" && parsedUrl.hostname === "api.clickup.com";
}

module.exports = { isClickUpApiUrl };

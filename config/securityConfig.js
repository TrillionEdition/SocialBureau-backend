const allowedOrigins = Object.freeze([
  "https://www.socialbureau.in",
  "https://socialbureau.in",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
]);

function isAllowedOrigin(origin) {
  return !origin || allowedOrigins.includes(origin);
}

module.exports = { allowedOrigins, isAllowedOrigin };

const multer = require("multer");

// 50 MB per file — files never touch disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

/** Parse `1-3,5,7-9` into a 0-indexed list of pages, clamped to `total`. */
function parsePageRanges(ranges, total) {
  if (!ranges) return Array.from({ length: total }, (_, i) => i);
  const out = [];
  ranges
    .replace(/\s+/g, "")
    .split(",")
    .filter(Boolean)
    .forEach((part) => {
      let start;
      let end;
      if (part.includes("-")) {
        const [a, b] = part.split("-");
        start = parseInt(a, 10);
        end = parseInt(b, 10);
      } else {
        start = end = parseInt(part, 10);
      }
      if (Number.isNaN(start) || Number.isNaN(end)) return;
      for (let p = start; p <= end; p += 1) {
        if (p >= 1 && p <= total) out.push(p - 1);
      }
    });
  return out;
}

function sendBuffer(res, buffer, filename, mediaType) {
  res.setHeader("Content-Type", mediaType);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"`
  );
  res.send(buffer);
}

module.exports = { upload, parsePageRanges, sendBuffer };

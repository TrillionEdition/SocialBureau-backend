const express = require("express");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const pdfParse = require("pdf-parse");
const archiver = require("archiver");
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require("docx");
const mammoth = require("mammoth");

let pdfToImgPromise = null;
function loadPdfToImg() {
  if (!pdfToImgPromise) {
    pdfToImgPromise = import("pdf-to-img").then((m) => m.pdf);
  }
  return pdfToImgPromise;
}

const { upload, parsePageRanges, sendBuffer } = require("../utils/multerUtils");

const router = express.Router();

// ─── MERGE ────────────────────────────────────────────────────────────────
router.post("/merge", upload.array("files"), async (req, res, next) => {
  try {
    if (!req.files || req.files.length < 2) {
      return res.status(400).json({ message: "Upload at least 2 PDFs to merge" });
    }
    const out = await PDFDocument.create();
    for (const f of req.files) {
      const src = await PDFDocument.load(f.buffer);
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((p) => out.addPage(p));
    }
    const bytes = await out.save({ useObjectStreams: true });
    sendBuffer(res, Buffer.from(bytes), "merged.pdf", "application/pdf");
  } catch (err) {
    next(err);
  }
});

// ─── SPLIT ────────────────────────────────────────────────────────────────
router.post("/split", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "file required" });
    const src = await PDFDocument.load(req.file.buffer);
    const total = src.getPageCount();
    const ranges = (req.body.ranges || "").toString();
    const selected = ranges.trim()
      ? parsePageRanges(ranges, total)
      : Array.from({ length: total }, (_, i) => i);
    if (!selected.length) {
      return res.status(400).json({ message: "No valid pages selected" });
    }
    const out = await PDFDocument.create();
    const copied = await out.copyPages(src, selected);
    copied.forEach((p) => out.addPage(p));
    const bytes = await out.save({ useObjectStreams: true });
    sendBuffer(res, Buffer.from(bytes), "split.pdf", "application/pdf");
  } catch (err) {
    next(err);
  }
});

// ─── COMPRESS ─────────────────────────────────────────────────────────────
router.post("/compress", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "file required" });
    const src = await PDFDocument.load(req.file.buffer);
    const bytes = await src.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });
    sendBuffer(res, Buffer.from(bytes), "compressed.pdf", "application/pdf");
  } catch (err) {
    next(err);
  }
});

// ─── PDF → IMAGES (ZIP of PNGs) ───────────────────────────────────────────
router.post("/to-images", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "file required" });
    const dpi = Math.max(72, Math.min(300, Number(req.body.dpi) || 150));
    const scale = dpi / 72;

    const pdfLoader = await loadPdfToImg();
    const doc = await pdfLoader(req.file.buffer, { scale });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="pdf_pages.zip"'
    );
    const zip = archiver("zip", { zlib: { level: 9 } });
    zip.on("error", next);
    zip.pipe(res);
    let i = 0;
    for await (const page of doc) {
      i += 1;
      const name = `page_${String(i).padStart(3, "0")}.png`;
      zip.append(page, { name });
    }
    await zip.finalize();
  } catch (err) {
    next(err);
  }
});

// ─── PDF → TEXT (JSON) ────────────────────────────────────────────────────
router.post("/to-text", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "file required" });
    const result = await pdfParse(req.file.buffer);
    res.json({ text: result.text || "", pages: result.numpages || 0 });
  } catch (err) {
    next(err);
  }
});

// ─── IMAGES → PDF ─────────────────────────────────────────────────────────
router.post("/from-images", upload.array("files"), async (req, res, next) => {
  try {
    if (!req.files || !req.files.length) {
      return res.status(400).json({ message: "Upload at least 1 image" });
    }
    const out = await PDFDocument.create();
    for (const f of req.files) {
      const mime = (f.mimetype || "").toLowerCase();
      const embed =
        mime.includes("jpeg") || mime.includes("jpg")
          ? await out.embedJpg(f.buffer)
          : await out.embedPng(f.buffer);
      const page = out.addPage([embed.width, embed.height]);
      page.drawImage(embed, {
        x: 0,
        y: 0,
        width: embed.width,
        height: embed.height,
      });
    }
    const bytes = await out.save();
    sendBuffer(res, Buffer.from(bytes), "from_images.pdf", "application/pdf");
  } catch (err) {
    next(err);
  }
});

// ─── PDF → WORD (.docx) ───────────────────────────────────────────────────
router.post("/to-word", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "file required" });
    const { text = "" } = await pdfParse(req.file.buffer);

    const paragraphs = text
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map(
        (line) =>
          new Paragraph({
            children: [new TextRun({ text: line })],
          })
      );

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: "Converted from PDF",
              heading: HeadingLevel.HEADING_1,
            }),
            ...paragraphs,
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    sendBuffer(
      res,
      buffer,
      "converted.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
  } catch (err) {
    next(err);
  }
});

// Helper to sanitize Unicode characters for standard PDF WinAnsi font support
function sanitizeWinAnsi(str) {
  if (!str) return "";
  let clean = str
    .replace(/₹/g, "Rs.")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, "-");
  
  let result = "";
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const code = char.charCodeAt(0);
    
    if (code >= 32 && code <= 126) {
      result += char;
    } else if (code === 10 || code === 13 || code === 9) {
      result += char;
    } else if (code >= 160 && code <= 255) {
      result += char;
    } else {
      if (code === 8364) result += "€";
      else if (code === 338) result += "Œ";
      else if (code === 339) result += "œ";
      else if (code === 352) result += "Š";
      else if (code === 353) result += "š";
      else if (code === 376) result += "Ÿ";
      else if (code === 381) result += "Ž";
      else if (code === 382) result += "ž";
      else if (code === 402) result += "ƒ";
    }
  }
  return result;
}

// ─── WORD → PDF ───────────────────────────────────────────────────────────
router.post("/from-word", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "file required" });
    
    // Extract raw text from docx and sanitize for WinAnsi encoding
    const parsed = await mammoth.extractRawText({ buffer: req.file.buffer });
    const text = sanitizeWinAnsi(parsed.value || "");
 
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 10;
    const margin = 50;
    
    const lines = text.split(/\r?\n/);
    let page = pdfDoc.addPage();
    let { width, height } = page.getSize();
    let y = height - margin;
 
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        y -= 15;
        if (y < margin) {
          page = pdfDoc.addPage();
          y = height - margin;
        }
        continue;
      }
 
      // Simple word-wrapping to prevent text overflow past page width
      const maxWidth = width - (margin * 2);
      const words = trimmed.split(/\s+/);
      let currentLine = "";
 
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);
        if (testWidth > maxWidth && currentLine) {
          page.drawText(currentLine, {
            x: margin,
            y: y,
            size: fontSize,
            font,
            color: rgb(0.1, 0.1, 0.1)
          });
          y -= 15;
          if (y < margin) {
            page = pdfDoc.addPage();
            y = height - margin;
          }
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
 
      if (currentLine) {
        page.drawText(currentLine, {
          x: margin,
          y: y,
          size: fontSize,
          font,
          color: rgb(0.1, 0.1, 0.1)
        });
        y -= 15;
        if (y < margin) {
          page = pdfDoc.addPage();
          y = height - margin;
        }
      }
    }
 
    const bytes = await pdfDoc.save();
    sendBuffer(res, Buffer.from(bytes), "converted.pdf", "application/pdf");
  } catch (err) {
    next(err);
  }
});

module.exports = router;

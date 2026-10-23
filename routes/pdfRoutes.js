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

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const promisify = require("util").promisify;
const execPromise = promisify(exec);
const fsPromises = fs.promises;

// Find LibreOffice binary path
function getLibreOfficePath() {
  if (process.platform === "win32") {
    const paths = [
      "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
      "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe"
    ];
    for (const p of paths) {
      if (fs.existsSync(p)) return `"${p}"`;
    }
    return "soffice"; // Fallback to system PATH
  }
  return "soffice"; // On Linux/macOS, it's usually in PATH
}

async function convertWithLibreOffice(fileBuffer, inputExt, outputExt, inFilter = null) {
  const soffice = getLibreOfficePath();
  const tempDir = path.join(__dirname, "..", "temp");
  
  // Ensure temp directory exists
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const rand = Math.random().toString(36).substring(7);
  const inputFileName = `temp_${rand}.${inputExt}`;
  const inputFilePath = path.join(tempDir, inputFileName);
  
  // Write input buffer to temp file
  await fsPromises.writeFile(inputFilePath, fileBuffer);

  try {
    // Execute headless LibreOffice conversion
    const filterArg = inFilter ? `--infilter="${inFilter}"` : "";
    const cmd = `${soffice} --headless ${filterArg} --convert-to ${outputExt} --outdir "${tempDir}" "${inputFilePath}"`;
    
    await execPromise(cmd);

    const outputFileName = `temp_${rand}.${outputExt}`;
    const outputFilePath = path.join(tempDir, outputFileName);

    if (!fs.existsSync(outputFilePath)) {
      throw new Error("Conversion failed. Output file was not created by LibreOffice.");
    }

    const outputBuffer = await fsPromises.readFile(outputFilePath);

    // Clean up temp files in background
    fsPromises.unlink(inputFilePath).catch(() => {});
    fsPromises.unlink(outputFilePath).catch(() => {});

    return outputBuffer;
  } catch (err) {
    // Clean up input file in case of error
    fsPromises.unlink(inputFilePath).catch(() => {});
    throw new Error(
      `LibreOffice conversion failed. Please make sure LibreOffice is installed. Error: ${err.message}`
    );
  }
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
    
    try {
      const buffer = await convertWithLibreOffice(req.file.buffer, "pdf", "docx", "writer_pdf_import");
      sendBuffer(
        res,
        buffer,
        "converted.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
    } catch (err) {
      console.error("LibreOffice conversion failed, falling back to basic text extractor:", err);
      try {
        const data = await pdfParse(req.file.buffer);
        const lines = data.text.split("\n");
        const paragraphs = lines.map(line => {
          return new Paragraph({
            children: [new TextRun({ text: line, size: 22 })],
          });
        });
        const doc = new Document({
          sections: [{
            properties: {},
            children: paragraphs
          }]
        });
        const docxBuffer = await Packer.toBuffer(doc);
        sendBuffer(
          res,
          docxBuffer,
          "converted.docx",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        );
      } catch (fallbackErr) {
        console.error("Fallback PDF to Word conversion failed:", fallbackErr);
        return res.status(500).json({ 
          message: "Conversion failed. High-fidelity conversion requires LibreOffice to be installed on the server/machine." 
        });
      }
    }
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
    
    try {
      const buffer = await convertWithLibreOffice(req.file.buffer, "docx", "pdf");
      sendBuffer(res, buffer, "converted.pdf", "application/pdf");
    } catch (err) {
      console.error("LibreOffice conversion failed, falling back to basic PDF generator:", err);
      try {
        const data = await mammoth.extractRawText({ buffer: req.file.buffer });
        const text = data.value || "";
        const lines = text.split("\n");
        
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        
        let page = pdfDoc.addPage([595.28, 841.89]); // A4
        const { width, height } = page.getSize();
        let y = height - 50;
        const margin = 50;
        const fontSize = 10;
        const lineHeight = 14;
        
        for (const line of lines) {
          if (y < margin + 20) {
            page = pdfDoc.addPage([595.28, 841.89]);
            y = height - 50;
          }
          const cleanLine = sanitizeWinAnsi(line.trim());
          if (cleanLine) {
            page.drawText(cleanLine, {
              x: margin,
              y: y,
              size: fontSize,
              font: font,
              color: rgb(0, 0, 0)
            });
          }
          y -= lineHeight;
        }
        
        const pdfBytes = await pdfDoc.save();
        sendBuffer(res, Buffer.from(pdfBytes), "converted.pdf", "application/pdf");
      } catch (fallbackErr) {
        console.error("Fallback Word to PDF conversion failed:", fallbackErr);
        return res.status(500).json({ 
          message: "Conversion failed. High-fidelity conversion requires LibreOffice to be installed on the server/machine." 
        });
      }
    }
  } catch (err) {
    next(err);
  }
});

// ─── EDIT PDF ─────────────────────────────────────────────────────────────
router.post("/edit", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "file required" });
    const text = req.body.text || "";
    const x = Number(req.body.x) || 50;
    const y = Number(req.body.y) || 50;
    const pageNum = Math.max(1, Number(req.body.page) || 1);
    const fontSize = Number(req.body.fontSize) || 12;
    const colorName = req.body.color || "black";

    const src = await PDFDocument.load(req.file.buffer);
    const pageCount = src.getPageCount();
    if (pageNum > pageCount) {
      return res.status(400).json({ message: `Page number ${pageNum} exceeds PDF page count of ${pageCount}` });
    }

    const pages = src.getPages();
    const page = pages[pageNum - 1];

    const font = await src.embedFont(StandardFonts.Helvetica);
    
    // Determine color
    let color = rgb(0, 0, 0);
    if (colorName === "blue") color = rgb(0, 0, 1);
    else if (colorName === "red") color = rgb(1, 0, 0);
    else if (colorName === "green") color = rgb(0, 0.5, 0);
    else if (colorName.startsWith("#")) {
      const hex = colorName.replace("#", "");
      const r = (parseInt(hex.substring(0, 2), 16) || 0) / 255;
      const g = (parseInt(hex.substring(2, 4), 16) || 0) / 255;
      const b = (parseInt(hex.substring(4, 6), 16) || 0) / 255;
      color = rgb(r, g, b);
    }

    page.drawText(sanitizeWinAnsi(text), {
      x,
      y,
      size: fontSize,
      font,
      color,
    });

    const bytes = await src.save();
    sendBuffer(res, Buffer.from(bytes), "edited.pdf", "application/pdf");
  } catch (err) {
    next(err);
  }
});

// ─── SIGN PDF ─────────────────────────────────────────────────────────────
router.post("/sign", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "file required" });
    const signatureType = req.body.signatureType || "text";
    const signatureData = req.body.signatureData || "";
    const x = Number(req.body.x) || 50;
    const y = Number(req.body.y) || 50;
    const pageNum = Math.max(1, Number(req.body.page) || 1);
    
    const src = await PDFDocument.load(req.file.buffer);
    const pageCount = src.getPageCount();
    if (pageNum > pageCount) {
      return res.status(400).json({ message: `Page number ${pageNum} exceeds PDF page count of ${pageCount}` });
    }

    const pages = src.getPages();
    const page = pages[pageNum - 1];

    if (signatureType === "text") {
      const font = await src.embedFont(StandardFonts.HelveticaBoldOblique);
      const fontSize = Number(req.body.fontSize) || 20;
      const color = rgb(0.05, 0.05, 0.4); // Elegant signature blue
      page.drawText(sanitizeWinAnsi(signatureData), {
        x,
        y,
        size: fontSize,
        font,
        color,
      });
    } else {
      if (!signatureData) {
        return res.status(400).json({ message: "Signature image data is required" });
      }
      
      const cleanBase64 = signatureData.replace(/^data:image\/\w+;base64,/, "");
      const imgBuffer = Buffer.from(cleanBase64, "base64");
      
      let img;
      if (signatureData.includes("image/jpeg") || signatureData.includes("image/jpg")) {
        img = await src.embedJpg(imgBuffer);
      } else {
        img = await src.embedPng(imgBuffer);
      }
      
      const width = Number(req.body.width) || 120;
      const height = Number(req.body.height) || (img.height * (width / img.width)) || 40;
      
      page.drawImage(img, {
        x,
        y,
        width,
        height,
      });
    }

    const bytes = await src.save();
    sendBuffer(res, Buffer.from(bytes), "signed.pdf", "application/pdf");
  } catch (err) {
    next(err);
  }
});

module.exports = router;

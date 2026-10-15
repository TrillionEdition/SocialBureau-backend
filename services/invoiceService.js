const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const Invoice = require("../models/Invoice");
const sendMail = require("../utils/sendMail");

const money = (value, currency = "INR") => `${currency === "INR" ? "Rs." : currency} ${Number(value || 0).toFixed(2)}`;
const istDate = (value) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium" }).format(new Date(value));

const LOGOS = {
  socialBureau: "https://pub-dbc24446d37a40aeb1dfdd10992cd2d9.r2.dev/SB_sticker-02_1_k3ulwd.png",
  trillionEdition: "https://pub-7b4bafb3da7d4c758183e371fbae58c2.r2.dev/fa6dbee8-2117-40a6-a15b-c1bec5d21fad%20(1).png",
  razorpay: "https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/razorpay-icon.png",
};
const logoCache = new Map();

// Logos are optional: a failed download must never block invoice generation.
function loadLogo(url) {
  if (!logoCache.has(url)) {
    const promise = fetch(url, { signal: AbortSignal.timeout(5000) })
      .then((response) => (response.ok ? response.arrayBuffer() : null))
      .then((buffer) => (buffer ? Buffer.from(buffer) : null))
      .catch(() => null);
    logoCache.set(url, promise);
    promise.then((buffer) => { if (!buffer) logoCache.delete(url); });
  }
  return logoCache.get(url);
}

async function embedLogo(pdf, url) {
  const bytes = await loadLogo(url);
  if (!bytes) return null;
  try { return await pdf.embedPng(bytes); } catch { return pdf.embedJpg(bytes).catch(() => null); }
}

function buildDescription(campaign) {
  return `YouTube ${campaign.campaignType} campaign - ${Number(campaign.requestedViews).toLocaleString("en-IN")} views, ${campaign.durationMinutes} min (Booking ${campaign.bookingId})`;
}

// Idempotent: the unique razorpayPaymentId index guarantees one invoice per payment.
async function createInvoiceForCampaign(campaign) {
  if (!campaign.razorpayPaymentId || campaign.paymentStatus !== "paid") return null;
  const existing = await Invoice.findOne({ razorpayPaymentId: campaign.razorpayPaymentId });
  if (existing) return existing;

  const pricing = campaign.pricingBreakdown || {};
  let invoice;
  try {
    invoice = await Invoice.create({
      invoiceNumber: await Invoice.nextInvoiceNumber(),
      razorpayPaymentId: campaign.razorpayPaymentId,
      razorpayOrderId: campaign.razorpayOrderId,
      campaignId: campaign._id,
      bookingId: campaign.bookingId,
      clientId: campaign.clientId || null,
      clientName: campaign.clientName,
      clientEmail: campaign.clientEmail,
      description: buildDescription(campaign),
      baseAmount: pricing.baseAmount,
      gstRate: Number(process.env.CAMPAIGN_GST_RATE) || 18,
      gstAmount: pricing.campaignGst,
      processingFee: pricing.estimatedRazorpayFee,
      processingFeeGst: pricing.estimatedRazorpayFeeGst,
      total: pricing.total,
      currency: campaign.currency || "INR",
      issuedAt: campaign.paidAt || new Date(),
    });
  } catch (error) {
    if (error.code === 11000) return Invoice.findOne({ razorpayPaymentId: campaign.razorpayPaymentId });
    throw error;
  }
  await emailInvoice(invoice);
  return invoice;
}

function wrap(text, font, size, maxWidth) {
  const lines = [];
  let line = "";
  for (const word of String(text).split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > maxWidth && line) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

async function generateInvoicePdf(invoice) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.1, 0.1, 0.1);
  const muted = rgb(0.4, 0.4, 0.4);
  const text = (value, x, y, { size = 10, f = font, color = ink } = {}) => page.drawText(String(value), { x, y, size, font: f, color });
  const right = (value, y, opts = {}) => {
    const size = opts.size || 10;
    const f = opts.f || font;
    text(value, 545 - f.widthOfTextAtSize(String(value), size), y, opts);
  };

  const [sbLogo, trillionLogo, razorpayLogo] = await Promise.all([LOGOS.socialBureau, LOGOS.trillionEdition, LOGOS.razorpay].map((url) => embedLogo(pdf, url)));
  const drawLogo = (image, x, y, maxW, maxH) => {
    if (!image) return 0;
    const { width, height } = image.scaleToFit(maxW, maxH);
    page.drawImage(image, { x, y, width, height });
    return width;
  };

  const sbWidth = drawLogo(sbLogo, 50, 765, 50, 50);
  text("SocialBureau", 50 + (sbWidth ? sbWidth + 10 : 0), 780, { size: 20, f: bold });
  text("TAX INVOICE", 50 + (sbWidth ? sbWidth + 10 : 0), 758, { size: 10, color: muted });
  right(`Invoice ${invoice.invoiceNumber}`, 780, { size: 12, f: bold });
  right(`Date: ${istDate(invoice.issuedAt)}`, 762, { color: muted });

  text("Billed to", 50, 710, { color: muted });
  text(invoice.clientName, 50, 694, { f: bold, size: 12 });
  text(invoice.clientEmail, 50, 678);

  page.drawRectangle({ x: 50, y: 630, width: 495, height: 22, color: rgb(0.93, 0.93, 0.93) });
  text("Description", 58, 637, { f: bold });
  right("Amount", 637, { f: bold });
  let y = 612;
  for (const line of wrap(invoice.description, font, 10, 340)) { text(line, 58, y); y -= 14; }
  right(money(invoice.baseAmount, invoice.currency), 612);

  y = Math.min(y, 590) - 20;
  const rows = [
    [`GST (${invoice.gstRate}%)`, invoice.gstAmount],
    ["Payment processing fee", invoice.processingFee],
    ["GST on processing fee", invoice.processingFeeGst],
  ];
  for (const [label, value] of rows) { text(label, 320, y); right(money(value, invoice.currency), y); y -= 18; }
  page.drawLine({ start: { x: 320, y: y + 10 }, end: { x: 545, y: y + 10 }, thickness: 0.7, color: muted });
  y -= 8;
  text("Total paid", 320, y, { f: bold, size: 12 });
  right(money(invoice.total, invoice.currency), y, { f: bold, size: 12 });

  y -= 50;
  text("Payment details", 50, y, { color: muted });
  drawLogo(razorpayLogo, 130, y - 6, 18, 18);
  text(`Razorpay payment ID: ${invoice.razorpayPaymentId}`, 50, y - 16);
  text(`Razorpay order ID: ${invoice.razorpayOrderId}`, 50, y - 32);
  text(`Booking ID: ${invoice.bookingId}`, 50, y - 48);
  text("Powered by", 50, 110, { size: 8, color: muted });
  drawLogo(trillionLogo, 50, 70, 120, 34);
  text("This is a computer-generated invoice and does not require a signature.", 50, 50, { size: 8, color: muted });

  return Buffer.from(await pdf.save());
}

async function emailInvoice(invoice) {
  try {
    const pdf = await generateInvoicePdf(invoice);
    await sendMail.transporter.sendMail({
      from: `"SocialBureau" <${process.env.BREVO_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || process.env.MAIL_USER}>`,
      to: invoice.clientEmail,
      subject: `Invoice ${invoice.invoiceNumber} - SocialBureau`,
      html: `<p>Hi ${String(invoice.clientName).replace(/[<>&]/g, "")},</p><p>Thank you for your payment of ${money(invoice.total, invoice.currency)}. Your invoice <b>${invoice.invoiceNumber}</b> is attached.</p><p>SocialBureau</p>`,
      attachments: [{ filename: `${invoice.invoiceNumber}.pdf`, content: pdf, contentType: "application/pdf" }],
    });
    invoice.emailSentAt = new Date();
    await invoice.save();
  } catch (error) {
    console.error("Invoice email failed:", error.message);
  }
}

module.exports = { createInvoiceForCampaign, generateInvoicePdf };

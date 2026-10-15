const express = require("express");
const mongoose = require("mongoose");
const Invoice = require("../models/Invoice");
const userAuthentication = require("../middlewares/userAuthentication");
const { generateInvoicePdf } = require("../services/invoiceService");

const router = express.Router();

router.get("/", userAuthentication, async (req, res) => {
  const invoices = await Invoice.find({ clientId: req.user.id }).sort({ issuedAt: -1 }).limit(200);
  res.json({ invoices });
});

router.get("/:id/pdf", userAuthentication, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Invoice not found" });
  // Scoping by clientId means other clients' invoices return 404.
  const invoice = await Invoice.findOne({ _id: req.params.id, clientId: req.user.id });
  if (!invoice) return res.status(404).json({ message: "Invoice not found" });
  const pdf = await generateInvoicePdf(invoice);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${invoice.invoiceNumber}.pdf"`);
  res.send(pdf);
});

module.exports = router;

const test = require("node:test");
const assert = require("node:assert/strict");
const { generateInvoicePdf } = require("./invoiceService");

test("generates a PDF invoice", async () => {
  const pdf = await generateInvoicePdf({
    invoiceNumber: "SB-INV-2026-000001", issuedAt: new Date(), clientName: "Client", clientEmail: "c@example.com",
    description: "YouTube Basic campaign", baseAmount: 350, gstRate: 18, gstAmount: 63, processingFee: 12.39,
    processingFeeGst: 2.23, total: 427.62, currency: "INR", razorpayPaymentId: "pay_1", razorpayOrderId: "order_1", bookingId: "SBYT-1",
  });
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
});

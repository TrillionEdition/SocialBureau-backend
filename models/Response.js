const mongoose = require("mongoose");

const ResponseSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    formId: { type: String, required: true },
    formTitle: String,
    slug: String,
    data: Object,
    submittedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.models.Response || mongoose.model("Response", ResponseSchema);

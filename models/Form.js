const mongoose = require("mongoose");

const FormSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    slug: { type: String, required: true, index: true, unique: true },
    title: String,
    description: String,
    questions: Array,
    createdAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.models.Form || mongoose.model("Form", FormSchema);

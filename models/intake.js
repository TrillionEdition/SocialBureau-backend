const mongoose = require("mongoose");
const IntakeSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
module.exports = mongoose.model("Intake", IntakeSchema);

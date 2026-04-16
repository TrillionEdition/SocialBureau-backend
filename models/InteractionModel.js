// models/Interaction.js
const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema({
  client_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClientForm'
  },
  interaction_type: String,
  title: String,
  notes: String,
  interaction_date: Date,
  performed_by: String
}, { timestamps: true });

module.exports = mongoose.model('Interaction', interactionSchema);
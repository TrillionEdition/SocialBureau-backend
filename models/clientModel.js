// models/Client.js
const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: String,

  company_name: String,
  industry: String,
  website_url: String,

  current_marketing_description: String,
  monthly_budget_range: String,
  timeline_to_start: String,

  status: {
    type: String,
    enum: [
      'intake',
      'qualified',
      'proposal_sent',
      'negotiating',
      'closed_won',
      'closed_lost'
    ],
    default: 'intake'
  },

  social_links: [
    {
      link_type: String,
      url: String,
      verified: { type: Boolean, default: false }
    }
  ],

  goals: [String],
  channels: [String],

  clickup_task_id: String,

  assigned_to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }

}, { timestamps: true });

module.exports = mongoose.model('ClientForm', clientSchema);
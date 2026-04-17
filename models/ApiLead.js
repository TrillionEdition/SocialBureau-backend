const mongoose = require('mongoose');

const apiLeadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  businessName: String,
  category: String,
  monthlySpend: String,
  challenge: String,
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'proposal', 'closed'],
    default: 'new'
  }
}, { timestamps: true });

module.exports = mongoose.model('ApiLead', apiLeadSchema);

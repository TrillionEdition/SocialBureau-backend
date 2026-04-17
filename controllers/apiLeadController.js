const ApiLead = require('../models/ApiLead');

exports.createLead = async (req, res) => {
  try {
    const lead = new ApiLead(req.body);
    await lead.save();
    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.getAllLeads = async (req, res) => {
  try {
    const leads = await ApiLead.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: leads.length, data: leads });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateLeadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const lead = await ApiLead.findByIdAndUpdate(id, { status }, { new: true });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.status(200).json({ success: true, data: lead });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.deleteLead = async (req, res) => {
  try {
    const { id } = req.params;
    await ApiLead.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Lead deleted' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

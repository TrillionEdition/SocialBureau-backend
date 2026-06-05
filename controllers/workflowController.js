const asyncHandler = require('express-async-handler');
const WorkflowSubmission = require('../models/WorkflowSubmission');

// POST /workflow
const submitWorkflow = asyncHandler(async (req, res) => {
  const data = req.body;

  if (!data || Object.keys(data).length === 0) {
    return res.status(400).json({ success: false, message: 'No submission data provided' });
  }

  const submission = await WorkflowSubmission.create({
    form: data,
    meta: {
      ip: req.ip || req.headers['x-forwarded-for'] || null,
      userAgent: req.get('User-Agent') || null,
    },
  });

  res.status(201).json({ success: true, id: submission._id });
});

module.exports = {
  submitWorkflow,
};

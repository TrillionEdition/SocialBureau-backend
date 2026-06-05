const mongoose = require('mongoose');

const { Schema } = mongoose;

const WorkflowSubmissionSchema = new Schema(
  {
    form: { type: Schema.Types.Mixed, required: true },
    blueprint: { type: Schema.Types.Mixed },
    paid: { type: Boolean, default: false },
    meta: {
      ip: String,
      userAgent: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WorkflowSubmission', WorkflowSubmissionSchema);

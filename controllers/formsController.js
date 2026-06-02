const Form = require("../models/Form");
const Response = require("../models/Response");

// Seed used when no forms exist yet
const seedForm = {
  id: "demo",
  slug: "demo",
  title: "Product Enquiry",
  description: "Tell us what you need.",
  questions: [
    { id: "q1", label: "Your Name", type: "text", placeholder: "John Doe", required: true, options: [] },
    { id: "q2", label: "Email", type: "email", placeholder: "john@example.com", required: true, options: [] },
    { id: "q3", label: "Product Interest", type: "select", placeholder: "", required: true, options: ["Widget A", "Widget B", "Widget C"] },
    { id: "q4", label: "Message", type: "textarea", placeholder: "Describe your requirement...", required: false, options: [] },
  ],
  createdAt: new Date().toISOString(),
};

exports.listForms = async (req, res, next) => {
  try {
    const forms = await Form.find({}).lean();
    if (!forms || forms.length === 0) return res.json([seedForm]);
    return res.json(forms);
  } catch (err) {
    next(err);
  }
};

exports.getForm = async (req, res, next) => {
  try {
    const slug = req.params.slug;
    const form = await Form.findOne({ slug }).lean();
    if (!form) return res.status(404).json({ error: "Form not found" });
    return res.json(form);
  } catch (err) {
    next(err);
  }
};

exports.addResponse = async (req, res, next) => {
  try {
    const slug = req.params.slug;
    const { data, submittedAt } = req.body;
    const form = await Form.findOne({ slug }).lean();
    // if form not in DB, accept but still store with slug
    const formId = form ? form.id : (req.body.formId || "demo");
    const formTitle = form ? form.title : (req.body.formTitle || slug);

    const resp = new Response({
      id: req.body.id || String(Math.random()).slice(2, 12),
      formId,
      formTitle,
      slug,
      data: data || {},
      submittedAt: submittedAt || new Date().toISOString(),
    });

    await resp.save();
    return res.status(201).json({ success: true, id: resp.id });
  } catch (err) {
    next(err);
  }
};

exports.listResponses = async (req, res, next) => {
  try {
    const responses = await Response.find({}).sort({ createdAt: -1 }).lean();
    return res.json(responses);
  } catch (err) {
    next(err);
  }
};

exports.createForm = async (req, res, next) => {
  try {
    const form = new Form(req.body);
    await form.save();
    return res.status(201).json(form);
  } catch (err) {
    next(err);
  }
};

exports.updateForm = async (req, res, next) => {
  try {
    const form = await Form.findOneAndUpdate(
      { slug: req.params.slug },
      req.body,
      { new: true }
    );
    if (!form) return res.status(404).json({ error: "Form not found" });
    return res.json(form);
  } catch (err) {
    next(err);
  }
};

exports.deleteForm = async (req, res, next) => {
  try {
    await Form.findOneAndDelete({ slug: req.params.slug });
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
};
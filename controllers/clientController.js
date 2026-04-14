// controllers/clientController.js
const Client = require('../models/clientModel');
const Interaction = require('../models/InteractionModel');
// const ClickUpService = require('../services/clickupService');
const emailService = require('../services/emailService');

exports.createClient = async (req, res) => {
  try {
    const data = req.body;

    // 1. Check duplicate
    const exists = await Client.findOne({ email: data.email });
    if (exists) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // 2. Create client
    const client = await Client.create(data);

    // 3. Create ClickUp task (if service available)
    // try {
    //   const clickup = new ClickUpService();
    //   const task = await clickup.createClientTask(data);
    //   client.clickup_task_id = task.task_id;
    //   await client.save();
    // } catch (clickupErr) {
    //   console.log('ClickUp service error:', clickupErr.message);
    //   // Continue without ClickUp task
    // }

    // 4. Save interaction
    await Interaction.create({
      client_id: client._id,
      interaction_type: 'form_submission',
      title: 'Initial form submission'
    });

    // 5. Send confirmation email
    try {
      await emailService.sendConfirmation(client);
    } catch (emailErr) {
      console.log('Email service error:', emailErr.message);
    }

    res.status(201).json({
      success: true,
      data: client
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id).populate('assigned_to');
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }
    res.json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllClients = async (req, res) => {
  try {
    const { status, search } = req.query;
    let filter = {};

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { first_name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company_name: { $regex: search, $options: 'i' } }
      ];
    }

    const clients = await Client.find(filter)
      .populate('assigned_to')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: clients,
      total: clients.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateClient = async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('assigned_to');

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json({
      success: true,
      data: client
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addInteraction = async (req, res) => {
  try {
    const { interaction_type, title, notes } = req.body;

    const interaction = await Interaction.create({
      client_id: req.params.id,
      interaction_type,
      title,
      notes
    });

    res.status(201).json({
      success: true,
      data: interaction
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
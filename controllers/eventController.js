const mongoose = require('mongoose');
const Event = require('../models/eventModel');
const expressAsyncHandler = require("express-async-handler");
const { getCache, setCache, invalidateCache, invalidateEventCaches, CACHE_EXPIRY } = require("../utils/Cacheutils");

function sendError(res, status = 400, message = 'Bad Request', details = null) {
  const payload = { success: false, message };
  if (details) payload.details = details;
  return res.status(status).json(payload);
}

const eventController = {
  // Create new event
  createEvent: expressAsyncHandler(async (req, res) => {
    try {
      const {
        title,
        description,
        startDate,
        endDate,
        location,
        venue,
        image,
        category,
        registrationLink,
        maxAttendees,
        tags,
        organizer,
        contactEmail,
      } = req.body;

      // support file upload via multer/cloudinary (field name: 'image')
      const uploadedImage = req.file ? req.file.location : null;

      if (!title) return sendError(res, 400, 'Title is required');
      if (!description) return sendError(res, 400, 'Description is required');
      if (!startDate) return sendError(res, 400, 'Start date is required');
      if (!endDate) return sendError(res, 400, 'End date is required');

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start >= end) {
        return sendError(res, 400, 'End date must be after start date');
      }

      // normalize tags when received via multipart/form-data (string) or JSON (array)
      const parsedTags = Array.isArray(tags)
        ? tags
        : typeof tags === 'string' && tags.trim()
        ? tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

      const newEvent = new Event({
        title,
        description,
        startDate: start,
        endDate: end,
        location,
        venue,
        image: uploadedImage || image,
        category,
        registrationLink,
        maxAttendees,
        tags: parsedTags,
        organizer,
        contactEmail,
      });

      const saved = await newEvent.save();
      
      // Invalidate cache
      await invalidateEventCaches();
      
      return res.status(201).json({ success: true, data: saved });
    } catch (err) {
      console.error('createEvent error', err);
      return sendError(res, 500, 'Internal server error', err.message);
    }
  }),

  // Get all events with filters
  getEvents: expressAsyncHandler(async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        sort = '-startDate',
        status,
        category,
        upcoming,
        past,
        search,
      } = req.query;

      const p = Math.max(1, parseInt(page, 10) || 1);
      const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

      const filter = { isPublished: true };

      if (status) filter.status = status;
      if (category) filter.category = category;

      const now = new Date();
      if (upcoming === 'true') {
        filter.startDate = { $gte: now };
        filter.status = 'upcoming';
      }
      if (past === 'true') {
        filter.endDate = { $lt: now };
      }

      if (search) {
        const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filter.$or = [
          { title: regex },
          { description: regex },
          { location: regex },
          { tags: regex },
        ];
      }

      const cacheKey = `events:list:${JSON.stringify(filter)}:${p}:${l}:${sort}`;
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        return res.json({
          success: true,
          meta: cachedData.meta,
          data: cachedData.data,
        });
      }

      const skip = (p - 1) * l;

      const [items, total] = await Promise.all([
        Event.find(filter)
          .skip(skip)
          .limit(l)
          .sort(sort)
          .lean(),
        Event.countDocuments(filter),
      ]);

      const responseData = {
        success: true,
        meta: {
          page: p,
          limit: l,
          total,
          pages: Math.ceil(total / l),
        },
        data: items,
      };

      await setCache(cacheKey, responseData, CACHE_EXPIRY.EVENTS_LIST);

      return res.json(responseData);
    } catch (err) {
      console.error('getEvents error', err);
      return sendError(res, 500, 'Internal server error', err.message);
    }
  }),

  // Get single event by ID
  getEventById: expressAsyncHandler(async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return sendError(res, 400, 'Invalid event ID');
      }

      const cacheKey = `event:${id}`;
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        return res.json({ success: true, data: cachedData });
      }

      const event = await Event.findById(id).populate('attendees', 'name email').lean();
      if (!event) return sendError(res, 404, 'Event not found');

      await setCache(cacheKey, event, CACHE_EXPIRY.SINGLE_EVENT);

      return res.json({ success: true, data: event });
    } catch (err) {
      console.error('getEventById error', err);
      return sendError(res, 500, 'Internal server error', err.message);
    }
  }),

  // Update event
  updateEvent: expressAsyncHandler(async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return sendError(res, 400, 'Invalid event ID');
      }

      const allowed = [
        'title',
        'description',
        'startDate',
        'endDate',
        'location',
        'venue',
        'image',
        'category',
        'status',
        'registrationLink',
        'maxAttendees',
        'tags',
        'organizer',
        'contactEmail',
        'isPublished',
      ];

      const updates = {};
      allowed.forEach((k) => {
        if (Object.prototype.hasOwnProperty.call(req.body, k)) {
          updates[k] = req.body[k];
        }
      });

      if (updates.startDate && updates.endDate) {
        const start = new Date(updates.startDate);
        const end = new Date(updates.endDate);
        if (start >= end) {
          return sendError(res, 400, 'End date must be after start date');
        }
      }

      const updated = await Event.findByIdAndUpdate(id, updates, { new: true }).lean();
      if (!updated) return sendError(res, 404, 'Event not found');

      // Invalidate cache
      await invalidateEventCaches();
      await invalidateCache(`event:${id}`);

      return res.json({ success: true, data: updated });
    } catch (err) {
      console.error('updateEvent error', err);
      return sendError(res, 500, 'Internal server error', err.message);
    }
  }),

  // Delete event
  deleteEvent: expressAsyncHandler(async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return sendError(res, 400, 'Invalid event ID');
      }

      const removed = await Event.findByIdAndDelete(id).lean();
      if (!removed) return sendError(res, 404, 'Event not found');

      // Invalidate cache
      await invalidateEventCaches();
      await invalidateCache(`event:${id}`);

      return res.json({ success: true, data: removed });
    } catch (err) {
      console.error('deleteEvent error', err);
      return sendError(res, 500, 'Internal server error', err.message);
    }
  }),

  // Get upcoming events
  getUpcomingEvents: expressAsyncHandler(async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      const l = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

      const cacheKey = `events:upcoming:${l}`;
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        return res.json({ success: true, data: cachedData });
      }

      const now = new Date();
      const events = await Event.find({
        startDate: { $gte: now },
        status: 'upcoming',
        isPublished: true,
      })
        .sort('startDate')
        .limit(l)
        .lean();

      await setCache(cacheKey, events, CACHE_EXPIRY.EVENTS_LIST);

      return res.json({ success: true, data: events });
    } catch (err) {
      console.error('getUpcomingEvents error', err);
      return sendError(res, 500, 'Internal server error', err.message);
    }
  }),

  // Generate calendar file (.ics)
  generateCalendarFile: expressAsyncHandler(async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return sendError(res, 400, 'Invalid event ID');
      }

      const event = await Event.findById(id).lean();
      if (!event) return sendError(res, 404, 'Event not found');

      // Generate ICS file content
      const formatDate = (date) => {
        return new Date(date)
          .toISOString()
          .replace(/[-:]/g, '')
          .replace(/\.\d{3}/, '');
      };

      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Social Bureau//Events//EN',
        'BEGIN:VEVENT',
        `UID:${event._id}@socialbureau.in`,
        `DTSTAMP:${formatDate(new Date())}`,
        `DTSTART:${formatDate(event.startDate)}`,
        `DTEND:${formatDate(event.endDate)}`,
        `SUMMARY:${event.title}`,
        `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
        event.location || event.venue ? `LOCATION:${event.location || event.venue}` : '',
        event.registrationLink ? `URL:${event.registrationLink}` : '',
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR',
      ]
        .filter(Boolean)
        .join('\r\n');

      res.setHeader('Content-Type', 'text/calendar');
      res.setHeader('Content-Disposition', `attachment; filename="event-${event._id}.ics"`);
      return res.send(icsContent);
    } catch (err) {
      console.error('generateCalendarFile error', err);
      return sendError(res, 500, 'Internal server error', err.message);
    }
  }),

  // Register for event
  registerForEvent: expressAsyncHandler(async (req, res) => {
    try {
      const { id } = req.params;
      // support payload: { userId } OR { name, email } for guest registrations
      const { userId, name, email } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return sendError(res, 400, 'Invalid event ID');
      }

      const event = await Event.findById(id);
      if (!event) return sendError(res, 404, 'Event not found');

      // compute current participants (attendees + guest registrations)
      const currentCount = (event.attendees?.length || 0) + (event.registrations?.length || 0);
      if (event.maxAttendees && currentCount >= event.maxAttendees) {
        return sendError(res, 400, 'Event is full');
      }

      // If a userId is provided, keep previous behavior
      if (userId) {
        if (!mongoose.Types.ObjectId.isValid(userId)) return sendError(res, 400, 'invalid user id');
        if (event.attendees && event.attendees.some((a) => String(a) === String(userId))) {
          return sendError(res, 400, 'Already registered for this event');
        }
        event.attendees = event.attendees || [];
        event.attendees.push(userId);
        await event.save();
        return res.json({ success: true, message: 'Successfully registered for event' });
      }

      // Guest registration path
      if (!email) return sendError(res, 400, 'email is required for registration');
      const emailLower = String(email).toLowerCase();

      // prevent duplicate guest registrations by email
      if (event.registrations && event.registrations.some((r) => String(r.email).toLowerCase() === emailLower)) {
        return sendError(res, 400, 'This email is already registered for the event');
      }

      event.registrations = event.registrations || [];
      event.registrations.push({ name: name || '', email: emailLower });
      await event.save();

      // Invalidate cache
      await invalidateCache(`event:${id}`);

      return res.json({ success: true, message: 'Thank you. You have successfully registered for the event' });
    } catch (err) {
      console.error('registerForEvent error', err);
      return sendError(res, 500, 'Internal server error', err.message);
    }
  }),
};

module.exports = eventController;

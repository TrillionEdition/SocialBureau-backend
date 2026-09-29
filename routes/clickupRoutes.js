const express = require("express");
const clickupController = require("../controllers/clickupController");
const clickupRoutes = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/', limits: { fileSize: 20 * 1024 * 1024 } });


const userAuthentication = require("../middlewares/userAuthentication");

const { clickupStorage, getUserConfig } = clickupController;

const clickupContext = async (req, res, next) => {
  try {
    const viewId = req.params?.viewId || req.query?.viewId || req.body?.viewId || req.params?.taskId;
    const config = await getUserConfig(req.user?.id || req.user?._id, viewId);
    clickupStorage.run(config, () => {
      next();
    });
  } catch (err) {
    next(err);
  }
};

const authWithContext = [userAuthentication, clickupContext];

clickupRoutes.get('/tasks', authWithContext, clickupController.getTasks);
clickupRoutes.get('/tasks/:taskId', authWithContext, clickupController.getTaskById);
clickupRoutes.get('/member-details', authWithContext, clickupController.getMemberDetails);
clickupRoutes.get('/public-member-details', clickupController.getPublicMemberDetails);
// OAuth connect flow for ClickUp (start + callback)
clickupRoutes.get('/oauth/start', userAuthentication, clickupController.startOAuth);
clickupRoutes.get('/oauth/callback', userAuthentication, clickupController.handleOAuthCallback);
clickupRoutes.get('/tasks/:taskId/activity', authWithContext, clickupController.getTaskActivity);
clickupRoutes.get('/recent-activity', authWithContext, clickupController.getRecentActivity);
clickupRoutes.post('/create-task', authWithContext, clickupController.createTask);
clickupRoutes.get('/chat-messages/:viewId', authWithContext, clickupController.getChatComments);
clickupRoutes.post('/chat-messages/:viewId', authWithContext, clickupController.postChatComment);
clickupRoutes.post('/chat-messages/:viewId/attachment', authWithContext, upload.single('attachment'), clickupController.uploadAttachment);
clickupRoutes.get('/image-proxy', authWithContext, clickupController.proxyClickUpImage);


module.exports = clickupRoutes;
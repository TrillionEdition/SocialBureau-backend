const express = require("express");
const clickupController = require("../controllers/clickupController");
const clickupRoutes = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // Temporary storage before proxying to ClickUp


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
clickupRoutes.get('/time', authWithContext, clickupController.getTime);
clickupRoutes.get('/user-task', authWithContext, clickupController.getTasksById);
clickupRoutes.get('/user-details', authWithContext, clickupController.getUserDetails);
clickupRoutes.get('/member-details', authWithContext, clickupController.getMemberDetails);
clickupRoutes.get('/test', authWithContext, clickupController.testClickUp);
// OAuth connect flow for ClickUp (start + callback)
clickupRoutes.get('/oauth/start', userAuthentication, clickupController.startOAuth);
clickupRoutes.get('/oauth/callback', userAuthentication, clickupController.handleOAuthCallback);
clickupRoutes.get('/tasks/:taskId/activity', authWithContext, clickupController.getTaskActivity);
clickupRoutes.post('/create-task', authWithContext, clickupController.createTask);
clickupRoutes.get('/chat-messages/:viewId', authWithContext, clickupController.getChatComments);
clickupRoutes.post('/chat-messages/:viewId', authWithContext, clickupController.postChatComment);
clickupRoutes.post('/chat-messages/:viewId/attachment', authWithContext, upload.single('attachment'), clickupController.uploadAttachment);
clickupRoutes.get('/image-proxy', clickupController.proxyClickUpImage);
clickupRoutes.get('/general-activity', authWithContext, clickupController.getGeneralActivity);


module.exports = clickupRoutes;
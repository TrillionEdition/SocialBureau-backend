const express = require("express")
const userController = require("../controllers/userController")
const upload = require("../middlewares/cloudinary")
const userAuthentication = require("../middlewares/userAuthentication");
const isAdmin = require("../middlewares/isAdmin");
const userRouter = express.Router()

userRouter.post('/register', upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'idCard', maxCount: 1 },
    { name: 'toolIcons', maxCount: 20 }
]), userController.register)
userRouter.post("/login", userController.login)
userRouter.get('/logout', userController.logout)
userRouter.get('/team', userController.getUsers)
userRouter.put('/tools', userController.updateTool)
userRouter.put('/clients', userController.updateClient)
userRouter.get("/leaderboard", userController.getLeaderboard);
userRouter.post("/forgot-password", userController.forgotPassword);
userRouter.post("/reset-password/:token", userController.resetPassword);

// Specific user routes (must come after static routes like /team, /leaderboard to avoid conflicts if IDs are not validated)
userRouter.get('/:id', userController.getUserById);
userRouter.put('/:id', upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'idCard', maxCount: 1 },
    { name: 'avatar', maxCount: 1 }, // Added avatar support
    { name: 'toolIcons', maxCount: 20 }
]), userController.updateUser);

module.exports = userRouter


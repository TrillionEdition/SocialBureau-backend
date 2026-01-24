const express = require("express");
const clickupRoutes = require("./clickupRoutes");
const userRouter = require("./userRoutes");
const reviewRoutes = require("./reviewRoutes");
const qaRoutes = require("./qaRoutes");
const blogRoutes = require("./blogRoutes");
const eventRoutes = require("./eventRoutes");
const newsletterRoutes = require("./newsletterRoutes");
const achievementRoutes = require("./achievementRoutes");
const companyAchievementRoutes = require("./companyAchievementRoutes");
const paymentRoutes = require("./paymentRoutes");
const jobRoutes = require("./jobRoutes");

const router = express.Router();

router.use(express.json());

router.use("/clickup", clickupRoutes);
router.use("/user", userRouter);
router.use("/review", reviewRoutes);
router.use("/qa", qaRoutes);
router.use("/job",jobRoutes)
router.use("/blog", blogRoutes);
router.use("/event", eventRoutes);
router.use("/newsletter", newsletterRoutes);
router.use("/achievement", achievementRoutes);
router.use("/company-achievement", companyAchievementRoutes);
// router.use("/payment", paymentRoutes);

module.exports = router;
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
const clientRoutes = require("./clientRoutes");
// const paymentRoutes = require("./paymentRoutes");
const jobRoutes = require("./jobRoutes");
const clientReviewRoutes = require('./clientReviewRoutes');
const analyticsRoutes = require("./analyticsRoutes");
const partnershipRoutes = require("./partnershipRoutes");
const atsRoutes = require("./ats");
const resumeRoutes = require("./resumeRoutes");
const jobPostingRoutes = require("./jobPostingRoutes");
const jobApplicationRoutes = require("./jobApplicationRoutes");
const externalJobRoutes = require("./externalJobRoutes");
const teamRoutes = require("./teamRoutes");
const ClientRouters = require("./clientRoutes");
const apiLeadRoutes = require("./apiLeadRoutes");
const mediaWaitlistRoutes = require("./mediaWaitlistRoutes");

const router = express.Router();

router.use(express.json());

router.use("/clickup", clickupRoutes);
router.use("/user", userRouter);
router.use("/review", reviewRoutes);
router.use("/qa", qaRoutes);
router.use("/job", jobRoutes)
router.use("/clients", ClientRouters);
router.use("/hr-jobs", jobPostingRoutes);
router.use("/hr-applications", jobApplicationRoutes);
router.use("/hr-external-jobs", externalJobRoutes);
router.use("/blog", blogRoutes);
router.use("/event", eventRoutes);
router.use("/newsletter", newsletterRoutes);
router.use("/achievement", achievementRoutes);
router.use("/company-achievement", companyAchievementRoutes);
router.use('/client-reviews', clientReviewRoutes);
router.use("/api/analytics", analyticsRoutes);
router.use("/partners", partnershipRoutes);
// router.use("/payment", paymentRoutes);
router.use('/ats', atsRoutes);
router.use('/resume', resumeRoutes);
router.use('/team', teamRoutes);
router.use("/api-leads", apiLeadRoutes);
router.use("/media-waitlist", mediaWaitlistRoutes);

module.exports = router;
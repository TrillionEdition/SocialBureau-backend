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
const paymentRoutes = require("./paymentRoutes");
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
const formsRoutes = require("./formsRoutes");
const ajnoraRouters = require("./ajnoraRoutes");
const lotteryRoutes = require("./lotteryRoutes");
const suntipsRoutes = require("./suntipsRoutes");
const chocochiRoutes = require("./chocochiRoutes");
const posterRoutes = require("./posterRoutes");
const reelRoutes = require("./reelRoutes");
const intakeRoutes = require("./intakeRoutes");
const workflowRoutes = require("./workflowRoutes");
const fifaRoutes = require("./fifaRoutes");

const auditReportRoutes = require("../modules/auditReports/auditReportRoutes");

const router = express.Router();

router.use(express.json());

// Move Team to Top for Priority
router.use('/team-v2', teamRoutes);
router.use('/team', teamRoutes);

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
router.use("/payment", paymentRoutes);
router.use('/ats', atsRoutes);
router.use('/resume', resumeRoutes);
router.use("/api-leads", apiLeadRoutes);
router.use("/media-waitlist", mediaWaitlistRoutes);
router.use("/ajnora", ajnoraRouters);
router.use("/lottery", lotteryRoutes);
router.use("/suntips", suntipsRoutes);
router.use("/chocochi", chocochiRoutes);
router.use("/posters", posterRoutes);
router.use("/reels", reelRoutes);
router.use("/workflow", workflowRoutes);
router.use("/fifa", fifaRoutes);
router.use("/api/forms", formsRoutes);
router.use("/api/audit-reports", auditReportRoutes);
router.use("/", intakeRoutes);

module.exports = router;
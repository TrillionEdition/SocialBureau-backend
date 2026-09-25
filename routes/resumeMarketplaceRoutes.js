const express = require('express');
const userAuthentication = require('../middlewares/userAuthentication');
const isAdmin = require('../middlewares/isAdmin');
const upload = require('../middlewares/cloudflare');
const ctrl = require('../controllers/resumeMarketplaceController');

const router = express.Router();

/* Company (any logged-in user) — basic info only pre-payment */
router.get('/resumes', userAuthentication, ctrl.getListings);
router.get('/resumes/:id', userAuthentication, ctrl.getListingBasic);
router.get('/resumes/:id/full', userAuthentication, ctrl.unlockResume);

/* Company — purchases (Razorpay, reused gateway) */
router.post('/purchase/create-order', userAuthentication, ctrl.createPurchaseOrder);
router.post('/purchase/verify', userAuthentication, ctrl.verifyPurchasePayment);
router.get('/purchases/my', userAuthentication, ctrl.getMyPurchases);
router.get('/downloads/my', userAuthentication, ctrl.getMyDownloads);

/* Admin — Resume Management */
router.get('/admin/resumes', userAuthentication, isAdmin, ctrl.getAdminListings);
router.get('/admin/resumes/:id', userAuthentication, isAdmin, ctrl.getAdminListingById);
router.post(
  '/admin/resumes',
  userAuthentication,
  isAdmin,
  upload.single('resumeFile', 'resume-marketplace'),
  ctrl.createListing
);
router.put(
  '/admin/resumes/:id',
  userAuthentication,
  isAdmin,
  upload.single('resumeFile', 'resume-marketplace'),
  ctrl.updateListing
);
router.patch('/admin/resumes/:id/publish', userAuthentication, isAdmin, ctrl.togglePublish);
router.delete('/admin/resumes/:id', userAuthentication, isAdmin, ctrl.deleteListing);

module.exports = router;

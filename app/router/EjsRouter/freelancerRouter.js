const express = require('express');
const router = express.Router();
const FreelancerController = require('../../controller/EjsController/FreelancerController');
const BidController = require('../../controller/EjsController/BidController');
const MessageController = require('../../controller/EjsController/MessageController');
const auth = require('../../middlewere/auth');
const checkRole = require('../../middlewere/rbacMiddleware');

//Apply authentication and role check for all freelancer routes
router.use(auth);
router.use(checkRole(['freelancer']));

router.get('/dashboard', FreelancerController.freelancerDashboard);

//Job searchJobs and viewJobDetails
router.get('/jobs', FreelancerController.searchJobs);
router.get('/jobs/:jobId', FreelancerController.viewJobDetails);

//Mark job ready
router.post('/jobs/:jobId/ready', FreelancerController.markJobReady);

router.get('/profile', FreelancerController.getProfile);
router.post('/profile/update', FreelancerController.updateProfile);

//Bidding routes
router.post('/jobs/:jobId/bid', BidController.submitBid);
router.get('/bids', BidController.getFreelancerBids);
router.post('/bids/:bidId/withdraw', BidController.withdrawBid);

//Messaging routes for freelancer. This logic written in MessageController.
router.get('/messages/:jobId', MessageController.freelancerGetJobConversation);


module.exports = router;

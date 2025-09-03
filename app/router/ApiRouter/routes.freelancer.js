const express = require('express');
const router = express.Router();
const FreelancerController = require('../../controller/ApiController/FreelancerController');
// const BidController = require('../../controller/EjsController/BidController');
// const MessageController = require('../../controller/EjsController/MessageController');
const auth = require('../../middlewere/auth');
const checkRole = require('../../middlewere/rbacMiddleware');

//Apply authentication and role check for all freelancer routes
router.use(auth);
router.use(checkRole(['freelancer']));

//Freelancer dashboard
router.get('/dashboard', FreelancerController.freelancerDashboard);

//Job browsing and bidding
router.get('/jobs', FreelancerController.searchJobs);
router.get('/jobs/:jobId', FreelancerController.viewJobDetails);

//Bidding routes
router.post('/jobs/:jobId/bid', BidController.submitBid);
router.get('/bids', BidController.getFreelancerBids);
router.post('/bids/:bidId/withdraw', BidController.withdrawBid);

//Messaging routes
router.get('/messages', MessageController.getMessageInbox);
router.get('/messages/:jobId', MessageController.getJobConversation);
router.post('/messages/send', MessageController.sendMessage);
router.delete('/messages/:messageId', MessageController.deleteMessage);

//Mark job ready (delivery)
router.post('/jobs/:jobId/ready', FreelancerController.markJobReady);

//Profile management
router.get('/profile', FreelancerController.getProfile);
router.post('/profile/update', FreelancerController.updateProfile);

module.exports = router;
const express = require('express');
const router = express.Router();
const BidController = require('../../controller/EjsController/BidController');
const auth = require('../../middlewere/auth');
const checkRole = require('../../middlewere/rbacMiddleware');



router.use(auth);

//Client routes (view and manage bids)
router.get('/jobs/:jobId', checkRole(['client']), BidController.viewJobBids);
router.post('/:bidId/accept', checkRole(['client']), BidController.acceptBid);
router.post('/:bidId/reject', checkRole(['client']), BidController.rejectBid);

//Freelancer routes (submit and manage bids)
router.post('/jobs/:jobId/submit', checkRole(['freelancer']), BidController.submitBid);
router.post('/:bidId/withdraw', checkRole(['freelancer']), BidController.withdrawBid);

module.exports = router;

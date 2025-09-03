const express = require('express');
const router = express.Router();
const MessageController = require('../../controller/EjsController/MessageController');
const auth = require('../../middlewere/auth');


router.use(auth);

// Get message inbox for client
router.get('/inbox', MessageController.getMessageInbox);

// Job specific conversation for client
router.get('/:jobId', MessageController.getJobConversation);

//This router work for (freelancer as well as client) for Send message.
router.post('/send', MessageController.sendMessage);

//For freelancer message page get.This logic written in MessageController.
router.get('/inbox/freelancer', MessageController.freelancerGetMessageInbox);


module.exports = router;

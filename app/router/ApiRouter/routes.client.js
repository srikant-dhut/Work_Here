const express = require('express');
const router = express.Router();
const clientApiController = require('../../controller/ApiController/ClientController');
const auth = require("../../middlewere/auth");
const checkRole = require("../../middlewere/rbacMiddleware");


router.use(auth);

router.get('/jobs', checkRole(["client"]), clientApiController.getClientJobs);
router.post('/jobs/create', checkRole(["client"]), clientApiController.createJob);
router.put('/jobs/edit/:id', checkRole(["client"]), clientApiController.updateJob);
router.delete('/jobs/:id', checkRole(["client"]), clientApiController.deleteJob);

module.exports = router;




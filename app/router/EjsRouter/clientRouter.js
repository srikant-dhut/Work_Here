const express = require("express");
const router = express.Router();
const homeController = require("../../controller/EjsController/HomeController");
const ClientController = require("../../controller/EjsController/ClientController");
const auth = require("../../middlewere/auth");
const checkRole = require("../../middlewere/rbacMiddleware");

// Protected routes for clients
router.get("/clientPage", auth, checkRole(["client"]), ClientController.clientPage);
router.get("/createJob", auth, checkRole(["client"]), ClientController.jobCreatePage);
router.post('/createJob', auth, checkRole(["client"]), ClientController.createJob);
router.get('/jobs/:id', auth, checkRole(["client"]), ClientController.getEditJob);
router.post('/jobs/:id', auth, checkRole(["client"]), ClientController.postEditJob);
router.post('/jobs/delete/:id', auth, checkRole(["client"]), ClientController.deleteJob);


module.exports = router;
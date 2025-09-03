const express = require("express");
const router = express.Router();
const homeController = require("../../controller/EjsController/HomeController");


router.get("/", homeController.homePage);

module.exports = router;
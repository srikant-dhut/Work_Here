const express = require("express");
const router = express.Router();
const homeController = require("../../controller/EjsController/HomeController");


router.get("/", homeController.homePage);
router.get("/jobs", homeController.allJobsPage);
router.get("/freelancers", homeController.allFreelancersPage);
router.get("/blog", homeController.blogPage);

module.exports = router;

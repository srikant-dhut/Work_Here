const express = require("express");
const router = express.Router();
const userEjsRouter = require("./userEjsRouter");
const homeEjsRouter = require("./homeRouter");
const adminEjsRouter = require("./adminRouter");
const clientRouter = require("./clientRouter");
const freelancerRouter = require("./freelancerRouter");
const bidRouter = require("./bidRouter");
const messageRouter = require("./messageRouter");
const checkAuthentication = require("../../middlewere/checkAuthentication");


router.use(homeEjsRouter);
router.use(userEjsRouter);
router.use(checkAuthentication);
router.use(clientRouter);
router.use("/freelancer", freelancerRouter);
router.use("/bids", bidRouter);
router.use("/messages", messageRouter);
router.use("/admin", adminEjsRouter);

module.exports = router;
const express = require("express");
const router = express.Router();

const adminRouter = require("./routes.admin");
const bidRouter = require("./routes.bid");
const clientRouter = require("./routes.client");
const messageRouter = require("./routes.message");
const userRouter = require("./routes.user");

router.use("/admins", adminRouter);
router.use("/bids", bidRouter);
router.use("/clients", clientRouter);
router.use("/messages", messageRouter);
router.use("/users", userRouter);

module.exports = router;



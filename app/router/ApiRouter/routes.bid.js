const express = require("express");
const router = express.Router();
const BidController = require("../../controller/ApiController/BidController");

router.get("/", BidController.listBids);
router.get("/:id", BidController.getBidById);
router.post("/", BidController.createBid);
router.put("/:id", BidController.updateBid);
router.delete("/:id", BidController.deleteBid);

module.exports = router;



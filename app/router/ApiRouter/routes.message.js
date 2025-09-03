const express = require("express");
const router = express.Router();
const MessageController = require("../../controller/ApiController/MessageController");

router.get("/", MessageController.listMessages);
router.get("/:id", MessageController.getMessageById);
router.post("/", MessageController.createMessage);
router.put("/:id", MessageController.updateMessage);
router.delete("/:id", MessageController.deleteMessage);

module.exports = router;



const express = require("express");
const router = express.Router();
const AdminController = require("../../controller/ApiController/adminController");

router.get("/", AdminController.listAdmins);
router.get("/:id", AdminController.getAdminById);
router.post("/", AdminController.createAdmin);
router.put("/:id", AdminController.updateAdmin);
router.delete("/:id", AdminController.deleteAdmin);

module.exports = router;



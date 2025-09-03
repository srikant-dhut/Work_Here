const express = require("express");
const adminEjsController = require("../../controller/EjsController/adminController");
const adminCheckauthenticationToken = require("../../middlewere/adminAuth");
const router = express.Router();


router.get("/login", (req, res) => {
  res.render("adminLogin");
});
router.post("/login", adminEjsController.login);


router.use(adminCheckauthenticationToken);

router.get("/", (req, res) => {
  res.redirect("/admin");
});

router.get("/dashboard", adminEjsController.dashboard);
router.get("/logout", adminEjsController.logout);
router.get("/adminProfile/", adminEjsController.adminProfile);
router.get("/adminEditForm/", adminEjsController.adminEditForm);
router.post("/adminEdit/:id", adminEjsController.adminEdit);

module.exports = router;

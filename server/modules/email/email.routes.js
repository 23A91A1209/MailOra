const express    = require("express");
const router     = express.Router();
const controller = require("./email.controller");
const { protect } = require("../../middlewares/auth.middleware");

router.get("/",            protect, controller.getAllEmails);
router.get("/registration", protect, controller.getRegistrationEmails);
router.get("/registered",   protect, controller.getRegisteredEmails);
router.get("/inprogress",   protect, controller.getInProgressEmails);
router.get("/confirmed",    protect, controller.getConfirmedEmails);
router.delete("/:type/:id", protect, controller.deleteEmail);

module.exports = router;

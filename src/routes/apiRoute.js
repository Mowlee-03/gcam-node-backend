var express = require('express');
var router = express.Router();

const userRoute = require("../routes/api/userRoute")
const orgRoute = require("../routes/api/organizationRoute")
const SiteRoute = require("../routes/api/SiteRoute")
const DeviceRoute = require("../routes/api/DeviceRoute")
const listRoute = require("../routes/api/listRoute")


router.use("/user",authMiddleware,userRoute)
router.use("/organization",authMiddleware,orgRoute)
router.use("/site",authMiddleware,SiteRoute)
router.use("/device",authMiddleware,DeviceRoute)
router.use("/list",authMiddleware,listRoute)
module.exports = router;

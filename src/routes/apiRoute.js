var express = require('express');
var router = express.Router();

const userRoute = require("../routes/api/userRoute")
const orgRoute = require("../routes/api/organizationRoute")
const SiteRoute = require("../routes/api/SiteRoute")
const DeviceRoute = require("../routes/api/DeviceRoute")
const listRoute = require("../routes/api/listRoute")


router.use("/user",userRoute)
router.use("/organization",orgRoute)
router.use("/site",SiteRoute)
router.use("/device",DeviceRoute)
router.use("/list",listRoute)
module.exports = router;

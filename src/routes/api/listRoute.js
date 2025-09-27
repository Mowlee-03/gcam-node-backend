var express = require("express")
const { 
    getOrganizationList, 
    getSitesForOneOrganization, 
    getnonRegisteredDevicelist,
    getRegisteredDeviceList,
    getloggedUserDeviceList
} = require("../../controllers/ListController")
var router  = express.Router()

router.get("/organizations",getOrganizationList)
router.get("/organization/:org_id/sites",getSitesForOneOrganization)
router.post("/registered/devices",getRegisteredDeviceList)
router.get("/not-registered/devices",getnonRegisteredDevicelist)
router.get("/owned/devices/for/user/:user_id",getloggedUserDeviceList)
module.exports = router
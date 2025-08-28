var express = require("express")
const { 
    getOrganizationList, 
    getSitesForOneOrganization, 
    getnonRegisteredDevicelist,
    getRegisteredDeviceList
} = require("../../controllers/ListController")
var router  = express.Router()

router.get("/organizations",getOrganizationList)
router.get("/organization/:org_id/sites",getSitesForOneOrganization)
router.get("/registered/devices",getRegisteredDeviceList)
router.get("/not-registered/devices",getnonRegisteredDevicelist)

module.exports = router
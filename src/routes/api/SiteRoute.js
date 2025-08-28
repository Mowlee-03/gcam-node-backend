var express = require("express")
const { 
    createsite, 
    viewOnesiteDetaily, 
    allSiteDetails, 
    deleteSite, 
    updateSite
} = require("../../controllers/SiteController")
var router = express.Router()


router.post("/create",createsite)
router.post("/viewall",allSiteDetails)
router.get("/view/:site_id",viewOnesiteDetaily)
router.put("/update/:site_id",updateSite)
router.delete("/delete/:site_id",deleteSite)

module.exports = router

var express = require("express")
const { 
    createOrganization,
    updateOrganization,
    getAllOrganization,
    deleteOrganization,
    addOrgAccess
 } = require("../../controllers/OrganizationController")
var router = express.Router()


router.post("/create",createOrganization)
router.get("/viewall",getAllOrganization)
router.put("/update/:org_id",updateOrganization)
router.delete("/delete/:org_id",deleteOrganization)


router.post("/add/access/:user_id",addOrgAccess)
router.delete("/remove/access/:user_id",removeOrgAccess)

module.exports = router
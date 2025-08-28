var express = require("express")
const { 
    createOrganization,
    updateOrganization,
    getAllOrganization,
    deleteOrganization,
    addOrgAccess,
    updateUserOrganziationRole,
    removeOrgAccess
 } = require("../../controllers/OrganizationController")
var router = express.Router()


router.post("/create",createOrganization)
router.get("/viewall",getAllOrganization)
router.put("/update/:org_id",updateOrganization)
router.delete("/delete/:org_id",deleteOrganization)


router.post("/add/access/:user_id",addOrgAccess)
router.delete("/remove/access/:user_id",removeOrgAccess)
router.put("/user/role/update",updateUserOrganziationRole)

module.exports = router
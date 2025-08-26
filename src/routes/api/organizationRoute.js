var express = require("express")
const { 
    createOrganization,
    updateOrganization,
    getAllOrganization,
    deleteOrganization
 } = require("../../controllers/OrganizationController")
const authMiddleware = require("../../middleware/authMiddleware")
var router = express.Router()


router.post("/create",createOrganization)
router.get("/viewall",authMiddleware,getAllOrganization)
router.put("/update/:org_id",updateOrganization)
router.delete("/delete/:org_id",deleteOrganization)



module.exports = router
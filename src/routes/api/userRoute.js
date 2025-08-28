var express = require("express")
const { createuser, getAllUsers, updateUser, deleteUser, usersAndOrganizations, userAndDevices } = require("../../controllers/UserManageController")
const { authuser } = require("../../controllers/AuthController")
var router = express.Router()

router.get("/auth",authuser)

router.post("/create",createuser)
router.get("/viewall",getAllUsers)
router.put("/update/:user_id",updateUser)
router.delete("/delete/:user_id",deleteUser)

router.get("/organization/details",usersAndOrganizations)
router.get("/device/details",userAndDevices)

module.exports = router
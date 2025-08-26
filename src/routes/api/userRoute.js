var express = require("express")
const { createuser, getAllUsers, updateUser, deleteUser } = require("../../controllers/UserManageController")
const { authuser } = require("../../controllers/AuthController")
var router = express.Router()

router.get("/auth",authuser)

router.post("/create",createuser)
router.get("/viewall",getAllUsers)
router.put("/update/:user_id",updateUser)
router.delete("/delete/:user_id",deleteUser)

module.exports = router
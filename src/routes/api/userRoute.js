var express = require("express")
const { createuser, getAllUsers, updateUser, deleteUser } = require("../../controllers/UserManageController")
var router = express.Router()

router.post("/create",createuser)
router.get("/viewall",getAllUsers)
router.put("/update/:user_id",updateUser)
router.delete("/delete/:user_id",deleteUser)

module.exports = router
var express = require("express")
const { createuser, getAllUsers } = require("../../controllers/UserManageController")
var router = express.Router()

router.post("/create",createuser)
router.get("/viewall",getAllUsers)

module.exports = router
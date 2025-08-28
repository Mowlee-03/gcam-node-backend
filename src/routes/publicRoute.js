var express = require("express")
const { createDevice } = require("../controllers/DeviceController")
const { login, logout } = require("../controllers/AuthController")
const { inituser } = require("../controllers/UserManageController")
var router = express.Router()

router.post("/device/create",createDevice)

router.post("/login",login)
router.post("/logout",logout)

router.post("/init/user",inituser)
module.exports = router
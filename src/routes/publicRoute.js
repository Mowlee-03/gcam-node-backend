var express = require("express")
const { createDevice } = require("../controllers/DeviceController")
const { login, logout } = require("../controllers/AuthController")
var router = express.Router()

router.post("/device/create",createDevice)

router.post("/login",login)
router.post("/logout",logout)

module.exports = router
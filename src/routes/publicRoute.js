var express = require("express")
const { createDevice } = require("../controllers/DeviceController")
const { login, logout } = require("../controllers/AuthController")
const { inituser } = require("../controllers/UserManageController")
const { uploadGarbage } = require("../utils/Multer")
// const { garbagelog } = require("../controllers/LogController")

var router = express.Router()

router.post("/device/create",createDevice)
// router.post("/garbage/log",uploadGarbage.single("image_name"),garbagelog)

router.post("/login",login)
router.post("/logout",logout)

router.post("/init/user",inituser)
module.exports = router
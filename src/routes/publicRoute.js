var express = require("express")
const { createDevice } = require("../controllers/DeviceController")
const { login, logout } = require("../controllers/AuthController")
const { inituser } = require("../controllers/UserManageController")
const { uploadGarbage } = require("../utils/Multer")
const { garbagelog, personlog } = require("../controllers/logs/LogController")
const { validateFormData } = require("../middleware/contentType")


var router = express.Router()

router.post("/device/create",createDevice)
router.post("/garbage/log",validateFormData,uploadGarbage.single("image_name"),garbagelog)
router.post("/person/log",validateFormData,uploadGarbage.single("image_name"),personlog)

router.post("/login",login)
router.post("/logout",logout)

router.post("/init/user",inituser)
module.exports = router
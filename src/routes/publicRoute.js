var express = require("express")
const { createDevice } = require("../controllers/DeviceController")
var router = express.Router()

router.post("/device/create",createDevice)


module.exports = router
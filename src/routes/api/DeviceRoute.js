var express = require("express")
const { 
    deviceRegister, 
    getdevices, 
    deviceUpdate, 
    deviceDelete,
    addDeviceAccess,
    removeDeviceAccess
} = require("../../controllers/DeviceController")
var router = express.Router()


router.post("/register",deviceRegister)
router.post("/viewall",getdevices)
router.put("/update/:device_id",deviceUpdate)
router.delete("/delete/:device_id",deviceDelete)


router.post("/add/access/:user_id",addDeviceAccess)
router.delete("/remove/access/:user_id",removeDeviceAccess)



module.exports = router
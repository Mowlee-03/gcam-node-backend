var express = require("express")
const { 
    deviceRegister, 
    getdevices, 
    deviceUpdate, 
    deviceDelete
} = require("../../controllers/DeviceController")
var router = express.Router()


router.post("/register",deviceRegister)
router.get("/viewall",getdevices)
router.put("/update/:device_id",deviceUpdate)
router.delete("/delete/:device_id",deviceDelete)



module.exports = router
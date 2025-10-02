var express = require("express")
const { 
    deviceRegister, 

    deviceDelete,
    addDeviceAccess,
    removeDeviceAccess,
    getdevicesforuser,
    deviceGarbageCountUpdate,
    getAllDevcies,
    updateDevice,
    deviceLocationDetails,
    deviceLatestgarbageLog,
    getDeviceswithGarbageCount
} = require("../../controllers/DeviceController")
const { oneDayPersonLogsData } = require("../../controllers/logs/PersonController")
var router = express.Router()


router.post("/register",deviceRegister)
router.delete("/delete/:device_id",deviceDelete)
router.get("/all",getAllDevcies)
router.put("/update/:device_id",updateDevice)
router.post("/add/access/:user_id",addDeviceAccess)
router.delete("/remove/access/:user_id",removeDeviceAccess)


//FOR USER
router.get("/viewall/:user_id",getdevicesforuser)
router.get("/garbage_count/:user_id",getDeviceswithGarbageCount)
router.put("/garbage_count/update/:device_id",deviceGarbageCountUpdate)
router.get("/location/details/:user_id",deviceLocationDetails)
router.get("/:device_id/latest/garbage_log",deviceLatestgarbageLog)
router.post("/person/data",oneDayPersonLogsData)
module.exports = router
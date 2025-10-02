const {PrismaClient}=require("../../generated/prisma");
const { 
    getUTCRangeFromISTDate, 
    formatDateIST 
} = require("../../utils/dateUtils");
const gcamprisma = new PrismaClient()

// POST - /api/device/person/data
const oneDayPersonLogsData = async (req, res) => {
  try {
    let { device_id, date } = req.body;

    // Validation
    if (!device_id || isNaN(device_id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid device_id"
      });
    }


    if (!date) {
      return res.status(400).json({
        status: "error",
        message: "Date is required"
      });
    }

    let startUTC, endUTC;
    try {
    ({ startUTC, endUTC } = getUTCRangeFromISTDate(date));
    console.log(startUTC, endUTC); // now it will print proper UTC dates
    } catch (err) {
    return res.status(400).json({
        status: "error",
        message: err.message
    });
    }


    const device = await gcamprisma.device.findUnique({
        where:{id:Number(device_id)},
        select:{id:true}
    })
    if (!device) {
        return res.status(404).json({
            status:"error",
            message:"Device not found"
        })
    }
    // Fetch logs
    const personLogs = await gcamprisma.personLog.findMany({
      where: {
        device_id: Number(device_id),
        date: {
          gte: startUTC,
          lte: endUTC
        }
      },
      orderBy: { date: "asc" },
      select:{
        id:true,
        date:true,
        image:true
      }
    });

    const logwithIst =personLogs.map(log=>({
        ...log,
        date:formatDateIST(log.date)
    }))

    return res.status(200).json({
      status: "success",
      data: logwithIst
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      error: error.message
    });
  }
};


module.exports = {
    oneDayPersonLogsData
}
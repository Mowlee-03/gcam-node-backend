const {PrismaClient}=require("../../generated/prisma")
const gcamprisma = new PrismaClient()

const createDevice = async (req,res) => {
    try {
        const { imei , video_url } = req.body

        if (!imei || !video_url) {
            return res.status(400).json({
                status:"error",
                message:"Bad request , missing required fields"
            })
        }

        const imeiExist = await gcamprisma.installedDevice.findUnique({
            where : { imei : imei }
        })
        if (imeiExist) {
            return res.status(409).json({
                status:"error",
                message:"IMEI Already exist"
            })
        }

        await gcamprisma.installedDevice.create({
            data:{
                imei:imei,
                video_url:video_url
            }
        })

        return res.status(200).json({
            status:"success",
            message:"Device created successfully"
        })

    } catch (error) {
        console.log(error)
        return res.status(500).json({
            status:"error",
            message:"Internal Server Error",
            error:error.message
        })
    }
}


const deviceRegister = async (req, res) => {
  try {
    const {
      device_id, imei, video_url,
      organization_id, site_id,
      location, name, max_count
    } = req.body;

    if (!device_id || !imei || !video_url || !site_id || !organization_id) {
      return res.status(400).json({
        status: "error",
        message: "Bad request, missing required fields"
      });
    }

    const deviceexist = await gcamprisma.installedDevice.findUnique({
      where: { id: Number(device_id) }
    });

    if (!deviceexist) {
      return res.status(404).json({
        status: "error",
        message: "Device not found"
      });
    }

    if (deviceexist.is_registered) {
      return res.status(409).json({
        status: "error",
        message: "Device is already registered"
      });
    }

    const imeiExist = await gcamprisma.device.findUnique({
      where: { imei }
    });

    if (imeiExist) {
      return res.status(409).json({
        status: "error",
        message: "Device already registered with given IMEI"
      });
    }

    const organizationCheck = await gcamprisma.organization.findUnique({
      where: { id: Number(organization_id) }
    });

    if (!organizationCheck) {
      return res.status(404).json({
        status: "error",
        message: "Invalid organization"
      });
    }

    const siteCheck = await gcamprisma.site.findFirst({
      where: {
        id: Number(site_id),
        organization_id: Number(organization_id)
      }
    });

    if (!siteCheck) {
      return res.status(404).json({
        status: "error",
        message: "Invalid site"
      });
    }

    await gcamprisma.$transaction([
      gcamprisma.device.create({
        data: {
          imei,
          video_url,
          name: name ?? null,
          location: location ?? null,
          site_id: Number(site_id),
          organization_id: Number(organization_id),
          max_count: max_count ?? null
        }
      }),
      gcamprisma.installedDevice.update({
        where: { id: Number(device_id) },
        data: { is_registered: true }
      })
    ]);

    return res.status(200).json({
      status: "success",
      message: "Device registered successfully"
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
    createDevice,
    deviceRegister
}
const {PrismaClient}=require("../generated/prisma")
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


const getdevices = async (req, res) => {
  try {
    const { role, organizations } = req.body; 
    // organizations example: [{ id: 1, role: "ADMIN" }, { id: 2, role: "USER", devices: [5,6] }]

    let devices = [];

    if (role === "SUPERADMIN") {
      // Fetch all devices
      devices = await gcamprisma.device.findMany({
        include: {
          organization: { select: { id: true, name: true } },
          latestlog: true
        }
      });

    } else if (role === "USER" && Array.isArray(organizations) && organizations.length > 0) {
      let orgConditions = [];

        for (const org of organizations) {
            // ✅ Basic validation
            if (!org.id || !org.role) {
            return res.status(400).json({
                status: "error",
                message: `Invalid organization entry: ${JSON.stringify(org)}`
            });
            }

            if (org.role === "ADMIN") {
            // Admin → all devices in org
            orgConditions.push({ organization_id: org.id });

            } else if (org.role === "USER") {
            if (!Array.isArray(org.devices)) {
                return res.status(400).json({
                status: "error",
                message: `Invalid , devices must be an array ${org.id}`
                });
            }
            orgConditions.push({ id: { in: org.devices } });

            } else {
            return res.status(400).json({
                status: "error",
                message: `Invalid role "${org.role}" in organization ${org.id}. Must be ADMIN or USER.`
            });
            }
        }


      if (orgConditions.length > 0) {
        devices = await gcamprisma.device.findMany({
          where: { OR: orgConditions },
          include: {
            organization: { select: { id: true, name: true } },
            latestlog: true
          }
        });
      }
    } else {
      return res.status(400).json({
        status: "error",
        message: "Invalid role or organization filter."
      });
    }

    return res.status(200).json({
      status: "success",
      data: devices
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



const deviceUpdate = async (req, res) => {
  try {
    const { device_id } = req.params;
    const {
      video_url,
      organization_id,
      site_id,
      location,
      name,
      max_count
    } = req.body;

    if (!device_id) {
      return res.status(400).json({
        status: "error",
        message: "Bad request, device_id is required"
      });
    }

    // Find existing device
    const device = await gcamprisma.device.findUnique({
      where: { id: Number(device_id) }
    });

    if (!device) {
      return res.status(404).json({
        status: "error",
        message: "Device not found"
      });
    }

    // Build update data by comparing values
    const updateData = {};
    if (video_url && video_url !== device.video_url) updateData.video_url = video_url;
    if (organization_id && Number(organization_id) !== device.organization_id) {
      const orgCheck = await gcamprisma.organization.findUnique({
        where: { id: Number(organization_id) }
      });
      if (!orgCheck) {
        return res.status(404).json({
          status: "error",
          message: "Invalid organization"
        });
      }
      updateData.organization_id = Number(organization_id);
    }
    if (site_id && Number(site_id) !== device.site_id) {
      const siteCheck = await gcamprisma.site.findFirst({
        where: {
          id: Number(site_id),
          organization_id: organization_id
            ? Number(organization_id)
            : device.organization_id
        }
      });
      if (!siteCheck) {
        return res.status(404).json({
          status: "error",
          message: "Invalid site"
        });
      }
      updateData.site_id = Number(site_id);
    }
    if (location && location !== device.location) updateData.location = location;
    if (name && name !== device.name) updateData.name = name;
    if (max_count && Number(max_count) !== device.max_count) updateData.max_count = Number(max_count);

    // If no changes, return early
    if (Object.keys(updateData).length === 0) {
      return res.status(200).json({
        status: "success",
        message: "No changes detected, device not updated",
        data: device
      });
    }

    // Update only modified fields
    const updatedDevice = await gcamprisma.device.update({
      where: { id: Number(device_id) },
      data: updateData
    });

    return res.status(200).json({
      status: "success",
      message: "Device updated successfully",
      data: updatedDevice
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



const deviceDelete = async (req,res) => {
    try {
        const {device_id} = req.params
        if (!device_id) {
            return res.status(400).json({
                status:"error",
                message:"Bad request"
            })
        }

        await gcamprisma.device.delete({
            where:{id:Number(device_id)}
        })

        return res.status(200).json({
            status:"success",
            message:"Device deleted successfully"
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: "error",
            message: "Internal Server Error",
            error: error.message
        });
    }
}
module.exports = {
    createDevice,
    deviceRegister,
    getdevices,
    deviceUpdate,
    deviceDelete
}
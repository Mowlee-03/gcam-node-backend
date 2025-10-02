const {PrismaClient}=require("../generated/prisma")
const gcamprisma = new PrismaClient()
//POST - /gcam/common/device/create
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

//POST - /api/device/register
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

    if (location && !Array.isArray(location)) {
      return res.status(400).json({
        status:"error",
        message:"Invalid location data"
      })
    }
    const [createdDevice] = await gcamprisma.$transaction([
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

    // Create LatestLog with mock data
     gcamprisma.latestLog.create({
      data: {
        device_id: createdDevice.id,
        imei: createdDevice.imei,
        organization_name: organizationCheck.name,
        site_name: siteCheck.name,
        garbage_image: "mock_garbage.jpg", // put default mock path or URL
        person_image: "mock_person.jpg",    // put default mock path or URL
        garbage_date:new Date(),
        person_date:new Date(),
        box_count:0
      }
    });

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

// GET - /api/device/all
const getAllDevcies = async (req,res) => {
  try {
    const devicedata = await gcamprisma.device.findMany({
      select:{
        id:true,
        imei:true,
        name:true,
        location:true,
        is_active:true,
        site:{
          select:{
            id:true,
            name:true
          }
        },
        organization:{
          select:{
            id:true,
            name:true
          }
        }
      }
    })

    res.status(200).json({
      status:"success",
      data:devicedata
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

//PUT - /api/device/update/:device_id
const updateDevice = async (req, res) => {
  try {
    const { device_id } = req.params;
    const { 
      name,
      location,
      organization_id,
      site_id,
      is_active,
      ...extraFields 
    } = req.body;

    if (!device_id|| isNaN(device_id)) {
      return res.status(400).json({
        status: "error",
        message: "Bad request, device_id is required"
      });
    }

    if (Object.keys(extraFields).length > 0) {
      return res.status(400).json({
        status: "error",
        message: `Invalid fields provided: ${Object.keys(extraFields).join(", ")}`
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

    const updateData = {};
    let deleteUserDevice = false;

    if (name && name !== device.name) updateData.name = name;

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
      deleteUserDevice = true; // only delete if organization changes
    }

    if (site_id && Number(site_id) !== device.site_id) {
      const siteCheck = await gcamprisma.site.findFirst({
        where: {
          id: Number(site_id),
          organization_id: organization_id ? Number(organization_id) : device.organization_id
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

    if (is_active !== undefined && is_active !== device.is_active) {
      updateData.is_active = Boolean(is_active);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(200).json({
        status: "info",
        message: "No changes detected, device not updated",
      });
    }

    let message = "Device updated successfully";

    // Delete UserDevice entries only if organization changed
    if (deleteUserDevice) {
      await gcamprisma.userDevice.deleteMany({
        where: {
          device_id: Number(device_id)
        }
      });
      message += " | All user relations for this device have been removed due to organization change";
    }

    await gcamprisma.device.update({
      where: { id: Number(device_id) },
      data: updateData
    });

    return res.status(200).json({
      status: "success",
      message
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


//DELETE - /api/device/delete/:device_id
const deviceDelete = async (req,res) => {
    try {
        const {device_id} = req.params
        if (!device_id|| isNaN(device_id)) {
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

//POST - /api/device/add/access/:user_id
const addDeviceAccess = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { devices } = req.body; // [1, 2, 3]

    if (!user_id|| isNaN(user_id) || !Array.isArray(devices) || devices.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Bad request. user_id and devices[] are required",
      });
    }

    // 🔹 Step 1: Check user exists
    const userExist = await gcamprisma.user.findUnique({
      where: { id: Number(user_id) },
      include: { organization: true }, // user’s org roles
    });

    if (!userExist) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    // 🔹 Step 2: Fetch devices
    const deviceList = await gcamprisma.device.findMany({
      where: { id: { in: devices.map(Number) } },
      select: { id: true, organization_id: true , name:true ,imei:true },
      include:{organization:{select:{name:true}}}
    });

    if (deviceList.length !== devices.length) {
      return res.status(400).json({
        status: "error",
        message: "Some device IDs are invalid",
      });
    }

    // 🔹 Step 3: Validate each device
    let assignableDevices = [];
    for (const d of deviceList) {
      const orgMembership = userExist.organization.find(
        (org) => org.organization_id === d.organization_id
      );

      if (!orgMembership) {
        return res.status(403).json({
          status: "error",
          message: `User does not belong to organization ${d.organization.name} (device ${d.name || d.imei})`,
        });
      }

      if (orgMembership.role === "ADMIN") {
        // Admin → no device assignment required
        continue;
      }

      if (orgMembership.role === "USER") {
        assignableDevices.push(d.id);
      } else {
        return res.status(403).json({
          status: "error",
          message: `Role ${orgMembership.role} is not allowed for device assignment (device ${d.name|| d.imei})`,
        });
      }
    }

    // 🔹 Step 4: Update device assignments (for USER role only)
    if (assignableDevices.length > 0) {
      await gcamprisma.userDevice.deleteMany({
        where: { user_id: Number(user_id) },
      });

      await gcamprisma.userDevice.createMany({
        data: assignableDevices.map((deviceId) => ({
          user_id: Number(user_id),
          device_id: deviceId,
        })),
        skipDuplicates: true,
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Device access updated successfully",
      assigned_devices: assignableDevices,
      skipped_as_admin: deviceList
        .filter((d) => !assignableDevices.includes(d.id))
        .map((d) => d.id),
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

//POST - /api/device/remove/access/:user_id
const removeDeviceAccess = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { devices } = req.body; // [1, 2, 3]

    if (!user_id|| isNaN(user_id) || !Array.isArray(devices) || devices.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Bad request. user_id and devices[] are required",
      });
    }

    // 🔹 Step 1: Check user exists
    const userExist = await gcamprisma.user.findUnique({
      where: { id: Number(user_id) },
      include: { organization: true },
    });

    if (!userExist) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    // 🔹 Step 2: Fetch devices
    const deviceList = await gcamprisma.device.findMany({
      where: { id: { in: devices.map(Number) } },
      select: { id: true, organization_id: true ,name:true,imei:true },
      include:{organization:{select:{name:true}}}
    });

    if (deviceList.length !== devices.length) {
      return res.status(400).json({
        status: "error",
        message: "Some device IDs are invalid",
      });
    }

    // 🔹 Step 3: Validate devices and prepare deletions
    let removableDevices = [];
    for (const d of deviceList) {
      const orgMembership = userExist.organization.find(
        (org) => org.organization_id === d.organization_id
      );

      if (!orgMembership) {
        return res.status(403).json({
          status: "error",
          message: `User does not belong to organization ${d.organization.name} (device ${d.name || d.imei})`,
        });
      }

      if (orgMembership.role === "ADMIN") {
        return res.status(403).json({
          status: "error",
          message: `User have ADMIN role already has full access. Cannot remove device ${d.name|| d.imei} individually.`,
        });
      }

      if (orgMembership.role === "USER") {
        removableDevices.push(d.id);
      } else {
        return res.status(403).json({
          status: "error",
          message: `Role ${orgMembership.role} is not allowed for device removal (device ${d.id})`,
        });
      }
    }

    // 🔹 Step 4: Remove device access
    if (removableDevices.length > 0) {
      await gcamprisma.userDevice.deleteMany({
        where: {
          user_id: Number(user_id),
          device_id: { in: removableDevices },
        },
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Device access removed successfully",
      removed_devices: removableDevices,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      error: error.message,
    });
  }
};



// FOR USER 

//POST - /api/device/viewall/:user_id
const getdevicesforuser = async (req, res) => {
  try {
    let { user_id } = req.params;

    if (!user_id|| isNaN(user_id)) {
      return res.status(400).json({
        status: "error",
        message: "Bad request, user_id is required"
      });
    }

    user_id = parseInt(user_id);

    // 1. Fetch the user with role + organizations + device access
    const user = await gcamprisma.user.findUnique({
      where: { id: user_id },
      include: {
        organization: {
          include: { organization: true } // UserOrganization → Organization
        },
        device_access: {
          include: { device: true } // UserDevice → Device
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found"
      });
    }

    let devices = [];

    // 2. SUPERADMIN → all active devices
    if (user.role === "SUPERADMIN") {
      devices = await gcamprisma.device.findMany({
        where: { is_active: true },
        select: {
          id: true,
          imei: true,
          video_url: true,
          name: true,
          location: true,
          site: { select: { id: true, name: true } },
          organization: { select: { id: true, name: true } },
          latestlog: true
        }
      });
    } else {
      // 3. USER → collect org + device conditions
      let orgConditions = [];

      for (const org of user.organization) {
        if (org.role === "ADMIN") {
          // Admin → all devices in org
          orgConditions.push({
            organization_id: org.organization_id,
            is_active: true
          });
        } else if (org.role === "USER") {
          const deviceIds = user.device_access.map(d => d.device_id);
          if (deviceIds.length > 0) {
            orgConditions.push({
              id: { in: deviceIds },
              is_active: true
            });
          }
        }
      }

      if (orgConditions.length > 0) {
        devices = await gcamprisma.device.findMany({
          where: { OR: orgConditions },
          select: {
            id: true,
            imei: true,
            video_url: true,
            name: true,
            location: true,
            site: { select: { id: true, name: true } },
            organization: { select: { id: true, name: true } },
            latestlog: true
          }
        });
      }
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

//GET - /api/device/garbage_count/:user_id
const getDeviceswithGarbageCount = async (req,res) => {
  try {
    let { user_id } = req.params;
    if (!user_id|| isNaN(user_id)) {
      return res.status(400).json({
        status: "error",
        message: "Bad request, missing user_id",
      });
    }

    user_id = Number(user_id);

    // Fetch user with device access
    const user = await gcamprisma.user.findUnique({
      where: { id: user_id },
      include: {
        organization: {
          include: {
            organization: true,
          },
        },
        device_access: {
          include: {
            device: {
              select: {
                id: true,
                imei: true,
                name: true,
                max_count:true,
                organization_id: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    // Block SUPERADMIN
    if (user.role === "SUPERADMIN") {
      return res.status(403).json({
        status: "error",
        message: "Access denied for SUPERADMIN, this data is only for USER",
      });
    }

    // Collect devices
    let devices = [];

    for (const orgLink of user.organization) {
      const org = orgLink.organization;

      if (orgLink.role === "ADMIN") {
        // Admin: all devices in this org
        const allDevices = await gcamprisma.device.findMany({
          where: { organization_id: org.id },
          select: {
            id: true,
            imei: true,
            name: true,
            max_count:true
          },
        });
        devices.push(...allDevices);
      } else {
        // User: only allowed devices
        const allowedDevices = user.device_access
          .filter((ud) => ud.device.organization_id === org.id)
          .map((ud) => ({
            id: ud.device.id,
            imei: ud.device.imei,
            name: ud.device.name,
            max_count:ud.device.max_count
          }));
        devices.push(...allowedDevices);
      }
    }

    return res.status(200).json({
      status: "success",
      data: devices,
    });
  } catch (error) {
    console.error("❌ Error fetching device garbage count details:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      error: error.message,
    });
  }
}

//PUT - /api/device/garbage_count/update/:device_id
const deviceGarbageCountUpdate = async (req, res) => {
  try {
    const { device_id } = req.params;
    const { max_count, ...extraFields } = req.body;

    if (!device_id|| isNaN(device_id)) {
      return res.status(400).json({
        status: "error",
        message: "Bad request, device_id is required"
      });
    }

    // ❌ Reject any extra fields
    if (Object.keys(extraFields).length > 0) {
      return res.status(400).json({
        status: "error",
        message: `Only 'max_count' can be updated. Invalid fields provided: ${Object.keys(extraFields).join(", ")}`
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

    // Check if max_count is provided and different
    if (max_count === undefined || Number(max_count) === device.max_count) {
      return res.status(200).json({
        status: "info",
        message: "No changes detected, device not updated",
      });
    }

    // Update max_count only
    await gcamprisma.device.update({
      where: { id: Number(device_id) },
      data: { max_count: Number(max_count) }
    });

    return res.status(200).json({
      status: "success",
      message: "Device garbage count updated successfully",
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


// GET - /api/device/location/details/:user_id
const deviceLocationDetails = async (req, res) => {
  try {
    let { user_id } = req.params;
    if (!user_id|| isNaN(user_id)) {
      return res.status(400).json({
        status: "error",
        message: "Bad request, missing user_id",
      });
    }

    user_id = Number(user_id);

    // Fetch user with device access
    const user = await gcamprisma.user.findUnique({
      where: { id: user_id },
      include: {
        organization: {
          include: {
            organization: true,
          },
        },
        device_access: {
          include: {
            device: {
              select: {
                id: true,
                imei: true,
                name: true,
                location: true,
                organization_id: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    // Block SUPERADMIN
    if (user.role === "SUPERADMIN") {
      return res.status(403).json({
        status: "error",
        message: "Access denied for SUPERADMIN, this data is only for USER",
      });
    }

    // Collect devices
    let devices = [];

    for (const orgLink of user.organization) {
      const org = orgLink.organization;

      if (orgLink.role === "ADMIN") {
        // Admin: all devices in this org
        const allDevices = await gcamprisma.device.findMany({
          where: { organization_id: org.id },
          select: {
            id: true,
            imei: true,
            name: true,
            location: true,
          },
        });
        devices.push(...allDevices);
      } else {
        // User: only allowed devices
        const allowedDevices = user.device_access
          .filter((ud) => ud.device.organization_id === org.id)
          .map((ud) => ({
            id: ud.device.id,
            imei: ud.device.imei,
            name: ud.device.name,
            location: ud.device.location,
          }));
        devices.push(...allowedDevices);
      }
    }

    return res.status(200).json({
      status: "success",
      data: devices,
    });
  } catch (error) {
    console.error("❌ Error fetching device location details:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      error: error.message,
    });
  }
};


// GET - /api/device/:device_id/latest/garbage_log
const deviceLatestgarbageLog = async (req,res) => {
  try {
    const {device_id}=req.params

    if (!device_id || isNaN(device_id)) {
      return res.status(400).json({
        status:"error",
        message:"Bad request , missing device_id"
      })
    }

    const latest_data  = await gcamprisma.latestLog.findUnique({
      where:{ device_id:Number(device_id) },
      select:{
        imei:true,
        garbage_image:true,
        garbage_date:true,
        box_count:true,
      }
    })

    return res.status(200).json({
      status:"success",
      data:latest_data
    })

  } catch (error) {
    console.error("❌ Error fetching device latest ", error);
    return res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      error: error.message,
    });
  }
}


module.exports = {
    createDevice,
    deviceRegister,
    getAllDevcies,
    updateDevice,
    deviceDelete,
    addDeviceAccess,
    removeDeviceAccess,


    getdevicesforuser,
    getDeviceswithGarbageCount,
    deviceGarbageCountUpdate,
    deviceLocationDetails,
    deviceLatestgarbageLog
}
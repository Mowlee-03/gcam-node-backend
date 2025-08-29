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
    await gcamprisma.latestLog.create({
      data: {
        device_id: createdDevice.id,
        imei: createdDevice.imei,
        organization_name: organizationCheck.name,
        site_name: siteCheck.name,
        garbage_image: "mock_garbage.jpg", // put default mock path or URL
        person_image: "mock_person.jpg"    // put default mock path or URL
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


const getdevices = async (req, res) => {
  try {
    let { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({
        status: "error",
        message: "Bad request, user_id is required"
      });
    }

    user_id = parseInt(user_id)
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

    // 2. SUPERADMIN → all devices
    if (user.role === "SUPERADMIN") {
      devices = await gcamprisma.device.findMany({
        include: {
          organization: { select: { id: true, name: true } },
          latestlog: true
        }
      });

    } else {
      // 3. USER → collect org + device conditions
      let orgConditions = [];

      // From organizations (via UserOrganization)
      for (const org of user.organization) {
        if (org.role === "ADMIN") {
          // Admin → all devices in org
          orgConditions.push({ organization_id: org.organization_id });
        } else if (org.role === "USER") {
          // User → specific devices linked in UserDevice
          const deviceIds = user.device_access.map(d => d.device_id);
          if (deviceIds.length > 0) {
            orgConditions.push({ id: { in: deviceIds } });
          }
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
      max_count,
      ...extraFields
    } = req.body;

    if (!device_id) {
      return res.status(400).json({
        status: "error",
        message: "Bad request, device_id is required"
      });
    }

        // ❌ Check for extra/unknown fields
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
        status: "info",
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


const addDeviceAccess = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { devices } = req.body; // [1, 2, 3]

    if (!user_id || !Array.isArray(devices) || devices.length === 0) {
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


const removeDeviceAccess = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { devices } = req.body; // [1, 2, 3]

    if (!user_id || !Array.isArray(devices) || devices.length === 0) {
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

module.exports = {
    createDevice,
    deviceRegister,
    getdevices,
    deviceUpdate,
    deviceDelete,
    addDeviceAccess,
    removeDeviceAccess
}
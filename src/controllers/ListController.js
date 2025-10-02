const {PrismaClient,GlobalRole,OrgRole}=require("../generated/prisma")
const gcamprisma = new PrismaClient()

//GET - /api/list/organizations
const getOrganizationList = async (req,res) => {
    try {
        const orgData = await gcamprisma.organization.findMany({
            select:{
                id:true,
                name:true
            }
        })

        return res.status(200).json({
            status:"success",
            data:orgData
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

//GET - /api/list/organization/:org_id/sites
const getSitesForOneOrganization = async (req,res) => {
    try {
        const {org_id} = req.params
            // validate first
        if (!org_id || isNaN(Number(org_id))) {
        return res.status(400).json({
            status: "error",
            message: "Bad request, missing or invalid org_id",
        });
        }

        const checkorgExist = await gcamprisma.organization.findUnique({
            where:{id:Number(org_id)}
        })

        if (!checkorgExist) {
            return res.status(404).json({
                status:"error",
                message:"Organization not found"
            })
        }

        const sitedata = await gcamprisma.site.findMany({
            where:{organization_id:Number(org_id)},
            select:{
                id:true,
                name:true,
                location:true
            }
        })

        return res.status(200).json({
            status:"success",
            message:"Fetching site list success",
            data:sitedata
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

//POST - /api/list/registered/devices
const getRegisteredDeviceList = async (req,res) => {
    try {
        const {org_ids} = req.body

        if (Array.isArray(org_ids)) {
            if (org_ids.length===0) {
                return res.status(400).json({
                    status:"error",
                    message:"Bad request"
                })
            }

            const devices = await gcamprisma.device.findMany({
                where:{organization_id:{in:org_ids},is_active:true},
                select : { 
                    id      :   true,
                    imei    :   true,
                    name    :   true,
                }
            })

            return res.status(200).json({
                status:"success",
                data:devices
            })
        }else if (org_ids==="ALL") {
            const devices = await gcamprisma.device.findMany({
                where:{is_active:true},
                select : { 
                    id      :   true,
                    imei    :   true,
                    name    :   true,
                }
            })

            return res.status(200).json({
                status:"success",
                data:devices
            })
        }else {
            return res.status(400).json({
                status:"error",
                message:"Something went wrong"
            })
        }


    } catch (error) {
        console.log(error)
        return res.status(500).json({
            status:"error",
            message:"Internal Server Error",
            error:error.message
        })
    }
}
 

//GET - /api/list/not-registered/devices
const getnonRegisteredDevicelist = async (req,res) => {
    try {
        const data = await gcamprisma.installedDevice.findMany({
            where : {
                is_registered:false
            }
        })

        return res.status(200).json({
            status:"success",
            data:data
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


const getloggedUserDeviceList = async (req, res) => {
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
                organization_id: true,
                is_active:true
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
          where: { organization_id: org.id ,is_active:true},
          select: {
            id: true,
            imei: true,
            name: true,
          },
        });
        devices.push(...allDevices);
      } else {
        // User: only allowed devices
        const allowedDevices = user.device_access
          .filter((ud) => ud.device.organization_id === org.id&&ud.device.is_active)
          .map((ud) => ({
            id: ud.device.id,
            imei: ud.device.imei,
            name: ud.device.name,
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




module.exports = {
    getOrganizationList,
    getSitesForOneOrganization,
    getRegisteredDeviceList,
    getnonRegisteredDevicelist,
    getloggedUserDeviceList
}
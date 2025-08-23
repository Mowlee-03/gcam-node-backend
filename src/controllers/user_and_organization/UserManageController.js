const {PrismaClient,GlobalRole,OrgRole}=require("../../generated/prisma")
const { hashPassword } = require("../../utils/password")
const gcamprisma = new PrismaClient()
const globalroles = Object.values(GlobalRole)
const orgroles = Object.values(OrgRole)


const createuser = async (req, res) => {
  const {
    username,
    email,
    password,
    mobile,
    role,
    organizations, // [{ id: 1, role: "ADMIN" }, { id: 2, role: "USER", devices: [5,6] }]
  } = req.body;

  try {
    // Basic required fields
    if (!username || !email || !password || !mobile || !role) {
      return res.status(400).json({
        status: "error",
        message: "Bad request , missing required fields",
      });
    }

    // Unique email check
    const userexistwithemail = await gcamprisma.user.findUnique({ where: { email } });
    if (userexistwithemail) {
      return res.status(409).json({
        status: "error",
        message: "User with this 'email' already exists",
      });
    }

    // Unique mobile check
    const mobilenumberexist = await gcamprisma.user.findUnique({ where: { mobile } });
    if (mobilenumberexist) {
      return res.status(409).json({
        status: "error",
        message: "Mobile number already exists for another user",
      });
    }

    // Role validation
    if (role && !globalroles.includes(role)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid user role",
        allowedroles: globalroles,
        receivedrole: role,
      });
    }

    // Extra validation if role is USER
    if (role === "USER") {
      if (!organizations || !Array.isArray(organizations) || organizations.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "At least one organization is required",
        });
      }

      // Fetch orgs with names
      const orgIds = organizations.map(o => o.id);
      const orgsExist = await gcamprisma.organization.findMany({
        where: { id: { in: orgIds } },
        select: { id: true, name: true },
      });

      const foundOrgIds = orgsExist.map(o => o.id);
      const missingOrgs = orgIds.filter(id => !foundOrgIds.includes(id));

      if (missingOrgs.length > 0) {
        const missingOrgNames = missingOrgs.map(id => {
          const org = organizations.find(o => o.id === id);
          return org ? `id:${org.id}` : id;
        });
        return res.status(400).json({
          status: "error",
          message: "Some organizations not found",
          missingOrganizations: missingOrgNames,
        });
      }

      // Validate each organization individually
      for (const org of organizations) {
        const orgData = orgsExist.find(o => o.id === org.id);

        if (!org.role) {
          return res.status(400).json({
            status: "error",
            message: `org_role is required for organization '${orgData?.name || org.id}'`,
          });
        }

        if (org.role && !orgroles.includes(org.role)) {
          return res.status(400).json({
            status: "error",
            message: "Invalid org role",
            allowedroles: orgroles,
            receivedrole: `Received role ${org.role} for organization '${orgData?.name || org.id}'`,
          });
        }

        if (org.role === "USER") {
          if (!org.devices || org.devices.length === 0) {
            return res.status(400).json({
              status: "error",
              message: `Devices are required for organization '${orgData?.name || org.id}' when org_role is USER`,
            });
          }

          // Check devices exist with org reference
          const devsExist = await gcamprisma.device.findMany({
            where: { id: { in: org.devices } },
            select: { id: true, organization_id: true },
          });

          const foundDevIds = devsExist.map(d => d.id);
          const missingDevs = org.devices.filter(id => !foundDevIds.includes(id));
          if (missingDevs.length > 0) {
            return res.status(400).json({
              status: "error",
              message: `Some devices not found for organization '${orgData?.name || org.id}'`,
              missingDevices: missingDevs,
            });
          }

          // Check devices belong to that organization
          const invalidDevs = devsExist.filter(d => d.organization_id !== org.id);
          if (invalidDevs.length > 0) {
            return res.status(400).json({
              status: "error",
              message: `Some devices do not belong to organization '${orgData?.name || org.id}'`,
              invalidDevices: invalidDevs.map(d => d.id),
            });
          }
        }
      }
    }

    const hashedpass = await hashPassword(password);

    // Start transaction
    const result = await gcamprisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: { username, email, password: hashedpass, mobile, role },
      });

      // If role = USER, create org + device relations
      if (role === "USER") {
        for (const org of organizations) {
          // Create UserOrganization
          await tx.userOrganization.create({
            data: {
              user_id: newUser.id,
              organization_id: org.id,
              role: org.role,
            },
          });

          // If org_role = USER → also create UserDevice links
          if (org.role === "USER" && org.devices && org.devices.length > 0) {
            for (const deviceId of org.devices) {
              await tx.userDevice.create({
                data: {
                  user_id: newUser.id,
                  device_id: deviceId,
                },
              });
            }
          }
        }
      }

      return newUser;
    });

    return res.status(200).json({
      status: "success",
      message: "User created successfully",
      data: result,
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



const getuserdetail = async (req, res) => {
  const { user_id } = req.params;
  if (!user_id) {
    return res.status(400).json({
      status: "error",
      message: "Bad request , user_id is required"
    });
  }

  try {
    const user = await gcamprisma.user.findUnique({
      where: { id: Number(user_id) },
      include: {
        organization: {
          include: {
            organization: true, // includes org info
          },
        },
        device_access: {
          include: {
            device: true, // includes device info
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found"
      });
    }

    // --- SUPERADMIN: Full access
    if (user.role === "SUPERADMIN") {

      return res.status(200).json({
        status: "success",
        data: {
          user,
          organizations: "ALL",
          devices: "ALL",
        },
      });
    }

    // --- USER: need to check organization roles
    let orgAccess = [];

    for (const orgLink of user.organization) {
      const org = orgLink.organization;

      if (orgLink.role === "ADMIN") {
        // ADMIN inside an org = all devices of that org
        orgAccess.push({
            id: org.id,
            name: org.name,
            access: "ALL",
            devices: await gcamprisma.device.findMany({
                where: { organization_id: org.id },
            }),
        });
      } else {
        // USER inside org = only specific devices
        const allowedDevices = user.device_access
          .filter((ud) => ud.device.organization_id === org.id)
          .map((ud) => ud.device);

        orgAccess.push({
            id: org.id,
            name: org.name,
            access: "LIMITED",
            devices: allowedDevices
        });
      }
    }

    return res.status(200).json({
      status: "success",
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
        },
        organizations: orgAccess,
      },
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


const getallusers = async (req,res) => {
    try {
        const usersdata = await gcamprisma.user.findMany({
            include:{
                organization:true,
                device_access:true
            }
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({
        status: "error",
        message: "Internal Server Error",
        error: error.message,
        });
    }
}




module.exports = {
    createuser,
    getuserdetail,

}
const {PrismaClient,GlobalRole,OrgRole}=require("../generated/prisma")
const { hashPassword } = require("../utils/password")
const gcamprisma = new PrismaClient()
const globalroles = Object.values(GlobalRole)
const orgroles = Object.values(OrgRole)

const inituser = async (req, res) => {
  try {
    // check if any user already exists
    const existingUser = await gcamprisma.user.findFirst();
    if (existingUser) {
      return res.status(400).json({
        status: "error",
        message: "Initialization already done. Users exist in the system.",
      });
    }

    // get user details from body
    const { fullname, username, password, mobile, } = req.body;

    if (!fullname || !username || !password || !mobile) {
      return res.status(400).json({
        status: "error",
        message: "Missing required fields",
      });
    }

    // hash password
    const hashedPassword = await hashPassword(password)

    // create the first user with ADMIN role
    const newUser = await gcamprisma.user.create({
      data: {
        fullname,
        username,
        password: hashedPassword,
        mobile,
        role: "SUPERADMIN", // 🚨 give first user admin rights
      },
    });

    return res.status(201).json({
      status: "success",
      message: "First user created successfully",
      data: newUser
    });
  } catch (error) {
    console.error("❌ Error creating initial user:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      error: error.message,
    });
  }
};


const createuser = async (req, res) => {
  const {
    username,
    fullname,
    password,
    mobile,
    role,
    organizations, // [{ id: 1, role: "ADMIN" }, { id: 2, role: "USER", devices: [5,6] }]
  } = req.body;

  try {
    // Basic required fields
    if (!username || !fullname || !password || !mobile || !role) {
      return res.status(400).json({
        status: "error",
        message: "Bad request , missing required fields",
      });
    }

    // Unique username check
    const userexistwithUsername = await gcamprisma.user.findUnique({ where: { username } });
    if (userexistwithUsername) {
      return res.status(409).json({
        status: "error",
        message: "User with this 'username' already exists",
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
          return org ? org.id : id;
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

        if (!org.role || !org.id) {
          return res.status(400).json({
            status: "error",
            message: `Bad request for '${orgData?.name || org.id}'`,
          });
        }

        if (org.role && !orgroles.includes(org.role)) {
          return res.status(400).json({
            status: "error",
            message: "Invalid org role",
            allowedroles: orgroles,
            receivedrole: `Received role ${org.role} for '${orgData?.name || org.id}'`,
          });
        }

        if (org.role === "USER") {
          if (!org.devices || org.devices.length === 0) {
            return res.status(400).json({
              status: "error",
              message: `Devices are required for '${orgData?.name || org.id}' when org_role is USER`,
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
              message: `Some devices not found for '${orgData?.name || org.id}'`,
              missingDevices: missingDevs,
            });
          }

          // Check devices belong to that organization
          const invalidDevs = devsExist.filter(d => d.organization_id !== org.id);
          if (invalidDevs.length > 0) {
            return res.status(400).json({
              status: "error",
              message: `Some devices do not belong to '${orgData?.name || org.id}'`,
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
        data: { username, fullname, password: hashedpass, mobile, role },
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

// ✅ Get all users with org + device access
const getAllUsers = async (req, res) => {
  try {
    const users = await gcamprisma.user.findMany({
      include: {
        organization: {
          include: {
            organization: true, // org info
          },
        },
        device_access: {
          include: {
            device: true, // device info
          },
        },
      },
    });

    if (!users || users.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "No users found",
      });
    }

    // Process each user into structured access response
    const userAccessList = await Promise.all(
      users.map(async (user) => {
        // --- SUPERADMIN: Full access
        if (user.role === "SUPERADMIN") {
          return {
            id: user.id,
            username: user.username,
            fullname: user.fullname,
            mobile: user.mobile,
            role: user.role,
            organizations: "ALL",
          };
        }

        // --- USER / ADMIN (org-level)
        let orgAccess = [];
        for (const orgLink of user.organization) {
          const org = orgLink.organization;

          if (orgLink.role === "ADMIN") {
            // ADMIN inside org → all devices of that org
            const allDevices = await gcamprisma.device.findMany({
              where: { organization_id: org.id },
            });

            orgAccess.push({
              id: org.id,
              name: org.name,
              org_role: orgLink.role, // ✅ include org_role here
              access: "ALL",
              devices: allDevices,
            });
          } else {
            // USER inside org → only specific devices linked
            const allowedDevices = user.device_access
              .filter((ud) => ud.device.organization_id === org.id)
              .map((ud) => ud.device);

            orgAccess.push({
              id: org.id,
              name: org.name,
              org_role: orgLink.role, // ✅ include org_role here
              access: "LIMITED",
              devices: allowedDevices,
            });
          }
        }

        return {
          id: user.id,
          username: user.username,
          fullname: user.fullname,
          mobile: user.mobile,
          role: user.role,
          organizations: orgAccess,
        };
      })
    );

    return res.status(200).json({
      status: "success",
      data: userAccessList,
    });
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      error: error.message,
    });
  }
};


const updateUser = async (req, res) => {
  const { user_id } = req.params;
  const { username, fullname, mobile, role, } = req.body;

  try {
    if (!user_id) {
      return res.status(400).json({
        status: "error",
        message: "Bad request",
      });
    }

    // ✅ Check for extra fields
    const allowedFields = ["username", "fullname", "mobile", "role"];
    const extraFields = Object.keys(req.body).filter(
      (key) => !allowedFields.includes(key)
    );

    if (extraFields.length > 0) {
      return res.status(400).json({
        status: "error",
        message: "Invalid fields in request body",
        invalidFields: extraFields,
        allowedFields,
      });
    }

    // Fetch existing user with orgs/devices
    const existingUser = await gcamprisma.user.findUnique({
      where: { id: Number(user_id) },
      include: {
        organization: true,
        device_access: true,
      },
    });

    if (!existingUser) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    const updateData = {};

    if (username) updateData.username = username;
    if (fullname) updateData.fullname = fullname;
    if (mobile) updateData.mobile = mobile;

    if (role && role !== existingUser.role) {
      if (!globalroles.includes(role)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid global role",
          allowedroles: globalroles,
          receivedrole: role,
        });
      }
      updateData.role = role;

      if (existingUser.role === "USER" && role === "SUPERADMIN") {
        await gcamprisma.userOrganization.deleteMany({
          where: { user_id: Number(user_id) },
        });
        await gcamprisma.userDevice.deleteMany({
          where: { user_id: Number(user_id) },
        });
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(200).json({
        status: "info",
        message: "No changes detected",
      });
    }

    const result = await gcamprisma.user.update({
      where: { id: Number(user_id) },
      data: updateData,
    });

    return res.status(200).json({
      status: "success",
      message: "User updated successfully",
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



const deleteUser = async (req, res) => {
  const { user_id } = req.params;

  try {
    if (!user_id) {
      return res.status(400).json({
        status: "error",
        message: "Bad request, user_id is required",
      });
    }

    const existingUser = await gcamprisma.user.findUnique({
      where: { id: Number(user_id) },
    });

    if (!existingUser) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    // Transaction to delete user + related links
    await gcamprisma.$transaction(async (tx) => {
      // delete org links
      await tx.userOrganization.deleteMany({
        where: { user_id: Number(user_id) },
      });

      // delete device links
      await tx.userDevice.deleteMany({
        where: { user_id: Number(user_id) },
      });

      // finally delete user
      await tx.user.delete({
        where: { id: Number(user_id) },
      });
    });

    return res.status(200).json({
      status: "success",
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting user:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      error: error.message,
    });
  }
};


const usersAndOrganizations = async (req, res) => {
  try {
    const users = await gcamprisma.user.findMany({
      where: { role: "USER" },
      select: {
        id: true,
        username:true,
        fullname: true,
        organization: {
          select: {
            role: true,
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Transform the data to match your required response
    const result = users.map((user) => ({
      id: user.id,
      name: user.fullname ?? user.username,
      org_count: user.organization.length,
      organization: user.organization.map((org) => ({
        id: org.organization.id,
        name: org.organization.name,
        role: org.role,
      })),
    }));

    return res.status(200).json({
      status: "success",
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


const userAndDevices = async (req, res) => {
  try {
    const userdata = await gcamprisma.user.findMany({
      where: {
        role: "USER",
        organization: {
          some: { role: "USER" },
        },
      },
      select: {
        id: true,
        name: true,
        organization: {
          select: {
            role: true,
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        device_access: {
          select: {
            device: {
              select: {
                id: true,
                imei: true,
                name: true,
                organization_id: true,
              },
            },
          },
        },
      },
    });

    // transform
    const result = userdata.map((user) => {
      // group devices under their organization
      const orgs = user.organization.map((org) => {
        const orgDevices = user.device_access
          .map((da) => da.device)
          .filter((d) => d.organization_id === org.organization.id);

        return {
          id: org.organization.id,
          name: org.organization.name,
          role: org.role,
          devices: orgDevices.map((d) => ({
            id: d.id,
            imei: d.imei,
            name: d.name,
          })),
        };
      });

      const deviceCount = orgs.reduce(
        (acc, org) => acc + org.devices.length,
        0
      );

      return {
        id: user.id,
        name: user.name,
        org_count: orgs.length,
        device_count: deviceCount,
        organization: orgs,
      };
    });

    return res.status(200).json({
      status: "success",
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

module.exports = {
    createuser,
    getAllUsers,
    updateUser,
    deleteUser,
    usersAndOrganizations,
    userAndDevices,
    inituser
}
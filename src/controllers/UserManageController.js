const {PrismaClient,GlobalRole,OrgRole}=require("../generated/prisma")
const { hashPassword } = require("../utils/password")
const gcamprisma = new PrismaClient()
const globalroles = Object.values(GlobalRole)
const orgroles = Object.values(OrgRole)



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
  const {
    username,
    fullname,
    password,
    mobile,
    role,
    organizations, // optional [{ id, role, devices }]
  } = req.body;

  try {
    // Fetch existing user with orgs/devices
    const existingUser = await gcamprisma.user.findUnique({
      where: { id: Number(user_id) },
      include: {
        organization: true, // [{ id, user_id, organization_id, role }]
        device_access: true, // [{ id, user_id, device_id }]
      },
    });

    if (!existingUser) {
      return res.status(404).json({ status: "error", message: "User not found" });
    }

    // ---------- BASIC FIELD CHANGES ----------
    let updateData = {};

    if (fullname && fullname !== existingUser.fullname) {
      updateData.fullname = fullname;
    }

    if (username && username !== existingUser.username) {
      const usernameExists = await gcamprisma.user.findFirst({
        where: { username, id: { not: Number(user_id) } },
      });
      if (usernameExists) {
        return res.status(409).json({ status: "error", message: "Username already exists" });
      }
      updateData.username = username;
    }

    if (mobile && mobile !== existingUser.mobile) {
      const mobileExists = await gcamprisma.user.findFirst({
        where: { mobile, id: { not: Number(user_id) } },
      });
      if (mobileExists) {
        return res.status(409).json({ status: "error", message: "Mobile already exists" });
      }
      updateData.mobile = mobile;
    }

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
    }

    if (password) {
      const hashedpass = await hashPassword(password);
      if (hashedpass !== existingUser.password) {
        updateData.password = hashedpass;
      }
    }

    // ---------- ORG + DEVICE UPDATES ----------
    let orgUpdatesNeeded = false;
    let orgDiffOps = []; // holds insert/update/delete instructions

    if (role === "USER" && organizations) {
      // Map current orgs/devices
      const currentOrgs = existingUser.organization.map(o => ({
        orgId: o.organization_id,
        role: o.role,
      }));
      const currentDevices = existingUser.device_access.map(d => ({
        deviceId: d.device_id,
        orgId: existingUser.organization.find(o => o.user_id === d.user_id)?.organization_id,
      }));

      const incomingOrgs = organizations.map(o => ({
        orgId: o.id,
        role: o.role,
        devices: o.devices || [],
      }));

      // Build sets for comparison
      const currentOrgIds = currentOrgs.map(o => o.orgId);
      const incomingOrgIds = incomingOrgs.map(o => o.orgId);

      // Orgs to remove
      for (const orgId of currentOrgIds) {
        if (!incomingOrgIds.includes(orgId)) {
          orgUpdatesNeeded = true;
          orgDiffOps.push({ action: "removeOrg", orgId });
        }
      }

      // Orgs to add or update
      for (const org of incomingOrgs) {
        const existing = currentOrgs.find(o => o.orgId === org.orgId);
        if (!existing) {
          // New org → add
          orgUpdatesNeeded = true;
          orgDiffOps.push({ action: "addOrg", org });
        } else if (existing.role !== org.role) {
          // Role changed → update
          orgUpdatesNeeded = true;
          orgDiffOps.push({ action: "updateOrgRole", org });
        }

        // Device diff (only if org.role === USER)
        if (org.role === "USER") {
          const existingDevs = currentDevices
            .filter(d => d.orgId === org.orgId)
            .map(d => d.deviceId);
          const incomingDevs = org.devices;

          // Devices to remove
          for (const devId of existingDevs) {
            if (!incomingDevs.includes(devId)) {
              orgUpdatesNeeded = true;
              orgDiffOps.push({ action: "removeDevice", orgId: org.orgId, deviceId: devId });
            }
          }

          // Devices to add
          for (const devId of incomingDevs) {
            if (!existingDevs.includes(devId)) {
              orgUpdatesNeeded = true;
              orgDiffOps.push({ action: "addDevice", orgId: org.orgId, deviceId: devId });
            }
          }
        }
      }
    }

    // ---------- NOTHING CHANGED ----------
    if (Object.keys(updateData).length === 0 && !orgUpdatesNeeded) {
      return res.status(200).json({
        status: "success",
        message: "No changes detected",
      });
    }

    // ---------- TRANSACTION ----------
    const result = await gcamprisma.$transaction(async (tx) => {
      let updatedUser = existingUser;

      // Basic update
      if (Object.keys(updateData).length > 0) {
        updatedUser = await tx.user.update({
          where: { id: Number(user_id) },
          data: updateData,
        });
      }

      // Apply org/device diffs
      for (const op of orgDiffOps) {
        switch (op.action) {
          case "removeOrg":
            await tx.userOrganization.deleteMany({
              where: { user_id: updatedUser.id, organization_id: op.orgId },
            });
            await tx.userDevice.deleteMany({
              where: { user_id: updatedUser.id },
              // optional: filter by org's devices
            });
            break;

          case "addOrg":
            await tx.userOrganization.create({
              data: {
                user_id: updatedUser.id,
                organization_id: op.org.orgId,
                role: op.org.role,
              },
            });
            if (op.org.role === "USER") {
              for (const deviceId of op.org.devices) {
                await tx.userDevice.create({
                  data: { user_id: updatedUser.id, device_id: deviceId },
                });
              }
            }
            break;

          case "updateOrgRole":
            await tx.userOrganization.updateMany({
              where: { user_id: updatedUser.id, organization_id: op.org.orgId },
              data: { role: op.org.role },
            });
            break;

          case "removeDevice":
            await tx.userDevice.deleteMany({
              where: { user_id: updatedUser.id, device_id: op.deviceId },
            });
            break;

          case "addDevice":
            await tx.userDevice.create({
              data: { user_id: updatedUser.id, device_id: op.deviceId },
            });
            break;
        }
      }

      return updatedUser;
    });

    return res.status(200).json({
      status: "success",
      message: "User updated successfully",
      data: result,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", message: "Internal Server Error", error: error.message });
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


module.exports = {
    createuser,
    getAllUsers,
    updateUser,
    deleteUser
}
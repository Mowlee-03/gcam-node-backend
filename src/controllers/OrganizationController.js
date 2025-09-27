const {PrismaClient,OrgRole}=require("../generated/prisma")
const gcamprisma = new PrismaClient()
const orgroles = Object.values(OrgRole)


// POST - /api/organization/create
const createOrganization = async (req,res) => {
    try {
        let {name}=req.body
        if (!name) {
            return res.status(400).json({
                status:"error",
                message:"Bad request , name is required"
            })
        }
        name = name.trim();
        const isalreadyExistName = await gcamprisma.organization.findFirst({
            where:{name:name}
        })

        if (isalreadyExistName) {
            return res.status(409).json({
                status:"error",
                message:"Name already exist"
            })
        }

        await gcamprisma.organization.create({
            data:{name:name}
        })
        return res.status(201).json({
            status:"success",
            message:"Organization created successfully"
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

// GET - /api/organization/viewall
const getAllOrganization = async (req, res) => {
  try {
    const orgDatas = await gcamprisma.organization.findMany({
      include: {
        _count: {
          select: {
            sites: true,
            devices: true,
          },
        },
      },
    });

    const formattedOrgs = orgDatas.map(({ _count, ...org }) => ({
      ...org,                // keep all organization columns
      sites: _count.sites,   // add count
      devices: _count.devices,
    }));

    return res.status(200).json({
      status: "success",
      message: "Fetching organizations with counts success",
      data: formattedOrgs,
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

//PUT - /api/organization/update/:org_id
const updateOrganization = async (req,res) => {
    const {org_id}=req.params
    const {name}=req.body
    try {
        if (!org_id || !name) {
            return res.status(400).json({
                status:400,
                message:"Bad request"
            })
        }

        const org = await gcamprisma.organization.findUnique({
            where:{id:Number(org_id)}
        })

        if (!org) {
            return res.status(404).json({
                status:"error",
                message:"Organization not found"
            })
        }

        if (name && name !== org.name) {
            await gcamprisma.organization.update({
                where:{id:Number(org_id)},
                data:{
                    name:name
                }
            })
            return res.status(200).json({
                status:"success",
                message:"Updated successfully"
            })

        }else{
            return res.status(200).json({
                status:"info",
                message:"No changes made"
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

//DELETE - /api/organization/delete/:org_id
const deleteOrganization = async (req,res) => {
    const {org_id} = req.params
    try {
        if (!org_id) {
            return res.status(400).json({
                status:"error",
                message:"Bad request"
            })
        }
        const data = await gcamprisma.organization.findUnique({
          where:{id:Number(org_id)}
        })

        if (!data) {
          return res.status(404).json({
            status:"error",
            message:"Organization not found"
          })
        }
        await gcamprisma.organization.delete({
            where:{id:Number(org_id)}
        })


        return res.status(200).json({
            status:"success",
            message:"Organization deleted successfully"
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


// POST - /api/organization/add/access/:user_id
const addOrgAccess = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { organization } = req.body; // [{id:1,role:"ADMIN"},{id:2,role:"USER"}]

    if (!user_id) {
      return res.status(400).json({
        status: "error",
        message: "Bad request, user_id required",
      });
    }

    const existData = await gcamprisma.user.findUnique({
      where: { id: Number(user_id) },
      include: {
        organization: {
          select: {
            organization_id: true,
            role: true,
          },
        },
      },
    });

    if (!existData) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    if (existData.role !== "USER") {
      return res.status(403).json({
        status: "error",
        message: "Organization assigning only for Clients",
      });
    }

    if (!organization || !Array.isArray(organization) || organization.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Bad request, at least one organization entry is required",
      });
    }

    const results = [];

    // ✅ Loop through each org request
    for (const org of organization) {
      const alreadyAssigned = await gcamprisma.userOrganization.findUnique({
        where: {
          user_id_organization_id: {
            user_id: Number(user_id),
            organization_id: org.id,
          },
        },
        include: {
          organization: { select: { name: true } }, // 👈 fetch org name
        },
      });

      if (alreadyAssigned) {
        results.push({
          organization_id: org.id,
          orgname: alreadyAssigned.organization.name, // 👈 org name added
          role: alreadyAssigned.role,
          status: "skipped - already assigned",
        });
      } else {
        const newOrg = await gcamprisma.userOrganization.create({
          data: {
            user_id: Number(user_id),
            organization_id: org.id,
            role: org.role || "USER",
          },
          include: {
            organization: { select: { name: true } }, // 👈 fetch org name
          },
        });

        results.push({
          organization_id: newOrg.organization_id,
          orgname: newOrg.organization.name, // 👈 org name added
          role: newOrg.role,
          status: "created",
        });
      }
    }

    return res.status(200).json({
      status: "success",
      message: "Organization assignment process completed",
      data: results,
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


// Delete - /api/organization/remove/access/:user_id
const removeOrgAccess = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { organization } = req.body; // [{id:1,name:""}, {id:2,name:""}]

    if (!user_id) {
      return res.status(400).json({
        status: "error",
        message: "Bad request, user_id required",
      });
    }

    if (!organization || !Array.isArray(organization) || organization.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Bad request, at least one organization entry is required",
      });
    }

    const results = [];

    for (const org of organization) {
      if (!org.id||!org.name) {
        return res.status(400).json({
          status: "error",
          message: "Bad request, organization id and name are required",
        });
      }
      const assigned = await gcamprisma.userOrganization.findUnique({
        where: {
          user_id_organization_id: {
            user_id: Number(user_id),
            organization_id: org.id,
          },
        },
      });

      if (!assigned) {
        results.push({
          organization_id: org.id,
          orgname: null,
          status: "skipped - not assigned",
        });
      } else {
        // ✅ Remove UserOrganization
        await gcamprisma.userOrganization.delete({
          where: {
            user_id_organization_id: {
              user_id: Number(user_id),
              organization_id: org.id,
            },
          },
        });

        let deviceCleanupCount = 0;

        // ✅ If role was USER → remove all UserDevice under that organization
        if (assigned.role === "USER") {
          const deleted = await gcamprisma.userDevice.deleteMany({
            where: {
              user_id: Number(user_id),
              device: {
                organization_id: org.id, // 👈 no need to query devices first
              },
            },
          });
          deviceCleanupCount = deleted.count;
        }

        results.push({
          organization_id: org.id,
          orgname: org.name,
          role: assigned.role,
          status: "removed",
          devices_removed: deviceCleanupCount,
        });
      }
    }

    return res.status(200).json({
      status: "success",
      message: "Organization access removal process completed",
      data: results,
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

// PUT - /api/organization/remove/access/:user_id
const updateUserOrganziationRole = async (req, res) => {
  try {
    const { user_id, org_id, role } = req.body;

    if (!user_id || !org_id || !role) {
      return res.status(400).json({
        status: "error",
        message: "Bad request, missing required fields"
      });
    }

    // find existing access
    const orgAccess = await gcamprisma.userOrganization.findUnique({
      where: {
        user_id_organization_id: {
          user_id: Number(user_id),
          organization_id: Number(org_id),
        },
      },
    });

    if (!orgAccess) {
      return res.status(404).json({
        status: "error",
        message: "Access not found",
      });
    }

    const existorgAccessRole = orgAccess.role;

    // validate role
    if (!orgroles.includes(role)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid org role",
        allowedroles: orgroles,
        receivedrole: role,
      });
    }

    // no change
    if (role === existorgAccessRole) {
      return res.status(200).json({
        status: "success",
        message: "No changes made",
      });
    }

    // role transition handling
    if (existorgAccessRole === "USER" && role === "ADMIN") {
      // remove all device access
      await gcamprisma.userDevice.deleteMany({
        where: { user_id: Number(user_id) },
      });
    }

    // update organization role
    await gcamprisma.userOrganization.update({
      where: {
        user_id_organization_id: {
          user_id: Number(user_id),
          organization_id: Number(org_id),
        },
      },
      data: { role },
    });

    return res.status(200).json({
      status: "success",
      message:
        existorgAccessRole === "ADMIN" && role === "USER"
          ? "Role updated to USER, please assign devices later"
          : "Org Role updated to ADMIN, can access ALL devices",
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
    createOrganization,
    getAllOrganization,
    updateOrganization,
    deleteOrganization,
    addOrgAccess,
    removeOrgAccess,
    updateUserOrganziationRole
}
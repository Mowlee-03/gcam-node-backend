const {PrismaClient}=require("../generated/prisma")
const gcamprisma = new PrismaClient()


const createsite = async (req,res) => {
    try {
        const {
            org_id,
            name,
            location
        } = req.body

        if (!org_id || !name || !location || !Array.isArray(location) || location.length === 0) {
            return res.status(400).json({
                status: "error",
                message: "Bad request , missing required fields",
            });
        }

        const checkOrganization = await gcamprisma.organization.findUnique({
            where:{id:org_id}
        })
        if (!checkOrganization) {
            return res.status(404).json({
                status:"error",
                message:"Organization Not found"
            })
        }

        const sitenameCheckInOrganization = await gcamprisma.site.findFirst({
            where:{
                organization_id:org_id,
                name:name
            }
        })

        if (sitenameCheckInOrganization) {
            return res.status(409).json({
                status:"error",
                message:"Site name already exist in given organization"
            })
        }

        const newsite = await gcamprisma.site.create({
            data:{
                organization_id:org_id,
                name:name,
                location:location
            }
        })

        return res.status(200).json({
            status:"success",
            message:"Site created successfully",
            data:newsite
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


const allSiteDetails = async (req, res) => {
    try {
        const { organization } = req.body;

        let sites;

        if (organization === "ALL") {
            sites = await gcamprisma.site.findMany({
                include: {
                    organization: { select: { id: true, name: true } },
                    _count: { select: { devices: true } }
                }
            });
        } else if (Array.isArray(organization) && organization.length > 0) {
            sites = await gcamprisma.site.findMany({
                where: { organization_id: { in: organization } }, // ⚡ make sure field name matches schema
                include: {
                    organization: { select: { id: true, name: true } },
                    _count: { select: { devices: true } }
                }
            });
        } else {
            return res.status(400).json({
                status: "error",
                message: "Invalid organization filter. Must be 'ALL' or an array of org IDs."
            });
        }

        // 🔄 alias device count
        const formattedSites = sites.map(site => ({
            ...site,
            deviceCount: site._count.devices,
            _count: undefined
        }));

        return res.status(200).json({
            status: "success",
            data: formattedSites
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


const viewOnesiteDetaily = async (req,res) => {
    try {
        const {site_id}=req.params
        if (!site_id) {
            return res.status(400).json({
                status:"error",
                message:"Bad request , missing required field"
            })
        }
        const sitedetails = await gcamprisma.site.findUnique({
            where:{ id : site_id},
            include:{
                organization:{ select : { name : true } },
                devices:true
            }
        })

        return res.status(200).json({
            status:"success",
            data:sitedetails
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


const updateSite = async (req, res) => {
  const { site_id } = req.params;
  const { name, location } = req.body;

  try {
    if (!site_id || !name || !location || !Array.isArray(location)) {
      return res.status(400).json({
        status: "error",
        message: "Bad request, missing required fields"
      });
    }

    const site = await gcamprisma.site.findUnique({
      where: { id: Number(site_id) }
    });

    if (!site) {
      return res.status(404).json({
        status: "error",
        message: "Site not found"
      });
    }

    // Compare values safely
    const isNameSame = name === site.name;
    const isLocationSame = JSON.stringify(location) === JSON.stringify(site.location);

    if (!isNameSame || !isLocationSame) {
      await gcamprisma.site.update({
        where: { id: Number(site_id) },  // ✅ Missing before
        data: {
          name,
          location
        }
      });

      return res.status(200).json({
        status: "success",
        message: "Site updated successfully"
      });
    } else {
      return res.status(200).json({
        status: "success",
        message: "No changes made"
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      error: error.message
    });
  }
};


const deleteSite = async (req,res) => {
    try {
        const {site_id}=req.params
        if (!site_id) {
            return res.status(400).json({
                status:"error",
                message:"Bad request , missing required field"
            })
        }

        await gcamprisma.site.delete({
            where:{id:Number(site_id)}
        })

        return res.status(200).json({
            status:"success",
            message:"Site deleted successfully"
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

module.exports = {
    createsite,
    allSiteDetails,
    viewOnesiteDetaily,
    updateSite,
    deleteSite
}


const {PrismaClient,GlobalRole,OrgRole}=require("../generated/prisma")
const { verifyPassword } = require("../utils/password")
const { generateToken, setAuthTokenCookie } = require("../utils/token")
const gcamprisma = new PrismaClient()

const login = async (req,res) => {
    try {
        const {username , password} = req.body

        const existingToken = req.cookies?.gcam_auth_token;
        if (existingToken) {
          return res.status(409).json({
            status: "success",
            message: "Already logged in",
          });
        }

        if (!username || !password) {
            return res.status(400).json({
                status:"error",
                message:"Bad request"
            })
        }

        const user = await gcamprisma.user.findUnique({
            where:{username:username},
            include:{

            }
        })
        
        if (!user) {
            return res.status(404).json({
                status:"error",
                message:"User not found"
            })
        }

        const verifypass = await verifyPassword(password,user.password)

        if (!verifypass) {
            return res.status(403).json({
                status:"error",
                message:"Invalid password"
            })
        }

        const token = generateToken({
            id:user.id,
            username:user.username,
            fullname:user.fullname,
            role:user.role
        })

        setAuthTokenCookie(res,"gcam_auth_token",token)

        return res.status(200).json({
            status:"success",
            message:"Login successfully"
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

const logout = async (req, res) => {
  try {
    const token = req.cookies?.gcam_auth_token;

    if (!token) {
      return res.status(400).json({
        status: "error",
        message: "Bad request",
      });
    }

    res.clearCookie("gcam_auth_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "None",
    });

    return res.status(200).json({
      status: "success",
      message: "Logged out successfully",
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



const authuser = async (req, res) => {
  try {
    const { id } = req.user; // comes from JWT in authMiddleware

    if (!id) {
        return res.status(404).json({
            status:"error",
            message:"Can't get auth user data"
        })
    }
    const user = await gcamprisma.user.findUnique({
      where: { id },
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

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    // --- SUPERADMIN: Full access
    if (user.role === "SUPERADMIN") {
      return res.status(200).json({
        status: "success",
        data: {
          id: user.id,
          username: user.username,
          fullname: user.fullname,
          mobile: user.mobile,
          role: user.role,
          organizations: "ALL",
        },
      });
    }

    // --- USER / ADMIN (org-level)
    let orgAccess = [];
    for (const orgLink of user.organization) {
      const org = orgLink.organization;

        if (orgLink.role === "ADMIN") {
            // ADMIN inside org → all devices of that org
            orgAccess.push({
            id: org.id,
            //   name: org.name,
            role: orgLink.role,
            devices: "ALL",
            });
        } else {
            // USER inside org → only specific devices linked
            const allowedDevices = user.device_access
                .filter((ud) => ud.device.organization_id === org.id)
                .map((ud) => ud.device.id); // ✅ only return ID

            orgAccess.push({
                id: org.id,
                role: orgLink.role,
                devices: allowedDevices,
            });
        }

    }

    return res.status(200).json({
      status: "success",
      data: {
        id: user.id,
        username: user.username,
        fullname: user.fullname,
        mobile: user.mobile,
        role: user.role,
        organizations: orgAccess,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching authenticated user:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      error: error.message,
    });
  }
};



module.exports = {
    login,
    logout,
    authuser
}


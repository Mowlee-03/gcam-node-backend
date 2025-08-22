const {PrismaClient,GlobalRole}=require("../../generated/prisma")
const { hashPassword } = require("../../utils/password")
const gcamprisma = new PrismaClient()
const globalrole = Object.values(GlobalRole)


const createuser = async (req,res) => {
    try {
        const { 
            username,email,password,
            mobile,role,
        }=req.body

        if (!username || !email || !password || !mobile || !role) {
            return res.status(400).json({
                status:"error",
                message:"Bad request , missing required fields"
            })
        }

        const userexistwithemail = await gcamprisma.user.findUnique({
            where:{email:email}
        })
        if (userexistwithemail) {
            return res.status(409).json({
                status:"error",
                message:"User with this 'email' is already exist"
            })
        }

        const mobilenumberexist = await gcamprisma.user.findUnique({
            where:{
                mobile:mobile
            }
        })
        if (mobilenumberexist) {
            return res.status(409).json({
                status:"error",
                message:"Mobile number already exist for another user"
            })
        }

        if (role && !globalrole.includes(role)) {
            return res.status(400).json({
                status:"error",
                message:"Invalid user role",
                allowedroles:globalrole,
                receivedrole:role
            })
        }

        const hashedpass = await hashPassword(password)

        const user = await gcamprisma.user.create({
            data:{
                username,
                email,
                password:hashedpass,
                mobile,
                role
            }
        })

        return res.status(200).json({
            status:"success",
            message:"User created successfully",
            data:user
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
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


const getuserdetail = async (req,res) => {
    const {user_id} = req.params

    try {
        
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            status:"error",
            message:"Internal Server Error",
            error:error.message
        })
    }
}
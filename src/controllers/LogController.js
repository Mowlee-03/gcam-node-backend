const {PrismaClient}=require("../generated/prisma")
const gcamprisma = new PrismaClient()


const garbagelog = async (req,res) => {
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
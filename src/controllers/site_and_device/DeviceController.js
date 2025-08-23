const {PrismaClient}=require("../../generated/prisma")
const gcamprisma = new PrismaClient()

const createDevice = async (req,res) => {
    try {
        const { imei , video_url } = req.body

    } catch (error) {
        console.log(error)
        return res.status(500).json({
            status:"error",
            message:"Internal Server Error",
            error:error.message
        })
    }
}


const deviceRegister = async (req,res) => {
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


module.exports = {
    
}
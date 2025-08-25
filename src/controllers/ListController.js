const {PrismaClient,GlobalRole,OrgRole}=require("../generated/prisma")
const gcamprisma = new PrismaClient()


const getOrganizationList = async (req,res) => {
    try {
        const orgData = await gcamprisma.organization.findMany({
            select:{
                id:true,
                name:true
            }
        })

        return res.status(200).json({
            status:"success",
            data:orgData
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


const getSitesForOneOrganization = async (req,res) => {
    try {
        const {org_id} = req.params
        if (!org_id) {
            return res.status(400).json({
                status:"error",
                message:"Bad request , missing required field"
            })
        }

        const sitedata = await gcamprisma.site.findMany({
            where:{organization_id:Number(org_id)},
            select:{
                id:true,
                name:true,
                location:true
            }
        })

        return res.status(200).json({
            status:"success",
            message:"Fetching site list success",
            data:sitedata
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


const getRegisteredDeviceList = async (req,res) => {
    try {
        const {org_ids} = req.params

        if (!org_ids || !Array.isArray(org_ids || org_ids.length ===0)) {
            return res.status(400).json({
                status:"error",
                message:"Bad request"
            })
        }

        const devices = await gcamprisma.device.findMany({
            where:{organization_id:{in:Number(org_id)}},
            select : { 
                id      :   true,
                imei    :   true,
                name    :   true,
             }
        })

        return res.status(200).json({
            status:"success",
            data:devices
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
 

const getnonRegisteredDevicelist = async (req,res) => {
    try {
        const data = await gcamprisma.installedDevice.findMany({
            where : {
                is_registered:false
            }
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
    getOrganizationList,
    getSitesForOneOrganization,
    getRegisteredDeviceList,
    getnonRegisteredDevicelist
}
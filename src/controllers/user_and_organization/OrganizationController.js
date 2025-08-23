const {PrismaClient}=require("../../generated/prisma")
const gcamprisma = new PrismaClient()


const createOrganization = async (req,res) => {
    try {
        const {name}=req.body
        if (!name) {
            return res.status(400).json({
                status:"error",
                message:"Bad request , name is required"
            })
        }

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


const getAllOrganization = async (req,res) => {
    try {
        const orgDatas = await gcamprisma.organization.findMany({
            include:{
                sites:true,
                devices:true
            }
        })

        return res.status(200).json({
            status:"success",
            message:"Fetching organizations with details success",
            data:orgDatas
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
                status:"success",
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


const deleteOrganization = async (req,res) => {
    const {org_id} = req.params
    try {
        if (!org_id) {
            return res.status(400).json({
                status:"error",
                message:"Bad request"
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


module.exports = {
    createOrganization,
    getAllOrganization,
    updateOrganization,
    deleteOrganization
}
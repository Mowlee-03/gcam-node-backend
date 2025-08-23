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
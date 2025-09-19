const {PrismaClient}=require("../../generated/prisma")
const gcamprisma = new PrismaClient()


const garbagelog = async (req, res) => {
    try {
        const { site_name, imei, dt, box_count } = req.body;

        // Ensure file exists
        if (!req.file) {
            return res.status(400).json({
                status: "error",
                message: "Image file is required"
            });
        }
        const { filename } = req.file;

        // Validate required fields
        if (!site_name || !imei || !dt || !box_count) {
            return res.status(400).json({
                status: "error",
                message: "Bad request, missing required fields"
            });
        }

        // Validate datetime
        const parsedDate = new Date(dt);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({
                status: "error",
                message: "Invalid date/time format"
            });
        }

        // Validate box_count
        const boxCount = parseInt(box_count, 10);
        if (isNaN(boxCount)) {
            return res.status(400).json({
                status: "error",
                message: "Invalid box_count (must be a number)"
            });
        }

        // Check if device exists in installedDevice
        const checkRegister = await gcamprisma.installedDevice.findUnique({
            where: { imei }
        });
        if (!checkRegister) {
            return res.status(404).json({
                status: "error",
                message: "Device not found"
            });
        }
        if (checkRegister.is_registered === false) {
            return res.status(400).json({
                status: "error",
                message: "Device not registered yet"
            });
        }

        // Get device details
        const Device = await gcamprisma.device.findUnique({
            where: { imei },
            select: {
                id: true,
                imei: true,
                organization: { select: { id: true, name: true } },
                site: { select: { id: true, name: true } }
            }
        });
        if (!Device) {
            return res.status(404).json({
                status: "error",
                message: "Device not registered or not found"
            });
        }

        // Save garbage log
        const imagePath = `/images/garbage/${filename}`;
        const newLog = await gcamprisma.garbageLog.create({
            data: {
                device_id: Device.id,
                imei,
                organization_name: Device.organization?.name || "N/A",
                site_name: Device.site?.name || "N/A",
                date: parsedDate,
                image: imagePath,
                box_count: boxCount,
                org_id: Device.organization?.id || null,
                site_id: Device.site?.id || null
            }
        });

        // Update or insert into LatestLog
        await gcamprisma.latestLog.upsert({
            where: { device_id: Device.id },
            update: {
                imei,
                organization_name: Device.organization?.name || "N/A",
                site_name: Device.site?.name || "N/A",
                box_count: boxCount,
                garbage_image: imagePath,
                garbage_date: parsedDate
            },
            create: {
                device_id: Device.id,
                imei,
                organization_name: Device.organization?.name || "N/A",
                site_name: Device.site?.name || "N/A",
                box_count: boxCount,
                garbage_image: imagePath,
                garbage_date: parsedDate,
                person_image: "",  // empty until person log is added
                person_date: new Date(0) // default epoch if not yet available
            }
        });

        return res.status(200).json({
            status: "success",
            message: "Garbage log added & LatestLog updated",
            data: newLog
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


module.exports = {
    garbagelog
}


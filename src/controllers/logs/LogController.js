const {PrismaClient}=require("../../generated/prisma")
const gcamprisma = new PrismaClient()


const garbagelog = async (req, res) => {
    const io = req.app.locals.io
    const saveMissedLog = async (problem) => {
        try {
            await gcamprisma.missedlog.create({
                data: {
                    data: { body: req.body, file: req.file || null },
                    problem
                }
            });
        } catch (logError) {
            console.error("Failed to save missed log:", logError);
        }
    };

    try {
        const { site_name, imei, dt, box_count } = req.body;

        // Ensure file exists
        if (!req.file) {
            const msg = "Image file is required";
            await saveMissedLog(msg);
            return res.status(400).json({ status: "error", message: msg });
        }

        const { filename } = req.file;

        // Validate required fields
        if (!site_name || !imei || !dt || !box_count) {
            const msg = "Missing required fields";
            await saveMissedLog(msg);
            return res.status(400).json({ status: "error", message: msg });
        }

        // Validate datetime
        const parsedDate = new Date(dt);
        if (isNaN(parsedDate.getTime())) {
            const msg = "Invalid date/time format";
            await saveMissedLog(msg);
            return res.status(400).json({ status: "error", message: msg });
        }

        // Validate box_count
        const boxCount = parseInt(box_count, 10);
        if (isNaN(boxCount)) {
            const msg = "Invalid box_count (must be a number)";
            await saveMissedLog(msg);
            return res.status(400).json({ status: "error", message: msg });
        }

        // Check if device exists in installedDevice
        const checkRegister = await gcamprisma.installedDevice.findUnique({ where: { imei } });
        if (!checkRegister) {
            const msg = "Device not found";
            await saveMissedLog(msg);
            return res.status(404).json({ status: "error", message: msg });
        }

        if (!checkRegister.is_registered) {
            const msg = "Device not registered yet";
            await saveMissedLog(msg);
            return res.status(400).json({ status: "error", message: msg });
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
            const msg = "Device not registered or not found";
            await saveMissedLog(msg);
            return res.status(404).json({ status: "error", message: msg });
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
                person_image: "",
                person_date: new Date(0)
            }
        });

        // Emit only to the room for that device_id
        io.to(`device_${Device.id}`).emit("garbageUpdate", {
            device_id: Device.id,
            imei,
            // site_name: Device.site?.name || "N/A",
            box_count: boxCount,
            // date: parsedDate,
            // image: imagePath
        });

        return res.status(200).json({
            status: "success",
            message: "Garbage log added & LatestLog updated",
            data: newLog
        });

    } catch (error) {
        console.error(error);
        await saveMissedLog(error.message);
        return res.status(500).json({
            status: "error",
            message: "Internal Server Error",
            error: error.message
        });
    }
};

const personlog = async (req, res) => {
    const saveMissedLog = async (problem) => {
        try {
            await gcamprisma.missedlog.create({
                data: {
                    data: { body: req.body, file: req.file || null },
                    problem
                }
            });
        } catch (logError) {
            console.error("Failed to save missed log:", logError);
        }
    };

    try {
        const { site_name, imei, dt } = req.body;

        // Ensure file exists
        if (!req.file) {
            const msg = "Image file is required";
            await saveMissedLog(msg);
            return res.status(400).json({ status: "error", message: msg });
        }

        const { filename } = req.file;

        // Validate required fields
        if (!site_name || !imei || !dt) {
            const msg = "Missing required fields";
            await saveMissedLog(msg);
            return res.status(400).json({ status: "error", message: msg });
        }

        // Validate datetime
        const parsedDate = new Date(dt);
        if (isNaN(parsedDate.getTime())) {
            const msg = "Invalid date/time format";
            await saveMissedLog(msg);
            return res.status(400).json({ status: "error", message: msg });
        }

        // Check if device exists in installedDevice
        const checkRegister = await gcamprisma.installedDevice.findUnique({ where: { imei } });
        if (!checkRegister) {
            const msg = "Device not found";
            await saveMissedLog(msg);
            return res.status(404).json({ status: "error", message: msg });
        }

        if (!checkRegister.is_registered) {
            const msg = "Device not registered yet";
            await saveMissedLog(msg);
            return res.status(400).json({ status: "error", message: msg });
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
            const msg = "Device not registered or not found";
            await saveMissedLog(msg);
            return res.status(404).json({ status: "error", message: msg });
        }

        // Save person log
        const imagePath = `/images/person/${filename}`;
        const newLog = await gcamprisma.personLog.create({
            data: {
                device_id: Device.id,
                imei,
                organization_name: Device.organization?.name || "N/A",
                site_name: Device.site?.name || "N/A",
                date: parsedDate,
                image: imagePath,
                org_id: Device.organization?.id || null,
                site_id: Device.site?.id || null
            }
        });

        // Upsert LatestLog (update person info or create if missing)
        await gcamprisma.latestLog.upsert({
            where: { device_id: Device.id },
            update: {
                imei,
                organization_name: Device.organization?.name || "N/A",
                site_name: Device.site?.name || "N/A",
                person_image: imagePath,
                person_date: parsedDate
            },
            create: {
                device_id: Device.id,
                imei,
                organization_name: Device.organization?.name || "N/A",
                site_name: Device.site?.name || "N/A",
                box_count: 0, // default if no garbage yet
                garbage_image: "", // default
                garbage_date: new Date(0), // default epoch
                person_image: imagePath,
                person_date: parsedDate
            }
        });

        return res.status(200).json({
            status: "success",
            message: "Person log added & LatestLog updated",
            data: newLog
        });

    } catch (error) {
        console.error(error);
        await saveMissedLog(error.message);
        return res.status(500).json({
            status: "error",
            message: "Internal Server Error",
            error: error.message
        });
    }
};


module.exports = {
    garbagelog,
    personlog
}


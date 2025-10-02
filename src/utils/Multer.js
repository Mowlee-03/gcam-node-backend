const multer = require("multer");
const path = require("path");
const fs = require("fs");

const createStorage = (folder) => {
    return multer.diskStorage({
        destination: function (req, file, cb) {
            const uploadPath = path.join(__dirname, `../../public/images/${folder}`);
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }
            cb(null, uploadPath);
        },
        filename: function (req, file, cb) {
            const uniqueName = Date.now() + "-" + file.originalname;
            cb(null, uniqueName);
        }
    });
};

// 🔹 utility function to delete uploaded image
const deleteImage = async (folder, filename) => {
    if (!filename) return;
    try {
        const imagePath = path.join(__dirname, `../../public/images/${folder}`, filename);
        if (fs.existsSync(imagePath)) {
            await fs.promises.unlink(imagePath);
            console.log("Deleted image:", imagePath);
        }
    } catch (err) {
        console.error("Failed to delete image:", err.message);
    }
};

module.exports = {
    uploadGarbage: multer({ storage: createStorage("garbage") }),
    uploadPerson: multer({ storage: createStorage("person") }),
    deleteImage   // 🔹 export the function
};

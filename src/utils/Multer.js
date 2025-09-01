
import multer from "multer";
import path from 'path'
import fs from 'fs'


const createStorage = (folder)=>{
    return multer.diskStorage({
        destination: function (req,file,cb) {
            const uploadPath = path.join(__dirname,`../../public/images/${folder}`);
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath,{recursive:true});
            }
            cb(null,uploadPath);
        },
        filename:function(req,file,cb){
            const uniqueName = Date.now() + "-" +file.originalname;
            cb(null,uniqueName)
        }
    })
}

export const uploadGarbage = multer({storage:createStorage("garbage")})
export const uploadPerson = multer({storage:createStorage("person")})
const cloudinary = require('cloudinary').v2;
const fs = require("fs");

          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null;
        // upload the file on cloudinary
        const resp = await cloudinary.uploader.upload(localFilePath, { resource_type: "auto" });
        // file is uploaded on cloudinary
        fs.unlinkSync(localFilePath);
        return resp;
    } catch (error) {
        fs.unlinkSync(localFilePath); // remove the locally saved file
        return null;
    }
}

module.exports = {uploadOnCloudinary}


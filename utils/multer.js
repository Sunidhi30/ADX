const multer = require("multer");
const path = require("path");

// Set storage engine
const storage = multer.diskStorage({
  destination: "./uploads/", // Store images in the "uploads" folder
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});
const videoStorage = multer.diskStorage({
  destination: "./uploads/videos/", // Store videos in "uploads/videos"
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

// File filter to allow only images
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png|heic|heif/;
  const allowedVideoTypes = /mp4|mkv|avi|mov/;

  const extname =
    allowedImageTypes.test(path.extname(file.originalname).toLowerCase()) ||
    allowedVideoTypes.test(path.extname(file.originalname).toLowerCase());

  const mimetype =
    allowedImageTypes.test(file.mimetype) ||
    allowedVideoTypes.test(file.mimetype);
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    return cb(
      new Error(
        "Only JPEG, JPG, PNG images and MP4, MKV, AVI, MOV videos are allowed!"
      )
    );
  }
};

const upload = multer({
  storage: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, imageStorage);
    } else if (file.mimetype.startsWith("video/")) {
      cb(null, videoStorage);
    } else {
      cb(new Error("Invalid file type!"));
    }
  },
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // Increase limit to 100MB for videos
});

module.exports = upload;

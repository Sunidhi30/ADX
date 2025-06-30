const multer = require("multer");

const storage = multer.memoryStorage(); // ✅ for buffer (not disk)

const upload = multer({ storage });

module.exports = upload;

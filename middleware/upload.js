const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 確保目錄存在
const ensureDirExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// 頭像儲存設定
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/avatars";
    ensureDirExists(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// 證書儲存設定
const certificateStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/certificates";
    ensureDirExists(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const uploadAvatar = multer({ storage: avatarStorage });
const uploadCertificates = multer({ storage: certificateStorage });

module.exports = {
  uploadAvatar,
  uploadCertificates,
};

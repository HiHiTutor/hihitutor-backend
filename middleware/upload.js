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

// 機構證明上傳設定
const orgStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/organizationDocs/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});

// ✅ 檔案格式 & 大小限制
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("❌ 只允許上傳 JPG、PNG 或 PDF 檔案"), false);
  }
};

const limits = {
  fileSize: 5 * 1024 * 1024 // 5MB
};


// ✅ 上載機構證明設定（加限制）
const uploadOrgDocs = multer({
  storage: orgStorage,
  fileFilter,
  limits
}).fields([

  { name: "businessRegistration", maxCount: 1 },
  { name: "addressProof", maxCount: 1 }
]);


const uploadAvatar = multer({ storage: avatarStorage });
const uploadCertificates = multer({ storage: certificateStorage });

module.exports = {
  uploadAvatar,
  uploadCertificates,
  uploadOrgDocs
};

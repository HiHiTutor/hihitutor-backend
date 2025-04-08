import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

// ✅ 解決 __dirname 問題
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ✅ 確保目錄存在
const ensureDirExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// ✅ 頭像儲存設定
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../uploads/avatars");
    ensureDirExists(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// ✅ 證書儲存設定
const certificateStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../uploads/certificates");
    ensureDirExists(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// ✅ 機構證明上傳設定
const orgStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../uploads/organizationDocs");
    ensureDirExists(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});

// ✅ 限制設定
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

// ✅ 建立 middleware
const uploadAvatar = multer({ storage: avatarStorage });
const uploadCertificates = multer({ storage: certificateStorage });
const uploadOrgDocs = multer({
  storage: orgStorage,
  fileFilter,
  limits
}).fields([
  { name: "businessRegistration", maxCount: 1 },
  { name: "addressProof", maxCount: 1 }
]);

// ✅ 匯出
export { uploadAvatar, uploadCertificates, uploadOrgDocs };

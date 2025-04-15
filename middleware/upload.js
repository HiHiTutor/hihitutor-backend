import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import dotenv from "dotenv";

// ✅ 解決 __dirname 問題（ESM）
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ✅ 載入環境變量
dotenv.config();

// ✅ 上傳目錄配置
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "../uploads");

// ✅ 建立目錄（若未存在）
const ensureDirExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// ✅ 儲存設定：頭像
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_DIR, "avatars");
    ensureDirExists(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// ✅ 儲存設定：證書
const certificateStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_DIR, "certificates");
    ensureDirExists(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// ✅ 儲存設定：機構證明文件
const orgStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_DIR, "organizationDocs");
    ensureDirExists(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // 生成安全的文件名
    const ext = path.extname(file.originalname);
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    cb(null, `${timestamp}_${randomString}${ext}`);
  },
});

// ✅ 上傳限制設定
const fileFilter = (req, file, cb) => {
  // 放寬 MIME 類型限制
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "application/pdf",
    "image/webp",
    "image/gif"
  ];
  
  // 檢查文件擴展名
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.webp', '.gif'];
  
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`❌ 不支援的文件類型。允許的類型：${allowedExtensions.join(', ')}`), false);
  }
};

const limits = {
  fileSize: 5 * 1024 * 1024, // 5MB
};

// ✅ Middleware：上傳實例
const uploadAvatar = multer({ storage: avatarStorage });
const uploadCertificates = multer({ storage: certificateStorage });

const uploadOrgDocs = multer({
  storage: orgStorage,
  fileFilter,
  limits,
}).fields([
  { name: "businessRegistration", maxCount: 1 },
  { name: "addressProof", maxCount: 1 }
]);

// ✅ 匯出（ESM named export）
export {
  uploadAvatar,
  uploadCertificates,
  uploadOrgDocs
};

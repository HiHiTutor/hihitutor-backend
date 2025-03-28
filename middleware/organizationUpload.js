// 📁 C:\Projects\HiHiTutor\hihitutor-backend\middleware\organizationUpload.js

const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 📂 建立上傳目的地資料夾
const orgDocsPath = path.join(__dirname, "../uploads/organizationDocs");
fs.mkdirSync(orgDocsPath, { recursive: true });

// 📦 建立 Multer 儲存設定
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, orgDocsPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  }
});

// ✅ 建立 Multer 中介層
const organizationUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB 限制
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("只支援 PDF、JPG、PNG 格式"));
    }
  }
});

// ✅【新增】中介層包裝（支援接收文字欄位）
const organizationUploadWithTextFields = (req, res, next) => {
  const handler = organizationUpload.fields([
    { name: "br", maxCount: 1 },
    { name: "cr", maxCount: 1 },
    { name: "addressProof", maxCount: 1 },
  ]);

  handler(req, res, function (err) {
    if (err) {
      console.error("❌ 上傳文件錯誤:", err);
      return res.status(400).json({ error: "上傳文件失敗，請確認格式與大小" });
    }

    // ✅ 保證 req.body 內文字欄位正確轉換成 string（因為 multer 可能包裝為 array）
    for (const key in req.body) {
      if (Array.isArray(req.body[key])) {
        req.body[key] = req.body[key][0];
      }
    }

    next();
  });
};

// ✅ 匯出新版本
module.exports = organizationUploadWithTextFields;

// 📁 middleware/organizationUploadWithTextFields.js
import { uploadOrgDocs } from "./upload.js";

// ✅ 包裝 middleware，支援文字欄位轉換
const organizationUploadWithTextFields = (req, res, next) => {
  uploadOrgDocs(req, res, function (err) {
    if (err) {
      console.error("❌ 上傳文件錯誤:", err);
      return res.status(400).json({ error: "上傳文件失敗，請確認格式與大小" });
    }

    // ✅ Multer 會將文字欄位包裝成 array，要處理返
    for (const key in req.body) {
      if (Array.isArray(req.body[key])) {
        req.body[key] = req.body[key][0];
      }
    }

    next();
  });
};

export default organizationUploadWithTextFields;

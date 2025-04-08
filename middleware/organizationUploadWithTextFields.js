// middleware/organizationUploadWithTextFields.js
import { uploadOrgDocs } from "./upload.js";

const organizationUploadWithTextFields = (req, res, next) => {
  uploadOrgDocs(req, res, function (err) {
    if (err) {
      console.error("❌ 上傳文件錯誤:", err);
      return res.status(400).json({ error: "上傳文件失敗，請確認格式與大小" });
    }

    // 文字欄位轉為 string
    for (const key in req.body) {
      if (Array.isArray(req.body[key])) {
        req.body[key] = req.body[key][0];
      }
    }

    next();
  });
};

export default organizationUploadWithTextFields;

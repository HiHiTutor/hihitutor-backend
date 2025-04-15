import express from "express";
import mongoose from "mongoose";

// 創建驗證碼 Schema
const verificationSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  code: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 } // 5分鐘後自動刪除
});

// 創建驗證碼 Model
const Verification = mongoose.model('Verification', verificationSchema);

const router = express.Router();
const verifiedPhones = new Map();

// 🔹 POST /api/sms/send-code
router.post("/send-code", async (req, res) => {
  try {
    console.log("📱 收到發送驗證碼請求:", req.body);
    
    const phone = req.body.phone || req.body.phoneNumber;
    if (!phone) {
      console.log("❌ 缺少電話號碼");
      return res.status(400).json({ message: "請提供電話號碼" });
    }

    // 生成6位數驗證碼
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 儲存到 MongoDB
    await Verification.findOneAndUpdate(
      { phone },
      { code },
      { upsert: true, new: true }
    );

    console.log(`✅ 驗證碼已生成並儲存：${phone} -> ${code}`);

    return res.status(200).json({
      message: "驗證碼已發送（開發模式）",
      code: code // 開發模式直接返回驗證碼
    });
  } catch (error) {
    console.error("❌ 發送驗證碼錯誤:", error);
    return res.status(500).json({ message: "發送驗證碼失敗，請稍後再試" });
  }
});

// 🔹 POST /api/sms/verify-code
router.post("/verify-code", async (req, res) => {
  try {
    console.log("📱 收到驗證碼驗證請求:", req.body);
    
    const { phone, code } = req.body;
    if (!phone || !code) {
      console.log("❌ 缺少電話號碼或驗證碼");
      return res.status(400).json({ message: "缺少參數" });
    }

    // 從 MongoDB 查詢驗證碼
    const verification = await Verification.findOne({ phone });
    console.log(`📝 檢查驗證碼：${phone} -> 輸入：${code}，找到記錄：`, verification);
    
    if (!verification) {
      console.log("❌ 驗證碼不存在或已過期");
      return res.status(400).json({ message: "驗證碼已過期或未發送" });
    }

    if (verification.code !== code) {
      console.log("❌ 驗證碼不匹配");
      return res.status(400).json({ message: "驗證碼錯誤" });
    }

    // 驗證成功，刪除驗證碼
    await Verification.deleteOne({ phone });
    console.log(`✅ 驗證成功，已刪除驗證碼：${phone}`);

    // 記錄驗證成功時間
    verifiedPhones.set(phone, Date.now());

    return res.status(200).json({ message: "驗證成功" });
  } catch (error) {
    console.error("❌ 驗證碼驗證錯誤:", error);
    return res.status(500).json({ message: "驗證失敗，請稍後再試" });
  }
});

// ✅ 正確 ESM 匯出方式
export default router;
export { verifiedPhones };

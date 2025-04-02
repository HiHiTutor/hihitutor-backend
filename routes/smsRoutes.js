const express = require("express");
const router = express.Router();

// 🔹 POST /api/sms/send-code
router.post("/send-code", (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ message: "請提供電話號碼" });

  const code = Math.floor(100000 + Math.random() * 900000); // 6位數
  verificationCodes.set(phone, code.toString());

  console.log(`📱【開發模式】發送驗證碼至 ${phone}：${code}`);

  return res.status(200).json({
    message: "驗證碼已發送（開發模式）",
    code: code.toString() // 開發測試用，正式環境請刪除
  });
});

// 🔹 POST /api/sms/verify-code
router.post("/verify-code", (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) return res.status(400).json({ message: "缺少參數" });

  const validCode = verificationCodes.get(phone);
  if (!validCode) return res.status(400).json({ message: "驗證碼已過期或未發送" });

  if (validCode !== code) return res.status(400).json({ message: "驗證碼錯誤" });

  verificationCodes.delete(phone);
  return res.status(200).json({ message: "驗證成功" });
});

// ✅ 正確 export router：
module.exports = router;

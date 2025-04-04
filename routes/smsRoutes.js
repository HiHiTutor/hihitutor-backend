const express = require("express");
const router = express.Router();
const verifiedPhones = new Set();


// 用 Map 暫存驗證碼（正式應用應該用 Redis）
const verificationCodes = new Map();

// 🔹 POST /api/sms/send-code
router.post("/send-code", (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ message: "請提供電話號碼" });

  const code = Math.floor(100000 + Math.random() * 900000); // 6位數
  verificationCodes.set(phone, code.toString());

  console.log(`📱【開發模式】發送驗證碼至 ${phone}：${code}`);

  return res.status(200).json({
    message: "驗證碼已發送（開發模式）",
    code: code.toString() // 測試用，正式記得唔好回傳 code
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
  verifiedPhones.add(phone);
  return res.status(200).json({ message: "驗證成功" });
});

// ✅ Export router + verificationCodes 一齊導出
module.exports = {
  router,
  verificationCodes,
  verifiedPhones
};

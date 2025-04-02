const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const UserProfile = require("../models/userProfile");
const User = require("../models/User");
const Case = require("../models/case");

// ✅ /users/me：取得當前登入者基本資料 + profile + 所有個案
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const plainUser = user.toObject ? user.toObject() : user;

    let userProfile = null;
    try {
      userProfile = await UserProfile.findOne({ userId: user._id });
    } catch (err) {
      console.warn("⚠️ 找不到 userProfile 或出錯:", err.message);
    }

    // ✅ 額外取得該用戶的所有個案（createdBy）
    let userCases = [];
    try {
      userCases = await Case.find({ createdBy: user._id }).lean();
    } catch (err) {
      console.warn("⚠️ 找不到 case 或出錯:", err.message);
    }

    res.json({
      id: user._id.toString(),
      ...plainUser,
      profile: userProfile?.approvedProfile || null,
      cases: userCases
    });
  } catch (err) {
    console.error("❌ /me 錯誤:", err.message);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

module.exports = router;

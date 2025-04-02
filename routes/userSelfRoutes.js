
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const UserProfile = require("../models/userProfile");
const User = require("../models/User");
const Case = require("../models/case");

// ✅ /users/me：取得當前登入者基本資料
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

    res.json({
      id: user._id.toString(),
      ...plainUser,
      profile: userProfile?.approvedProfile || null
    });
  } catch (err) {
    console.error("❌ /me 錯誤:", err.message);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// ✅ /users/cases/my：取得當前登入者發佈的個案
router.get("/cases/my", authMiddleware, async (req, res) => {
  try {
    const myCases = await Case.find({ createdBy: req.user._id });
    res.json(myCases);
  } catch (err) {
    console.error("❌ 取得個案失敗:", err.message);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

module.exports = router;

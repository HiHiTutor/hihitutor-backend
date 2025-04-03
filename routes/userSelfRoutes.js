const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const UserProfile = require("../models/userProfile");
const User = require("../models/User");
const Case = require("../models/case");
const { uploadCertificates, uploadOrgDocs } = require("../middleware/upload");


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

// ✅ 導師上載證書 API
router.post("/:userId/certificates", uploadCertificates.array("certificates", 5), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: "找不到用戶" });

    const paths = req.files.map(file => `/uploads/certificates/${file.filename}`);
    user.tutorCertificates.push(...paths);
    await user.save();

    res.json({ msg: "✅ 證書已成功上載", files: paths });
  } catch (err) {
    console.error("❌ 上載證書失敗:", err.message);
    res.status(500).json({ error: "上載失敗" });
  }
});

/** 🔵 取得登入用戶發佈的所有個案 */
router.get("/my-cases", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { postType } = req.query;

    const query = { userId };
    if (postType) query.postType = postType;

    const myCases = await Case.find(query).sort({ createdAt: -1 });
    res.status(200).json(myCases);
  } catch (err) {
    console.error("❌ 讀取 my-cases 錯誤:", err.message);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});


module.exports = router;

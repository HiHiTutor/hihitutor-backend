// 📁 C:\Projects\HiHiTutor\hihitutor-backend\routes\profileRoutes.js
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const User = require("../models/User");
const UserProfile = require("../models/userProfile");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

// 🧩 上傳設定（共用）
const makeStorage = (subfolder) =>
  multer.diskStorage({
    destination: function (req, file, cb) {
      const dir = path.join(__dirname, `../uploads/${subfolder}`);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: function (req, file, cb) {
      const ext = path.extname(file.originalname);
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, uniqueName);
    },
  });

const uploadAvatar = multer({ storage: makeStorage("avatars") });
const uploadCertificates = multer({ storage: makeStorage("certificates") });

// ✅ 上傳頭像（單張）
router.post("/:userId/avatar", authMiddleware, uploadAvatar.single("avatar"), async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "無效用戶 ID" });
    }

    const fileUrl = `/uploads/avatars/${req.file.filename}`;
    let userProfile = await UserProfile.findOne({ userId });
    if (!userProfile) {
      userProfile = new UserProfile({ userId, latestProfile: { avatar: fileUrl } });
    } else {
      userProfile.latestProfile.avatar = fileUrl;
    }
    await userProfile.save();

    res.json({ msg: "✅ 頭像上傳成功", avatar: fileUrl, userProfile });
  } catch (err) {
    console.error("❌ 上傳頭像失敗:", err.message);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// ✅ 上傳證書（多張）
router.post("/:userId/certificates", authMiddleware, uploadCertificates.array("certificates", 5), async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "無效用戶 ID" });
    }

    const fileUrls = req.files.map(file => `/uploads/certificates/${file.filename}`);
    let userProfile = await UserProfile.findOne({ userId });
    if (!userProfile) {
      userProfile = new UserProfile({
        userId,
        latestProfile: { certificates: fileUrls }
      });
    } else {
      userProfile.latestProfile.certificates = [
        ...(userProfile.latestProfile.certificates || []),
        ...fileUrls
      ];
    }
    await userProfile.save();

    res.json({ msg: "✅ 證書上傳成功", certificates: fileUrls, userProfile });
  } catch (err) {
    console.error("❌ 上傳證書失敗:", err.message);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// ✅ 提交 latestProfile 資料
router.post("/submit", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      fullName,
      gender,
      HKID,
      education,
      experience,
      introduction,
      profileImage,
      certificates = []
    } = req.body;

    // ✅ 安全過濾：不可更新 email / phone 等欄位
    const forbiddenFields = ["email", "phone", "_id", "password"];
    for (let key of forbiddenFields) {
      if (req.body[key]) {
        return res.status(400).json({ error: `❌ 不可提交 ${key} 欄位` });
      }
    }

    const latest = {
      fullName,
      gender,
      HKID,
      education,
      experience,
      introduction,
      profileImage,
      certificates: Array.isArray(certificates) ? certificates : []
    };

    let userProfile = await UserProfile.findOne({ userId });
    if (userProfile) {
      userProfile.latestProfile = latest;
    } else {
      userProfile = new UserProfile({ userId, latestProfile: latest });
    }

    await userProfile.save();
    res.status(200).json({ msg: "✅ Profile 已提交，待審批" });
  } catch (err) {
    console.error("❌ 提交 profile 錯誤:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// ✅ Admin 審批 latestProfile → 複製到 approvedProfile
router.put("/approve/:userId", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "User ID 無效" });
    }

    const userProfile = await UserProfile.findOne({ userId });
    if (!userProfile || !userProfile.latestProfile) {
      return res.status(404).json({ error: "找不到 latest profile" });
    }

    userProfile.approvedProfile = userProfile.latestProfile;
    await userProfile.save();

    res.json({ msg: "✅ Profile 已成功審批" });
  } catch (err) {
    console.error("❌ 審批 profile 錯誤:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// ✅ Admin 查看所有 user 的 profile
router.get("/all", authMiddleware, async (req, res) => {
  try {
    const profiles = await UserProfile.find().populate("userId", "email name createdAt");
    res.status(200).json(profiles);
  } catch (err) {
    console.error("❌ 獲取所有 profile 錯誤:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// ✅ 單一 user 查看 approvedProfile（給 frontend 用）
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = await UserProfile.findOne({ userId });
    if (!profile || !profile.approvedProfile) {
      return res.status(404).json({ error: "尚未有已審批的 profile" });
    }
    res.json(profile.approvedProfile);
  } catch (err) {
    console.error("❌ 獲取個人 profile 錯誤:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

module.exports = router;

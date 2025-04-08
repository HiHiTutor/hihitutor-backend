import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

import User from "../models/User.js";
import UserProfile from "../models/userProfile.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { uploadOrgDocs } from "../middleware/upload.js";

const router = express.Router();

// ✅ 解決 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

    let userProfile = await UserProfile.findOne({ user: userId });
    
    if (!userProfile) {
      userProfile = new UserProfile({
        user: userId,
        userId,
        latestProfile: {
          fullName: "尚未填寫",
          avatar: fileUrl || "/uploads/avatars/default.jpg"
        }
      });
    } else {
      userProfile.latestProfile = {
        ...userProfile.latestProfile,
        avatar: fileUrl || "/uploads/avatars/default.jpg"
      };
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
      userProfile = new UserProfile({ userId, latestProfile: { certificates: fileUrls } });
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

// ✅ Admin 或用戶提交 latestProfile（新版：指定 userId）
router.post("/:userId/submit", authMiddleware, async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "User ID 無效" });
    }

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

    const latest = {
      fullName,
      gender,
      HKID,
      education,
      experience,
      introduction,
      avatar: profileImage || "/uploads/avatars/default.jpg",
      certificates: Array.isArray(certificates) ? certificates : []
    };

let userProfile = await UserProfile.findOne({ user: userId }); // ✅ 查找時也改為 user
if (userProfile) {
  userProfile.latestProfile = latest;
} else {
  userProfile = new UserProfile({
    user: userId,              // ✅ 補返必填欄位
    userId,
    latestProfile: latest
  });
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

    // ✅ 更新 userCode 與 tags
const user = await User.findById(userId);
if (user) {
  if (user.userCode.startsWith("U-")) {
    const count = await User.countDocuments({ tags: "tutor" });
    user.userCode = `T-${String(count + 1).padStart(5, "0")}`;
  }
  if (!user.tags.includes("tutor")) {
    user.tags.push("tutor");
  }
  await user.save();
}

    res.json({ msg: "✅ Profile 已成功審批，導師升級完成" });
  } catch (err) {
    console.error("❌ 審批 profile 錯誤:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// ✅ Admin 查看所有 user 的 profile
router.get("/all", authMiddleware, async (req, res) => {
  try {
    const profiles = await UserProfile.find().populate("user", "email name createdAt").lean();
    res.status(200).json(profiles);
  } catch (err) {
    console.error("❌ 獲取所有 profile 錯誤:", err.message);
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

// ✅ 機構上載文件 API（帶錯誤處理）
router.post("/:userId/organization-docs", (req, res, next) => {
  uploadOrgDocs(req, res, function (err) {
    if (err) {
      console.error("❌ 上載失敗:", err.message);
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    console.log("🧾 req.files", req.files);

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: "找不到用戶" });

    user.organizationDocs = {
      businessRegistration: `/uploads/organizationDocs/${req.files.businessRegistration[0].filename}`,
      addressProof: `/uploads/organizationDocs/${req.files.addressProof[0].filename}`
    };
    await user.save();

    res.json({ msg: "✅ 機構文件已成功上載", docs: user.organizationDocs });
  } catch (err) {
    console.error("❌ 上載機構文件失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

export default router;

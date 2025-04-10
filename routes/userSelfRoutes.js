import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import UserProfile from "../models/userProfile.js";
import User from "../models/User.js";
import Case from "../models/case.js";
import { uploadCertificates, uploadOrgDocs } from "../middleware/upload.js";

const router = express.Router();

// ✅ 角色邏輯：角色繼承
function getRolesFromTags(tags = []) {
  const roles = new Set();
  if (tags.includes("admin")) {
    roles.add("admin");
    roles.add("tutor");
    roles.add("student");
  } else if (tags.includes("tutor")) {
    roles.add("tutor");
    roles.add("student");
  } else if (tags.includes("student")) {
    roles.add("student");
  }
  return Array.from(roles);
}

function getMainRole(tags = []) {
  if (tags.includes("admin")) return "admin";
  if (tags.includes("tutor")) return "tutor";
  if (tags.includes("student")) return "student";
  return "user";
}

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

    let userCases = [];
    try {
      userCases = await Case.find({ createdBy: user._id }).lean();
    } catch (err) {
      console.warn("⚠️ 找不到 case 或出錯:", err.message);
    }

    const roles = getRolesFromTags(user.tags);
    const mainRole = getMainRole(user.tags);

    res.json({
      id: user._id.toString(),
      ...plainUser,
      role: mainRole,
      mainRole,
      roles,
      isTutor: roles.includes("tutor"),
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
    const userId = req.user._id;
    const { postType } = req.query;

    const query = { createdBy: userId };
    if (postType) query.postType = postType;

    const myCases = await Case.find(query).sort({ createdAt: -1 });
    res.status(200).json(myCases);
  } catch (err) {
    console.error("❌ 讀取 my-cases 錯誤:", err.message);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// ✅ 更改密碼 API：PUT /api/self-users/me/password
router.put("/me/password", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    // 格式驗證（可按需要加強）
    if (!password || password.length < 8) {
      return res.status(400).json({ msg: "密碼至少需 8 字元" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "找不到用戶" });

    user.password = await bcrypt.hash(password, 10);
    await user.save();

    res.json({ msg: "✅ 密碼已成功更新" });
  } catch (err) {
    console.error("❌ 更改密碼錯誤:", err.message);
    res.status(500).json({ msg: "伺服器錯誤" });
  }
});


export default router;

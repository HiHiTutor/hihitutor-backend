import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { check, validationResult } from "express-validator";
import dotenv from "dotenv";
import User from "../models/User.js";
import UserProfile from "../models/userProfile.js";
import authMiddleware from "../middleware/authMiddleware.js";
import organizationUpload from "../middleware/organizationUploadWithTextFields.js";
import { verificationCodes, verifiedPhones } from "../routes/smsRoutes.js";

dotenv.config();

const router = express.Router();

console.log("✅ userRoutes.js 已載入");

router.post(
  "/register",
  organizationUpload,
  [
    check("name", "請輸入名稱").not().isEmpty(),
    check("birthdate", "請輸入有效的出生日期").isISO8601(),
    check("email", "請輸入有效的電郵").isEmail(),
    check("password", "密碼需至少 8 字，包含英文字母與數字")
      .isLength({ min: 8 })
      .matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]+$/),
    check("userType", "請選擇用戶類型").not().isEmpty()
  ],
  async (req, res) => {
    console.log("📌 收到 /register 請求:", req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, birthdate, email, password, phone, userType, verificationCode } = req.body;

    try {
      console.log("📞 已驗證電話列表:", [...verifiedPhones]);
      if (!verifiedPhones.has(phone)) {
        return res.status(400).json({ msg: "請先完成電話驗證" });
      }

      verifiedPhones.delete(phone);

      const existing = await User.findOne({ email });
      if (existing) return res.status(400).json({ msg: "該電郵已被註冊" });

      const count = await User.countDocuments({
        userType,
        tags: userType === "organization" ? ["institution"] : ["student"]
      });

      const codePrefix = userType === "organization" ? "ORG" : "U";
      const userCode = `${codePrefix}-${String(count + 1).padStart(5, "0")}`;

      const newUser = new User({
        name,
        birthdate,
        email,
        phone,
        userType,
        tags: userType === "organization" ? ["institution"] : ["student"],
        userCode
      });

      if (userType === "organization") {
        const { br, cr, addressProof } = req.files || {};
        if (!br?.[0] || !cr?.[0] || !addressProof?.[0]) {
          return res.status(400).json({ msg: "機構註冊需上載 BR、CR 及地址證明" });
        }

        const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
        const allFiles = [br[0], cr[0], addressProof[0]];

        const invalidFiles = allFiles.filter(file => !allowedTypes.includes(file.mimetype));
        const oversized = allFiles.filter(file => file.size > 5 * 1024 * 1024);

        if (invalidFiles.length > 0) {
          return res.status(400).json({ msg: "請只上傳 PDF 或 JPG/PNG 圖片" });
        }

        if (oversized.length > 0) {
          return res.status(400).json({ msg: "每個檔案大小不可超過 5MB" });
        }

        newUser.organizationDocs = {
          br: br[0].path,
          cr: cr[0].path,
          addressProof: addressProof[0].path
        };
      }

      newUser.password = await bcrypt.hash(password, 10);
      await newUser.save();

      let role = "user";
      if (newUser.tags.includes("admin")) role = "admin";
      else if (newUser.tags.includes("institution")) role = "organization";
      else if (newUser.tags.includes("provider")) role = "tutor";
      else if (newUser.tags.includes("student")) role = "student";

      const token = jwt.sign({ user: { id: newUser.id, role } }, process.env.JWT_SECRET, { expiresIn: "1h" });

      res.json({
        msg: "✅ 註冊成功",
        token,
        user: {
          id: newUser._id,
          name: newUser.name,
          userCode: newUser.userCode,
          userType: newUser.userType,
          tags: newUser.tags,
          organizationDocs: newUser.organizationDocs || {}
        }
      });
    } catch (err) {
      console.error("❌ 註冊錯誤:", err.message);
      res.status(500).json({ error: "伺服器錯誤" });
    }
  }
);

router.post(
  "/login",
  [
    check("password", "請輸入密碼").exists(),
    check("identifier", "請輸入電郵或電話號碼").notEmpty(),
  ],
  async (req, res) => {
    console.log("📌 收到 /login 請求:", req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { identifier, password } = req.body;

    try {
      const user = await User.findOne({ $or: [{ email: identifier }, { phone: identifier }] }).select("+password");
      if (!user) return res.status(400).json({ msg: "無效的帳號或密碼 (用戶不存在)" });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ msg: "無效的帳號或密碼" });

      let role = "user";
      if (user.tags.includes("admin")) role = "admin";
      else if (user.tags.includes("institution")) role = "organization";
      else if (user.tags.includes("provider")) role = "tutor";
      else if (user.tags.includes("student")) role = "student";

      const payload = { user: { id: user.id, role } };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

      res.json({ token });
    } catch (err) {
      console.error("❌ 登入錯誤:", err.message);
      res.status(500).send("伺服器錯誤");
    }
  }
);

router.post("/refresh-token", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ error: "沒有提供 Refresh Token" });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    if (!decoded || !decoded.user) return res.status(403).json({ error: "Refresh Token 無效，請重新登入" });

    const newToken = jwt.sign({ user: decoded.user }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ token: newToken });
  } catch (err) {
    return res.status(403).json({ error: "Refresh Token 無效，請重新登入" });
  }
});

router.get("/", authMiddleware, async (req, res) => {
  try {
    const sortField = req.query.sortField || "createdAt";
    const sortOrder = req.query.sortOrder === "DESC" ? -1 : 1;
    const sortOption = {};
    sortOption[sortField] = sortOrder;

    const users = await User.find().select("-password").sort(sortOption);
    const totalUsers = await User.countDocuments();

    res.set("Access-Control-Expose-Headers", "Content-Range, X-Total-Count");
    res.set("Content-Range", `users 0-${users.length - 1}/${totalUsers}`);
    res.set("X-Total-Count", totalUsers);

    const formattedUsers = await Promise.all(users.map(async (user) => {
      const profile = await UserProfile.findOne({ user: user._id });
      const hasPendingProfile = profile &&
        profile.latestProfile &&
        JSON.stringify(profile.latestProfile) !== JSON.stringify(profile.approvedProfile);

      return {
        id: user._id.toString(),
        ...user.toObject(),
        hasPendingProfile
      };
    }));

    res.status(200).json(formattedUsers);
  } catch (err) {
    res.status(500).send("伺服器錯誤");
  }
});

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ msg: "用戶不存在" });

    const userProfile = await UserProfile.findOne({ userId: user._id });

    res.json({
      id: user._id.toString(),
      ...user.toObject(),
      profile: userProfile?.approvedProfile || null
    });
  } catch (err) {
    res.status(500).send("伺服器錯誤");
  }
});

router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    let updateData = req.body;
    if ("password" in updateData) delete updateData.password;

    const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedUser) return res.status(404).json({ msg: "用戶不存在" });

    res.status(200).json({ id: updatedUser._id.toString(), ...updatedUser.toObject() });
  } catch (err) {
    res.status(500).json({ msg: "伺服器錯誤，無法更新用戶" });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "只有 Admin 可以刪除帳戶" });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: "用戶不存在" });

    await User.deleteOne({ _id: req.params.id });
    res.json({ msg: "✅ 用戶已刪除" });
  } catch (err) {
    console.error("❌ 刪除用戶錯誤:", err.message);
    res.status(500).send("伺服器錯誤");
  }
});

router.post("/create-admin", async (req, res) => {
  try {
    const existing = await User.findOne({ email: "admin@example.com" });
    if (existing) return res.status(400).json({ msg: "admin@example.com 已存在" });

    const hashedPassword = await bcrypt.hash("88888888", 10);

    const admin = new User({
      name: "Admin",
      email: "admin@example.com",
      password: hashedPassword,
      birthdate: new Date(1990, 0, 1),
      phone: "91234567",
      tags: ["admin"],
      userType: "individual",
      createdAt: new Date()
    });

    await admin.save();
    res.json({ msg: "✅ 已成功建立 admin 帳號", admin });
  } catch (err) {
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// ✅ 升級為導師 API
router.post("/upgrade-to-tutor", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ msg: "找不到用戶" });
    if (user.userType !== "individual") return res.status(400).json({ msg: "只有個人用戶可升級為導師" });

    if (!user.tags.includes("provider")) {
      user.tags.push("provider");

      // 升級 userCode（如由 U-00001 ➜ T-00088）
      const count = await User.countDocuments({ tags: { $in: ["provider"] } });
      user.userCode = `T-${String(count + 1).padStart(5, "0")}`;

      await user.save();
    }

    res.status(200).json({ msg: "✅ 成功升級為導師", user });
  } catch (err) {
    console.error("❌ 升級導師失敗:", err);
    res.status(500).json({ msg: "伺服器錯誤，升級失敗" });
  }
});


export default router;
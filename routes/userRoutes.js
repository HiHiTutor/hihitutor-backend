import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { check, validationResult } from "express-validator";
import dotenv from "dotenv";
import User from "../models/User.js";
import UserProfile from "../models/userProfile.js";
import authMiddleware from "../middleware/authMiddleware.js";
import organizationUpload from "../middleware/organizationUploadWithTextFields.js";
import { verifiedPhones } from "./smsRoutes.js"; // 或 "../routes/smsRoutes.js" 視乎檔案位置


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

// ✅ 1. 用 email 查詢帳戶
const existingUserByEmail = await User.findOne({ email });

if (existingUserByEmail) {
  if (existingUserByEmail.status === "inactive") {
    // ✅ 重新啟用帳戶
    existingUserByEmail.name = name;
    existingUserByEmail.birthdate = birthdate;
    existingUserByEmail.phone = phone;
    existingUserByEmail.userType = userType;
    existingUserByEmail.tags = userType === "organization" ? ["institution"] : ["student"];
    existingUserByEmail.status = "active";

    await existingUserByEmail.save();

    const payload = { user: { id: existingUserByEmail.id, role: userType } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

    return res.json({
      msg: "✅ 帳戶已重新啟用",
      token,
      user: {
        id: existingUserByEmail._id,
        name: existingUserByEmail.name,
        userCode: existingUserByEmail.userCode,
        userType: existingUserByEmail.userType,
        tags: existingUserByEmail.tags,
      },
    });
  } else {
    return res.status(400).json({ msg: "該電郵已被註冊" });
  }
}

// ✅ 2. 用電話查詢帳戶
const existingUserByPhone = await User.findOne({ phone });

if (existingUserByPhone && existingUserByPhone.status === "active") {
  return res.status(400).json({ msg: "此電話號碼已被使用，請勿重複註冊。" });
}

if (existingUserByPhone && existingUserByPhone.status === "inactive") {
  // 自動復效帳戶
  existingUserByPhone.status = "active";
  existingUserByPhone.name = name;
  existingUserByPhone.birthdate = birthdate;
  existingUserByPhone.email = email;
  existingUserByPhone.password = await bcrypt.hash(password, 10);
  existingUserByPhone.userType = userType;
  existingUserByPhone.tags = userType === "organization" ? ["institution"] : ["student"];

  await existingUserByPhone.save();

  const token = jwt.sign({ user: { id: existingUserByPhone.id, role: "student" } }, process.env.JWT_SECRET, { expiresIn: "1h" });

  return res.json({
    msg: "✅ 帳戶已復效並成功登入",
    token,
    user: {
      id: existingUserByPhone._id,
      name: existingUserByPhone.name,
      userCode: existingUserByPhone.userCode,
      userType: existingUserByPhone.userType,
      tags: existingUserByPhone.tags,
    }
  });
}

// ✅ 先定義 userCode
const count = await User.countDocuments({
  userType,
  tags: userType === "organization" ? ["institution"] : ["student"]
});
const prefix = userType === "organization" ? "ORG" : "U";
const userCode = `${prefix}-${String(count + 1).padStart(5, "0")}`;

// ✅ 再建立新用戶
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
      else if (newUser.tags.includes("tutor")) role = "tutor";
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
      else if (user.tags.includes("tutor")) role = "tutor";
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

// ✅ POST /api/users/check-phone
router.post("/check-phone", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ msg: "請提供電話號碼" });

    const existing = await User.findOne({ phone, status: "active" });
    if (existing) {
      return res.status(200).json({ exists: true, msg: "電話號碼已被使用" });
    }

    res.status(200).json({ exists: false });
  } catch (err) {
    console.error("❌ 檢查電話錯誤:", err.message);
    res.status(500).json({ msg: "伺服器錯誤" });
  }
});

// ✅ POST /api/users/check-email
router.post("/check-email", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ msg: "請提供電郵" });

    const existing = await User.findOne({ email, status: "active" });
    if (existing) {
      return res.status(200).json({ exists: true, msg: "電郵已被使用" });
    }

    res.status(200).json({ exists: false });
  } catch (err) {
    console.error("❌ 檢查電郵錯誤:", err.message);
    res.status(500).json({ msg: "伺服器錯誤" });
  }
});


// ✅ 刷新 Token
router.post("/refresh-token", authMiddleware, async (req, res) => {
  try {
    const user = req.user;

    let role = "user";
    if (user.tags?.includes("admin")) role = "admin";
    else if (user.tags?.includes("institution")) role = "organization";
    else if (user.tags?.includes("tutor")) role = "tutor";
    else if (user.tags?.includes("student")) role = "student";

    const newToken = jwt.sign({ user: { id: user._id, role } }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({ token: newToken });
  } catch (err) {
    console.error("❌ 刷新 Token 失敗:", err.message);
    res.status(500).json({ msg: "伺服器錯誤" });
  }
});


router.post("/upgrade-to-tutor", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ msg: "找不到用戶" });
    if (user.userType !== "individual") return res.status(400).json({ msg: "只有個人用戶可升級為導師" });

    if (!user.tags.includes("tutor")) {
      user.tags.push("tutor");

      const count = await User.countDocuments({ tags: "tutor" });
      user.userCode = `T-${String(count + 1).padStart(5, "0")}`;

      await user.save();
    }

    res.status(200).json({ msg: "✅ 成功升級為導師", user });
  } catch (err) {
    console.error("❌ 升級導師失敗:", err);
    res.status(500).json({ msg: "伺服器錯誤，升級失敗" });
  }
});

// ✅ 取得所有用戶（for Admin 用戶列表）👉 對應 /api/users
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

    res.status(200).json(users);
  } catch (err) {
    console.error("❌ 讀取用戶錯誤:", err.message);
    res.status(500).send("伺服器錯誤");
  }
});

// ✅ 加返這條 API：取得單一用戶
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ msg: "找不到用戶" });
    res.status(200).json(user);
  } catch (err) {
    console.error("❌ 讀取用戶錯誤:", err.message);
    res.status(500).json({ msg: "伺服器錯誤" });
  }
});

// ✅ 更新單一用戶（for Admin 編輯 user 資料）
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    const updates = req.body;

    const updatedUser = await User.findByIdAndUpdate(userId, updates, {
      new: true,
    }).select("-password");

    if (!updatedUser) return res.status(404).json({ msg: "找不到用戶" });

    res.json({ msg: "✅ 用戶已更新", user: updatedUser });
  } catch (err) {
    console.error("❌ 更新用戶失敗:", err.message);
    res.status(500).json({ msg: "伺服器錯誤" });
  }
});

// ✅ 刪除用戶
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    const requester = req.user;

    // 如果係 admin，永久刪除
    if (requester.tags.includes("admin")) {
      await User.findByIdAndDelete(userId);
      return res.json({ msg: "✅ 用戶已永久刪除" });
    }

    // 如果係用戶自己刪自己，就 set 為 inactive
    if (requester.id === userId) {
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ msg: "找不到用戶" });

  user.status = "inactive";

  // ✅ 強制設定欄位，避免 Mongoose validation error
  user.userCode = user.userCode || `U-${user._id.toString().slice(-5)}`;

  await user.save();

  return res.json({ msg: "✅ 帳戶已隱藏（已登出，無法再登入）" });
}


    return res.status(403).json({ msg: "你沒有權限刪除此帳戶" });
  } catch (err) {
    console.error("❌ 刪除用戶失敗:", err.message);
    res.status(500).json({ msg: "伺服器錯誤" });
  }
});


export default router;

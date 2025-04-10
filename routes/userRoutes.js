import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { check, validationResult } from "express-validator";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import User from "../models/User.js";
import UserProfile from "../models/userProfile.js";
import authMiddleware from "../middleware/authMiddleware.js";
import organizationUpload from "../middleware/organizationUploadWithTextFields.js";
import { verifiedPhones } from "./smsRoutes.js";

dotenv.config();

const router = express.Router();
console.log("✅ userRoutes.js 已載入");

// 工具函數：決定用戶角色
const determineUserRole = (tags) => {
  if (tags?.includes("admin")) return "admin";
  if (tags?.includes("institution")) return "organization";
  if (tags?.includes("tutor")) return "tutor";
  if (tags?.includes("student")) return "student";
  return "user";
};

// ✅ POST /api/users/request-password-reset
router.post("/request-password-reset", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: "請提供電話號碼" });

    const user = await User.findOne({ phone });
    if (!user || !user.email) {
      return res.status(404).json({ message: "找不到綁定電郵的帳戶" });
    }

    const resetToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "30m" }
    );

    const resetLink = `https://www.hihitutor.com/reset-password?token=${resetToken}`;

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"HiHiTutor" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "【HiHiTutor】重設密碼連結（30分鐘內有效）",
      html: `
        <p>親愛的 ${user.name || "用戶"} 您好，</p>
        <p>請點擊以下連結以重設您的 HiHiTutor 密碼（有效期為 30 分鐘）：</p>
        <p><a href="${resetLink}" target="_blank">${resetLink}</a></p>
        <p>如您沒有申請重設密碼，請忽略此電郵。</p>
        <br />
        <p>HiHiTutor 團隊敬上</p>
      `
    });

    res.json({ message: "✅ 重設密碼連結已發送到您的電郵" });
  } catch (err) {
    console.error("❌ 發送重設密碼 email 錯誤:", err.message);
    res.status(500).json({ message: "發送失敗，請稍後再試。" });
  }
});

// ✅ POST /api/users/register
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, birthdate, email, password, phone, userType } = req.body;

    try {
      // 電話驗證檢查
      const verifiedAt = verifiedPhones.get(phone);
      if (!verifiedAt || Date.now() - verifiedAt > 10 * 60 * 1000) {
        return res.status(400).json({ message: "請先完成電話驗證" });
      }
      verifiedPhones.delete(phone);

      // 檢查現有用戶
      const existingUserByEmail = await User.findOne({ email });
      if (existingUserByEmail) {
        if (existingUserByEmail.status === "inactive") {
          // 重新啟用帳戶
          existingUserByEmail.name = name;
          existingUserByEmail.birthdate = birthdate;
          existingUserByEmail.phone = phone;
          existingUserByEmail.userType = userType;
          existingUserByEmail.tags = userType === "organization" ? ["institution"] : ["student"];
          existingUserByEmail.status = "active";
          await existingUserByEmail.save();

          const token = jwt.sign(
            { user: { id: existingUserByEmail.id, role: determineUserRole(existingUserByEmail.tags) } },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
          );

          return res.json({
            message: "✅ 帳戶已重新啟用",
            token,
            user: {
              id: existingUserByEmail._id,
              name: existingUserByEmail.name,
              userCode: existingUserByEmail.userCode,
              userType: existingUserByEmail.userType,
              tags: existingUserByEmail.tags,
            },
          });
        }
        return res.status(400).json({ message: "該電郵已被註冊" });
      }

      // 檢查電話是否已被使用
      const existingUserByPhone = await User.findOne({ phone, status: "active" });
      if (existingUserByPhone) {
        return res.status(400).json({ message: "此電話號碼已被使用" });
      }

      // 生成用戶編號
      const count = await User.countDocuments({
        userType,
        tags: userType === "organization" ? ["institution"] : ["student"]
      });
      const prefix = userType === "organization" ? "ORG" : "U";
      const userCode = `${prefix}-${String(count + 1).padStart(5, "0")}`;

      // 創建新用戶
      const newUser = new User({
        name,
        birthdate,
        email,
        phone,
        userType,
        tags: userType === "organization" ? ["institution"] : ["student"],
        userCode,
        password: await bcrypt.hash(password, 10)
      });

      // 處理機構用戶文件上傳
      if (userType === "organization") {
        const { br, cr, addressProof } = req.files || {};
        if (!br?.[0] || !cr?.[0] || !addressProof?.[0]) {
          return res.status(400).json({ message: "機構註冊需上載 BR、CR 及地址證明" });
        }

        const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
        const allFiles = [br[0], cr[0], addressProof[0]];

        if (allFiles.some(file => !allowedTypes.includes(file.mimetype))) {
          return res.status(400).json({ message: "請只上傳 PDF 或 JPG/PNG 圖片" });
        }

        if (allFiles.some(file => file.size > 5 * 1024 * 1024)) {
          return res.status(400).json({ message: "每個檔案大小不可超過 5MB" });
        }

        newUser.organizationDocs = {
          br: br[0].path,
          cr: cr[0].path,
          addressProof: addressProof[0].path
        };
      }

      await newUser.save();

      // 機構用戶需等待審批
      if (newUser.userType === "organization") {
        return res.json({
          message: "✅ 機構註冊成功，請等待後台審批",
          user: {
            id: newUser._id,
            name: newUser.name,
            userCode: newUser.userCode,
            userType: newUser.userType,
            tags: newUser.tags,
            organizationDocs: newUser.organizationDocs || {}
          }
        });
      }

      // 其他用戶直接登入
      const token = jwt.sign(
        { user: { id: newUser.id, role: determineUserRole(newUser.tags) } },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      res.json({
        message: "✅ 註冊成功",
        token,
        user: {
          id: newUser._id,
          name: newUser.name,
          userCode: newUser.userCode,
          userType: newUser.userType,
          tags: newUser.tags,
        }
      });
    } catch (err) {
      console.error("❌ 註冊錯誤:", err.message);
      res.status(500).json({ message: "註冊失敗，請稍後再試" });
    }
  }
);

// ✅ POST /api/users/login
router.post(
  "/login",
  [
    check("password", "請輸入密碼").exists(),
    check("identifier", "請輸入電郵或電話號碼").notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { identifier, password } = req.body;

    try {
      const user = await User.findOne({
        $or: [{ email: identifier }, { phone: identifier }],
      }).select("+password");

      if (!user) return res.status(400).json({ message: "無效的帳號或密碼" });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: "無效的帳號或密碼" });

      // 機構用戶檢查
      if (user.userType === "organization" && user.tags.includes("institution")) {
        if (!user.organizationDocs?.br || !user.organizationDocs?.cr || !user.organizationDocs?.addressProof) {
          return res.status(403).json({ message: "機構資料尚未提交完整" });
        }

        if (user.status !== "approved") {
          return res.status(403).json({ message: "機構帳戶尚未審批" });
        }
      }

      const token = jwt.sign(
        { user: { id: user.id, role: determineUserRole(user.tags) } },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      res.json({ 
        token,
        user: {
          id: user._id,
          name: user.name,
          userType: user.userType,
          tags: user.tags
        }
      });
    } catch (err) {
      console.error("❌ 登入錯誤:", err.message);
      res.status(500).json({ message: "伺服器錯誤" });
    }
  }
);

// ✅ POST /api/users/check-phone
router.post("/check-phone", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: "請提供電話號碼" });

    const existing = await User.findOne({ phone, status: "active" });
    res.status(200).json({ exists: !!existing });
  } catch (err) {
    console.error("❌ 檢查電話錯誤:", err.message);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

// ✅ POST /api/users/check-email
router.post("/check-email", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "請提供電郵" });

    const existing = await User.findOne({ email, status: "active" });
    res.status(200).json({ exists: !!existing });
  } catch (err) {
    console.error("❌ 檢查電郵錯誤:", err.message);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

// ✅ POST /api/users/refresh-token
router.post("/refresh-token", authMiddleware, async (req, res) => {
  try {
    const newToken = jwt.sign(
      { user: { id: req.user._id, role: determineUserRole(req.user.tags) } },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.json({ token: newToken });
  } catch (err) {
    console.error("❌ 刷新 Token 失敗:", err.message);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

// ✅ POST /api/users/upgrade-to-tutor
router.post("/upgrade-to-tutor", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "找不到用戶" });
    if (user.userType !== "individual") {
      return res.status(400).json({ message: "只有個人用戶可升級為導師" });
    }

    if (!user.tags.includes("tutor")) {
      user.tags.push("tutor");
      const count = await User.countDocuments({ tags: "tutor" });
      user.userCode = `T-${String(count + 1).padStart(5, "0")}`;
      await user.save();
    }

    res.json({ 
      message: "✅ 成功升級為導師",
      user: {
        id: user._id,
        name: user.name,
        userCode: user.userCode,
        tags: user.tags
      }
    });
  } catch (err) {
    console.error("❌ 升級導師失敗:", err);
    res.status(500).json({ message: "升級失敗" });
  }
});

// ✅ GET /api/users
router.get("/", authMiddleware, async (req, res) => {
  try {
    const sortField = req.query.sortField || "createdAt";
    const sortOrder = req.query.sortOrder === "DESC" ? -1 : 1;
    const sortOption = { [sortField]: sortOrder };

    const users = await User.find().select("-password").sort(sortOption);
    const totalUsers = await User.countDocuments();

    res.set({
      "Access-Control-Expose-Headers": "Content-Range, X-Total-Count",
      "Content-Range": `users 0-${users.length - 1}/${totalUsers}`,
      "X-Total-Count": totalUsers
    });

    res.json(users);
  } catch (err) {
    console.error("❌ 讀取用戶錯誤:", err.message);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

// ✅ GET /api/users/:id
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "找不到用戶" });
    res.json(user);
  } catch (err) {
    console.error("❌ 讀取用戶錯誤:", err.message);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

// ✅ PUT /api/users/:id
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).select("-password");

    if (!updatedUser) return res.status(404).json({ message: "找不到用戶" });
    res.json({ message: "✅ 用戶已更新", user: updatedUser });
  } catch (err) {
    console.error("❌ 更新用戶失敗:", err.message);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

// ✅ DELETE /api/users/:id
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const requester = req.user;
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ message: "找不到用戶" });

    // Admin 直接刪除
    if (requester.tags.includes("admin")) {
      await user.deleteOne();
      return res.json({ message: "✅ 用戶已永久刪除" });
    }

    // 用戶自己停用帳戶
    if (requester.id === req.params.id) {
      user.status = "inactive";
      user.userCode = user.userCode || `U-${user._id.toString().slice(-5)}`;
      await user.save();
      return res.json({ message: "✅ 帳戶已隱藏" });
    }

    res.status(403).json({ message: "權限不足" });
  } catch (err) {
    console.error("❌ 刪除用戶失敗:", err.message);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

// ✅ POST /api/users/reset-password
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: "請提供 token 和新密碼" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ message: "找不到用戶" });

    // 密碼強度驗證
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return res.status(400).json({ message: "密碼需至少8字且包含字母和數字" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "✅ 密碼已重設" });
  } catch (err) {
    console.error("❌ 重設密碼錯誤:", err.message);
    const message = err.name === "TokenExpiredError" ? "Token已過期" : "無效的Token";
    res.status(400).json({ message });
  }
});

// ✅ POST /api/users/approve-organization/:id
router.put("/approve-organization/:id", authMiddleware, async (req, res) => {
  try {
    if (!req.user.tags.includes("admin")) {
      return res.status(403).json({ message: "權限不足" });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "找不到用戶" });
    if (user.userType !== "organization") {
      return res.status(400).json({ message: "非機構帳戶" });
    }

    user.status = "approved";
    await user.save();

    res.json({ message: "✅ 機構帳戶已審批" });
  } catch (err) {
    console.error("❌ 機構審批錯誤:", err.message);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

export default router;//呢到就完,試下先
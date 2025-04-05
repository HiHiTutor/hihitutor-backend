const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log("🧪 authHeader:", authHeader);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "未授權，缺少 Token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("🧪 decoded JWT:", decoded);

    if (!decoded.user || !decoded.user.id) {
      return res.status(401).json({ error: "無效的 Token，請重新登入" });
    }

    const user = await User.findById(decoded.user.id).select("-password");
    console.log("🧪 req.user (from middleware):", user);

    if (!user) {
      return res.status(401).json({ error: "用戶不存在，請重新登入" });
    }

    // ✅ 加上角色識別
    let role = "user";
    if (user.tags.includes("admin")) role = "admin";
    else if (user.tags.includes("institution")) role = "organization";
    else if (user.tags.includes("provider")) role = "tutor";
    else if (user.tags.includes("student")) role = "student";

    req.user = user;
    req.user.role = role; // 🔥 這一行非常重要

    next();
  } catch (err) {
    console.error("❌ 授權失敗:", err.message);
    return res.status(401).json({ error: "授權失敗，請重新登入" });
  }
};

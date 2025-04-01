const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "未授權，缺少 Token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.user || !decoded.user.id) {
      return res.status(401).json({ error: "無效的 Token，請重新登入" });
    }

    req.user = await User.findById(decoded.user.id).select("-password");
    if (!req.user) {
      return res.status(401).json({ error: "用戶不存在，請重新登入" });
    }

    next();
  } catch (err) {
    console.error("❌ 授權失敗:", err.message);
    return res.status(401).json({ error: "授權失敗，請重新登入" });
  }
};

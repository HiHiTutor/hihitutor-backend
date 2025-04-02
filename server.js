const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/hihitutor";

// ✅ 設定 CORS
app.use(cors({
  origin: [
    "https://hihitutor-frontend.onrender.com",
    "http://localhost:3000"
  ],
  methods: "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "Range"],
  exposedHeaders: ["Content-Range", "X-Total-Count"]
}));

app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// ✅ 請求記錄
app.use((req, res, next) => {
  console.log(`📌 API 請求: ${req.method} ${req.url}`, req.body);
  next();
});

// ✅ 連接 MongoDB
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log("✅ 成功連接 MongoDB");

    // ✅ 載入 API 路由
    const { router: smsRoutes } = require('./routes/smsRoutes');
    const userRoutes = require(path.join(__dirname, "routes/userRoutes"));
    const studentRoutes = require(path.join(__dirname, "routes/studentRoutes"));
    const tutorRoutes = require(path.join(__dirname, "routes/tutorRoutes"));
    const caseRoutes = require(path.join(__dirname, "routes/caseRoutes"));
    const profileRoutes = require(path.join(__dirname, "routes/profileRoutes"));

    // ✅ 路由註冊
    app.use("/api/sms", smsRoutes);
    app.use("/api/users", userRoutes);
    app.use("/api/students", studentRoutes);
    app.use("/api/tutors", tutorRoutes);
    app.use("/api/cases", caseRoutes);
    app.use("/api/profiles", profileRoutes);

    // ✅ 測試 API
    app.get("/api", (req, res) => {
      res.json({ message: "🚀 HiHiTutor API is running!" });
    });

    // ✅ 首頁路由說明
    app.get("/", (req, res) => {
      res.json({ message: "✅ HiHiTutor API 已啟動，請使用 /api 開頭的路由。" });
    });

    // ✅ 處理 404 錯誤
    app.use((req, res) => {
      res.status(404).json({ error: "❌ API 路由不存在" });
    });

    // ✅ 錯誤處理
    app.use((err, req, res, next) => {
      console.error("❌ 伺服器錯誤:", err);
      res.status(500).json({ error: "伺服器錯誤，請稍後再試。" });
    });

    // ✅ 啟動伺服器
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ 連接 MongoDB 失敗:", err);
    process.exit(1);
  });

// ✅ 監聽 MongoDB 錯誤
mongoose.connection.on("error", err => {
  console.error("❌ MongoDB 錯誤:", err);
});
mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ MongoDB 中斷連線");
});

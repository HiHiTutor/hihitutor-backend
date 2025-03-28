

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path"); // ✅ 確保正確載入路由
require("dotenv").config({ path: path.resolve(__dirname, ".env") });


const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/hihitutor";

// ✅ 設定 CORS，確保 API 可被前端讀取
app.use(cors({
  origin: "http://localhost:3000",
  methods: "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "Range"],
  exposedHeaders: ["Content-Range", "X-Total-Count"]
}));

// ✅ 確保 Express 正確解析 JSON
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Debug: 打印收到的請求數據
app.use((req, res, next) => {
  console.log(`📌 收到 API 請求: ${req.method} ${req.url}`, req.body);
  next();
});


// ✅ 連接 MongoDB，確保成功連接後才啟動伺服器
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("✅ 成功連接 MongoDB");

    // ✅ 載入 API 路由（加上 Debug 訊息）
    console.log("✅ 正在載入 API 路由...");
    try {
      // ✅ 確保正確載入 routes
      const userRoutes = require(path.join(__dirname, "routes/userRoutes"));
      const studentRoutes = require(path.join(__dirname, "routes/studentRoutes"));
      const tutorRoutes = require(path.join(__dirname, "routes/tutorRoutes"));
      const caseRoutes = require(path.join(__dirname, "routes/caseRoutes"));
      const profileRoutes = require(path.join(__dirname, "routes/profileRoutes")); // ✅ 新增

      console.log("✅ API 路由成功載入");

      // ✅ 註冊 API 路由
      app.use("/api/users", userRoutes);
      app.use("/api/students", studentRoutes);
      app.use("/api/tutors", tutorRoutes);
      app.use("/api/cases", caseRoutes);
      app.use("/api/profiles", profileRoutes); // ✅ 新增


      console.log("✅ 所有 API 路由已成功註冊！");
    } catch (error) {
      console.error("❌ 載入 API 路由失敗:", error);
      process.exit(1); // 強制停止伺服器
    }

    // ✅ 測試 API
    app.get("/api", (req, res) => {
      res.json({ message: "🚀 HiHiTutor API is running!" });
    });

    // ✅ 處理 404 錯誤
    app.use((req, res, next) => {
      res.status(404).json({ error: "❌ API 路由不存在" });
    });

    // ✅ 伺服器錯誤處理
    app.use((err, req, res, next) => {
      console.error("❌ 伺服器錯誤:", err);
      res.status(500).json({ error: "伺服器錯誤，請稍後再試。" });
    });

    // ✅ 啟動伺服器
    app.listen(PORT, () => {
      console.log(`🚀 伺服器運行於 http://localhost:${PORT}`);
    });

  })
  .catch((err) => {
    console.error("❌ 連接 MongoDB 失敗:", err);
    process.exit(1); // 強制停止伺服器，防止錯誤運行
  });

// ✅ 監聽 MongoDB 錯誤
mongoose.connection.on("error", err => {
  console.error("❌ MongoDB 連線錯誤:", err);
});

mongoose.connection.on("disconnected", () => {
  console.error("⚠️ MongoDB 連線中斷，正在重新連接...");
});

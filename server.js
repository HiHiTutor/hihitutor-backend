const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/hihitutor";

// CORS 設定
app.use(cors({
  origin: "*", // ✅ 改為 * 避免 Render 遠端限制，之後可再收緊
  methods: "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "Range"],
  exposedHeaders: ["Content-Range", "X-Total-Count"]
}));

app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`📌 API 請求: ${req.method} ${req.url}`, req.body);
  next();
});

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("✅ 成功連接 MongoDB");

    // 載入路由
    const userRoutes = require(path.join(__dirname, "routes/userRoutes"));
    const studentRoutes = require(path.join(__dirname, "routes/studentRoutes"));
    const tutorRoutes = require(path.join(__dirname, "routes/tutorRoutes"));
    const caseRoutes = require(path.join(__dirname, "routes/caseRoutes"));
    const profileRoutes = require(path.join(__dirname, "routes/profileRoutes"));

    app.use("/api/users", userRoutes);
    app.use("/api/students", studentRoutes);
    app.use("/api/tutors", tutorRoutes);
    app.use("/api/cases", caseRoutes);
    app.use("/api/profiles", profileRoutes);

    app.get("/api", (req, res) => {
      res.json({ message: "🚀 HiHiTutor API is running!" });
    });

    app.use((req, res, next) => {
      res.status(404).json({ error: "❌ API 路由不存在" });
    });

    app.use((err, req, res, next) => {
      console.error("❌ 伺服器錯誤:", err);
      res.status(500).json({ error: "伺服器錯誤，請稍後再試。" });
    });

    // ✅ 重點：Render 要求用 process.env.PORT
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });

  })
  .catch((err) => {
    console.error("❌ MongoDB 連接失敗:", err);
    process.exit(1);
  });

mongoose.connection.on("error", err => {
  console.error("❌ MongoDB 錯誤:", err);
});

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ MongoDB 中斷連線");
});

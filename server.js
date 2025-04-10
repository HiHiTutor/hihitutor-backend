import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// ✅ 處理 ESM 無 __dirname 問題
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ✅ 載入 .env
dotenv.config({ path: path.resolve(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/hihitutor";

const corsOptions = {
  origin: [
    "https://www.hihitutor.com",
    "https://hihitutor-frontend.onrender.com",
    "http://localhost:3000",
    "https://hihitutor-admin.vercel.app",
    "https://hihitutor-admin-falsekit4-hihitutors-projects.vercel.app"
  ],
  methods: "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "Range"],
  exposedHeaders: ["Content-Range", "X-Total-Count"]
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // ✅ 確保 OPTIONS request 用相同設定

// ✅ 解析 Body
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// ✅ API 請求 log
app.use((req, res, next) => {
  console.log(`📌 API 請求: ${req.method} ${req.url}`, req.body);
  next();
});

// ✅ 載入所有路由（記得補 .js）
import smsRoutes, { verifiedPhones, verificationCodes } from "./routes/smsRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import userSelfRoutes from "./routes/userSelfRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import tutorRoutes from "./routes/tutorRoutes.js";
import caseRoutes from "./routes/caseRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";

// ✅ 註冊路由
app.use("/api/sms", smsRoutes);
app.use("/api/users", userRoutes);
app.use("/api/self-users", userSelfRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/tutors", tutorRoutes);
app.use("/api/cases", caseRoutes);
app.use("/api/profiles", profileRoutes);

// ✅ 測試 API
app.get("/api", (req, res) => {
  res.json({ message: "🚀 HiHiTutor API is running!" });
});

// ✅ 首頁
app.get("/", (req, res) => {
  res.json({ message: "✅ HiHiTutor API 已啟動，請使用 /api 開頭的路由。" });
});

// ✅ 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "❌ API 路由不存在" });
});

// ✅ 全域錯誤處理
app.use((err, req, res, next) => {
  console.error("❌ 伺服器錯誤:", err);
  res.status(500).json({ error: "伺服器錯誤，請稍後再試。" });
});

// ✅ 連接 MongoDB 並啟動伺服器
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("✅ 成功連接 MongoDB");
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
  });
}).catch((err) => {
  console.error("❌ 連接 MongoDB 失敗:", err);
  process.exit(1);
});

// ✅ 監聽 MongoDB 事件
mongoose.connection.on("error", err => {
  console.error("❌ MongoDB 錯誤:", err);
});
mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ MongoDB 中斷連線");
});
// 🔄 Trigger redeploy


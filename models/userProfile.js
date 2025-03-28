// models/UserProfile.js
const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  gender: { type: String, enum: ["男", "女", "其他"] },
  profileImage: { type: String }, // ✅ 頭像 (URL)
  identityNumber: { type: String }, // ✅ 身份證（或學號）
  
  // 導師專屬欄位（只在 approvedProfile 中會顯示）
  education: { type: String },
  experience: { type: String },
  certifications: [{ type: String }], // ✅ 多個證書圖片 URL
  selfIntro: { type: String },

  // ✅ 管理用途
  submittedAt: { type: Date, default: Date.now }
});

const userProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },

  latestProfile: { type: profileSchema, required: true }, // 等待審批中版本
  approvedProfile: { type: profileSchema },                // 成功審批後版本
  profileStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" }
});

module.exports = mongoose.model("UserProfile", userProfileSchema);

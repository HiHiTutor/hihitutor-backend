const mongoose = require("mongoose");

// ✅ **導師基本資料 Schema**
const TutorSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // 連結到 User
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  subject: [{ type: String, required: true }], // 可以教授的科目
  experience: { type: Number, required: true }, // 教學經驗 (年數)
  description: { type: String }, // 自我介紹
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Tutor", TutorSchema);

const mongoose = require("mongoose");

// ✅ **導師發佈的補習個案 Schema**
const TutorCaseSchema = new mongoose.Schema({
  tutor: { type: mongoose.Schema.Types.ObjectId, ref: "Tutor", required: true }, // 連結到導師
  subject: { type: String, required: true }, // 例如 "數學"
  description: { type: String, required: true }, // 詳細內容
  hourlyRate: { type: Number, required: true }, // 時薪
  location: { type: String, required: true }, // 例如 "銅鑼灣"
  availableTimes: [{ type: String }], // 可補習時間
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("TutorCase", TutorCaseSchema);

const mongoose = require("mongoose");

const StudentSchema = new mongoose.Schema({
  name: { type: String, required: true }, // 學生名稱
  age: { type: Number, required: true }, // 學生年齡
  subjects: [{ type: String }], // 學生的學習科目（可選）
  createdAt: { type: Date, default: Date.now }, // 創建時間

  // ✅ 綁定家長帳戶
  parent: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  // ✅ 聯絡方式默認使用家長的
  contactEmail: { type: String }, // 聯絡電郵（默認填入家長的）
  contactPhone: { type: String }, // 聯絡電話（默認填入家長的）
});

module.exports = mongoose.model("Student", StudentSchema);

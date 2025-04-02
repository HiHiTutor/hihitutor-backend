const mongoose = require("mongoose");

const CaseSchema = new mongoose.Schema({
  postType: {
    type: String,
    enum: ["student-seeking-tutor", "tutor-seeking-student"], // ✅ 區分學生／老師
    required: true
  },
  postTitle: { type: String, required: true },       // ✅ 個案標題
  location: { type: String, required: true },         // ✅ 上堂地點
  category: { type: String, required: true },         // ✅ 補習類別
  subjects: [{ type: String, required: true }],       // ✅ 補習科目陣列
  rate: { type: Number, required: true },             // ✅ 時薪
  description: { type: String, maxlength: 300 },      // ✅ 補充說明
  approved: { type: Boolean, default: false },        // ✅ 是否審批
  createdAt: { type: Date, default: Date.now },       // ✅ 發布時間

  // ✅ 修復這裡：補回逗號 + 加上「待上課」status
  status: {
    type: String,
    enum: ["開放中", "配對中", "待上課", "已完成"],
    default: "開放中"
  }
});

module.exports = mongoose.model("Case", CaseSchema);

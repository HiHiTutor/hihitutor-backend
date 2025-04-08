import mongoose from "mongoose";

const StudentSchema = new mongoose.Schema({
  name: { type: String, required: true }, // 學生名稱
  age: { type: Number, required: true }, // 學生年齡
  subjects: [{ type: String }], // 學習科目（可選）
  createdAt: { type: Date, default: Date.now }, // 創建時間

  // ✅ 綁定家長帳戶
  parent: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  // ✅ 聯絡方式
  contactEmail: { type: String }, // 聯絡電郵
  contactPhone: { type: String }  // 聯絡電話
});

export default mongoose.model("Student", StudentSchema);

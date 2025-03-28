const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema({
  tutor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // 連結到導師
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // 連結到學生
  amount: { type: Number, required: true }, // 付款金額
  status: { type: String, enum: ["pending", "completed", "cancelled"], default: "pending" }, // 狀態
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Transaction", TransactionSchema);

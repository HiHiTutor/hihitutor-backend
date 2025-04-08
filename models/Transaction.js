import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema({
  tutor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },   // 對應導師
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // 對應學生
  amount: { type: Number, required: true },                                       // 付款金額
  status: {
    type: String,
    enum: ["pending", "completed", "cancelled"],
    default: "pending"
  },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Transaction", TransactionSchema);

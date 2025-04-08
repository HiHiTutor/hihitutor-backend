import mongoose from "mongoose";

// ✅ 導師發佈的補習個案 Schema
const TutorCaseSchema = new mongoose.Schema({
  tutor: { type: mongoose.Schema.Types.ObjectId, ref: "Tutor", required: true }, // 對應導師
  subject: { type: String, required: true },
  description: { type: String, required: true },
  hourlyRate: { type: Number, required: true },
  location: { type: String, required: true },
  availableTimes: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("TutorCase", TutorCaseSchema);

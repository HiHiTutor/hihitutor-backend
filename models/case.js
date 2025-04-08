import mongoose from "mongoose";

const CaseSchema = new mongoose.Schema({
  postType: {
    type: String,
    enum: ["student-seeking-tutor", "tutor-seeking-student"],
    required: true
  },
  postTitle: { type: String, required: true },
  location: { type: String, required: true },
  category: { type: String, required: true },
  subjects: [{ type: String, required: true }],
  rate: { type: Number, required: true },
  description: { type: String, maxlength: 300 },
  approved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["開放中", "配對中", "待上課", "已完成"],
    default: "開放中"
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  matchedTutor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  }
});

const Case = mongoose.model("Case", CaseSchema);
export default Case;

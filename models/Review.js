const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema({
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: "Case", required: true }, // 所屬的補習個案
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // 評論者（可以是學生或導師）
    rating: { type: Number, required: true, min: 1, max: 5 }, // 評分（1-5 星）
    comment: { type: String, required: false }, // 評語
    createdAt: { type: Date, default: Date.now } // 評價日期
});

module.exports = mongoose.model("Review", ReviewSchema);

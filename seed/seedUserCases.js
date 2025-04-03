const mongoose = require("mongoose");
const Case = require("../models/case");
const User = require("../models/User");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/hihitutor";

const seed = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ 已連接 MongoDB");

    const email = "testuser01@example.com";
    const user = await User.findOne({ email });

    if (!user) {
      console.error("❌ 找不到指定用戶");
      return mongoose.disconnect();
    }

    const cases = [
      {
        user: user._id,
        postType: "tutor-seeking-student", // ✅ 正確 enum 值
        postTitle: "小學數學專補",
        category: "小學科目",
        subjects: ["數學"],
        rate: 180,
        location: "黃大仙",
        description: "多年補小學數學經驗，學生升班表現顯著提升",
        approved: true,                    // ✅ 已審批
        status: "開放中"
      },
      {
        user: user._id,
        postType: "tutor-seeking-student",
        postTitle: "中學英文口語訓練",
        category: "中學科目",
        subjects: ["英文"],
        rate: 250,
        location: "觀塘",
        description: "針對 DSE 英文 Paper 4，提升 fluency 與 confidence",
        approved: true,
        status: "配對中"
      },
      {
        user: user._id,
        postType: "tutor-seeking-student",
        postTitle: "初中通識補習",
        category: "中學科目",
        subjects: ["通識"],
        rate: 200,
        location: "沙田",
        description: "補底為主，幫助學生掌握時事與論點發展",
        approved: true,
        status: "待上課"
      }
    ];

    await Case.insertMany(cases);
    console.log(`🎉 已為 ${email} 建立 ${cases.length} 個測試個案！`);

    mongoose.disconnect();
  } catch (err) {
    console.error("❌ 建立個案失敗:", err);
    mongoose.disconnect();
  }
};

seed();


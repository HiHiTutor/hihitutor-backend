const mongoose = require("mongoose");
const Case = require("../models/Case");

// 1. MongoDB 連線字串（按你實際嘅來改）
const MONGO_URI = "mongodb://localhost:27017/hihitutor";

// 2. 模擬科目 + 地點
const categories = ["中學科目", "小學科目", "興趣班"];
const subjectsMap = {
  "中學科目": ["中學中文", "中學英文", "數學", "通識"],
  "小學科目": ["小學中文", "小學英文", "常識", "數學"],
  "興趣班": ["畫畫", "鋼琴", "魔術", "舞蹈"]
};
const locations = ["荃灣", "沙田", "九龍灣", "灣仔", "將軍澳"];

async function seedCases() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ 已連接 MongoDB");

    const dummyCases = [];

    for (let i = 1; i <= 20; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const subjects = subjectsMap[category];
      const randomSubjects = [subjects[Math.floor(Math.random() * subjects.length)]];
      const randomLocation = locations[Math.floor(Math.random() * locations.length)];

      dummyCases.push({
        postType: i % 2 === 0 ? "student-seeking-tutor" : "tutor-seeking-student",
        postTitle: `示範個案 #${i}`,
        location: randomLocation,
        category,
        subjects: randomSubjects,
        rate: Math.floor(Math.random() * 400) + 100,
        description: `這是一個示範個案 #${i}，希望尋找優質導師。`,
        approved: false,
        status: "開放中",
        createdAt: new Date(),
      });
    }

    const result = await Case.insertMany(dummyCases);
    console.log(`✅ 成功插入 ${result.length} 個個案`);

    process.exit(0);
  } catch (error) {
    console.error("❌ 插入假資料失敗:", error);
    process.exit(1);
  }
}

seedCases();

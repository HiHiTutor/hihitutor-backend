// 📁 C:\Projects\HiHiTutor\hihitutor-backend\seed\seedUsers.js

const mongoose = require("mongoose");
const { faker } = require('@faker-js/faker');
const User = require("../models/User");
const UserProfile = require("../models/UserProfile");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/hihitutor";

const createFakeUser = (index) => {
  const isOrg = index % 5 === 0; // 每5個為機構用戶
  const birthYear = faker.number.int({ min: 1980, max: 2012 });
  const birthdate = new Date(
    birthYear,
    faker.number.int({ min: 0, max: 11 }),
    faker.number.int({ min: 1, max: 28 })
  );

  const baseUser = {
    name: faker.person.fullName(),
    email: faker.internet.email(),
    password: "hashedpassword123", // 假設密碼已加密
    birthdate,
    phone: faker.phone.number(),
    tags: isOrg ? ["institution"] : ["student", "tutor"],
    userType: isOrg ? "organization" : "individual",
    createdAt: new Date(),
  };

  if (isOrg) {
    baseUser.institutionName = faker.company.name();
    baseUser.businessRegistrationNumber = faker.string.uuid();
  }

  return baseUser;
};

const createProfile = (userId) => {
  const baseProfile = {
    fullName: faker.person.fullName(),
    gender: faker.helpers.arrayElement(["男", "女"]), // ✅ 改成 enum 支援值
    HKID: faker.string.alphanumeric(8).toUpperCase(),
    education: faker.lorem.words(5),
    experience: faker.lorem.sentences(2),
    introduction: faker.lorem.paragraph(),
    profileImage: "/uploads/avatar/default.png",
    certificates: [
      "/uploads/certificates/sample1.png",
      "/uploads/certificates/sample2.png",
    ],
  };

  return {
    user: userId, // ✅ 正確欄位應為 `user`
    latestProfile: baseProfile,
    approvedProfile: baseProfile,
  };
};

const seed = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ 已連接 MongoDB");

    const users = [];
    const profiles = [];

    for (let i = 0; i < 20; i++) {
      const userData = createFakeUser(i);
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        console.log(`⚠️ 用戶已存在，略過: ${userData.email}`);
        continue;
      }

      const newUser = new User(userData);
      await newUser.save();

      const profileData = createProfile(newUser._id);
      const newProfile = new UserProfile(profileData);
      await newProfile.save();

      users.push(newUser);
      profiles.push(newProfile);
    }

    console.log(`🎉 已新增 ${users.length} 位用戶及對應 profile（未刪除任何資料）`);
    mongoose.disconnect();
  } catch (err) {
    console.error("❌ 建立資料失敗:", err);
    mongoose.disconnect();
  }
};

seed();

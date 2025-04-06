const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true }, // 用戶名稱
  birthdate: { type: Date, required: true }, // 🎯 用戶出生年月日，系統自動計算年齡
  age: { type: Number }, // 後台計算的年齡（不讓用戶直接輸入）
  email: { type: String, required: true, unique: true }, // Email（未成年者則填家長的）
  password: { type: String, required: true }, 
  phone: { type: String }, // 聯絡電話（未成年者則填家長的）
  tags: { type: [String], default: [] }, // ["student", "tutor", "institution"]
  createdAt: { type: Date, default: Date.now }, // 帳戶創建時間

  // ✅ 新增：用戶類型（個人 / 機構）
  userType: {
    type: String,
    enum: ["individual", "organization"],
    required: true,
  },

  // ✅ 新增：用戶編號（U-xxxxx / T-xxxxx / ORG-xxxxx）
  userCode: {
    type: String,
    unique: true,
    required: true,
  },

  // ✅ 是否為高級個人用戶（導師）
  isTutor: {
    type: Boolean,
    default: false,
  },

  // ✅ 證明文件（導師 & 機構通用）
  organizationDocs: {
    businessRegistration: { type: String, default: "" }, // 商業發掘證
    addressProof: { type: String, default: "" }          // 地址證明
  },
  tutorCertificates: [{ type: String }], // 導師資歷證書（圖片路徑）

  // ✅ 監護人資訊（當用戶未成年 & 剖選了"監護人"時）
  guardian: {
    name: { type: String },
    relationship: { type: String },
    contactEmail: { type: String },
    contactPhone: { type: String }
  },

  // ✅ 機構用戶專屬資料
  institutionName: { type: String },
  businessRegistrationNumber: { type: String }
});

// 🎯 自動計算年齡（每次取出時自動計算）
UserSchema.pre("save", function (next) {
  if (this.birthdate) {
    const today = new Date();
    const birthDate = new Date(this.birthdate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--; // 若生日還沒到，今年年齡要減1
    }
    this.age = age;
  }
  next();
});

module.exports = mongoose.model("User", UserSchema);

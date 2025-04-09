import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  birthdate: { type: Date, required: true },
  age: { type: Number },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  tags: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },

  userType: {
    type: String,
    enum: ["individual", "organization"],
    required: true,
  },

  userCode: {
    type: String,
    unique: true,
    required: true,
  },

  isTutor: {
    type: Boolean,
    default: false,
  },

  organizationDocs: {
    businessRegistration: { type: String, default: "" },
    addressProof: { type: String, default: "" },
  },
  tutorCertificates: [{ type: String }],

  guardian: {
    name: { type: String },
    relationship: { type: String },
    contactEmail: { type: String },
    contactPhone: { type: String },
  },

  institutionName: { type: String },
  businessRegistrationNumber: { type: String },

  // ✅ 新增 status 欄位
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active"
  }
});

// ✅ 自動計算年齡
UserSchema.pre("save", function (next) {
  if (this.birthdate) {
    const today = new Date();
    const birthDate = new Date(this.birthdate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    this.age = age;
  }
  next();
});

const User = mongoose.model("User", UserSchema);
export default User;

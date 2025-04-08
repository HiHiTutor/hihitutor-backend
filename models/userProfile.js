// models/UserProfile.js
import mongoose from "mongoose";

const profileSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  gender: { type: String, enum: ["男", "女", "其他"] },
  profileImage: { type: String },
  identityNumber: { type: String },
  education: { type: String },
  experience: { type: String },
  certifications: [{ type: String }],
  selfIntro: { type: String },
  submittedAt: { type: Date, default: Date.now }
});

const userProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  latestProfile: { type: profileSchema, required: true },
  approvedProfile: { type: profileSchema },
  profileStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" }
});

const UserProfile = mongoose.model("UserProfile", userProfileSchema);
export default UserProfile;

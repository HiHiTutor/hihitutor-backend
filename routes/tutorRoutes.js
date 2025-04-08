const express = require("express");
const { check, validationResult } = require("express-validator");
const Tutor = require("../models/Tutor");
const TutorCase = require("../models/TutorCase");
const authMiddleware = require("../middleware/authMiddleware"); // 引入身份驗證
const router = express.Router();

// ✅ **獲取所有導師 (GET /api/tutors)**
router.get("/", async (req, res) => {
  try {
    const tutors = await Tutor.find();
    res.json(tutors);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("伺服器錯誤");
  }
});

// ✅ **新增導師 (POST /api/tutors)**
router.post(
  "/",
  [
    authMiddleware, // 需要登入
    check("name", "請輸入導師名稱").not().isEmpty(),
    check("email", "請輸入有效的電郵").isEmail(),
    check("subject", "請輸入教授科目").not().isEmpty(),
    check("experience", "請輸入教學經驗 (年數)").isNumeric(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, subject, experience, description } = req.body;

    try {
      let tutor = await Tutor.findOne({ email });
      if (tutor) {
        return res.status(400).json({ msg: "該電郵已經存在導師資料" });
      }

      tutor = new Tutor({ user: req.user.id, name, email, subject, experience, description });
      await tutor.save();

      res.json({ msg: "導師已新增", tutor });
    } catch (err) {
      console.error(err.message);
      res.status(500).send("伺服器錯誤");
    }
  }
);

// ✅ **獲取所有補習個案 (GET /api/tutors/cases)**
router.get("/cases", async (req, res) => {
  try {
    const cases = await TutorCase.find().populate("tutor", "name subject"); // 取得導師名稱
    res.json(cases);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("伺服器錯誤");
  }
});

// ✅ **導師新增補習個案 (POST /api/tutors/cases)**
router.post(
  "/cases",
  [
    authMiddleware,
    check("subject", "請輸入教授科目").not().isEmpty(),
    check("description", "請輸入詳細描述").not().isEmpty(),
    check("hourlyRate", "請輸入時薪").isNumeric(),
    check("location", "請輸入上課地點").not().isEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { subject, description, hourlyRate, location, availableTimes } = req.body;

    try {
      let tutor = await Tutor.findOne({ user: req.user.id });
      if (!tutor) {
        return res.status(404).json({ msg: "請先註冊為導師" });
      }

      const tutorCase = new TutorCase({
        tutor: tutor._id,
        subject,
        description,
        hourlyRate,
        location,
        availableTimes,
      });

      await tutorCase.save();

      res.json({ msg: "補習個案已新增", tutorCase });
    } catch (err) {
      console.error(err.message);
      res.status(500).send("伺服器錯誤");
    }
  }
);

export default router;

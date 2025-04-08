import express from "express";
import { check, validationResult } from "express-validator";
import Student from "../models/Student.js"; // ← 加 `.js`
import authMiddleware from "../middleware/authMiddleware.js"; // ← 加 `.js`

const router = express.Router();

// ✅ **新增學生 API**
router.post(
  "/",
  [
    authMiddleware,
    check("name", "請輸入學生名稱").not().isEmpty(),
    check("email", "請輸入有效的電郵").isEmail(),
    check("age", "請輸入學生年齡").isInt({ min: 3, max: 100 }),
    check("subjects", "請輸入至少一個學習科目").isArray({ min: 1 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, age, subjects } = req.body;

    try {
      const student = new Student({ 
        name, 
        email, 
        age, 
        subjects, 
        user: req.user.id 
      });

      await student.save();
      res.status(201).json({ msg: "學生已新增", student });
    } catch (err) {
      console.error(err.message);
      res.status(500).send("伺服器錯誤");
    }
  }
);

export default router;

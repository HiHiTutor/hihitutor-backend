console.log("✅ caseRoutes 加載成功");
const express = require("express");
const { check, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const Case = require("../models/case");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

/** ✅ 審批個案 */
router.put("/:id/approve", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "個案 ID 無效" });
    }

    const updated = await Case.findByIdAndUpdate(
      req.params.id,
      { approved: true, status: "開放中" },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "找不到個案" });
    }

    res.json({ msg: "✅ 個案已成功審批", case: updated });
  } catch (err) {
    console.error("❌ 審批個案錯誤:", err.message);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

/** ❌ 拒批個案 */
router.put("/:id/reject", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "個案 ID 無效" });
    }

    const updated = await Case.findByIdAndUpdate(
      req.params.id,
      { approved: false, status: "已拒絕" },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "找不到個案" });
    }

    res.json({ msg: "❌ 個案已被拒絕", case: updated });
  } catch (err) {
    console.error("❌ 拒絕個案錯誤:", err.message);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

/** 🔧 一般個案更新（例如：更新狀態） */
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "個案 ID 無效" });
    }

    delete updateData._id;
    delete updateData.id;

    const updatedCase = await Case.findByIdAndUpdate(id, updateData, { new: true });

    if (!updatedCase) {
      return res.status(404).json({ error: "找不到個案" });
    }

    console.log("✅ 成功更新個案:", updatedCase);
    res.json(updatedCase);
  } catch (err) {
    console.error("❌ 更新個案錯誤:", err.message);
    res.status(500).json({ error: `伺服器錯誤，請稍後再試。 錯誤詳情: ${err.message}` });
  }
});

/** 🟢 新增補習個案（學生發佈 / 老師招學生） */
router.post(
  "/",
  [
    authMiddleware,
    check("postType", "請選擇個案類型").isIn(["student-seeking-tutor", "tutor-seeking-student"]),
    check("postTitle", "請輸入標題").not().isEmpty(),
    check("location", "請輸入上堂地點").not().isEmpty(),
    check("category", "請選擇科目大分類").not().isEmpty(),
    check("subjects", "請選擇至少一個科目").isArray({ min: 1 }),
    check("rate", "請輸入正確的時薪").isFloat({ min: 50 }),
    check("description", "描述不能超過 300 字").isLength({ max: 300 }),
  ],
  async (req, res) => {
    console.log("📌 收到 POST /api/cases 請求，請求內容:", req.body);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.warn("⚠️ 表單驗證失敗:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const newCase = new Case({
        ...req.body,
        createdBy: req.user._id, // ✅ 最重要：儲存係邊個 user 出嘅個案
        approved: false,
        status: "開放中",
        createdAt: new Date(),
      });

      console.log("📌 嘗試存入 MongoDB:", newCase);

      await newCase.save();

      console.log("✅ 新個案已成功儲存:", newCase);
      res.status(201).json({ msg: "補習案件已提交，等待管理員審批", newCase });
    } catch (err) {
      console.error("❌ 伺服器錯誤:", err.message);
      res.status(500).json({ error: `伺服器錯誤，請稍後再試。 錯誤詳情: ${err.message}` });
    }
  }
);

/** 🔓 Public API：未登入都可以查看已審批個案 */
router.get("/public", async (req, res) => {
  try {
    const publicCases = await Case.find({
      approved: true,
      status: { $in: ["開放中", "配對中"] }
    });
    res.json(publicCases);
  } catch (err) {
    console.error("❌ 取得公開個案失敗:", err);
    res.status(500).json({ error: "伺服器錯誤，無法取得公開個案" });
  }
});


/** 🟠 取得目前登入用戶的個案 */
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { postType } = req.query;
    const query = { userId };
    if (postType) query.postType = postType;

    const myCases = await Case.find(query).sort({ createdAt: -1 });
    res.json(myCases);
  } catch (err) {
    console.error("❌ 讀取自己的個案錯誤:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

router.get("/", authMiddleware, async (req, res) => {
  try {
    const { postType, sortField = "createdAt", sortOrder = "desc" } = req.query;
    let query = { approved: true };
    if (postType) query.postType = postType;

    const sortKey = sortField === "id" ? "_id" : sortField;
    const sortOption = { [sortKey]: sortOrder.toLowerCase() === "asc" ? 1 : -1 };

    const cases = await Case.find(query).sort(sortOption);
    res.status(200).json(cases);
  } catch (err) {
    console.error("❌ 伺服器錯誤:", err.message);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});


/** 🟡 取得所有 **待審批** 的個案 */
router.get("/pending", authMiddleware, async (req, res) => {
  try {
    const { sortField = "createdAt", sortOrder = "desc" } = req.query;
    const sortOption = { [sortField]: sortOrder.toLowerCase() === "asc" ? 1 : -1 };
    const pendingCases = await Case.find({ approved: false }).sort(sortOption);

    res.status(200).json(pendingCases);
  } catch (err) {
    console.error("❌ 伺服器錯誤:", err.message);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

/** 🟣 取得單一個案（用於編輯個案） */
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "無效的個案 ID" });
    }

    const caseItem = await Case.findById(req.params.id);
    if (!caseItem) {
      return res.status(404).json({ error: "找不到該個案" });
    }
    res.json(caseItem);
  } catch (err) {
    console.error("❌ 獲取個案失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

/** ❌ 刪除個案 API */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "無效的個案 ID" });
    }

    const caseItem = await Case.findById(req.params.id);
    if (!caseItem) {
      return res.status(404).json({ error: "個案不存在" });
    }

    await Case.findByIdAndDelete(req.params.id);
    console.log("✅ 個案已刪除:", req.params.id);
    res.json({ msg: "個案已刪除" });
  } catch (err) {
    console.error("❌ 刪除個案失敗:", err.message);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});



export default router;

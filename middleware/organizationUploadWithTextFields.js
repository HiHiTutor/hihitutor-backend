// ✅ ESM 改寫版本
import organizationUpload from "./organizationUpload.js";

const convertFormDataTextFields = (req, res, next) => {
  for (const key in req.body) {
    if (Array.isArray(req.body[key])) {
      req.body[key] = req.body[key][0];
    }
  }
  next();
};

// 👉 你應該 export 結合後的 middleware（如果你用的是一齊用 upload + convert middleware 的方式）
const combinedMiddleware = [organizationUpload.fields([
  { name: "br", maxCount: 1 },
  { name: "cr", maxCount: 1 },
  { name: "addressProof", maxCount: 1 }
]), convertFormDataTextFields];

export default combinedMiddleware;

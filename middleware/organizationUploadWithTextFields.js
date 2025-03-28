// 📁 C:\Projects\HiHiTutor\hihitutor-backend\middleware\organizationUploadWithTextFields.js

const organizationUpload = require("./organizationUpload");

const convertFormDataTextFields = (req, res, next) => {
  for (const key in req.body) {
    if (Array.isArray(req.body[key])) {
      req.body[key] = req.body[key][0]; // 只取第一個文字
    }
  }
  next();
};

module.exports = [organizationUpload, convertFormDataTextFields];

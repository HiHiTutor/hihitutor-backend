import os
from pymongo import MongoClient
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()
client = MongoClient(os.getenv("MONGO_URI"))
db = client["HiHiTutor"]

# 清空 collections（如有需要可保留）
db.users.delete_many({})
db.cases.delete_many({})

print("🧪 開始匯入測試資料...")

# ➤ 插入用戶
admin_user = {
    "name": "Admin User",
    "email": "admin@example.com",
    "phone": "90000001",
    "userType": "individual",
    "tags": ["admin"],
    "status": "active",
    "userCode": "T-00001",
    "password": "hashedpassword"
}

org_user = {
    "name": "Test Organization",
    "email": "org@example.com",
    "phone": "90000002",
    "userType": "organization",
    "tags": ["institution"],
    "status": "approved",
    "userCode": "ORG-00001",
    "password": "hashedpassword"
}

normal_user = {
    "name": "Normal User",
    "email": "user@example.com",
    "phone": "90000003",
    "userType": "individual",
    "tags": ["student"],
    "status": "active",
    "userCode": "U-00001",
    "password": "hashedpassword"
}

admin_id = db.users.insert_one(admin_user).inserted_id
org_id = db.users.insert_one(org_user).inserted_id
normal_id = db.users.insert_one(normal_user).inserted_id

# ➤ 插入個案
approved_case = {
    "title": "已審批個案",
    "description": "這是一個已審批的個案",
    "status": "approved",
    "createdBy": normal_id,
    "postType": "student-seeking-tutor",
    "createdAt": datetime.utcnow()
}

pending_case = {
    "title": "待審批個案",
    "description": "這是一個待審批的個案",
    "status": "pending",
    "createdBy": org_id,
    "postType": "tutor-seeking-student",
    "createdAt": datetime.utcnow()
}

approved_case_id = db.cases.insert_one(approved_case).inserted_id
pending_case_id = db.cases.insert_one(pending_case).inserted_id

print("✅ 匯入完成！")
print(f"adminUserId={admin_id}")
print(f"orgUserId={org_id}")
print(f"normalUserId={normal_id}")
print(f"approvedCaseId={approved_case_id}")
print(f"pendingCaseId={pending_case_id}")

import os
from pymongo import MongoClient
from dotenv import load_dotenv

print("🚀 Script 開始執行")

try:
    load_dotenv()
    MONGO_URI = os.getenv("MONGO_URI")
    DB_NAME = "HiHiTutor"
    if not MONGO_URI:
        raise Exception("❌ MONGO_URI 未成功讀取")

    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]

    def get_user_by_tag(tag):
        return db.users.find_one({"tags": tag})

    def get_user_by_userType(user_type):
        return db.users.find_one({"userType": user_type})

    def get_case_by_status(status):
        return db.cases.find_one({"status": status})

    admin = get_user_by_tag("admin")
    org = get_user_by_userType("organization")
    normal = get_user_by_userType("individual")
    approved_case = get_case_by_status("approved")
    pending_case = get_case_by_status("pending")

    print("✅ 撈取結果：")
    print(f"adminUserId={admin['_id'] if admin else '❌ 無結果'}")
    print(f"orgUserId={org['_id'] if org else '❌ 無結果'}")
    print(f"normalUserId={normal['_id'] if normal else '❌ 無結果'}")
    print(f"approvedCaseId={approved_case['_id'] if approved_case else '❌ 無結果'}")
    print(f"pendingCaseId={pending_case['_id'] if pending_case else '❌ 無結果'}")

    # 確保 tests 資料夾存在
    os.makedirs("tests", exist_ok=True)

    with open("tests/hihitutor-env.postman_environment.json", "w", encoding="utf-8") as f:
        import json
        env = {
            "id": "hihitutor-env-id",
            "name": "HiHiTutor API Env",
            "values": [
                {"key": "adminUserId", "value": str(admin['_id']), "enabled": True},
                {"key": "orgUserId", "value": str(org['_id']), "enabled": True},
                {"key": "normalUserId", "value": str(normal['_id']), "enabled": True},
                {"key": "approvedCaseId", "value": str(approved_case['_id']), "enabled": True},
                {"key": "pendingCaseId", "value": str(pending_case['_id']), "enabled": True},
            ],
            "timestamp": 0,
            "_postman_variable_scope": "environment",
            "_postman_exported_at": "2025-04-11T00:00:00.000Z",
            "_postman_exported_using": "Postman"
        }
        json.dump(env, f, indent=2, ensure_ascii=False)

    print("\n✅ 已匯出環境變數至 tests/hihitutor-env.postman_environment.json")

except Exception as e:
    print("❌ 發生錯誤：", e)

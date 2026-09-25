"""
نظام إدارة الدخول والأمان وحفظ الحقوق
Copyright (C) ENG-MOSTAFAELMGHRABY - All Rights Reserved
"""

import hashlib
import hmac
import time
import uuid

# يتم تحميل المستخدمين ديناميكياً من settings_manager
from backend.settings_manager import get_users_db

ACTIVE_SESSIONS = {}
FAILED_ATTEMPTS = {}
LOCKOUT_TIME = 60
MAX_ATTEMPTS = 5

COPYRIGHT_NOTICE = "جميع الحقوق محفوظة للمهندس مصطفى المغربي © ENG-MOSTAFAELMGHRABY"


def verify_login(user_id, password):
    now = time.time()

    if user_id in FAILED_ATTEMPTS:
        attempts, last_time = FAILED_ATTEMPTS[user_id]
        if attempts >= MAX_ATTEMPTS:
            if now - last_time < LOCKOUT_TIME:
                remaining = int(LOCKOUT_TIME - (now - last_time))
                return {
                    "success": False,
                    "message": f"تم حظر المحاولات مؤقتاً بسبب تكرار كلمة المرور الخاطئة. الرجاء الانتظار {remaining} ثانية.",
                    "copyright": COPYRIGHT_NOTICE
                }
            else:
                FAILED_ATTEMPTS.pop(user_id, None)

    # تحميل المستخدمين من الإعدادات (دعم التحديث الديناميكي)
    users_db = get_users_db()
    user = users_db.get(user_id)
    if not user:
        return {"success": False, "message": "المستخدم غير موجود بالمنظومة.", "copyright": COPYRIGHT_NOTICE}

    # التحقق من حالة الحساب (نشط أم معطّل/محظور)
    if user.get("is_active") is False:
        return {
            "success": False,
            "message": "تم إيقاف وتعطيل هذا الحساب من قِبل إدارة النظام. يرجى مراجعة المسؤول.",
            "copyright": COPYRIGHT_NOTICE
        }

    pw_hash = hashlib.sha256(password.encode("utf-8")).hexdigest()
    if not hmac.compare_digest(user["password_hash"], pw_hash):
        attempts, _ = FAILED_ATTEMPTS.get(user_id, (0, now))
        FAILED_ATTEMPTS[user_id] = (attempts + 1, now)
        return {
            "success": False,
            "message": f"كلمة المرور غير صحيحة! المتبقي {MAX_ATTEMPTS - (attempts + 1)} محاولات.",
            "copyright": COPYRIGHT_NOTICE
        }

    FAILED_ATTEMPTS.pop(user_id, None)
    session_token = str(uuid.uuid4())
    session_data = {
        "user_id":        user["id"],
        "name":           user["name"],
        "role":           user["role"],
        "sector":         user.get("sector", "المنيا شمال"),
        "administration": user.get("administration", "بني مزار شرق"),
        "permissions":    user.get("permissions", []),
        "login_time":     now
    }
    ACTIVE_SESSIONS[session_token] = session_data

    return {
        "success": True,
        "token": session_token,
        "user": {
            "id":             user["id"],
            "name":           user["name"],
            "role":           user["role"],
            "sector":         user.get("sector", "المنيا شمال"),
            "administration": user.get("administration", "بني مزار شرق"),
            "permissions":    user.get("permissions", [])
        },
        "copyright": COPYRIGHT_NOTICE
    }


def validate_session(token):
    if not token or token not in ACTIVE_SESSIONS:
        return None
    return ACTIVE_SESSIONS[token]


def logout_session(token):
    if token in ACTIVE_SESSIONS:
        user_data = ACTIVE_SESSIONS.pop(token)
        return user_data
    return None


def get_users_list():
    from backend.settings_manager import get_users_list as sm_get_users_list
    return sm_get_users_list()

"""
سجل نشاط المستخدمين — يسجل جميع العمليات المنفذة
Copyright (C) ENG-MOSTAFAELMGHRABY - All Rights Reserved
"""

import os
import json
import time
from datetime import datetime, timezone

CURRENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOG_FILE = os.path.join(CURRENT_DIR, "activity_log.json")
MAX_LOG_ENTRIES = 2000  # الحد الأقصى للسجلات المحفوظة

ACTION_LABELS = {
    "login":           "تسجيل دخول",
    "logout":          "تسجيل خروج",
    "save_project":    "حفظ مشروع",
    "load_project":    "فتح مشروع",
    "delete_project":  "حذف مشروع",
    "export_excel":    "تصدير Excel",
    "print":           "طباعة مخطط",
    "add_user":        "إضافة مستخدم",
    "edit_user":       "تعديل مستخدم",
    "delete_user":     "حذف مستخدم",
    "change_password": "تغيير كلمة مرور",
    "change_settings": "تغيير الإعدادات",
    "simulation":      "محاكاة سكاكين",
    "calculate":       "حساب الشبكة"
}


def _load_log():
    if os.path.exists(LOG_FILE):
        try:
            with open(LOG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return []


def _save_log(entries):
    with open(LOG_FILE, "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)


def add_log(user_id, user_name, action, details=""):
    """تسجيل نشاط جديد في السجل."""
    try:
        entries = _load_log()
        now = datetime.now()
        entry = {
            "id":        int(time.time() * 1000),
            "timestamp": now.isoformat(),
            "date":      now.strftime("%Y-%m-%d"),
            "time":      now.strftime("%H:%M:%S"),
            "user_id":   user_id,
            "user_name": user_name,
            "action":    action,
            "action_label": ACTION_LABELS.get(action, action),
            "details":   details
        }
        entries.insert(0, entry)  # الأحدث في البداية
        if len(entries) > MAX_LOG_ENTRIES:
            entries = entries[:MAX_LOG_ENTRIES]
        _save_log(entries)
        return True
    except Exception as e:
        return False


def get_log(limit=500, user_filter=None, action_filter=None, date_from=None, date_to=None):
    """إرجاع سجل النشاط مع إمكانية الفلترة."""
    entries = _load_log()
    if user_filter:
        entries = [e for e in entries if e.get("user_id") == user_filter]
    if action_filter:
        entries = [e for e in entries if e.get("action") == action_filter]
    if date_from:
        entries = [e for e in entries if e.get("date", "") >= date_from]
    if date_to:
        entries = [e for e in entries if e.get("date", "") <= date_to]
    return entries[:limit]


def get_log_stats():
    """إحصائيات سريعة عن سجل النشاط."""
    entries = _load_log()
    stats = {
        "total": len(entries),
        "by_user": {},
        "by_action": {}
    }
    for e in entries:
        uid = e.get("user_id", "unknown")
        act = e.get("action", "unknown")
        stats["by_user"][uid]   = stats["by_user"].get(uid, 0) + 1
        stats["by_action"][act] = stats["by_action"].get(act, 0) + 1
    return stats


def clear_log():
    """مسح سجل النشاط (للمدير فقط)."""
    try:
        _save_log([])
        return True, "تم مسح سجل النشاط"
    except Exception as e:
        return False, str(e)


def get_action_labels():
    return ACTION_LABELS

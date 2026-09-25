"""
مدير إعدادات النظام — يقرأ ويكتب settings.json
Copyright (C) ENG-MOSTAFAELMGHRABY - All Rights Reserved
"""

import os
import json
import hashlib
import hmac
import time

CURRENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SETTINGS_FILE = os.path.join(CURRENT_DIR, "settings.json")

SECTORS_DATA = {
    "المنيا شمال": [
        "بني مزار شرق",
        "بني مزار غرب",
        "مغاغة",
        "العدوة",
        "مطاي",
        "سمالوط شرق",
        "سمالوط غرب"
    ],
    "المنيا جنوب": [
        "المنيا شرق",
        "المنيا غرب",
        "أبو قرقاص",
        "ملوي",
        "ديرمواس"
    ],
    "بني سويف": [
        "مدينة بني سويف",
        "مركز بني سويف",
        "ناصر",
        "ببا",
        "الفشن",
        "إهناسيا",
        "الواسطى",
        "سمسطا"
    ],
    "الفيوم": [
        "شرق الفيوم",
        "غرب الفيوم",
        "مركز الفيوم",
        "إطسا",
        "طامية",
        "سنورس",
        "يوسف الصديق",
        "إبشواي"
    ],
    "أسيوط": [
        "شرق أسيوط",
        "غرب أسيوط",
        "مركز أسيوط",
        "ديروط",
        "القوصية",
        "منفلوط",
        "أبنوب",
        "الفتح",
        "صدفا",
        "الغنايم",
        "البداري",
        "ساحل سليم"
    ],
    "الوادي الجديد": [
        "الخارجة",
        "الداخلة",
        "الفرافرة",
        "باريس",
        "بلاط"
    ]
}


def get_sectors_data():
    """إرجاع بيانات القطاعات والإدارات العامة المعتمدة في شركة مصر الوسطى لتوزيع الكهرباء."""
    raw = _load_raw()
    if raw and "sectors" in raw and isinstance(raw["sectors"], dict) and len(raw["sectors"]) > 0:
        return raw["sectors"]
    return SECTORS_DATA


def update_sectors_data(new_sectors):
    """حفظ وتحديث بيانات القطاعات والإدارات في settings.json."""
    if not isinstance(new_sectors, dict) or len(new_sectors) == 0:
        return False, "بيانات القطاعات غير صالحة"
    data = _load_raw() or DEFAULT_SETTINGS.copy()
    data["sectors"] = new_sectors
    _save_raw(data)
    global SECTORS_DATA
    SECTORS_DATA = new_sectors
    return True, "تم حفظ وتحديث القطاعات والإدارات الهندسية بنجاح"


DEFAULT_SETTINGS = {
    "system_info": {
        "app_name": "شركة مصر الوسطى لتوزيع الكهرباء",
        "sub_title": "النظام الهندسي الذكي لمخططات شبكات التوزيع"
    },
    "sectors": SECTORS_DATA,
    "dropdowns": {
        "overhead_sizes": [
            {"value": "70/12",   "label": "70/12"},
            {"value": "150/25",  "label": "150/25"},
            {"value": "سبيكة",   "label": "سبيكة AAAC"},
            {"value": "35/6",    "label": "35/6"}
        ],
        "cable_sizes": [
            {"value": "3*150",  "label": "3*150 مم²"},
            {"value": "3*240",  "label": "3*240 مم²"},
            {"value": "3*70",   "label": "3*70 مم²"},
            {"value": "150/25", "label": "150/25"},
            {"value": "70/12",  "label": "70/12"},
            {"value": "35/6",   "label": "35/6"}
        ],
        "transformer_capacities": [
            {"value": "25",   "label": "25 KVA"},
            {"value": "50",   "label": "50 KVA"},
            {"value": "63",   "label": "63 KVA"},
            {"value": "100",  "label": "100 KVA"},
            {"value": "160",  "label": "160 KVA"},
            {"value": "200",  "label": "200 KVA"},
            {"value": "300",  "label": "300 KVA"},
            {"value": "500",  "label": "500 KVA"},
            {"value": "1000", "label": "1000 KVA"},
            {"value": "1250", "label": "1250 KVA"},
            {"value": "1600", "label": "1600 KVA"}
        ],
        "voltage_levels": [
            {"value": "11", "label": "11 ك.ف"},
            {"value": "22", "label": "22 ك.ف"},
            {"value": "33", "label": "33 ك.ف"},
            {"value": "66", "label": "66 ك.ف"}
        ],
        "substation_types": [
            {"value": "substation", "label": "محطة محولات (3 دوائر مثلثة متداخلة)"},
            {"value": "board",      "label": "لوحة توزيع (إطار توزيع مزدوج)"}
        ],
        "rmu_switch_counts": [
            {"value": "2", "label": "2 سكينة"},
            {"value": "3", "label": "3 سكاكين"},
            {"value": "4", "label": "4 سكاكين"}
        ]
    },
    "users": {
        "admin": {
            "id": "admin",
            "name": "المدير العام (Administrator)",
            "role": "admin",
            "sector": "المنيا شمال",
            "administration": "بني مزار شرق",
            "is_active": True,
            "password_plain": "123450",
            "password_hash": hashlib.sha256("123450".encode("utf-8")).hexdigest(),
            "permissions": ["all", "edit_network", "export", "settings", "manage_users"]
        },
        "planning_eng": {
            "id": "planning_eng",
            "name": "مهندس تخطيط وشبكات",
            "role": "engineer",
            "sector": "المنيا شمال",
            "administration": "بني مزار غرب",
            "is_active": True,
            "password_plain": "eng123",
            "password_hash": hashlib.sha256("eng123".encode("utf-8")).hexdigest(),
            "permissions": ["edit_network", "export", "calculations"]
        },
        "operation_eng": {
            "id": "operation_eng",
            "name": "مهندس تشغيل ومناورات",
            "role": "operator",
            "sector": "المنيا شمال",
            "administration": "مغاغة",
            "is_active": True,
            "password_plain": "oper123",
            "password_hash": hashlib.sha256("oper123".encode("utf-8")).hexdigest(),
            "permissions": ["simulate_switching", "export", "view"]
        },
        "technician": {
            "id": "technician",
            "name": "فني شبكات وتوزيع",
            "role": "tech",
            "sector": "المنيا شمال",
            "administration": "العدوة",
            "is_active": True,
            "password_plain": "tech123",
            "password_hash": hashlib.sha256("tech123".encode("utf-8")).hexdigest(),
            "permissions": ["view", "export"]
        }
    }
}

ROLE_LABELS = {
    "admin":    "مدير النظام",
    "engineer": "مهندس",
    "operator": "مشغّل",
    "tech":     "فني",
    "viewer":   "مشاهد"
}

PERMISSION_CATEGORIES = [
    {"id": "system",    "label": "📁 أدوات النظام وإدارة المشاريع"},
    {"id": "lines",     "label": "🔌 أزرار رسم الخطوط والكابلات"},
    {"id": "equipment", "label": "🏭 أزرار المحطات والمعدات والمحولات"},
    {"id": "control",   "label": "⚡ أزرار التحكم والتحليل والمحاكاة"},
    {"id": "general",   "label": "⭐ صلاحيات عامة وإدارية"}
]

ALL_PERMISSIONS = [
    # عام
    {"key": "all",                 "label": "⭐ كامل الصلاحيات لجميع الأزرار والوظائف", "category": "general"},
    {"key": "manage_users",        "label": "👥 إدارة المستخدمين وصلاحياتهم", "category": "general"},

    # النظام والمشاريع
    {"key": "btn_projects",        "label": "📁 زر فتح واستعراض وإدارة المشاريع", "category": "system"},
    {"key": "btn_save",            "label": "💾 زر حفظ المخطط الحالي", "category": "system"},
    {"key": "btn_print",           "label": "🖨️ زر طباعة المخطط والخرطوشة", "category": "system"},
    {"key": "btn_excel",           "label": "📥 زر تصدير تقرير إكسيل هندسي", "category": "system"},
    {"key": "btn_settings",        "label": "⚙️ زر فتح لوحة الإعدادات الشاملة", "category": "system"},

    # الخطوط والكابلات
    {"key": "btn_cable",           "label": "╍ زر رسم كابل أرضي (- - -)", "category": "lines"},
    {"key": "btn_overhead",        "label": "➖ زر رسم خط هوائي (───)", "category": "lines"},
    {"key": "btn_line_between",    "label": "⚡ زر أخذ خط / تفريعة من بين نقطتين", "category": "lines"},
    {"key": "btn_quick_line",      "label": "➕ زر رسم خط/كابل سريع من الشريط الجانبي", "category": "lines"},

    # المحطات والمعدات
    {"key": "btn_substation",      "label": "🏭 زر إضافة محطة محولات / لوحة توزيع", "category": "equipment"},
    {"key": "btn_switch",          "label": "⚡ زر إضافة وضبط السكاكين الهوائية", "category": "equipment"},
    {"key": "btn_trans",           "label": "⚙️ زر إضافة محول معلق", "category": "equipment"},
    {"key": "btn_cascade_trans",   "label": "🔄 زر تفريع محول من محول آخر", "category": "equipment"},
    {"key": "btn_kiosk",           "label": "🔺 زر إضافة كشك محولات", "category": "equipment"},
    {"key": "btn_kiosk_from_kiosk", "label": "🔺➔🔺 زر إضافة كشك متغذياً من كشك آخر", "category": "equipment"},
    {"key": "btn_rmu",             "label": "🔄 زر إضافة وحدة ربط حلقي RMU", "category": "equipment"},
    {"key": "btn_avr",             "label": "🔋 زر إضافة منظم جهد AVR", "category": "equipment"},

    # التحكم والتحليل
    {"key": "btn_simulation",      "label": "⚡ زر وضع محاكاة السكاكين والفصل/التوصيل", "category": "control"},
    {"key": "btn_calculations",    "label": "📊 زر جدول الحسابات وهبوط الجهد", "category": "control"},
    {"key": "btn_undo",            "label": "↩️ زر تراجع عن آخر خطوة (Undo)", "category": "control"},
    {"key": "btn_delete",          "label": "🗑️ زر حذف العنصر المحدد أو مسح المخطط", "category": "control"},
]



def _load_raw():
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return None


def _save_raw(data):
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def get_settings():
    """إرجاع الإعدادات الكاملة. إن لم يوجد الملف، يُنشأ بالإعدادات الافتراضية."""
    raw = _load_raw()
    if raw is None:
        _save_raw(DEFAULT_SETTINGS)
        return DEFAULT_SETTINGS
    # دمج الإعدادات الجديدة مع الافتراضية (للتحديثات المستقبلية)
    merged = {**DEFAULT_SETTINGS, **raw}
    merged["system_info"] = {**DEFAULT_SETTINGS["system_info"], **raw.get("system_info", {})}
    merged["dropdowns"] = {**DEFAULT_SETTINGS["dropdowns"], **raw.get("dropdowns", {})}
    if "users" not in merged:
        merged["users"] = DEFAULT_SETTINGS["users"]
    merged["sectors"] = get_sectors_data()
    return merged


def update_system_info(new_info):
    s = get_settings()
    s["system_info"] = {**s.get("system_info", DEFAULT_SETTINGS["system_info"]), **new_info}
    ok, msg = save_settings(s)
    return ok, msg


def save_settings(settings_data):
    """حفظ الإعدادات على القرص."""
    try:
        _save_raw(settings_data)
        return True, "تم حفظ الإعدادات بنجاح"
    except Exception as e:
        return False, str(e)


def get_dropdowns():
    s = get_settings()
    return s.get("dropdowns", DEFAULT_SETTINGS["dropdowns"])


def get_users_db():
    """إرجاع قاعدة المستخدمين."""
    s = get_settings()
    return s.get("users", DEFAULT_SETTINGS["users"])


def get_users_list():
    db = get_users_db()
    return [
        {
            "id":             u["id"],
            "name":           u["name"],
            "role":           u["role"],
            "role_label":     ROLE_LABELS.get(u["role"], u["role"]),
            "sector":         u.get("sector", "المنيا شمال"),
            "administration": u.get("administration", "بني مزار شرق"),
            "is_active":      u.get("is_active", True),
            "password":       u.get("password_plain", ""),
            "permissions":    u.get("permissions", [])
        }
        for u in db.values()
    ]


def add_user(user_id, name, role, password, permissions, sector="المنيا شمال", administration="بني مزار شرق"):
    s = get_settings()
    users = s.get("users", {})
    if user_id in users:
        return False, "معرّف المستخدم موجود مسبقاً"
    if not user_id or not name or not password:
        return False, "جميع الحقول مطلوبة"
    users[user_id] = {
        "id":             user_id,
        "name":           name,
        "role":           role,
        "sector":         sector or "المنيا شمال",
        "administration": administration or "بني مزار شرق",
        "is_active":      True,
        "password_plain": password,
        "password_hash":  hashlib.sha256(password.encode("utf-8")).hexdigest(),
        "permissions":    permissions
    }
    s["users"] = users
    ok, msg = save_settings(s)
    return ok, msg


def update_user(user_id, name, role, permissions, sector=None, administration=None, password=None, is_active=None):
    s = get_settings()
    users = s.get("users", {})
    if user_id not in users:
        return False, "المستخدم غير موجود"
    users[user_id]["name"]        = name
    users[user_id]["role"]        = role
    users[user_id]["permissions"] = permissions
    if sector is not None:
        users[user_id]["sector"] = sector
    if administration is not None:
        users[user_id]["administration"] = administration
    if password:
        users[user_id]["password_plain"] = password
        users[user_id]["password_hash"] = hashlib.sha256(password.encode("utf-8")).hexdigest()
    if is_active is not None and user_id != "admin":
        users[user_id]["is_active"] = bool(is_active)
    s["users"] = users
    ok, msg = save_settings(s)
    return ok, msg


def toggle_user_status(user_id, is_active):
    """تفعيل أو حظر/تعطيل حساب مستخدم من قبل المدير."""
    if user_id == "admin":
        return False, "لا يمكن تعطيل أو حظر حساب المدير الرئيسي"
    s = get_settings()
    users = s.get("users", {})
    if user_id not in users:
        return False, "المستخدم غير موجود"
    users[user_id]["is_active"] = bool(is_active)
    s["users"] = users
    ok, msg = save_settings(s)
    status_text = "تفعيل" if is_active else "تعطيل وحظر"
    if ok:
        return True, f"تم {status_text} الحساب بنجاح"
    return ok, msg


def delete_user(user_id):
    if user_id == "admin":
        return False, "لا يمكن حذف حساب المدير الرئيسي"
    s = get_settings()
    users = s.get("users", {})
    if user_id not in users:
        return False, "المستخدم غير موجود"
    del users[user_id]
    s["users"] = users
    ok, msg = save_settings(s)
    return ok, msg


def change_password(user_id, new_password):
    if not new_password or len(new_password) < 4:
        return False, "كلمة المرور يجب أن تكون 4 أحرف على الأقل"
    s = get_settings()
    users = s.get("users", {})
    if user_id not in users:
        return False, "المستخدم غير موجود"
    users[user_id]["password_plain"] = new_password
    users[user_id]["password_hash"] = hashlib.sha256(new_password.encode("utf-8")).hexdigest()
    s["users"] = users
    ok, msg = save_settings(s)
    return ok, msg


def change_my_password(user_id, old_password, new_password):
    """تغيير كلمة المرور ذاتياً بواسطة المستخدم المسجل بعد التحقق من كلمته الحالية."""
    if not new_password or len(new_password) < 4:
        return False, "كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل"
    s = get_settings()
    users = s.get("users", {})
    if user_id not in users:
        return False, "المستخدم غير موجود"
    user = users[user_id]
    old_hash = hashlib.sha256((old_password or "").encode("utf-8")).hexdigest()
    if not hmac.compare_digest(user.get("password_hash", ""), old_hash):
        return False, "كلمة المرور الحالية غير صحيحة"
    user["password_plain"] = new_password
    user["password_hash"] = hashlib.sha256(new_password.encode("utf-8")).hexdigest()
    s["users"] = users
    ok, msg = save_settings(s)
    if ok:
        return True, "تم تغيير كلمة المرور بنجاح"
    return ok, msg


def update_dropdowns(new_dropdowns):
    s = get_settings()
    s["dropdowns"] = new_dropdowns
    return save_settings(s)


def get_all_permissions():
    return ALL_PERMISSIONS


def get_permission_categories():
    return PERMISSION_CATEGORIES


def get_role_labels():
    return ROLE_LABELS


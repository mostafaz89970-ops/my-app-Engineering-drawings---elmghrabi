"""
الخادم الرئيسي للنظام الهندسي الذكي لمخططات شبكات التوزيع
Copyright (C) ENG-MOSTAFAELMGHRABY - All Rights Reserved
"""

import os
import sys
import json
import webbrowser
import threading
import time
import subprocess

import bottle
from bottle import Bottle, run, static_file, request, response

# زيادة الحد الأقصى لحجم الطلبات إلى 50 ميجابايت لاستيعاب صور ورسومات المخططات وملفات الباور بوينت
bottle.BaseRequest.MEMFILE_MAX = 50 * 1024 * 1024

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, CURRENT_DIR)

import re
import io
import base64
from backend.auth import verify_login, validate_session, get_users_list, logout_session, COPYRIGHT_NOTICE
from backend.calculations import calculate_network_metrics
from backend.excel_exporter import export_network_to_excel
from backend.powerpoint_exporter import export_network_to_powerpoint
from backend.powerpoint_importer import import_powerpoint_presentation
from backend.project_manager import save_project, load_project, list_projects, delete_project, get_demo_video_project
from backend.settings_manager import (
    get_settings, save_settings, get_dropdowns, update_dropdowns, update_system_info,
    add_user, update_user, delete_user, change_password, toggle_user_status, change_my_password,
    get_all_permissions, get_permission_categories, get_role_labels, get_sectors_data, update_sectors_data
)
from backend.activity_log import add_log, get_log, get_log_stats, clear_log, get_action_labels

app = Bottle()
UI_DIR = os.path.join(CURRENT_DIR, "ui")


def enable_cors():
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Origin, Accept, Content-Type, X-Requested-With, X-CSRF-Token, Authorization'


def get_session_user(req):
    """استخراج بيانات المستخدم من رأس Authorization أو body."""
    token = req.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        body = req.json or {}
        token = body.get("token", "")
    if token:
        return validate_session(token)
    return None


@app.route('/')
def serve_index():
    return static_file("index.html", root=UI_DIR)


@app.route('/static/<filepath:path>')
def serve_static(filepath):
    return static_file(filepath, root=UI_DIR)


# ==================== AUTH ====================

@app.route('/api/users', method=['GET', 'OPTIONS'])
def api_users():
    enable_cors()
    if request.method == 'OPTIONS':
        return {}
    return {
        "success": True,
        "users": get_users_list(),
        "copyright": COPYRIGHT_NOTICE
    }


@app.route('/api/login', method=['POST', 'OPTIONS'])
def api_login():
    enable_cors()
    if request.method == 'OPTIONS':
        return {}
    data = request.json or {}
    user_id = data.get("user_id", "")
    password = data.get("password", "")
    result = verify_login(user_id, password)
    if result.get("success"):
        user = result["user"]
        add_log(user["id"], user["name"], "login", f"تسجيل دخول ناجح من المتصفح")
    return result


@app.route('/api/logout', method=['POST', 'OPTIONS'])
def api_logout():
    enable_cors()
    if request.method == 'OPTIONS':
        return {}
    data = request.json or {}
    token = data.get("token", "")
    user_data = logout_session(token)
    if user_data:
        add_log(user_data["user_id"], user_data["name"], "logout", "تسجيل خروج")
    return {"success": True}


# ==================== CALCULATIONS & EXPORT ====================

@app.route('/api/calculate', method=['POST', 'OPTIONS'])
def api_calculate():
    enable_cors()
    if request.method == 'OPTIONS':
        return {}
    data = request.json or {}
    nodes = data.get("nodes", [])
    sections = data.get("sections", [])
    voltage_kv = float(data.get("voltage_kv", 11.0))
    res = calculate_network_metrics(nodes, sections, voltage_kv)
    return res


@app.route('/api/export-excel', method=['POST', 'OPTIONS'])
def api_export_excel():
    enable_cors()
    if request.method == 'OPTIONS':
        return {}
    data = request.json or {}
    project_data = data.get("project", {})
    user_info = data.get("user", {})
    nodes = project_data.get("nodes", [])
    sections = project_data.get("sections", [])
    voltage_kv = float(project_data.get("voltage_kv", 11.0))
    metrics = calculate_network_metrics(nodes, sections, voltage_kv)
    excel_bytes = export_network_to_excel(project_data, metrics)
    if user_info:
        add_log(user_info.get("id", "?"), user_info.get("name", "?"), "export_excel",
                f"تصدير: {project_data.get('name', project_data.get('id', '?'))}")
    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    filename = f"{project_data.get('id', 'feeder')}_SLD_Report.xlsx"
    response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
    return excel_bytes


@app.route('/api/export-powerpoint', method=['POST', 'OPTIONS'])
def api_export_powerpoint():
    enable_cors()
    if request.method == 'OPTIONS':
        return {}
    try:
        data = request.json
        if not data:
            try:
                raw_body = request.body.read()
                if raw_body:
                    data = json.loads(raw_body.decode('utf-8'))
            except Exception as read_err:
                print(f"[export-powerpoint] Body read fallback note: {read_err}")
                data = {}
        if not data:
            data = {}

        project_data = data.get("project", {})
        user_info = data.get("user", {})
        image_base64 = data.get("image", None)
        view_box = data.get("viewBox", None)
        nodes = project_data.get("nodes", [])
        sections = project_data.get("sections", [])
        voltage_kv = float(project_data.get("voltage_kv", 11.0))
        metrics = calculate_network_metrics(nodes, sections, voltage_kv)
        pptx_bytes = export_network_to_powerpoint(project_data, metrics, image_base64=image_base64, view_box=view_box)
        if user_info:
            add_log(user_info.get("id", "?"), user_info.get("name", "?"), "export_powerpoint",
                    f"تحميل المشروع (باور بوينت): {project_data.get('name', project_data.get('id', '?'))}")
        safe_name = (project_data.get("name") or project_data.get("id") or "مشروع_المخطط_الهندسي")
        safe_name = re.sub(r'[\\/*?:"<>|]', '_', safe_name)
        import urllib.parse
        encoded_name = urllib.parse.quote(f"{safe_name}.pptx")
        
        # حفظ نسخة مباشرة وواضحة على سطح المكتب للمستخدم لسهولة الوصول الفوري إليها
        try:
            desktop_dir = os.path.join(os.environ.get('USERPROFILE', os.path.expanduser('~')), 'Desktop')
            if os.path.exists(desktop_dir):
                clean_desk_file = os.path.join(desktop_dir, f"{safe_name} (المشروع المحمي).pptx")
                with open(clean_desk_file, 'wb') as f_desk:
                    f_desk.write(pptx_bytes)
        except Exception as desk_err:
            print(f"[export-powerpoint] Note saving to desktop: {desk_err}")

        response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        response.headers['Content-Disposition'] = f'attachment; filename="{safe_name}.pptx"; filename*=UTF-8\'\'{encoded_name}'
        return pptx_bytes
    except Exception as e:
        import traceback
        traceback.print_exc()
        response.status = 500
        return json.dumps({"success": False, "error": f"حدث خطأ أثناء تصدير الباور بوينت: {str(e)}"})


@app.route('/api/import-powerpoint', method=['POST', 'OPTIONS'])
def api_import_powerpoint():
    enable_cors()
    if request.method == 'OPTIONS':
        return {}
    
    file_bytes = None
    force_autolayout = False
    layout_direction = "down"
    user_info = {}

    # 1. فحص إذا كان الإرسال كـ Multipart Form Data (ملف مباشر)
    upload = request.files.get('file')
    if upload:
        file_bytes = upload.file.read()
        force_autolayout = request.forms.get('force_autolayout', 'false').lower() == 'true'
        layout_direction = request.forms.get('layout_direction', 'down')
        user_str = request.forms.get('user', '')
        if user_str:
            try:
                user_info = json.loads(user_str)
            except Exception:
                pass
    else:
        # 2. فحص إذا كان الإرسال عبر JSON (Base64)
        data = request.json or {}
        b64_data = data.get("file_base64", "")
        force_autolayout = bool(data.get("force_autolayout", False))
        layout_direction = data.get("layout_direction", "down")
        user_info = data.get("user", {})
        if b64_data:
            clean_b64 = re.sub(r'^data:[^;]+;base64,', '', b64_data)
            file_bytes = base64.b64decode(clean_b64)

    if not file_bytes:
        return {"success": False, "message": "لم يتم العثور على ملف باور بوينت صالح"}

    try:
        stream = io.BytesIO(file_bytes)
        project_data, summary = import_powerpoint_presentation(
            stream,
            force_autolayout=force_autolayout,
            layout_direction=layout_direction
        )

        if user_info:
            add_log(user_info.get("id", "?"), user_info.get("name", "?"), "import_powerpoint",
                    f"استيراد باور بوينت: {project_data.get('name', 'مخطط مستورد')} ({summary.get('mode', 'autolayout')})")

        return {
            "success": True,
            "project": project_data,
            "summary": summary,
            "message": "تم استيراد وترتيب المخطط بنجاح"
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"success": False, "message": f"حدث خطأ أثناء قراءة ملف الباور بوينت: {str(e)}"}


# ==================== PROJECTS ====================

@app.route('/api/projects', method=['GET', 'OPTIONS'])
def api_list_projects():
    enable_cors()
    if request.method == 'OPTIONS':
        return {}
    return {
        "success": True,
        "projects": list_projects(),
        "copyright": COPYRIGHT_NOTICE
    }


@app.route('/api/load-project/<p_id:path>', method=['GET', 'OPTIONS'])
def api_load_project(p_id):
    enable_cors()
    if request.method == 'OPTIONS':
        return {}
    proj = load_project(p_id)
    if proj:
        return {"success": True, "project": proj}
    return {"success": False, "message": "المشروع غير موجود"}


@app.route('/api/save-project', method=['POST', 'OPTIONS'])
def api_save_project():
    enable_cors()
    if request.method == 'OPTIONS':
        return {}
    data = request.json or {}
    project_data = data.get("project", data)
    user_info = data.get("user", {})
    ok, path = save_project(project_data)
    if ok and user_info:
        add_log(user_info.get("id", "?"), user_info.get("name", "?"), "save_project",
                f"حفظ: {project_data.get('name', project_data.get('id', '?'))}")
    return {"success": ok, "path": path, "message": "تم حفظ المشروع بنجاح"}


@app.route('/api/delete-project/<p_id:path>', method=['POST', 'DELETE', 'OPTIONS'])
def api_delete_project(p_id):
    enable_cors()
    if request.method == 'OPTIONS':
        return {}
    data = request.json or {}
    user_info = data.get("user", {})
    ok = delete_project(p_id)
    if ok and user_info:
        add_log(user_info.get("id", "?"), user_info.get("name", "?"), "delete_project",
                f"حذف المشروع: {p_id}")
    return {"success": ok, "message": "تم حذف المشروع بنجاح" if ok else "تعذر حذف المشروع"}


# ==================== SETTINGS ====================

@app.route('/api/sectors', method=['GET', 'OPTIONS'])
def api_sectors():
    enable_cors()
    if request.method == 'OPTIONS':
        return {}
    return {
        "success": True,
        "sectors": get_sectors_data(),
        "copyright": COPYRIGHT_NOTICE
    }


@app.route('/api/settings', method=['GET', 'OPTIONS'])
def api_get_settings():
    enable_cors()
    if request.method == 'OPTIONS':
        return {}
    s = get_settings()
    safe_users = {}
    for uid, u in s.get("users", {}).items():
        safe_users[uid] = {
            "id":             uid,
            "name":           u.get("name", ""),
            "role":           u.get("role", "viewer"),
            "sector":         u.get("sector", "المنيا شمال"),
            "administration": u.get("administration", "بني مزار شرق"),
            "is_active":      u.get("is_active", True),
            "password":       u.get("password_plain", ""),
            "permissions":    u.get("permissions", [])
        }
    return {
        "success":     True,
        "system_info": s.get("system_info", {}),
        "dropdowns":   s.get("dropdowns", {}),
        "sectors":     get_sectors_data(),
        "users":       list(safe_users.values()),
        "permissions": get_all_permissions(),
        "categories":  get_permission_categories(),
        "role_labels": get_role_labels()
    }


@app.route('/api/settings/system-info', method=['POST', 'OPTIONS'])
def api_save_system_info():
    enable_cors()
    if request.method == 'OPTIONS':
        return {}
    data = request.json or {}
    new_info = data.get("system_info", {})
    user_info = data.get("user", {})
    ok, msg = update_system_info(new_info)
    if ok and user_info:
        add_log(user_info.get("id", "?"), user_info.get("name", "?"), "change_settings",
                f"تعديل اسم المنظومة: {new_info.get('app_name', '')}")
    return {"success": ok, "message": msg, "system_info": new_info}


@app.route('/api/settings/dropdowns', method=['POST', 'OPTIONS'])
def api_save_dropdowns():
    enable_cors()
    if request.method == 'OPTIONS':
        return {}
    data = request.json or {}
    new_dropdowns = data.get("dropdowns", {})
    user_info = data.get("user", {})
    ok, msg = update_dropdowns(new_dropdowns)
    if ok and user_info:
        add_log(user_info.get("id", "?"), user_info.get("name", "?"), "change_settings",
                "تحديث القوائم المنسدلة")
    return {"success": ok, "message": msg}


@app.route('/api/settings/sectors', method=['POST', 'OPTIONS'])
def api_save_sectors():
    enable_cors()
    if request.method == 'OPTIONS':
        return {}
    data = request.json or {}
    new_sectors = data.get("sectors", {})
    user_info = data.get("user", {})
    ok, msg = update_sectors_data(new_sectors)
    if ok and user_info:
        add_log(user_info.get("id", "?"), user_info.get("name", "?"), "change_settings",
                "تحديث وتخصيص بيانات القطاعات والإدارات الهندسية")
    return {"success": ok, "message": msg, "sectors": get_sectors_data()}


# ==================== USER MANAGEMENT ====================

@app.route('/api/users/add', method=['POST', 'OPTIONS'])
def api_add_user():
    enable_cors()
    if request.method == 'OPTIONS':
        return {}
    data = request.json or {}
    admin_info = data.get("admin", {})
    ok, msg = add_user(
        data.get("user_id", ""),
        data.get("name", ""),
        data.get("role", "viewer"),
        data.get("password", ""),
        data.get("permissions", []),
        sector=data.get("sector", "المنيا شمال"),
        administration=data.get("administration", "بني مزار شرق")
    )
    if ok and admin_info:
        add_log(admin_info.get("id", "?"), admin_info.get("name", "?"), "add_user",
                f"إضافة مستخدم: {data.get('user_id')} — {data.get('name')}")
    return {"success": ok, "message": msg, "users": get_users_list()}


@app.route('/api/users/update', method=['POST', 'OPTIONS'])
def api_update_user():
    enable_cors()
    if request.method == 'OPTIONS':
        return {}
    data = request.json or {}
    admin_info = data.get("admin", {})
    ok, msg = update_user(
        data.get("user_id", ""),
        data.get("name", ""),
        data.get("role", "viewer"),
        data.get("permissions", []),
        sector=data.get("sector"),
        administration=data.get("administration"),
        password=data.get("password")
    )
    if ok and admin_info:
        add_log(admin_info.get("id", "?"), admin_info.get("name", "?"), "edit_user",
                f"تعديل مستخدم: {data.get('user_id')} — {data.get('name')}")
    return {"success": ok, "message": msg, "users": get_users_list()}


@app.route('/api/users/delete', method=['POST', 'OPTIONS'])
def api_delete_user():
    enable_cors()
    if request.method == 'OPTIONS':
        return {}
    data = request.json or {}
    admin_info = data.get("admin", {})
    target_id = data.get("user_id", "")
    ok, msg = delete_user(target_id)
    if ok and admin_info:
        add_log(admin_info.get("id", "?"), admin_info.get("name", "?"), "delete_user",
                f"حذف مستخدم: {target_id}")
    return {"success": ok, "message": msg, "users": get_users_list()}


@app.route('/api/users/change-password', method=['POST', 'OPTIONS'])
def api_change_password():
    enable_cors()
    if request.method == 'OPTIONS':
        return {}
    data = request.json or {}
    admin_info = data.get("admin", {})
    target_id = data.get("user_id", "")
    ok, msg = change_password(target_id, data.get("new_password", ""))
    if ok and admin_info:
        add_log(admin_info.get("id", "?"), admin_info.get("name", "?"), "change_password",
                f"تغيير كلمة مرور: {target_id}")
    return {"success": ok, "message": msg}


@app.route('/api/users/toggle-status', method=['POST', 'OPTIONS'])
def api_toggle_user_status():
    enable_cors()
    if request.method == 'OPTIONS':
        return {}
    data = request.json or {}
    admin_info = data.get("admin", {})
    target_id = data.get("user_id", "")
    is_active = data.get("is_active", True)
    ok, msg = toggle_user_status(target_id, is_active)
    if ok and admin_info:
        action_name = "تفعيل حساب" if is_active else "حظر وتعطيل حساب"
        add_log(admin_info.get("id", "?"), admin_info.get("name", "?"), "toggle_user_status",
                f"{action_name}: {target_id}")
    return {"success": ok, "message": msg, "users": get_users_list()}


@app.route('/api/users/change-my-password', method=['POST', 'OPTIONS'])
def api_change_my_password():
    enable_cors()
    if request.method == 'OPTIONS':
        return {}
    data = request.json or {}
    user_id = data.get("user_id", "")
    user_name = data.get("user_name", user_id)
    old_password = data.get("old_password", "")
    new_password = data.get("new_password", "")
    ok, msg = change_my_password(user_id, old_password, new_password)
    if ok:
        add_log(user_id, user_name, "change_my_password",
                f"قام المستخدم {user_id} بتغيير كلمة المرور الخاصة به بنجاح")
    return {"success": ok, "message": msg}


# ==================== ACTIVITY LOG ====================

@app.route('/api/activity-log', method=['GET', 'OPTIONS'])
def api_get_log():
    enable_cors()
    if request.method == 'OPTIONS':
        return {}
    limit       = int(request.query.get("limit", 500))
    user_filter = request.query.get("user", None)
    action_filter = request.query.get("action", None)
    date_from   = request.query.get("from", None)
    date_to     = request.query.get("to", None)
    entries = get_log(limit, user_filter, action_filter, date_from, date_to)
    stats   = get_log_stats()
    return {
        "success": True,
        "entries": entries,
        "stats":   stats,
        "action_labels": get_action_labels()
    }


@app.route('/api/activity-log/add', method=['POST', 'OPTIONS'])
def api_add_log():
    enable_cors()
    if request.method == 'OPTIONS':
        return {}
    data = request.json or {}
    ok = add_log(
        data.get("user_id", "?"),
        data.get("user_name", "?"),
        data.get("action", "unknown"),
        data.get("details", "")
    )
    return {"success": ok}


@app.route('/api/activity-log/clear', method=['POST', 'OPTIONS'])
def api_clear_log():
    enable_cors()
    if request.method == 'OPTIONS':
        return {}
    data = request.json or {}
    admin_info = data.get("admin", {})
    ok, msg = clear_log()
    if ok and admin_info:
        add_log(admin_info.get("id", "?"), admin_info.get("name", "?"), "change_settings", "مسح سجل النشاط")
    return {"success": ok, "message": msg}


# ==================== SERVER STARTUP ====================

def start_server(port=7890):
    run(app, host='127.0.0.1', port=port, quiet=True)


def open_app_window(url):
    """فتح البرنامج كنافذة سطح مكتب مستقلة أنيقة"""
    edge_paths = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
    ]
    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

    for ep in edge_paths:
        if os.path.exists(ep):
            try:
                subprocess.Popen([ep, f"--app={url}", "--start-maximized"])
                return
            except Exception:
                pass

    if os.path.exists(chrome_path):
        try:
            subprocess.Popen([chrome_path, f"--app={url}", "--start-maximized"])
            return
        except Exception:
            pass

    webbrowser.open(url)


if __name__ == '__main__':
    port = 7890
    print("================================================================")
    print(" Smart Grid SLD Studio")
    print(f" {COPYRIGHT_NOTICE}")
    print("================================================================")
    print(f" Server running at: http://127.0.0.1:{port}")

    t = threading.Thread(target=start_server, args=(port,), daemon=True)
    t.start()
    time.sleep(1.0)

    url = f"http://127.0.0.1:{port}"
    open_app_window(url)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nServer stopped.")

"""
مدير حفظ واسترجاع مشاريع المخططات
Copyright (C) ENG-MOSTAFAELMGHRABY - All Rights Reserved
"""

import json
import os
import re
import time
from urllib.parse import unquote

PROJECTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "saved_projects")
os.makedirs(PROJECTS_DIR, exist_ok=True)
DELETED_FILE = os.path.join(PROJECTS_DIR, ".deleted_projects.json")

def get_deleted_ids():
    if os.path.exists(DELETED_FILE):
        try:
            with open(DELETED_FILE, "r", encoding="utf-8") as f:
                return set(json.load(f))
        except Exception:
            return set()
    return set()

def save_deleted_ids(del_set):
    try:
        with open(DELETED_FILE, "w", encoding="utf-8") as f:
            json.dump(list(del_set), f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error saving deleted projects: {e}")

def add_deleted_id(pid):
    if not pid:
        return
    del_set = get_deleted_ids()
    del_set.add(str(pid))
    safe = sanitize_id(pid)
    del_set.add(safe)
    save_deleted_ids(del_set)

def remove_deleted_id(pid):
    if not pid:
        return
    del_set = get_deleted_ids()
    safe = sanitize_id(pid)
    del_set.discard(str(pid))
    del_set.discard(safe)
    save_deleted_ids(del_set)

def sanitize_id(pid):
    if not pid:
        return f"project_{int(time.time())}"
    safe = re.sub(r'[\\/*?:"<>|]', '_', str(pid)).strip()
    return safe or f"project_{int(time.time())}"

def get_demo_video_project():
    """نموذج مخطط شبكة التوزيع المعتمد (11 ك.ف)"""
    return {
        "id": "video_demo_feeder",
        "name": "مخطط شبكة التوزيع المعتمد (11 ك.ف)",
        "substation": "محطة محولات غرب",
        "voltage_kv": 11,
        "designer": "ENG-MOSTAFAELMGHRABY",
        "copyright": "جميع الحقوق محفوظة للمهندس مصطفى المغربي © ENG-MOSTAFAELMGHRABY",
        "nodes": [
            {"id": "N1", "type": "substation", "name": "محطة محولات", "x": 400, "y": 80},
            {"id": "N2", "type": "switch", "name": "سكينة هوائية N2", "x": 400, "y": 260, "direction": "vertical", "state": "closed"},
            {"id": "N3", "type": "switch", "name": "سكينة تفريعة N3", "x": 400, "y": 480, "direction": "horizontal", "state": "closed"},
            {"id": "N4", "type": "transformer", "name": "محول 1", "capacity": 100, "loading_pct": 78, "x": 650, "y": 480, "direction": "up"},
            {"id": "N5", "type": "transformer", "name": "محول 2", "capacity": 63, "loading_pct": 80, "x": 920, "y": 480, "direction": "up"},
            {"id": "N6", "type": "junction", "name": "نقطة تفريعة كشك 1", "x": 400, "y": 900},
            {"id": "N7", "type": "kiosk", "name": "كشك 1", "capacity": 500, "loading_pct": 62, "switches_count": 2, "x": 750, "y": 900, "direction": "up"},
            {"id": "N8", "type": "kiosk", "name": "كشك 2", "capacity": 300, "loading_pct": 70, "switches_count": 1, "x": 1050, "y": 900, "direction": "right"},
            {"id": "N9", "type": "switch", "name": "سكينة N9", "x": 400, "y": 1400, "direction": "vertical", "state": "closed"},
            {"id": "N10", "type": "rmu", "name": "لوحة RMU 1", "switches_count": 3, "x": 400, "y": 1650},
            {"id": "N11", "type": "kiosk", "name": "كشك 3", "capacity": 300, "loading_pct": 45, "switches_count": 1, "x": 400, "y": 1900, "direction": "down"}
        ],
        "sections": [
            {"id": "S1", "from_node": "N1", "to_node": "N2", "type": "كابل", "size": "3*300", "length": 1500, "direction": "down"},
            {"id": "S2", "from_node": "N2", "to_node": "N3", "type": "هوائي", "size": "150/25", "length": 2000, "direction": "down"},
            {"id": "S3", "from_node": "N3", "to_node": "N4", "type": "هوائي", "size": "70/12", "length": 800, "direction": "right"},
            {"id": "S4", "from_node": "N4", "to_node": "N5", "type": "هوائي", "size": "70/12", "length": 1200, "direction": "right"},
            {"id": "S5", "from_node": "N3", "to_node": "N6", "type": "هوائي", "size": "150/25", "length": 6000, "direction": "down"},
            {"id": "S6", "from_node": "N6", "to_node": "N7", "type": "كابل", "size": "3*240", "length": 3000, "direction": "right"},
            {"id": "S7", "from_node": "N7", "to_node": "N8", "type": "كابل", "size": "3*70", "length": 350, "direction": "right"},
            {"id": "S8", "from_node": "N6", "to_node": "N9", "type": "هوائي", "size": "70/12", "length": 8000, "direction": "down"},
            {"id": "S9", "from_node": "N9", "to_node": "N10", "type": "كابل", "size": "3*240", "length": 1200, "direction": "down"},
            {"id": "S10", "from_node": "N10", "to_node": "N11", "type": "كابل", "size": "3*150", "length": 300, "direction": "down"}
        ]
    }

def get_rasm_tagreby_project():
    """
    نموذج الرسم التجريبي المطابق لصورة سطح المكتب (لوحة المركز القديمة)
    يوضح إمكانية أخذ المحولات من بعضها وأخذ مناول من الخط
    """
    return {
        "id": "rasm_tagreby",
        "name": "مخطط لوحة المركز القديمة (رسم تجريبي)",
        "substation": "لوحة المركز القديمة",
        "voltage_kv": 11,
        "designer": "ENG-MOSTAFAELMGHRABY",
        "copyright": "جميع الحقوق محفوظة للمهندس مصطفى المغربي © ENG-MOSTAFAELMGHRABY",
        "nodes": [
            {"id": "N1", "type": "substation", "name": "لوحة المركز القديمة", "x": 300, "y": 70},
            {"id": "N2", "type": "switch", "name": "سكينة N2", "x": 300, "y": 200, "direction": "vertical", "state": "closed"},
            {"id": "N3", "type": "switch", "name": "سكينة N3", "x": 300, "y": 360, "direction": "horizontal", "state": "closed"},
            {"id": "N4", "type": "transformer", "name": "اتصالات مصر", "capacity": 50, "loading_pct": 75, "x": 120, "y": 360, "direction": "left"},
            {"id": "N5", "type": "switch", "name": "سكينة N5", "x": 300, "y": 680, "direction": "vertical", "state": "closed"},
            {"id": "N6", "type": "switch", "name": "سكينة N6", "x": 480, "y": 720, "direction": "horizontal", "state": "closed"},
            {"id": "N7", "type": "junction", "name": "مناول من خط", "x": 560, "y": 720},
            {"id": "N8", "type": "transformer", "name": "ولاد غانم", "capacity": 160, "loading_pct": 80, "x": 560, "y": 550, "direction": "up"},
            {"id": "N9", "type": "kiosk", "name": "محول تفريعة فرعية", "capacity": 100, "loading_pct": 65, "switches_count": 2, "x": 660, "y": 550, "direction": "right"},
            {"id": "N11", "type": "switch", "name": "سكينة N11", "x": 780, "y": 720, "direction": "vertical", "state": "closed"},
            {"id": "N12", "type": "junction", "name": "نقطة تفريع كابلات", "x": 780, "y": 830},
            {"id": "N13", "type": "kiosk", "name": "انارة ام الساس الدائري", "capacity": 200, "loading_pct": 60, "switches_count": 2, "x": 950, "y": 830, "direction": "right"},
            {"id": "N14", "type": "kiosk", "name": "ام الساس الوسط", "capacity": 200, "loading_pct": 75, "switches_count": 2, "x": 860, "y": 700, "direction": "right"},
            {"id": "N15", "type": "kiosk", "name": "مدرسة ام الساس", "capacity": 100, "loading_pct": 70, "switches_count": 1, "x": 1350, "y": 600, "direction": "up"}
        ],
        "sections": [
            {"id": "S1", "from_node": "N1", "to_node": "N2", "type": "كابل", "size": "3*240", "length": 152, "direction": "down"},
            {"id": "S2", "from_node": "N2", "to_node": "N3", "type": "هوائي", "size": "150/25", "length": 500, "direction": "down"},
            {"id": "S3", "from_node": "N3", "to_node": "N4", "type": "كابل", "size": "3*150", "length": 200, "direction": "left"},
            {"id": "S4", "from_node": "N3", "to_node": "N5", "type": "هوائي", "size": "150/25", "length": 6600, "direction": "down"},
            {"id": "S5", "from_node": "N5", "to_node": "N6", "type": "هوائي", "size": "35/6", "length": 1100, "direction": "right"},
            {"id": "S6", "from_node": "N6", "to_node": "N7", "type": "هوائي", "size": "35/6", "length": 100, "direction": "right"},
            {"id": "S7", "from_node": "N7", "to_node": "N8", "type": "هوائي", "size": "35/6", "length": 100, "direction": "up"},
            {"id": "S8", "from_node": "N8", "to_node": "N9", "type": "هوائي", "size": "35/6", "length": 200, "direction": "right"},
            {"id": "S9", "from_node": "N7", "to_node": "N11", "type": "هوائي", "size": "35/6", "length": 350, "direction": "right"},
            {"id": "S10", "from_node": "N11", "to_node": "N12", "type": "كابل", "size": "3*150", "length": 65, "direction": "down"},
            {"id": "S11", "from_node": "N12", "to_node": "N13", "type": "كابل", "size": "3*70", "length": 200, "direction": "right"},
            {"id": "S12", "from_node": "N12", "to_node": "N14", "type": "كابل", "size": "3*70", "length": 200, "direction": "up"},
            {"id": "S13", "from_node": "N12", "to_node": "N15", "type": "كابل", "size": "3*70", "length": 490, "direction": "right"}
        ]
    }

def save_project(project_dict):
    p_id = sanitize_id(project_dict.get("id"))
    if not project_dict.get("name"):
        project_dict["name"] = "مخطط شبكة توزيع"
    project_dict["id"] = p_id
    project_dict["designer"] = "ENG-MOSTAFAELMGHRABY"
    project_dict["copyright"] = "جميع الحقوق محفوظة للمهندس مصطفى المغربي © ENG-MOSTAFAELMGHRABY"
    project_dict["updated_at"] = time.strftime("%Y-%m-%d %H:%M")

    # إزالة المشروع من قائمة المحذوفات إذا كان محذوفاً سابقاً
    remove_deleted_id(p_id)
    if project_dict.get("name"):
        remove_deleted_id(project_dict.get("name"))

    file_path = os.path.join(PROJECTS_DIR, f"{p_id}.sld")
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(project_dict, f, ensure_ascii=False, indent=2)
    return True, file_path

def load_project(p_id):
    if not p_id:
        return None
    p_id = unquote(str(p_id)).strip()
    if p_id.endswith(".sld"):
        p_id = p_id[:-4]
    
    # 1. فحص وجود الملف بالاسم المباشر على القرص
    file_path = os.path.join(PROJECTS_DIR, f"{p_id}.sld")
    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading {file_path}: {e}")

    # 2. فحص القوالب الافتراضية
    deleted_ids = get_deleted_ids()
    if p_id in ["video_demo_feeder", "demo", "main_feeder", "مخطط شبكة التوزيع المعتمد (11 ك.ف)", "مخطط شبكة التوزيع المعتمد (24,350م)"]:
        if p_id not in deleted_ids:
            demo_disk = os.path.join(PROJECTS_DIR, "video_demo_feeder.sld")
            if os.path.exists(demo_disk):
                try:
                    with open(demo_disk, "r", encoding="utf-8") as f:
                        return json.load(f)
                except Exception:
                    pass
            return get_demo_video_project()

    if p_id in ["rasm_tagreby", "لوحة المركز", "مخطط لوحة المركز القديمة (رسم تجريبي)", "مخطط لوحة المركز القديمة وتفريعاتها"]:
        if p_id not in deleted_ids:
            return get_rasm_tagreby_project()

    # 3. فحص كافة ملفات المشاريع المحفوظة للبحث بالمطابقة مع name أو id
    import glob
    for fpath in glob.glob(os.path.join(PROJECTS_DIR, "*.sld")):
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                data = json.load(f)
                if data.get("id") == p_id or data.get("name") == p_id:
                    return data
        except Exception:
            continue

    return None

def delete_project(p_id):
    if not p_id:
        return False
    p_id = unquote(str(p_id).strip())
    raw_id = p_id
    if p_id.endswith(".sld"):
        p_id = p_id[:-4]

    # إضافة المعرف وقيمته المنظفة لقائمة المحذوفات
    add_deleted_id(raw_id)
    add_deleted_id(p_id)

    # فحص وحذف أي ملفات فعلية مطابقة على القرص
    candidates = [
        os.path.join(PROJECTS_DIR, f"{p_id}.sld"),
        os.path.join(PROJECTS_DIR, f"{sanitize_id(p_id)}.sld"),
        os.path.join(PROJECTS_DIR, f"{raw_id}.sld")
    ]
    for cpath in candidates:
        if os.path.exists(cpath):
            try:
                os.remove(cpath)
            except Exception as e:
                print(f"Error removing {cpath}: {e}")

    # فحص ومسح أي ملف يحمل نفس id أو name داخلياً
    import glob
    for fpath in glob.glob(os.path.join(PROJECTS_DIR, "*.sld")):
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                data = json.load(f)
                if data.get("id") in [p_id, raw_id] or data.get("name") in [p_id, raw_id]:
                    f_name = data.get("name")
                    if f_name:
                        add_deleted_id(f_name)
                    try:
                        os.remove(fpath)
                    except Exception:
                        pass
        except Exception:
            continue

    return True

def list_projects():
    import glob
    projects = []
    saved_files = glob.glob(os.path.join(PROJECTS_DIR, "*.sld"))
    found_ids = set()
    deleted_ids = get_deleted_ids()

    for fpath in saved_files:
        fname = os.path.basename(fpath)
        pid = fname[:-4]
        if pid in deleted_ids:
            continue
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                data = json.load(f)
                item_id = data.get("id", pid)
                item_name = data.get("name", pid)
                if item_id in deleted_ids or item_name in deleted_ids:
                    continue
                found_ids.add(item_id)
                found_ids.add(pid)
                projects.append({
                    "id": pid,
                    "name": item_name,
                    "substation": data.get("substation", "محطة محولات"),
                    "voltage_kv": data.get("voltage_kv", 11),
                    "nodes_count": len(data.get("nodes", [])),
                    "sections_count": len(data.get("sections", [])),
                    "updated_at": data.get("updated_at", time.strftime("%Y-%m-%d", time.localtime(os.path.getmtime(fpath))))
                })
        except Exception:
            projects.append({
                "id": pid,
                "name": pid,
                "substation": "-",
                "voltage_kv": 11,
                "nodes_count": 0,
                "sections_count": 0,
                "updated_at": "-"
            })

    # إضافة المخططات المعتمدة الافتراضية إذا لم يتم حذفها ولم تكن موجودة بالفعل كملفات محفوظة
    if "rasm_tagreby" not in found_ids and "rasm_tagreby" not in deleted_ids and "مخطط لوحة المركز القديمة وتفريعاتها" not in deleted_ids and "مخطط لوحة المركز القديمة (رسم تجريبي)" not in deleted_ids:
        projects.append({
            "id": "rasm_tagreby",
            "name": "مخطط لوحة المركز القديمة وتفريعاتها",
            "substation": "لوحة المركز القديمة",
            "voltage_kv": 11,
            "nodes_count": 13,
            "sections_count": 13,
            "updated_at": "مخطط معتمد"
        })
    if "video_demo_feeder" not in found_ids and "video_demo_feeder" not in deleted_ids and "مخطط شبكة التوزيع المعتمد (24,350م)" not in deleted_ids and "مخطط شبكة التوزيع المعتمد (11 ك.ف)" not in deleted_ids:
        projects.append({
            "id": "video_demo_feeder",
            "name": "مخطط شبكة التوزيع المعتمد (24,350م)",
            "substation": "محطة محولات غرب",
            "voltage_kv": 11,
            "nodes_count": 11,
            "sections_count": 10,
            "updated_at": "مخطط معتمد"
        })

    return projects

"""
محرك استيراد وتفسير عروض الباور بوينت والترتيب التلقائي النظامي للمخططات الكهربائية
PowerPoint Importer & Systematic Auto-Layout Engine
Copyright (C) ENG-MOSTAFAELMGHRABY - All Rights Reserved
"""

import io
import re
import json
import base64
import time
from pptx import Presentation


def extract_embedded_sld_data(prs):
    """استخراج بيانات المخطط إذا كان الملف مصدراً من النظام مسبقاً (100% Lossless)"""
    try:
        # 1. فحص عناصر وأشكال الشرائح المخفية (Off-screen Shapes)
        for slide in prs.slides:
            for shape in slide.shapes:
                if shape.has_text_frame:
                    txt = shape.text_frame.text or ""
                    if "SLD_DATA_JSON::" in txt:
                        json_str = txt.split("SLD_DATA_JSON::")[1].strip()
                        project_data = json.loads(json_str)
                        if isinstance(project_data, dict) and "nodes" in project_data and "sections" in project_data:
                            return project_data

        # 2. فحص ملاحظات الشرائح (Notes Slide) للتوافق مع الملفات المصدرة سابقاً
        for slide in prs.slides:
            if slide.has_notes_slide:
                notes_txt = slide.notes_slide.notes_text_frame.text or ""
                if "SLD_DATA_JSON::" in notes_txt:
                    json_str = notes_txt.split("SLD_DATA_JSON::")[1].strip()
                    project_data = json.loads(json_str)
                    if isinstance(project_data, dict) and "nodes" in project_data and "sections" in project_data:
                        return project_data
    except Exception as e:
        print(f"Note: Error parsing embedded PPTX metadata: {e}")
    return None


def extract_text_and_tables_from_pptx(prs):
    """
    استخراج النصوص، الجداول، المسميات، والقدرات من أي عرض تقديمي عادي (Generic PPTX)
    """
    extracted = {
        "feeder_name": "مغذي التوزيع المستورد",
        "substation": "محطة المحولات الرئيسية",
        "voltage_kv": 11.0,
        "admin": "هندسة الكهرباء",
        "sector": "قطاع التوزيع",
        "designer": "المدير العام",
        "total_length": None,
        "ohl_length": None,
        "ugc_length": None,
        "switches_count": None,
        "equipment_list": [],  # قائمة المحولات والأكشاك المستخرجة
        "sections_list": []    # قائمة الخطوط الصريحة إن وجدت
    }

    all_texts = []

    for slide in prs.slides:
        for shape in slide.shapes:
            # 1. فحص الجداول (Tables)
            if shape.has_table:
                tbl = shape.table
                headers = []
                col_map = {}
                # قراءة الترويسة من السطر الأول
                for c_idx in range(len(tbl.columns)):
                    cell_txt = tbl.cell(0, c_idx).text.strip().lower()
                    headers.append(cell_txt)
                    if any(k in cell_txt for k in ["نود", "id", "node"]):
                        col_map["id"] = c_idx
                    elif any(k in cell_txt for k in ["اسم", "name", "محول", "كشك", "موقع"]):
                        col_map["name"] = c_idx
                    elif any(k in cell_txt for k in ["نوع", "type"]):
                        col_map["type"] = c_idx
                    elif any(k in cell_txt for k in ["قدرة", "cap", "سعة", "kva"]):
                        col_map["capacity"] = c_idx
                    elif any(k in cell_txt for k in ["تحميل", "load", "%"]):
                        col_map["load_pct"] = c_idx
                    elif any(k in cell_txt for k in ["طول", "length", "مسافة"]):
                        col_map["length"] = c_idx
                    elif any(k in cell_txt for k in ["موصل", "كابل", "هوائي", "line"]):
                        col_map["line_type"] = c_idx

                # قراءة صفوف البيانات
                for r_idx in range(1, len(tbl.rows)):
                    # تجاهل سطر الإجمالي
                    row_txt = " ".join(tbl.cell(r_idx, c).text.strip() for c in range(len(tbl.columns)))
                    if "إجمالي" in row_txt or "total" in row_txt.lower():
                        continue

                    item = {}
                    if "name" in col_map:
                        item["name"] = tbl.cell(r_idx, col_map["name"]).text.strip()
                    elif len(tbl.columns) >= 3:
                        item["name"] = tbl.cell(r_idx, 2).text.strip()
                    else:
                        item["name"] = f"معدة {r_idx}"

                    if not item.get("name"):
                        continue

                    # فحص النوع (كشك أو محول معلق)
                    type_str = ""
                    if "type" in col_map:
                        type_str = tbl.cell(r_idx, col_map["type"]).text.strip().lower()
                    
                    if "كشك" in type_str or "كشك" in item["name"] or "kiosk" in type_str:
                        item["type"] = "kiosk"
                    else:
                        item["type"] = "transformer"

                    # القدرة
                    cap_val = 100.0
                    if "capacity" in col_map:
                        raw_cap = tbl.cell(r_idx, col_map["capacity"]).text.strip()
                        nums = re.findall(r'[\d\.]+', raw_cap.replace(",", ""))
                        if nums:
                            cap_val = float(nums[0])
                    item["capacity"] = cap_val

                    # نسبة التحميل
                    load_val = 65.0
                    if "load_pct" in col_map:
                        raw_load = tbl.cell(r_idx, col_map["load_pct"]).text.strip()
                        nums = re.findall(r'[\d\.]+', raw_load.replace("%", ""))
                        if nums:
                            load_val = float(nums[0])
                    item["loading_pct"] = load_val

                    # الطول إن وجد في الجدول
                    if "length" in col_map:
                        raw_len = tbl.cell(r_idx, col_map["length"]).text.strip()
                        nums = re.findall(r'[\d\.]+', raw_len.replace(",", ""))
                        if nums:
                            item["length"] = float(nums[0])

                    # نوع الخط إن وجد
                    if "line_type" in col_map:
                        lt = tbl.cell(r_idx, col_map["line_type"]).text.strip()
                        item["line_type"] = "كابل" if "كابل" in lt else "هوائي"

                    extracted["equipment_list"].append(item)

            # 2. فحص مربعات النصوص وبطاقات المؤشرات (Text Frames)
            if shape.has_text_frame:
                txt = shape.text_frame.text.strip()
                if txt:
                    all_texts.append(txt)

    # تحليل النصوص الشاملة لاستخراج المتغيرات الرئيسية
    full_corpus = "\n".join(all_texts)

    # اسم المغذي
    m_feeder = re.search(r'(?:المخطط الهندسي لـ|المغذي:|اسم المغذي|اسم المغذي:)\s*([^\n\r–—•]+)', full_corpus)
    if m_feeder:
        extracted["feeder_name"] = m_feeder.group(1).strip()

    # اسم المحطة
    m_sub = re.search(r'(?:المحطة:|محطة:|محطة المحولات:|المحطة الرئيسية:)\s*([^\n\r–—•\(]+)', full_corpus)
    if m_sub:
        extracted["substation"] = m_sub.group(1).strip()

    # الجهد
    m_volt = re.search(r'(\d+(?:\.\d+)?)\s*(?:ك\.ف|ك\.ف\)|كيلو فولت|kV)', full_corpus, re.IGNORECASE)
    if m_volt:
        extracted["voltage_kv"] = float(m_volt.group(1))

    # الأطوال
    m_tot_len = re.search(r'(?:إجمالي أطوال الخطوط|الأطوال:|الأطوال)\s*[:•]?\s*([\d,]+(?:\.\d+)?)\s*م', full_corpus)
    if m_tot_len:
        extracted["total_length"] = float(m_tot_len.group(1).replace(",", ""))

    m_ohl = re.search(r'هوائي:\s*([\d,]+(?:\.\d+)?)\s*م', full_corpus)
    if m_ohl:
        extracted["ohl_length"] = float(m_ohl.group(1).replace(",", ""))

    m_ugc = re.search(r'كابل:\s*([\d,]+(?:\.\d+)?)\s*م', full_corpus)
    if m_ugc:
        extracted["ugc_length"] = float(m_ugc.group(1).replace(",", ""))

    # عدد السكاكين
    m_sw = re.search(r'(\d+)\s*سكينة', full_corpus)
    if m_sw:
        extracted["switches_count"] = int(m_sw.group(1))

    # إذا لم نجد معدات في الجداول، نبحث عنها في النصوص الصريحة (مثل السطور النقطية)
    if not extracted["equipment_list"]:
        pattern = re.compile(r'(محول|كشك)\s+([^\n\r–—•,،\(]+)(?:[^\d]*(\d+)\s*(?:kva|ك\.ف\.أ|ك ف أ))?', re.IGNORECASE)
        for m in pattern.finditer(full_corpus):
            eq_type = "kiosk" if m.group(1) == "كشك" else "transformer"
            eq_name = f"{m.group(1)} {m.group(2).strip()}"
            cap = float(m.group(3)) if m.group(3) else (200.0 if eq_type == "kiosk" else 100.0)
            extracted["equipment_list"].append({
                "type": eq_type,
                "name": eq_name,
                "capacity": cap,
                "loading_pct": 65.0
            })

    # إذا كان الملف فارغاً تماماً من المعدات، نضع بنية افتراضية نموذجية
    if not extracted["equipment_list"]:
        extracted["equipment_list"] = [
            {"type": "transformer", "name": "محول 1", "capacity": 100, "loading_pct": 70},
            {"type": "kiosk", "name": "كشك 1", "capacity": 300, "loading_pct": 60},
            {"type": "transformer", "name": "محول 2", "capacity": 160, "loading_pct": 75}
        ]

    return extracted


def build_systematic_autolayout(extracted, layout_direction="down"):
    """
    بناء مخطط هندسي نظامي متناسق فائق الجمال والدقة (Auto-Layout Engine)
    - المحطة في الأعلى
    - خط رئيسي جذعي مستقيم (Manhattan Feeder Backbone)
    - سكاكين عزل وتجزئة منتظمة على الخط الرئيسي
    - تفريع المحولات والأكشاك على الجانبين (يمين ويسار) بتناسق هندسي متماثل ومريح للعين
    - أطوال دقيقة، أسماء واضحة، ولا تداخل في النصوص أو الخطوط
    """
    ts = int(time.time() * 1000)
    project_id = f"feeder_{ts}"
    feeder_name = extracted.get("feeder_name", "مغذي التوزيع المستورد")
    substation_name = extracted.get("substation", "محطة المحولات")
    voltage_kv = extracted.get("voltage_kv", 11.0)
    eq_list = extracted.get("equipment_list", [])

    nodes = []
    sections = []

    # إعدادات المسافات الشبكية (Grid Dimensions)
    SPINE_X = 520            # المحور الرأسي للخط الرئيسي
    START_Y = 120            # بداية المحطة
    STEP_Y = 160             # المسافة الرأسية بين كل تفريعة والأخرى
    BRANCH_OFFSET_X = 260    # بعد المحول أو الكشك يميناً أو يساراً عن الخط الرئيسي

    # 1. عقدة المحطة / لوحة التوزيع الرئيسية (Substation)
    sub_node = {
        "id": "N1",
        "type": "substation",
        "name": substation_name,
        "x": SPINE_X,
        "y": START_Y,
        "subType": "substation"
    }
    nodes.append(sub_node)

    # 2. سكينة الخروج الرئيسية من المحطة (Main Feeder Switch)
    sw1_node = {
        "id": "N2",
        "type": "switch",
        "name": "سكينة خروج المحطة",
        "x": SPINE_X,
        "y": START_Y + 110,
        "state": "closed",
        "dir": "down",
        "direction": "vertical"
    }
    nodes.append(sw1_node)

    # كابل خروج من المحطة إلى سكينة الخروج
    ugc_out_len = 150.0
    if extracted.get("ugc_length"):
        ugc_out_len = min(250.0, max(80.0, extracted["ugc_length"] / 3.0))

    sections.append({
        "id": "S1",
        "from_node": "N1",
        "to_node": "N2",
        "type": "كابل",
        "size": "3*240",
        "length": ugc_out_len,
        "direction": "down",
        "_smartLabel": { "x": SPINE_X + 45, "y": START_Y + 55 }
    })

    curr_trunk_node_id = "N2"
    curr_y = START_Y + 110
    node_counter = 3
    section_counter = 2

    # حساب متوسط طول القسم من إجمالي الأطوال المستخرجة
    total_eq = len(eq_list)
    default_step_len = 220.0
    if extracted.get("total_length") and total_eq > 0:
        default_step_len = max(80.0, extracted["total_length"] / (total_eq * 1.5))

    # 3. توزيع المحولات والأكشاك والسكاكين بنظام هندسي متماثل (Symmetric Bilateral Layout)
    for idx, eq in enumerate(eq_list):
        curr_y += STEP_Y
        side = "right" if idx % 2 == 0 else "left"
        branch_x = SPINE_X + (BRANCH_OFFSET_X if side == "right" else -BRANCH_OFFSET_X)

        # إضافة سكينة قطاعية على الخط الرئيسي كل 3 محولات/أكشاك
        if idx > 0 and idx % 3 == 0:
            sw_trunk_id = f"N{node_counter}"
            node_counter += 1
            sw_trunk_node = {
                "id": sw_trunk_id,
                "type": "switch",
                "name": f"سكينة قطاعية {idx // 3}",
                "x": SPINE_X,
                "y": curr_y,
                "state": "closed",
                "dir": "down",
                "direction": "vertical"
            }
            nodes.append(sw_trunk_node)

            # وصلة الخط الرئيسي إلى السكينة
            sections.append({
                "id": f"S{section_counter}",
                "from_node": curr_trunk_node_id,
                "to_node": sw_trunk_id,
                "type": "هوائي",
                "size": "70/12",
                "length": default_step_len,
                "direction": "down",
                "_smartLabel": { "x": SPINE_X + 45, "y": curr_y - (STEP_Y / 2) }
            })
            section_counter += 1
            curr_trunk_node_id = sw_trunk_id
            curr_y += STEP_Y

        # نقطة تفرع على الخط الرئيسي (Junction)
        junc_id = f"N{node_counter}"
        node_counter += 1
        junc_node = {
            "id": junc_id,
            "type": "junction",
            "name": f"تفريعة {eq.get('name', '')}",
            "x": SPINE_X,
            "y": curr_y
        }
        nodes.append(junc_node)

        # مد الخط الرئيسي إلى نقطة التفرع
        sections.append({
            "id": f"S{section_counter}",
            "from_node": curr_trunk_node_id,
            "to_node": junc_id,
            "type": "هوائي",
            "size": "70/12",
            "length": default_step_len,
            "direction": "down",
            "_smartLabel": { "x": SPINE_X + 45, "y": curr_y - (STEP_Y / 2) }
        })
        section_counter += 1
        curr_trunk_node_id = junc_id

        # عقدة المحول أو الكشك (Equipment Node)
        eq_id = f"N{node_counter}"
        node_counter += 1
        eq_type = eq.get("type", "transformer")
        eq_name = eq.get("name", f"معدة {idx + 1}")
        eq_cap = float(eq.get("capacity", 100.0))
        eq_load = float(eq.get("loading_pct", 65.0))

        equipment_node = {
            "id": eq_id,
            "type": eq_type,
            "name": eq_name,
            "capacity": eq_cap,
            "loading_pct": eq_load,
            "x": branch_x,
            "y": curr_y,
            "direction": side
        }
        if eq_type == "kiosk":
            equipment_node["switches_count"] = 2
            equipment_node["has_outgoing"] = False

        nodes.append(equipment_node)

        # خط التفريع من نقطة التفرع إلى المحول / الكشك
        line_type = eq.get("line_type")
        if not line_type:
            line_type = "كابل" if eq_type == "kiosk" else "هوائي"

        line_size = "3*150" if line_type == "كابل" else "70/12"
        branch_len = float(eq.get("length", 80.0 if line_type == "كابل" else 120.0))

        lbl_x = (SPINE_X + branch_x) / 2
        lbl_y = curr_y - 20

        sections.append({
            "id": f"S{section_counter}",
            "from_node": junc_id,
            "to_node": eq_id,
            "type": line_type,
            "size": line_size,
            "length": branch_len,
            "direction": side,
            "_smartLabel": { "x": lbl_x, "y": lbl_y }
        })
        section_counter += 1

    # إضافة سكينة نهاية المغذي أو نقطة الربط الحلقي المفتوحة (Normally Open Tie Switch)
    curr_y += STEP_Y
    tie_sw_id = f"N{node_counter}"
    node_counter += 1
    tie_sw_node = {
        "id": tie_sw_id,
        "type": "switch",
        "name": "سكينة مناورة ربط حلقي (مفتوحة)",
        "x": SPINE_X,
        "y": curr_y,
        "state": "open",
        "dir": "down",
        "direction": "vertical"
    }
    nodes.append(tie_sw_node)

    sections.append({
        "id": f"S{section_counter}",
        "from_node": curr_trunk_node_id,
        "to_node": tie_sw_id,
        "type": "هوائي",
        "size": "70/12",
        "length": default_step_len,
        "direction": "down",
        "_smartLabel": { "x": SPINE_X + 45, "y": curr_y - (STEP_Y / 2) }
    })

    # بناء كائن المشروع الكامل
    project = {
        "id": project_id,
        "name": feeder_name,
        "substation": substation_name,
        "voltage_kv": voltage_kv,
        "admin": extracted.get("admin", "هندسة الكهرباء"),
        "sector": extracted.get("sector", "قطاع التوزيع"),
        "designer": extracted.get("designer", "المدير العام"),
        "drawing_direction": layout_direction,
        "nodes": nodes,
        "sections": sections
    }

    # ملخص الإحصائيات الفورية
    summary = {
        "feeder_name": feeder_name,
        "substation": substation_name,
        "voltage_kv": voltage_kv,
        "nodes_count": len(nodes),
        "sections_count": len(sections),
        "transformers_count": sum(1 for n in nodes if n["type"] == "transformer"),
        "kiosks_count": sum(1 for n in nodes if n["type"] == "kiosk"),
        "switches_count": sum(1 for n in nodes if n["type"] == "switch"),
        "total_length": sum(s.get("length", 0) for s in sections),
        "ohl_length": sum(s.get("length", 0) for s in sections if s.get("type") == "هوائي"),
        "ugc_length": sum(s.get("length", 0) for s in sections if s.get("type") == "كابل")
    }

    return project, summary


def import_powerpoint_presentation(file_stream_or_path, force_autolayout=False, layout_direction="down"):
    """
    الدالة الرئيسية لمعالجة واستيراد ملف الباور بوينت
    1. محاولة استرجاع البيانات المضمنة الأصلية إن وجدت (Lossless Roundtrip).
    2. استخراج العناصر والجداول والنصوص من أي عرض تقديمي عادي.
    3. تطبيق الترتيب والتنسيق التلقائي النظامي الكامل.
    """
    prs = Presentation(file_stream_or_path)

    # 1. فحص البيانات المضمنة
    embedded = extract_embedded_sld_data(prs)
    if embedded and not force_autolayout:
        # البيانات كاملة ومحفوظة بإحداثياتها
        nodes = embedded.get("nodes", [])
        sections = embedded.get("sections", [])
        summary = {
            "mode": "lossless_embedded",
            "feeder_name": embedded.get("name", "مغذي مستورد"),
            "substation": embedded.get("substation", "محطة"),
            "voltage_kv": float(embedded.get("voltage_kv", 11.0)),
            "nodes_count": len(nodes),
            "sections_count": len(sections),
            "transformers_count": sum(1 for n in nodes if n.get("type") in ["transformer", "trans"]),
            "kiosks_count": sum(1 for n in nodes if n.get("type") in ["kiosk"]),
            "switches_count": sum(1 for n in nodes if n.get("type") in ["switch"]) + sum(1 for s in sections if s.get("has_switch")),
            "total_length": sum(s.get("length", 0) for s in sections),
            "ohl_length": sum(s.get("length", 0) for s in sections if s.get("type") == "هوائي"),
            "ugc_length": sum(s.get("length", 0) for s in sections if s.get("type") == "كابل")
        }
        return embedded, summary

    # 2. الاستخراج من الجداول والنصوص والأشكال
    extracted = extract_text_and_tables_from_pptx(prs)

    # 3. الترتيب التلقائي النظامي
    project, summary = build_systematic_autolayout(extracted, layout_direction=layout_direction)
    summary["mode"] = "systematic_autolayout"
    return project, summary

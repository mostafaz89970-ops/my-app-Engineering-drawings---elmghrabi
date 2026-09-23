"""
محرك الحسابات الكهربائية لشبكات التوزيع
Copyright (C) ENG-MOSTAFAELMGHRABY - All Rights Reserved
"""

import math

# المواصفات الفنية القياسية للموصلات والكابلات (المقاومة R والمفاعلة X والسعة الأمبيرية)
CONDUCTOR_SPECS = {
    # خطوط هوائية (Overhead Lines)
    "35/6": {"type": "هوائي", "r_per_km": 0.85, "x_per_km": 0.38, "max_amp": 170},
    "70/12": {"type": "هوائي", "r_per_km": 0.428, "x_per_km": 0.36, "max_amp": 290},
    "150/25": {"type": "هوائي", "r_per_km": 0.204, "x_per_km": 0.33, "max_amp": 450},
    "سبيكة": {"type": "هوائي", "r_per_km": 0.35, "x_per_km": 0.35, "max_amp": 350},
    
    # كابلات أرضية (Underground Cables - XLPE 11/22kV)
    "3*70": {"type": "كابل", "r_per_km": 0.443, "x_per_km": 0.11, "max_amp": 200},
    "3*150": {"type": "كابل", "r_per_km": 0.206, "x_per_km": 0.098, "max_amp": 305},
    "3*240": {"type": "كابل", "r_per_km": 0.125, "x_per_km": 0.09, "max_amp": 395},
    "3*300": {"type": "كابل", "r_per_km": 0.100, "x_per_km": 0.088, "max_amp": 440},
}

POWER_FACTOR = 0.85
SYSTEM_VOLTAGE_KV = 11.0  # الجهد الاسمي ك.ف (افتراضي 11 ك.ف قابل للتغيير إلى 22 ك.ف)

def normalize_section_key(sec_str):
    if not sec_str:
        return "70/12"
    s = sec_str.replace(" ", "").replace("×", "*").replace("X", "*").replace("x", "*")
    for k in CONDUCTOR_SPECS:
        if k in s:
            return k
    return "70/12"

def calculate_network_metrics(nodes, sections, nominal_voltage_kv=11.0):
    """
    تحليل وحساب شبكة التوزيع الكهربائية
    """
    v_nominal = nominal_voltage_kv if nominal_voltage_kv > 0 else 11.0
    v_phase_to_phase = v_nominal * 1000.0  # فولت
    
    total_ohl_len = 0.0
    total_ugc_len = 0.0
    total_feeder_len = 0.0
    
    # 1. حساب الأطوال وتفاصيل المقاطع
    sections_detailed = []
    for sec in sections:
        length = float(sec.get("length", 0))
        sec_type = sec.get("type", "هوائي")
        sec_size = str(sec.get("size", "70/12"))
        
        if sec_type == "هوائي":
            total_ohl_len += length
        else:
            total_ugc_len += length
            
        total_feeder_len += length
        
        norm_key = normalize_section_key(sec_size)
        spec = CONDUCTOR_SPECS.get(norm_key, {"r_per_km": 0.3, "x_per_km": 0.2, "max_amp": 300})
        
        sections_detailed.append({
            "from_node": sec.get("from_node", ""),
            "to_node": sec.get("to_node", ""),
            "type": sec_type,
            "size": sec_size,
            "length": length,
            "r_total": spec["r_per_km"] * (length / 1000.0),
            "x_total": spec["x_per_km"] * (length / 1000.0),
            "max_amp": spec["max_amp"]
        })

    # 2. حساب الأحمال الموصلة والفعلية
    loads_detailed = []
    total_capacity_kva = 0.0
    total_actual_load_kva = 0.0
    overloaded_transformers = []

    for node in nodes:
        elem_type = node.get("type", "")
        if elem_type in ["transformer", "kiosk"]:
            capacity = float(node.get("capacity", 0))
            loading_pct = float(node.get("loading_pct", 70))
            actual_load_kva = capacity * (loading_pct / 100.0)
            
            # تيار الحمل بالجهد المتوسط (11 أو 22 ك.ف)
            rated_current_mv = capacity / (math.sqrt(3) * v_nominal)
            actual_current_mv = actual_load_kva / (math.sqrt(3) * v_nominal)
            
            total_capacity_kva += capacity
            total_actual_load_kva += actual_load_kva
            
            if loading_pct > 100.0:
                overloaded_transformers.append({
                    "name": node.get("name", ""),
                    "node": node.get("id", ""),
                    "loading_pct": loading_pct
                })
                
            loads_detailed.append({
                "node_id": node.get("id", ""),
                "name": node.get("name", ""),
                "type": "محول معلق" if elem_type == "transformer" else "كشك محولات",
                "capacity_kva": capacity,
                "loading_pct": loading_pct,
                "actual_load_kva": round(actual_load_kva, 2),
                "rated_amp_mv": round(rated_current_mv, 2),
                "actual_amp_mv": round(actual_current_mv, 2),
                "switches_count": node.get("switches_count", 1)
            })

    # إجمالي تيار المغذي الفعلي عند الجهد الاسمي
    total_feeder_amp = total_actual_load_kva / (math.sqrt(3) * v_nominal) if v_nominal > 0 else 0
    
    # 3. حساب هبوط الجهد التقريبي على مسار المقاطع
    # Delta V = sqrt(3) * I * (R*cos(phi) + X*sin(phi))
    sin_phi = math.sqrt(1 - POWER_FACTOR**2)
    cos_phi = POWER_FACTOR
    
    cum_drop_v = 0.0
    voltage_profile = []
    remaining_amp = total_feeder_amp

    for sec in sections_detailed:
        sec_drop = math.sqrt(3) * remaining_amp * (sec["r_total"] * cos_phi + sec["x_total"] * sin_phi)
        cum_drop_v += sec_drop
        drop_pct = (cum_drop_v / v_phase_to_phase) * 100.0 if v_phase_to_phase > 0 else 0
        
        voltage_profile.append({
            "from_node": sec["from_node"],
            "to_node": sec["to_node"],
            "length_m": sec["length"],
            "section_drop_v": round(sec_drop, 2),
            "cum_drop_v": round(cum_drop_v, 2),
            "drop_percentage": round(drop_pct, 2)
        })

    max_drop_pct = voltage_profile[-1]["drop_percentage"] if voltage_profile else 0.0

    overall_loading_pct = round((total_actual_load_kva / total_capacity_kva * 100.0), 2) if total_capacity_kva > 0 else 0.0

    return {
        "summary": {
            "total_feeder_length_m": round(total_feeder_len, 2),
            "total_ohl_length_m": round(total_ohl_len, 2),
            "total_ugc_length_m": round(total_ugc_len, 2),
            "total_capacity_kva": round(total_capacity_kva, 2),
            "total_actual_load_kva": round(total_actual_load_kva, 2),
            "overall_loading_pct": overall_loading_pct,
            "total_feeder_current_a": round(total_feeder_amp, 2),
            "max_voltage_drop_pct": round(max_drop_pct, 2),
            "overloaded_count": len(overloaded_transformers),
            "system_voltage_kv": v_nominal
        },
        "loads": loads_detailed,
        "sections": sections_detailed,
        "voltage_profile": voltage_profile,
        "overloaded_transformers": overloaded_transformers,
        "copyright": "جميع الحقوق محفوظة للمهندس مصطفى المغربي © ENG-MOSTAFAELMGHRABY"
    }

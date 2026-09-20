"""
محرك تصدير عروض الباور بوينت الهندسية الاحترافية (PowerPoint Presentation Exporter)
الوضع الرأسي (Portrait / بالطول) لاستيعاب المخططات الكبيرة مع الاحتواء التلقائي الكامل
Copyright (C) ENG-MOSTAFAELMGHRABY - All Rights Reserved
"""

import io
import os
import re
import base64
from PIL import Image

import pptx
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.enum.dml import MSO_LINE

# لوحة الألوان الهندسية الراقية
COLOR_NAVY_DARK = RGBColor(26, 54, 93)      # #1A365D
COLOR_NAVY_LIGHT = RGBColor(43, 108, 176)   # #2B6CB0
COLOR_ACCENT_BLUE = RGBColor(2, 132, 199)   # #0284C7
COLOR_GOLD = RGBColor(180, 83, 9)           # #B45309
COLOR_GREEN = RGBColor(22, 101, 52)         # #166534
COLOR_BG_LIGHT = RGBColor(248, 250, 252)    # #F8FAFC
COLOR_BG_CARD = RGBColor(255, 255, 255)     # #FFFFFF
COLOR_BORDER = RGBColor(203, 213, 225)      # #CBD5E1
COLOR_TEXT_MAIN = RGBColor(15, 23, 42)      # #0F172A
COLOR_TEXT_MUTED = RGBColor(100, 116, 139)  # #64748B
COLOR_WHITE = RGBColor(255, 255, 255)


def add_slide_header(slide, title, subtitle, right_badge="شركة مصر الوسطى لتوزيع الكهرباء", width=Inches(7.47), top=Inches(0.22), height=Inches(0.92)):
    """إضافة ترويسة رسمية موحدة لكل شريحة مع ملاءمة العرض تلقائياً"""
    header_rect = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.4), top, width, height
    )
    header_rect.fill.solid()
    header_rect.fill.fore_color.rgb = COLOR_NAVY_DARK
    header_rect.line.color.rgb = COLOR_NAVY_LIGHT
    header_rect.line.width = Pt(1.5)

    tf = header_rect.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    tf.margin_left = Inches(0.15)
    tf.margin_right = Inches(0.15)
    tf.margin_top = Inches(0.03)
    tf.margin_bottom = Inches(0.03)

    p1 = tf.paragraphs[0]
    p1.text = f"{right_badge}  -  {title}"
    p1.font.size = Pt(12)
    p1.font.bold = True
    p1.font.color.rgb = COLOR_WHITE
    p1.alignment = PP_ALIGN.RIGHT

    if subtitle:
        p2 = tf.add_paragraph()
        p2.text = subtitle
        p2.font.size = Pt(8.8)
        p2.font.color.rgb = RGBColor(186, 230, 253)
        p2.alignment = PP_ALIGN.RIGHT

    p3 = tf.add_paragraph()
    p3.text = "🔒 للفتح والتعديل ادخل كلمة المرور: 1234500  |  المعتمد: ENG-MOSTAFAELMGHRBI"
    p3.font.size = Pt(8.2)
    p3.font.bold = True
    p3.font.color.rgb = COLOR_GOLD
    p3.alignment = PP_ALIGN.RIGHT


def add_kpi_card(slide, left, top, width, height, title, main_val, sub_val, accent_color):
    """إضافة بطاقة مؤشر أداء هندسي بتصميم عصري"""
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    card.fill.solid()
    card.fill.fore_color.rgb = COLOR_BG_CARD
    card.line.color.rgb = accent_color
    card.line.width = Pt(1.5)

    tf = card.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    tf.margin_left = Inches(0.1)
    tf.margin_right = Inches(0.1)

    p1 = tf.paragraphs[0]
    p1.text = title
    p1.font.size = Pt(10.5)
    p1.font.bold = True
    p1.font.color.rgb = COLOR_TEXT_MUTED
    p1.alignment = PP_ALIGN.CENTER

    p2 = tf.add_paragraph()
    p2.text = main_val
    p2.font.size = Pt(15)
    p2.font.bold = True
    p2.font.color.rgb = accent_color
    p2.alignment = PP_ALIGN.CENTER

    if sub_val:
        p3 = tf.add_paragraph()
        p3.text = sub_val
        p3.font.size = Pt(8.5)
        p3.font.color.rgb = COLOR_TEXT_MAIN
        p3.alignment = PP_ALIGN.CENTER


def draw_native_sld_shapes_to_slide(slide, nodes, sections, frame_left, frame_top, frame_width, frame_height):
    """
    رسم عناصر وشبكة المخطط بالكامل كأشكال وخطوط ونصوص أصلية قابلة للتعديل 100% داخل PowerPoint
    مع الاحتواء التلقائي الكامل (Auto-Containment) الذي يضمن بقاء كافة العناصر والتسميات داخل حدود الشريحة بدقة
    """
    if not nodes or len(nodes) == 0:
        return False

    try:
        valid_nodes = [n for n in nodes if "x" in n and "y" in n and n["x"] is not None and n["y"] is not None]
        if not valid_nodes:
            return False

        nodes_dict = {str(n.get("id")): n for n in valid_nodes}

        def get_node_direction(node):
            if node.get("direction") in ["up", "down", "left", "right"]:
                return node["direction"]
            if node.get("dir") in ["up", "down", "left", "right"]:
                return node["dir"]
            nid = str(node.get("id"))
            for s in sections:
                if str(s.get("from_node")) == nid and str(s.get("to_node")) in nodes_dict:
                    other = nodes_dict[str(s.get("to_node"))]
                    dx = float(other.get("x", 0)) - float(node.get("x", 0))
                    dy = float(other.get("y", 0)) - float(node.get("y", 0))
                    return ("right" if dx >= 0 else "left") if abs(dx) >= abs(dy) else ("down" if dy >= 0 else "up")
            for s in sections:
                if str(s.get("to_node")) == nid and str(s.get("from_node")) in nodes_dict:
                    other = nodes_dict[str(s.get("from_node"))]
                    dx = float(node.get("x", 0)) - float(other.get("x", 0))
                    dy = float(node.get("y", 0)) - float(other.get("y", 0))
                    return ("right" if dx >= 0 else "left") if abs(dx) >= abs(dy) else ("down" if dy >= 0 else "up")
            return "down"

        # 1. مساحة الرسم المتاحة مع هامش أمان داخلي (Inner Margin) يمنع ملامسة الأشكال لإطار الشريحة
        inner_pad = Inches(0.25)
        avail_w = (frame_width - 2 * inner_pad) / Inches(1)
        avail_h = (frame_height - 2 * inner_pad) / Inches(1)

        # 2. تقدير مبدئي للمقياس لحساب أبعاد العناصر بالبوصة وتحويلها لوحدات الكانفاس
        raw_xs = [float(n["x"]) for n in valid_nodes]
        raw_ys = [float(n["y"]) for n in valid_nodes]
        raw_span_x = max(50.0, max(raw_xs) - min(raw_xs) + 120.0)
        raw_span_y = max(50.0, max(raw_ys) - min(raw_ys) + 120.0)
        scale_est = min(avail_w / raw_span_x, avail_h / raw_span_y)

        # 3. حساب حدود الاحتواء الشاملة (Comprehensive Bounding Box) متضمنة كافة النصوص والبطاقات والرموز
        min_bounds_x = min(raw_xs)
        max_bounds_x = max(raw_xs)
        min_bounds_y = min(raw_ys)
        max_bounds_y = max(raw_ys)

        for n in valid_nodes:
            nx = float(n["x"])
            ny = float(n["y"])
            ntype = str(n.get("type", "")).lower()
            sub_type = str(n.get("subType", "")).lower()
            name = str(n.get("name", "")).strip()
            dir_val = get_node_direction(n)

            if ntype in ["substation", "station"] or "board" in sub_type or "لوحة" in name:
                pw_units = 1.6 / scale_est / 2.0
                ph_units = 0.65 / scale_est / 2.0
                min_bounds_x = min(min_bounds_x, nx - pw_units)
                max_bounds_x = max(max_bounds_x, nx + pw_units)
                min_bounds_y = min(min_bounds_y, ny - ph_units)
                max_bounds_y = max(max_bounds_y, ny + ph_units)
            elif ntype in ["kiosk", "كشك"]:
                ext_w = 1.65 / scale_est
                ext_h = 0.70 / scale_est
                if dir_val == "right":
                    max_bounds_x = max(max_bounds_x, nx + ext_w)
                    min_bounds_y = min(min_bounds_y, ny - ext_h / 2)
                    max_bounds_y = max(max_bounds_y, ny + ext_h / 2)
                elif dir_val == "left":
                    min_bounds_x = min(min_bounds_x, nx - ext_w)
                    min_bounds_y = min(min_bounds_y, ny - ext_h / 2)
                    max_bounds_y = max(max_bounds_y, ny + ext_h / 2)
                elif dir_val == "up":
                    min_bounds_y = min(min_bounds_y, ny - ext_h - 0.45 / scale_est)
                    min_bounds_x = min(min_bounds_x, nx - 0.75 / scale_est)
                    max_bounds_x = max(max_bounds_x, nx + 0.75 / scale_est)
                else: # down
                    max_bounds_y = max(max_bounds_y, ny + ext_h + 0.45 / scale_est)
                    min_bounds_x = min(min_bounds_x, nx - 0.75 / scale_est)
                    max_bounds_x = max(max_bounds_x, nx + 0.75 / scale_est)
            elif ntype in ["transformer", "محول"]:
                ext_w = 1.65 / scale_est
                ext_h = 0.70 / scale_est
                max_bounds_x = max(max_bounds_x, nx + ext_w)
                min_bounds_x = min(min_bounds_x, nx - 0.6 / scale_est)
                min_bounds_y = min(min_bounds_y, ny - ext_h)
                max_bounds_y = max(max_bounds_y, ny + ext_h)
            elif ntype in ["switch", "سكينة", "سكينه", "breaker"]:
                ext = 1.15 / scale_est
                min_bounds_x = min(min_bounds_x, nx - ext)
                max_bounds_x = max(max_bounds_x, nx + ext)
                min_bounds_y = min(min_bounds_y, ny - ext)
                max_bounds_y = max(max_bounds_y, ny + ext)

        for s in sections:
            smart_lbl = s.get("_smartLabel")
            if isinstance(smart_lbl, dict) and "x" in smart_lbl and "y" in smart_lbl:
                slx = float(smart_lbl["x"])
                sly = float(smart_lbl["y"])
                lbl_w_u = 0.65 / scale_est
                lbl_h_u = 0.25 / scale_est
                min_bounds_x = min(min_bounds_x, slx - lbl_w_u)
                max_bounds_x = max(max_bounds_x, slx + lbl_w_u)
                min_bounds_y = min(min_bounds_y, sly - lbl_h_u)
                max_bounds_y = max(max_bounds_y, sly + lbl_h_u)

        # 4. المقياس النهائي المتناسق مع الاحتواء التلقائي الكامل والتوسيط الدقيق
        true_span_x = max(50.0, max_bounds_x - min_bounds_x)
        true_span_y = max(50.0, max_bounds_y - min_bounds_y)

        final_scale = min(avail_w / true_span_x, avail_h / true_span_y)
        actual_w = true_span_x * final_scale
        actual_h = true_span_y * final_scale

        off_x = frame_left + inner_pad + Inches((avail_w - actual_w) / 2)
        off_y = frame_top + inner_pad + Inches((avail_h - actual_h) / 2)

        def to_slide_coord(x, y):
            return off_x + Inches((float(x) - min_bounds_x) * final_scale), off_y + Inches((float(y) - min_bounds_y) * final_scale)

        node_coords = {nid: to_slide_coord(n["x"], n["y"]) for nid, n in nodes_dict.items()}

        # 5. رسم الخطوط والكابلات (Connectors) وبطاقات الأطوال بنفس التنسيق
        for s in sections:
            fn_id = str(s.get("from_node"))
            tn_id = str(s.get("to_node"))
            if fn_id in node_coords and tn_id in node_coords:
                x1, y1 = node_coords[fn_id]
                x2, y2 = node_coords[tn_id]

                conn = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, x1, y1, x2, y2)
                s_type = str(s.get("type", "") or s.get("line_type", "") or s.get("conductor_type", "")).lower()
                is_cable = any(k in s_type for k in ["كابل", "cable", "ugc", "أرضي", "ارضي", "متر كابل"])
                
                if is_cable:
                    conn.line.color.rgb = RGBColor(30, 136, 229)  # أزرق كهربائي للكابلات
                    conn.line.dash_style = MSO_LINE.DASH
                else:
                    conn.line.color.rgb = RGBColor(22, 163, 74)   # أخضر زمردي للخط الهوائي
                    conn.line.dash_style = MSO_LINE.SOLID
                conn.line.width = Pt(2.6)

                # بطاقة مسمى وطول المسار
                s_len = s.get("length", "")
                s_size = s.get("size", "") or s.get("cable_size", "")
                badge_txt = f"{s_len}م  {s_size}".strip() if s_len else str(s_size)
                if badge_txt:
                    smart_lbl = s.get("_smartLabel")
                    if isinstance(smart_lbl, dict) and "x" in smart_lbl and "y" in smart_lbl:
                        mx, my = to_slide_coord(smart_lbl["x"], smart_lbl["y"])
                    else:
                        mx = (x1 + x2) / 2
                        my = (y1 + y2) / 2

                    lbl_w = Inches(1.15)
                    lbl_h = Inches(0.28)
                    lbl_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, mx - lbl_w/2, my - lbl_h/2, lbl_w, lbl_h)
                    lbl_box.fill.solid()
                    lbl_box.fill.fore_color.rgb = RGBColor(255, 255, 255)
                    lbl_box.line.color.rgb = RGBColor(148, 163, 184)
                    lbl_box.line.width = Pt(0.75)

                    tf = lbl_box.text_frame
                    tf.word_wrap = False
                    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
                    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
                    p = tf.paragraphs[0]
                    p.text = badge_txt
                    p.font.size = Pt(7.5)
                    p.font.bold = True
                    p.font.color.rgb = RGBColor(15, 23, 42)
                    p.alignment = PP_ALIGN.CENTER

        # 6. رسم الرموز والمعدات بنفس التنسيق المعتمد
        for n in valid_nodes:
            nid = str(n.get("id"))
            cx, cy = node_coords[nid]
            ntype = str(n.get("type", "")).lower()
            sub_type = str(n.get("subType", "")).lower()
            name = str(n.get("name", "")).strip() or nid
            cap = n.get("capacity")
            dir_val = get_node_direction(n)

            # لوحة التوزيع / المحطة
            if ntype in ["substation", "station"] or "board" in sub_type or "لوحة" in name:
                pw, ph = Inches(1.6), Inches(0.58)
                pnl = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, cx - pw/2, cy - ph/2, pw, ph)
                pnl.fill.solid()
                pnl.fill.fore_color.rgb = RGBColor(15, 23, 42)
                pnl.line.color.rgb = RGBColor(43, 108, 176)
                pnl.line.width = Pt(2.2)
                tf = pnl.text_frame
                tf.word_wrap = True
                tf.vertical_anchor = MSO_ANCHOR.MIDDLE
                p = tf.paragraphs[0]
                p.text = f"🏢 {name}"
                p.font.size = Pt(9.5)
                p.font.bold = True
                p.font.color.rgb = RGBColor(255, 255, 255)
                p.alignment = PP_ALIGN.CENTER

            # الكشك (Kiosk) - مثلث أبيض مع إطار أزرق متصل بمسار الكابل
            elif ntype in ["kiosk", "كشك"]:
                # وصلة الكشك (Stem Connector) من مسار الكابل إلى قاعدة المثلث
                stem_len = Inches(0.16)
                tri_cx, tri_cy = cx, cy
                rot_map = {"up": 0, "right": 90, "down": 180, "left": 270}
                rot_val = rot_map.get(dir_val, 90)

                if dir_val == "right":
                    stem = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, cx, cy, cx + stem_len, cy)
                    stem.line.color.rgb = RGBColor(30, 136, 229); stem.line.width = Pt(2.2)
                    tri_cx = cx + stem_len + Inches(0.20)
                elif dir_val == "left":
                    stem = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, cx, cy, cx - stem_len, cy)
                    stem.line.color.rgb = RGBColor(30, 136, 229); stem.line.width = Pt(2.2)
                    tri_cx = cx - stem_len - Inches(0.20)
                elif dir_val == "up":
                    stem = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, cx, cy, cx, cy - stem_len)
                    stem.line.color.rgb = RGBColor(30, 136, 229); stem.line.width = Pt(2.2)
                    tri_cy = cy - stem_len - Inches(0.20)
                else: # down
                    stem = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, cx, cy, cx, cy + stem_len)
                    stem.line.color.rgb = RGBColor(30, 136, 229); stem.line.width = Pt(2.2)
                    tri_cy = cy + stem_len + Inches(0.20)

                tw, th = Inches(0.40), Inches(0.40)
                tri = slide.shapes.add_shape(MSO_SHAPE.ISOSCELES_TRIANGLE, tri_cx - tw/2, tri_cy - th/2, tw, th)
                tri.fill.solid()
                tri.fill.fore_color.rgb = RGBColor(255, 255, 255)
                tri.line.color.rgb = RGBColor(30, 136, 229)
                tri.line.width = Pt(2.4)
                tri.rotation = rot_val

                # بطاقة مسميات وبيانات الكشك
                lx = tri_cx + Inches(0.28) if dir_val != "left" else tri_cx - Inches(1.35)
                ly = tri_cy - Inches(0.30)
                lw, lh = Inches(1.15), Inches(0.62)
                tb = slide.shapes.add_textbox(lx, ly, lw, lh)
                tf = tb.text_frame
                tf.word_wrap = True
                tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
                p1 = tf.paragraphs[0]
                p1.text = name
                p1.font.size = Pt(8.5)
                p1.font.bold = True
                p1.font.color.rgb = RGBColor(15, 23, 42)
                if cap:
                    p2 = tf.add_paragraph()
                    p2.text = f"{cap} KVA"
                    p2.font.size = Pt(8.0)
                    p2.font.bold = True
                    p2.font.color.rgb = RGBColor(180, 83, 9)
                p3 = tf.add_paragraph()
                p3.text = nid
                p3.font.size = Pt(7.0)
                p3.font.color.rgb = RGBColor(100, 116, 139)

            # المحول (Transformer) - دائرتان متداخلتان IEC
            elif ntype in ["transformer", "محول"]:
                stem_len = Inches(0.14)
                r = Inches(0.28)

                if dir_val == "right":
                    stem = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, cx, cy, cx + stem_len, cy)
                    stem.line.color.rgb = RGBColor(22, 163, 74); stem.line.width = Pt(2.0)
                    c_base_x = cx + stem_len
                    c1x, c1y = c_base_x, cy - r/2
                    c2x, c2y = c_base_x + Inches(0.16), cy - r/2
                elif dir_val == "left":
                    stem = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, cx, cy, cx - stem_len, cy)
                    stem.line.color.rgb = RGBColor(22, 163, 74); stem.line.width = Pt(2.0)
                    c_base_x = cx - stem_len
                    c1x, c1y = c_base_x - r, cy - r/2
                    c2x, c2y = c_base_x - r - Inches(0.16), cy - r/2
                elif dir_val == "up":
                    stem = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, cx, cy, cx, cy - stem_len)
                    stem.line.color.rgb = RGBColor(22, 163, 74); stem.line.width = Pt(2.0)
                    c_base_y = cy - stem_len
                    c1x, c1y = cx - r/2, c_base_y - r
                    c2x, c2y = cx - r/2, c_base_y - r - Inches(0.16)
                else: # down
                    stem = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, cx, cy, cx, cy + stem_len)
                    stem.line.color.rgb = RGBColor(22, 163, 74); stem.line.width = Pt(2.0)
                    c_base_y = cy + stem_len
                    c1x, c1y = cx - r/2, c_base_y
                    c2x, c2y = cx - r/2, c_base_y + Inches(0.16)

                c1 = slide.shapes.add_shape(MSO_SHAPE.OVAL, c1x, c1y, r, r)
                c1.fill.solid(); c1.fill.fore_color.rgb = RGBColor(255, 255, 255)
                c1.line.color.rgb = RGBColor(22, 163, 74); c1.line.width = Pt(1.8)

                c2 = slide.shapes.add_shape(MSO_SHAPE.OVAL, c2x, c2y, r, r)
                c2.fill.solid(); c2.fill.fore_color.rgb = RGBColor(255, 255, 255)
                c2.line.color.rgb = RGBColor(22, 163, 74); c2.line.width = Pt(1.8)

                lx = cx + Inches(0.35)
                ly = cy - Inches(0.30)
                tb = slide.shapes.add_textbox(lx, ly, Inches(1.15), Inches(0.62))
                tf = tb.text_frame; tf.word_wrap = True; tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
                p1 = tf.paragraphs[0]; p1.text = name; p1.font.size = Pt(8.5); p1.font.bold = True; p1.font.color.rgb = RGBColor(15, 23, 42)
                if cap:
                    p2 = tf.add_paragraph(); p2.text = f"{cap} KVA"; p2.font.size = Pt(8.0); p2.font.bold = True; p2.font.color.rgb = RGBColor(180, 83, 9)
                p3 = tf.add_paragraph(); p3.text = nid; p3.font.size = Pt(7.0); p3.font.color.rgb = RGBColor(100, 116, 139)

            # السكينة الهوائية (Switch)
            elif ntype in ["switch", "سكينة", "سكينه", "breaker"]:
                blen = Inches(0.30)
                dx, dy = 0, 0
                if dir_val == "right": dx = blen
                elif dir_val == "left": dx = -blen
                elif dir_val == "down": dy = blen
                else: dy = -blen

                t_rad = Inches(0.04)
                t1 = slide.shapes.add_shape(MSO_SHAPE.OVAL, cx - t_rad, cy - t_rad, t_rad*2, t_rad*2)
                t1.fill.solid(); t1.fill.fore_color.rgb = RGBColor(255, 255, 255)
                t1.line.color.rgb = RGBColor(22, 163, 74); t1.line.width = Pt(1.5)

                t2 = slide.shapes.add_shape(MSO_SHAPE.OVAL, cx + dx - t_rad, cy + dy - t_rad, t_rad*2, t_rad*2)
                t2.fill.solid(); t2.fill.fore_color.rgb = RGBColor(255, 255, 255)
                t2.line.color.rgb = RGBColor(22, 163, 74); t2.line.width = Pt(1.5)

                blade = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, cx, cy, cx + dx, cy + dy)
                blade.line.color.rgb = RGBColor(22, 163, 74); blade.line.width = Pt(2.2)

                bw, bh = Inches(0.85), Inches(0.35)
                lx = cx + Inches(0.20) if dir_val != "left" else cx - Inches(1.05)
                ly = cy - Inches(0.18)
                sbox = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, lx, ly, bw, bh)
                sbox.fill.solid(); sbox.fill.fore_color.rgb = RGBColor(26, 32, 44)
                sbox.line.color.rgb = RGBColor(74, 85, 104); sbox.line.width = Pt(0.75)
                tf = sbox.text_frame; tf.word_wrap = True; tf.vertical_anchor = MSO_ANCHOR.MIDDLE
                tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
                p1 = tf.paragraphs[0]; p1.text = name; p1.font.size = Pt(7.5); p1.font.bold = True; p1.font.color.rgb = RGBColor(255, 255, 255); p1.alignment = PP_ALIGN.CENTER
                p2 = tf.add_paragraph(); p2.text = nid; p2.font.size = Pt(6.5); p2.font.color.rgb = RGBColor(144, 205, 244); p2.alignment = PP_ALIGN.CENTER

            # التفريعة / العمود (Junction / Pole)
            else:
                j_rad = Inches(0.04)
                jdot = slide.shapes.add_shape(MSO_SHAPE.OVAL, cx - j_rad, cy - j_rad, j_rad*2, j_rad*2)
                jdot.fill.solid(); jdot.fill.fore_color.rgb = RGBColor(255, 255, 255)
                jdot.line.color.rgb = RGBColor(43, 108, 176); jdot.line.width = Pt(1.5)
                tb = slide.shapes.add_textbox(cx + Inches(0.08), cy - Inches(0.12), Inches(0.6), Inches(0.25))
                tf = tb.text_frame; tf.word_wrap = False; tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
                p = tf.paragraphs[0]; p.text = name; p.font.size = Pt(7.0); p.font.color.rgb = RGBColor(100, 116, 139)

        return True
    except Exception as draw_err:
        print(f"Error drawing native SLD shapes: {draw_err}")
        import traceback
        traceback.print_exc()
        return False


def overlay_editable_labels_on_slide(slide, nodes, sections, pic_left, pic_top, fit_w_in, fit_h_in, view_box=None):
    """
    وضع عناصر وبطاقات نصية أصلية قابلة للتعديل 100% داخل PowerPoint فوق مواقع المعدات والكابلات بالرسمة
    تتيح للمستخدم النقر المباشر وتعديل أي مسمى، قدرة، طول كابل، أو قطاع بدقة متناهية وبدون أي تداخل أو لخبطة
    """
    if not nodes or len(nodes) == 0:
        return

    try:
        # استخراج إحداثيات viewBox
        if not view_box or not isinstance(view_box, dict) or "x" not in view_box:
            valid_nodes = [n for n in nodes if "x" in n and "y" in n and n["x"] is not None and n["y"] is not None]
            if not valid_nodes:
                return
            xs = [float(n["x"]) for n in valid_nodes]
            ys = [float(n["y"]) for n in valid_nodes]
            min_x, max_x = min(xs), max(xs)
            min_y, max_y = min(ys), max(ys)
            pad = 50.0
            vb_x = min_x - pad
            vb_y = min_y - pad
            vb_w = max(400.0, (max_x - min_x) + pad * 2)
            vb_h = max(300.0, (max_y - min_y) + pad * 2)
        else:
            vb_x = float(view_box.get("x", 0))
            vb_y = float(view_box.get("y", 0))
            vb_w = max(1.0, float(view_box.get("width", 1000)))
            vb_h = max(1.0, float(view_box.get("height", 800)))

        def to_slide(cx, cy):
            px = pic_left + Inches(fit_w_in * (float(cx) - vb_x) / vb_w)
            py = pic_top + Inches(fit_h_in * (float(cy) - vb_y) / vb_h)
            return px, py

        nodes_dict = {str(n.get("id")): n for n in nodes}

        # 1. بطاقات أطوال وقطاعات الكابلات القابلة للتعديل المباشر
        for s in sections:
            fn_id = str(s.get("from_node"))
            tn_id = str(s.get("to_node"))
            if fn_id in nodes_dict and tn_id in nodes_dict:
                n1 = nodes_dict[fn_id]
                n2 = nodes_dict[tn_id]
                smart_lbl = s.get("_smartLabel")
                if isinstance(smart_lbl, dict) and "x" in smart_lbl and "y" in smart_lbl:
                    mx, my = float(smart_lbl["x"]), float(smart_lbl["y"])
                else:
                    mx = (float(n1.get("x", 0)) + float(n2.get("x", 0))) / 2.0
                    my = (float(n1.get("y", 0)) + float(n2.get("y", 0))) / 2.0

                smx, smy = to_slide(mx, my)
                s_len = s.get("length", "")
                s_size = s.get("size", "") or s.get("cable_size", "")
                badge_txt = f"{s_len}م  {s_size}".strip() if s_len else str(s_size)
                if badge_txt:
                    bw = Inches(0.85)
                    bh = Inches(0.24)
                    bbox = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, smx - bw/2, smy - bh/2, bw, bh)
                    bbox.fill.solid()
                    bbox.fill.fore_color.rgb = RGBColor(255, 255, 255)
                    bbox.line.color.rgb = RGBColor(148, 163, 184)
                    bbox.line.width = Pt(0.75)
                    tf = bbox.text_frame
                    tf.word_wrap = False
                    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
                    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
                    p = tf.paragraphs[0]
                    p.text = badge_txt
                    p.font.size = Pt(7.0)
                    p.font.bold = True
                    p.font.color.rgb = RGBColor(15, 23, 42)
                    p.alignment = PP_ALIGN.CENTER

        # 2. بطاقات ومسميات المعدات القابلة للتعديل المباشر
        for n in nodes:
            nid = str(n.get("id"))
            nx, ny = float(n.get("x", 0)), float(n.get("y", 0))
            sx, sy = to_slide(nx, ny)
            ntype = str(n.get("type", "")).lower()
            sub_type = str(n.get("subType", "")).lower()
            name = str(n.get("name", "")).strip() or nid
            cap = n.get("capacity")
            dir_val = n.get("direction") or n.get("dir") or "down"

            # محطة / لوحة توزيع
            if ntype in ["substation", "station"] or "board" in sub_type or "لوحة" in name:
                sw = Inches(1.3)
                sh = Inches(0.42)
                pnl = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, sx - sw/2, sy - sh/2, sw, sh)
                pnl.fill.solid()
                pnl.fill.fore_color.rgb = RGBColor(15, 23, 42)
                pnl.line.color.rgb = RGBColor(43, 108, 176)
                pnl.line.width = Pt(1.5)
                tf = pnl.text_frame
                tf.word_wrap = True
                tf.vertical_anchor = MSO_ANCHOR.MIDDLE
                p = tf.paragraphs[0]
                p.text = f"🏢 {name}"
                p.font.size = Pt(8.5)
                p.font.bold = True
                p.font.color.rgb = RGBColor(255, 255, 255)
                p.alignment = PP_ALIGN.CENTER

            # كشك
            elif ntype in ["kiosk", "كشك"]:
                lx = sx + Inches(0.18) if dir_val != "left" else sx - Inches(1.05)
                ly = sy - Inches(0.25)
                lw, lh = Inches(0.95), Inches(0.55)
                tb = slide.shapes.add_textbox(lx, ly, lw, lh)
                tf = tb.text_frame
                tf.word_wrap = True
                tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
                p1 = tf.paragraphs[0]
                p1.text = name
                p1.font.size = Pt(8.0)
                p1.font.bold = True
                p1.font.color.rgb = RGBColor(15, 23, 42)
                if cap:
                    p2 = tf.add_paragraph()
                    p2.text = f"{cap} KVA"
                    p2.font.size = Pt(7.5)
                    p2.font.bold = True
                    p2.font.color.rgb = RGBColor(180, 83, 9)
                p3 = tf.add_paragraph()
                p3.text = nid
                p3.font.size = Pt(6.5)
                p3.font.color.rgb = RGBColor(100, 116, 139)

            # محول
            elif ntype in ["transformer", "محول"]:
                lx = sx + Inches(0.18)
                ly = sy - Inches(0.25)
                lw, lh = Inches(0.95), Inches(0.55)
                tb = slide.shapes.add_textbox(lx, ly, lw, lh)
                tf = tb.text_frame
                tf.word_wrap = True
                tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
                p1 = tf.paragraphs[0]
                p1.text = name
                p1.font.size = Pt(8.0)
                p1.font.bold = True
                p1.font.color.rgb = RGBColor(15, 23, 42)
                if cap:
                    p2 = tf.add_paragraph()
                    p2.text = f"{cap} KVA"
                    p2.font.size = Pt(7.5)
                    p2.font.bold = True
                    p2.font.color.rgb = RGBColor(180, 83, 9)
                p3 = tf.add_paragraph()
                p3.text = nid
                p3.font.size = Pt(6.5)
                p3.font.color.rgb = RGBColor(100, 116, 139)

            # سكينة
            elif ntype in ["switch", "سكينة", "سكينه", "breaker"]:
                bw = Inches(0.65)
                bh = Inches(0.26)
                lx = sx + Inches(0.12) if dir_val != "left" else sx - Inches(0.77)
                ly = sy - bh/2
                sbox = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, lx, ly, bw, bh)
                sbox.fill.solid()
                sbox.fill.fore_color.rgb = RGBColor(26, 32, 44)
                sbox.line.color.rgb = RGBColor(74, 85, 104)
                sbox.line.width = Pt(0.75)
                tf = sbox.text_frame
                tf.word_wrap = False
                tf.vertical_anchor = MSO_ANCHOR.MIDDLE
                tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
                p1 = tf.paragraphs[0]
                p1.text = name
                p1.font.size = Pt(7.0)
                p1.font.bold = True
                p1.font.color.rgb = RGBColor(255, 255, 255)
                p1.alignment = PP_ALIGN.CENTER
    except Exception as e:
        print(f"Overlay editable labels note: {e}")


def export_network_to_powerpoint(project_data, metrics_data, image_base64=None, view_box=None):
    """
    توليد عرض تقديمي احترافي متكامل مع الاحتواء التلقائي الكامل (Auto-Containment):
    1. شريحة المخطط الهندسي فائق الدقة المعتمد بدون أي تداخل + طبقة نصوص وبطاقات قابلة للتعديل المباشر.
    2. شريحة المخطط المتجهي التفاعلي للتحريك والتعديل الشامل.
    3. شريحة المؤشرات والتحليلات الكهربائية وحسابات هبوط الجهد.
    4. شريحة جدول حصر وتوزيع المحولات والأكشاك مع استخراج دقيق للقدرات والأحمال.
    """
    feeder_name = project_data.get("name", "مغذي التوزيع")
    substation = project_data.get("substation", "المحطة الرئيسية")
    voltage_kv = float(project_data.get("voltage_kv", 11.0))
    sector = project_data.get("sector", "قطاع المنيا شمال")
    admin_name = project_data.get("admin", "هندسة كهرباء بني مزار شرق")
    designer = project_data.get("designer", "المدير العام")

    total_len = float(metrics_data.get("total_length", 0.0))
    ohl_len = float(metrics_data.get("ohl_length", 0.0))
    ugc_len = float(metrics_data.get("ugc_length", 0.0))
    total_cap = float(metrics_data.get("total_capacity_kva", 0.0))
    actual_load = float(metrics_data.get("total_actual_load_kva", 0.0))
    total_cur = float(metrics_data.get("total_current_a", 0.0))
    max_drop = float(metrics_data.get("max_voltage_drop_pct", 0.0))

    nodes = project_data.get("nodes", [])
    sections = project_data.get("sections", [])

    # فحص ومعالجة الصورة واستخراج نسبة التناسب الهندسية
    img_aspect = 1.0
    img_stream = None
    if image_base64:
        try:
            clean_b64 = re.sub(r'^data:image/[^;]+;base64,', '', image_base64)
            img_bytes = base64.b64decode(clean_b64)
            img_stream = io.BytesIO(img_bytes)
            with Image.open(img_stream) as pil_img:
                img_w_px, img_h_px = pil_img.size
            img_stream.seek(0)
            img_aspect = img_w_px / max(1, img_h_px)
        except Exception as e:
            img_stream = None
            img_aspect = 1.0

    prs = Presentation()
    blank_layout = prs.slide_layouts[6]

    # تنسيق العرض التقديمي القياسي في باور بوينت (16:9 Widescreen) للاحتواء التلقائي الكامل والتناسب التام مع الشاشة
    is_landscape = True

    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    content_width = Inches(12.533)
    header_top = Inches(0.18)
    header_height = Inches(0.75)
    frame_top = Inches(1.02)
    frame_height = Inches(5.65)
    footer_top = Inches(6.78)
    footer_height = Inches(0.55)

    # =========================================================================
    # الشريحة 1: المخطط الهندسي المعتمد (نقي 100% بدون أي تداخل + طبقة تعديل مباشر)
    # =========================================================================
    slide1 = prs.slides.add_slide(blank_layout)
    subtitle1 = f"المشروع: مخطط شبكة الجهد المتوسط ({voltage_kv} ك.ف)  -  المحطة: {substation}  -  الاعتماد: {designer}"
    add_slide_header(slide1, f"المخطط الهندسي لـ {feeder_name}", subtitle1, f"{sector} - {admin_name}", width=content_width, top=header_top, height=header_height)

    # تضمين بيانات المخطط بالكامل داخل عنصر مخفي خارج حدود الشريحة للاسترجاع التلقائي 100% (Lossless Roundtrip)
    try:
        import json
        clean_project = {
            "id": project_data.get("id"),
            "name": project_data.get("name"),
            "substation": project_data.get("substation"),
            "voltage_kv": project_data.get("voltage_kv", 11.0),
            "admin": project_data.get("admin"),
            "sector": project_data.get("sector"),
            "designer": project_data.get("designer"),
            "nodes": project_data.get("nodes", []),
            "sections": project_data.get("sections", []),
            "switches": project_data.get("switches", []),
            "drawing_direction": project_data.get("drawing_direction", "down")
        }
        json_str = json.dumps(clean_project, ensure_ascii=False)
        meta_box = slide1.shapes.add_textbox(Inches(50), Inches(50), Inches(1), Inches(1))
        meta_box.text_frame.text = f"SLD_DATA_JSON::{json_str}"
    except Exception as e:
        pass

    # إطار المخطط الهندسي
    border_box = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.4), frame_top, content_width, frame_height)
    border_box.fill.solid()
    border_box.fill.fore_color.rgb = RGBColor(255, 255, 255)
    border_box.line.color.rgb = COLOR_NAVY_LIGHT
    border_box.line.width = Pt(1.5)

    # وضع الرسم الهندسي النقي والاحتواء التلقائي التام:
    if img_stream:
        try:
            max_w_in = (content_width - Inches(0.12)) / Inches(1)
            max_h_in = (frame_height - Inches(0.12)) / Inches(1)
            frame_aspect = max_w_in / max_h_in

            if img_aspect > frame_aspect:
                fit_w_in = max_w_in
                fit_h_in = max_w_in / img_aspect
            else:
                fit_h_in = max_h_in
                fit_w_in = max_h_in * img_aspect

            pic_left = Inches(0.4) + Inches(((content_width / Inches(1)) - fit_w_in) / 2)
            pic_top = frame_top + Inches(((frame_height / Inches(1)) - fit_h_in) / 2)

            slide1.shapes.add_picture(img_stream, pic_left, pic_top, width=Inches(fit_w_in), height=Inches(fit_h_in))
            # طبقة النصوص والبطاقات الأصلية القابلة للتعديل والنقر المباشر داخل PowerPoint
            overlay_editable_labels_on_slide(slide1, nodes, sections, pic_left, pic_top, fit_w_in, fit_h_in, view_box)
        except Exception as pic_err:
            print(f"Picture layout note: {pic_err}")
            draw_native_sld_shapes_to_slide(slide1, nodes, sections, Inches(0.4), frame_top, content_width, frame_height)
    elif nodes and len(nodes) > 0:
        draw_native_sld_shapes_to_slide(slide1, nodes, sections, Inches(0.4), frame_top, content_width, frame_height)
    else:
        tf_fallback = border_box.text_frame
        p_fb = tf_fallback.paragraphs[0]
        p_fb.text = f"مخطط المغذي: {feeder_name} (إجمالي النودات: {len(nodes)} نود | الأقسام: {len(sections)} قسم)"
        p_fb.alignment = PP_ALIGN.CENTER
        p_fb.font.size = Pt(14)
        p_fb.font.bold = True
        p_fb.font.color.rgb = COLOR_NAVY_DARK

    # شريط الحالة الهندسي السفلي للشريحة الأولى
    footer_bar = slide1.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.4), footer_top, content_width, footer_height
    )
    footer_bar.fill.solid()
    footer_bar.fill.fore_color.rgb = RGBColor(241, 245, 249)
    footer_bar.line.color.rgb = COLOR_BORDER
    footer_bar.line.width = Pt(1)

    ft_tf = footer_bar.text_frame
    ft_tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    ft_tf.margin_left = Inches(0.12)
    ft_tf.margin_right = Inches(0.12)

    p_ft1 = ft_tf.paragraphs[0]
    p_ft1.text = (
        f"الأطوال: {total_len:,.0f}م (هوائي: {ohl_len:,.0f}م | كابل: {ugc_len:,.0f}م)  •  "
        f"القدرة: {total_cap:,.1f}KVA  •  الحمل: {actual_load:,.1f}KVA"
    )
    p_ft1.font.size = Pt(9.5 if not is_landscape else 10.5)
    p_ft1.font.bold = True
    p_ft1.font.color.rgb = COLOR_NAVY_DARK
    p_ft1.alignment = PP_ALIGN.CENTER

    p_ft2 = ft_tf.add_paragraph()
    p_ft2.text = (
        f"أقصى هبوط جهد: {max_drop:.2f}%  •  التيار: {total_cur:.2f}A  "
        f"[ ENG-MOSTAFA ELMGHRABY (01124158545) ]"
    )
    p_ft2.font.size = Pt(9.0 if not is_landscape else 9.5)
    p_ft2.font.bold = True
    p_ft2.font.color.rgb = COLOR_GOLD
    p_ft2.alignment = PP_ALIGN.CENTER

    # =========================================================================
    # الشريحة 2: المخطط الهيكلي المتجهي (كامل المسارات والعناصر كأشكال متجهة قابلة للتحريك والتعديل)
    # =========================================================================
    if img_stream and nodes and len(nodes) > 0:
        slide_vec = prs.slides.add_slide(blank_layout)
        subtitle_vec = f"مخطط تفاعلي للعناصر المتجهة: يمكنك تحريك وتعديل الخطوط والرموز  -  المحطة: {substation}"
        add_slide_header(slide_vec, f"المخطط المتجهي التفاعلي لـ {feeder_name}", subtitle_vec, f"{sector} - {admin_name}", width=content_width, top=header_top, height=header_height)
        border_box_vec = slide_vec.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.4), frame_top, content_width, frame_height)
        border_box_vec.fill.solid()
        border_box_vec.fill.fore_color.rgb = RGBColor(255, 255, 255)
        border_box_vec.line.color.rgb = COLOR_NAVY_LIGHT
        border_box_vec.line.width = Pt(1.5)
        draw_native_sld_shapes_to_slide(slide_vec, nodes, sections, Inches(0.4), frame_top, content_width, frame_height)
        footer_bar_vec = slide_vec.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.4), footer_top, content_width, footer_height)
        footer_bar_vec.fill.solid()
        footer_bar_vec.fill.fore_color.rgb = RGBColor(241, 245, 249)
        footer_bar_vec.line.color.rgb = COLOR_BORDER
        footer_bar_vec.line.width = Pt(1)
        ft_tf_vec = footer_bar_vec.text_frame
        ft_tf_vec.vertical_anchor = MSO_ANCHOR.MIDDLE
        p_ft1_v = ft_tf_vec.paragraphs[0]
        p_ft1_v.text = f"الأطوال: {total_len:,.0f}م (هوائي: {ohl_len:,.0f}م | كابل: {ugc_len:,.0f}م)  •  القدرة: {total_cap:,.1f}KVA  •  الحمل: {actual_load:,.1f}KVA"
        p_ft1_v.font.size = Pt(10.5); p_ft1_v.font.bold = True; p_ft1_v.font.color.rgb = COLOR_NAVY_DARK; p_ft1_v.alignment = PP_ALIGN.CENTER
        p_ft2_v = ft_tf_vec.add_paragraph()
        p_ft2_v.text = f"أقصى هبوط جهد: {max_drop:.2f}%  •  التيار: {total_cur:.2f}A  [ ENG-MOSTAFA ELMGHRABY (01124158545) ]"
        p_ft2_v.font.size = Pt(9.5); p_ft2_v.font.bold = True; p_ft2_v.font.color.rgb = COLOR_GOLD; p_ft2_v.alignment = PP_ALIGN.CENTER

    # =========================================================================
    # الشريحة التكميلية: لوحة المؤشرات الفنية والتحليلية للمغذي (Feeder Analytics & KPIs)
    # =========================================================================
    slide2 = prs.slides.add_slide(blank_layout)
    add_slide_header(
        slide2,
        f"المؤشرات الفنية والتحليلية للمغذي: {feeder_name}",
        f"محطة: {substation} ({voltage_kv} ك.ف)  -  بيان تفصيلي بالأحمال والشبكة الهوائية والأرضية",
        f"{sector} - {admin_name}",
        width=content_width,
        top=header_top,
        height=header_height
    )

    drop_status = "حالة ممتازة" if max_drop <= 5.0 else ("مقبول هندسياً" if max_drop <= 7.5 else "تنبيه: مرتفع")
    drop_color = COLOR_GREEN if max_drop <= 5.0 else COLOR_GOLD

    if is_landscape:
        # الوضع العريض: 4 بطاقات KPI في صف واحد بالعرض
        card_w = Inches(2.98)
        card_h = Inches(1.22)
        kpi_top = Inches(1.05)
        lefts = [Inches(0.4), Inches(3.58), Inches(6.76), Inches(9.95)]

        add_kpi_card(slide2, lefts[0], kpi_top, card_w, card_h, "إجمالي أطوال الخطوط", f"{total_len:,.0f} متر", f"هوائي: {ohl_len:,.0f}م | كابل: {ugc_len:,.0f}م", COLOR_NAVY_LIGHT)
        add_kpi_card(slide2, lefts[1], kpi_top, card_w, card_h, "قدرة وأحمال المحولات", f"{total_cap:,.1f} KVA", f"الحمل: {actual_load:,.1f} KVA ({((actual_load/total_cap)*100) if total_cap>0 else 0:.1f}%)", COLOR_GOLD)
        add_kpi_card(slide2, lefts[2], kpi_top, card_w, card_h, "أقصى نسبة هبوط جهد", f"{max_drop:.2f} %", f"التقييم: {drop_status}", drop_color)
        add_kpi_card(slide2, lefts[3], kpi_top, card_w, card_h, "تيار المغذي الإجمالي", f"{total_cur:.2f} أمبير", f"الجهد: {voltage_kv} ك.ف", COLOR_ACCENT_BLUE)

        # بطاقتان تفصيليتان بجوار بعضهما
        det_w = Inches(6.16)
        det_top = Inches(2.45)
        det_h = Inches(4.85)

        card_proj = slide2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.4), det_top, det_w, det_h)
        card_net = slide2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.76), det_top, det_w, det_h)
    else:
        # الوضع الرأسي: 4 بطاقات KPI بنمط 2x2
        card_w = Inches(3.64)
        card_h = Inches(1.22)
        row1_top = Inches(1.2)
        row2_top = Inches(2.52)

        add_kpi_card(slide2, Inches(0.4), row1_top, card_w, card_h, "إجمالي أطوال الخطوط", f"{total_len:,.0f} متر", f"هوائي: {ohl_len:,.0f} م  |  كابل: {ugc_len:,.0f} م", COLOR_NAVY_LIGHT)
        add_kpi_card(slide2, Inches(4.23), row1_top, card_w, card_h, "قدرة وأحمال المحولات", f"{total_cap:,.1f} KVA", f"الحمل الفعلي: {actual_load:,.1f} KVA ({((actual_load/total_cap)*100) if total_cap>0 else 0:.1f}%)", COLOR_GOLD)
        add_kpi_card(slide2, Inches(0.4), row2_top, card_w, card_h, "أقصى نسبة هبوط جهد", f"{max_drop:.2f} %", f"التقييم: {drop_status} (كود التوزيع)", drop_color)
        add_kpi_card(slide2, Inches(4.23), row2_top, card_w, card_h, "تيار المغذي الإجمالي", f"{total_cur:.2f} أمبير", f"جهد التشغيل: {voltage_kv} كيلو فولت", COLOR_ACCENT_BLUE)

        card_proj = slide2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.4), Inches(3.9), content_width, Inches(3.6))
        card_net = slide2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.4), Inches(7.65), content_width, Inches(3.8))

    # تعبئة بطاقة بيانات المشروع
    card_proj.fill.solid()
    card_proj.fill.fore_color.rgb = COLOR_BG_CARD
    card_proj.line.color.rgb = COLOR_BORDER
    tf_proj = card_proj.text_frame
    tf_proj.word_wrap = True
    tf_proj.margin_left = Inches(0.2)
    tf_proj.margin_right = Inches(0.2)
    tf_proj.margin_top = Inches(0.15)

    p_proj_title = tf_proj.paragraphs[0]
    p_proj_title.text = "🏢 بيانات الاعتماد وهوية الشبكة الهندسية"
    p_proj_title.font.size = Pt(12.5)
    p_proj_title.font.bold = True
    p_proj_title.font.color.rgb = COLOR_NAVY_DARK
    p_proj_title.alignment = PP_ALIGN.RIGHT

    items_proj = [
        ("الشركة التابع لها", "شركة مصر الوسطى لتوزيع الكهرباء"),
        ("القطاع الجغرافي", sector),
        ("الإدارة العامة / الهندسة", admin_name),
        ("اسم المغذي", feeder_name),
        ("محطة المحولات المغذية", substation),
        ("جهد تشغيل الشبكة", f"{voltage_kv} ك.ف (جهد متوسط)"),
        ("الاعتماد الهندسي", designer),
        ("المصمم والمطور للمنظومة", "ENG-MOSTAFA ELMGHRABY (01124158545)")
    ]

    for lbl, val in items_proj:
        p_row = tf_proj.add_paragraph()
        p_row.text = f"• {lbl}: {val}"
        p_row.font.size = Pt(10)
        p_row.font.color.rgb = COLOR_TEXT_MAIN
        p_row.alignment = PP_ALIGN.RIGHT

    # تعبئة بطاقة حصر المكونات
    card_net.fill.solid()
    card_net.fill.fore_color.rgb = COLOR_BG_CARD
    card_net.line.color.rgb = COLOR_BORDER
    tf_net = card_net.text_frame
    tf_net.word_wrap = True
    tf_net.margin_left = Inches(0.2)
    tf_net.margin_right = Inches(0.2)
    tf_net.margin_top = Inches(0.15)

    p_net_title = tf_net.paragraphs[0]
    p_net_title.text = "⚡ حصر مكونات الشبكة والخطوط والمعدات"
    p_net_title.font.size = Pt(12.5)
    p_net_title.font.bold = True
    p_net_title.font.color.rgb = COLOR_NAVY_DARK
    p_net_title.alignment = PP_ALIGN.RIGHT

    trans_count = sum(1 for n in nodes if n.get("type") in ["transformer", "trans"])
    kiosk_count = sum(1 for n in nodes if n.get("type") in ["kiosk"])
    switch_count = sum(1 for s in sections if s.get("has_switch"))
    closed_switches = sum(1 for s in sections if s.get("has_switch") and s.get("switch_state", "closed") == "closed")
    open_switches = sum(1 for s in sections if s.get("has_switch") and s.get("switch_state", "closed") == "open")

    items_net = [
        ("إجمالي عدد النودات الهندسية", f"{len(nodes)} نود"),
        ("إجمالي عدد أقسام الخطوط", f"{len(sections)} وصلة"),
        ("عدد المحولات الهوائية المعلقة", f"{trans_count} محول"),
        ("عدد الأكشاك الأرضية المدمجة", f"{kiosk_count} كشك"),
        ("إجمالي عدد سكاكين العزل والمناورة", f"{switch_count} سكينة"),
        ("حالة السكاكين التشغيلية", f"{closed_switches} مغلقة (توصيل)  -  {open_switches} مفتوحة (عزل)"),
        ("نسبة الكابلات الأرضية من المغذي", f"{(ugc_len/total_len)*100 if total_len>0 else 0:.1f} %"),
        ("نسبة الخطوط الهوائية من المغذي", f"{(ohl_len/total_len)*100 if total_len>0 else 0:.1f} %")
    ]

    for lbl, val in items_net:
        p_row = tf_net.add_paragraph()
        p_row.text = f"• {lbl}: {val}"
        p_row.font.size = Pt(10)
        p_row.font.color.rgb = COLOR_TEXT_MAIN
        p_row.alignment = PP_ALIGN.RIGHT

    # =========================================================================
    # الشريحة 3: جدول حصر وتوزيع أحمال المحولات والأكشاك (Loads Schedule)
    # =========================================================================
    trans_nodes = [n for n in nodes if n.get("type") in ["transformer", "trans", "kiosk"]]
    if not trans_nodes:
        trans_nodes = [n for n in nodes if float(n.get("capacity", n.get("capacity_kva", 0)) or 0) > 0]

    if trans_nodes:
        slide3 = prs.slides.add_slide(blank_layout)
        add_slide_header(
            slide3,
            f"جدول حصر وتوزيع أحمال المحولات والأكشاك — {feeder_name}",
            f"إجمالي المحولات: {len(trans_nodes)}  -  القدرة الإجمالية: {total_cap:,.1f} KVA  -  الحمل الكلي: {actual_load:,.1f} KVA",
            f"{sector} - {admin_name}",
            width=content_width,
            top=header_top,
            height=header_height
        )

        max_rows = 14 if is_landscape else 22
        rows_cnt = min(len(trans_nodes) + 2, max_rows)
        cols_cnt = 7
        tbl_top = Inches(1.05) if is_landscape else Inches(1.22)
        tbl_h = Inches(6.0) if is_landscape else Inches(10.1)

        table_shape = slide3.shapes.add_table(rows_cnt, cols_cnt, Inches(0.4), tbl_top, content_width, tbl_h)
        tbl = table_shape.table

        if is_landscape:
            tbl.columns[0].width = Inches(0.6)   # م
            tbl.columns[1].width = Inches(1.2)   # رقم النود
            tbl.columns[2].width = Inches(4.733) # اسم المحول
            tbl.columns[3].width = Inches(1.5)   # النوع
            tbl.columns[4].width = Inches(1.4)   # القدرة KVA
            tbl.columns[5].width = Inches(1.4)   # نسبة التحميل
            tbl.columns[6].width = Inches(1.7)   # الحمل الفعلي
        else:
            tbl.columns[0].width = Inches(0.45)
            tbl.columns[1].width = Inches(0.85)
            tbl.columns[2].width = Inches(2.47)
            tbl.columns[3].width = Inches(0.95)
            tbl.columns[4].width = Inches(0.9)
            tbl.columns[5].width = Inches(0.9)
            tbl.columns[6].width = Inches(0.95)

        headers = ["م", "النود", "اسم المحول / الكشك", "النوع", "القدرة (KVA)", "نسبة التحميل", "الحمل الفعلي (KVA)"]
        for c_idx, h_text in enumerate(headers):
            cell = tbl.cell(0, c_idx)
            cell.fill.solid()
            cell.fill.fore_color.rgb = COLOR_NAVY_DARK
            cell.text_frame.word_wrap = True
            cell.text_frame.vertical_anchor = MSO_ANCHOR.MIDDLE
            p = cell.text_frame.paragraphs[0]
            p.text = h_text
            p.font.size = Pt(9.5 if not is_landscape else 10.5)
            p.font.bold = True
            p.font.color.rgb = COLOR_WHITE
            p.alignment = PP_ALIGN.CENTER

        display_nodes = trans_nodes[:rows_cnt - 2]
        for r_idx, node in enumerate(display_nodes, start=1):
            n_type = node.get("type", "")
            type_str = "كشك" if n_type == "kiosk" else "محول"
            cap = float(node.get("capacity", node.get("capacity_kva", 0)) or 0)
            load_pct = float(node.get("loading_pct", node.get("load_pct", 65)) or 65)
            node_actual = cap * (load_pct / 100.0)

            row_data = [
                str(r_idx),
                str(node.get("id", f"N{r_idx}")),
                str(node.get("name", f"محول {r_idx}")),
                type_str,
                f"{cap:,.0f}",
                f"{load_pct:.0f}%",
                f"{node_actual:,.0f}"
            ]

            bg_col = COLOR_BG_LIGHT if r_idx % 2 == 0 else COLOR_BG_CARD
            for c_idx, val_str in enumerate(row_data):
                cell = tbl.cell(r_idx, c_idx)
                cell.fill.solid()
                cell.fill.fore_color.rgb = bg_col
                cell.text_frame.word_wrap = True
                cell.text_frame.vertical_anchor = MSO_ANCHOR.MIDDLE
                p = cell.text_frame.paragraphs[0]
                p.text = val_str
                p.font.size = Pt(9 if not is_landscape else 10)
                p.font.color.rgb = COLOR_TEXT_MAIN
                p.alignment = PP_ALIGN.RIGHT if c_idx == 2 else PP_ALIGN.CENTER

        total_row_idx = rows_cnt - 1
        tbl.cell(total_row_idx, 0).text = ""
        tbl.cell(total_row_idx, 1).text = ""
        cell_tot_label = tbl.cell(total_row_idx, 2)
        cell_tot_label.text = "الإجمالي العام"
        cell_tot_label.text_frame.paragraphs[0].font.bold = True
        cell_tot_label.text_frame.paragraphs[0].alignment = PP_ALIGN.RIGHT

        tbl.cell(total_row_idx, 3).text = f"{len(trans_nodes)}"
        tbl.cell(total_row_idx, 4).text = f"{total_cap:,.0f}"
        tbl.cell(total_row_idx, 5).text = f"{((actual_load/total_cap)*100) if total_cap>0 else 0:.1f}%"
        tbl.cell(total_row_idx, 6).text = f"{actual_load:,.0f}"

        for c_idx in range(cols_cnt):
            c = tbl.cell(total_row_idx, c_idx)
            c.fill.solid()
            c.fill.fore_color.rgb = RGBColor(226, 232, 240)
            p = c.text_frame.paragraphs[0]
            p.font.bold = True
            p.font.size = Pt(9.5 if not is_landscape else 10.5)
            p.font.color.rgb = COLOR_NAVY_DARK
    out_stream = io.BytesIO()
    prs.save(out_stream)
    raw_bytes = out_stream.getvalue()

    # تطبيق حماية التعديل بكلمة المرور 1234500 (Write-Protection / Modify Password)
    # تطلب من أي شخص يدخل لتعديل العرض كلمة المرور 1234500 مع إمكانية القراءة
    try:
        protected_bytes = apply_write_protection_to_pptx_bytes(raw_bytes, password="1234500")
        return protected_bytes
    except Exception as prot_err:
        print(f"Warning: could not apply PPTX write protection: {prot_err}")
        return raw_bytes


def generate_pptx_write_protection_verifier(password="1234500", spin_count=100000):
    """
    توليد وسم حماية التعديل p:modifyVerifier المتوافق 100% مع Microsoft PowerPoint و MS-OFFCRYPTO / ISO-29500
    بحيث يطلب الباور بوينت كلمة المرور لفتح إمكانية التعديل (Write Protection).
    """
    import struct
    import hashlib
    salt = os.urandom(16)
    pwd_bytes = password.encode("utf-16le")
    h = hashlib.sha512(salt + pwd_bytes).digest()
    for i in range(spin_count):
        h = hashlib.sha512(h + struct.pack("<I", i)).digest()

    salt_b64 = base64.b64encode(salt).decode("utf-8")
    hash_b64 = base64.b64encode(h).decode("utf-8")

    return (
        f'<p:modifyVerifier cryptProviderType="rsaAES" cryptAlgorithmClass="hash" '
        f'cryptAlgorithmType="typeAny" cryptAlgorithmSid="14" spinCount="{spin_count}" '
        f'saltData="{salt_b64}" hashData="{hash_b64}"/>'
    )


def apply_write_protection_to_pptx_bytes(pptx_bytes, password="1234500"):
    """
    حقن وسم حماية التعديل داخل ملف الـ PPTX (presentation.xml) لفرض كلمة مرور عند فتح الملف للتعديل،
    مع ضبط هوية المطور (ENG-MOSTAFAELMGHRBI) وعنوان المنظومة (شركة مصر الوسطى لتوزيع الكهرباء)
    لتظهر في النافذة المنبثقة للباور بوينت عند النقر على تمكين التحرير على أي جهاز أو تطبيق (واتساب، حاسوب، موبايل).
    """
    import zipfile

    in_buf = io.BytesIO(pptx_bytes)
    out_buf = io.BytesIO()

    verifier_tag = generate_pptx_write_protection_verifier(password=password)

    with zipfile.ZipFile(in_buf, 'r') as in_zip:
        with zipfile.ZipFile(out_buf, 'w', zipfile.ZIP_DEFLATED) as out_zip:
            for item in in_zip.infolist():
                data = in_zip.read(item.filename)
                if item.filename == 'ppt/presentation.xml':
                    xml_str = data.decode('utf-8')
                    if '</p:presentation>' in xml_str and '<p:modifyVerifier' not in xml_str:
                        xml_str = xml_str.replace('</p:presentation>', f'{verifier_tag}</p:presentation>')
                    data = xml_str.encode('utf-8')
                elif item.filename == 'docProps/core.xml':
                    xml_str = data.decode('utf-8')
                    # استبدال وتعيين اسم المؤلف والمعدل والعنوان والوصف في النافذة المنبثقة
                    xml_str = re.sub(r'<dc:creator>[^<]*</dc:creator>', '', xml_str)
                    xml_str = re.sub(r'<dc:creator/>', '', xml_str)
                    xml_str = re.sub(r'<cp:lastModifiedBy>[^<]*</cp:lastModifiedBy>', '', xml_str)
                    xml_str = re.sub(r'<cp:lastModifiedBy/>', '', xml_str)
                    xml_str = re.sub(r'<dc:title>[^<]*</dc:title>', '', xml_str)
                    xml_str = re.sub(r'<dc:title/>', '', xml_str)
                    xml_str = re.sub(r'<dc:description>[^<]*</dc:description>', '', xml_str)
                    xml_str = re.sub(r'<dc:description/>', '', xml_str)
                    xml_str = xml_str.replace('</cp:coreProperties>', 
                        '<dc:title>شركة مصر الوسطى لتوزيع الكهرباء</dc:title>'
                        '<dc:creator>ENG-MOSTAFAELMGHRBI</dc:creator>'
                        '<cp:lastModifiedBy>ENG-MOSTAFAELMGHRBI</cp:lastModifiedBy>'
                        '<dc:description>للفتح والتعديل ادخل كلمة المرور (1234500) — شركة مصر الوسطى لتوزيع الكهرباء</dc:description>'
                        '</cp:coreProperties>'
                    )
                    data = xml_str.encode('utf-8')
                elif item.filename == 'docProps/app.xml':
                    xml_str = data.decode('utf-8')
                    xml_str = xml_str.replace('<Company></Company>', '<Company>شركة مصر الوسطى لتوزيع الكهرباء</Company>')
                    xml_str = xml_str.replace('<Company/>', '<Company>شركة مصر الوسطى لتوزيع الكهرباء</Company>')
                    xml_str = xml_str.replace('<Manager></Manager>', '<Manager>ENG-MOSTAFAELMGHRBI</Manager>')
                    xml_str = xml_str.replace('<Manager/>', '<Manager>ENG-MOSTAFAELMGHRBI</Manager>')
                    data = xml_str.encode('utf-8')
                out_zip.writestr(item, data)

    out_buf.seek(0)
    return out_buf.getvalue()


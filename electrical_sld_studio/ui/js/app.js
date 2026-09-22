/**
 * Smart Grid SLD Studio - Main Application Controller
 * Copyright (C) ENG-MOSTAFAELMGHRABY - All Rights Reserved
 */

var currentProject = window.currentProject || null;
window.currentProject = currentProject;

window.setCurrentProject = function(proj) {
  currentProject = proj;
  window.currentProject = proj;
  return proj;
};
window.getCurrentProject = function() {
  return currentProject || window.currentProject;
};

let currentLineDialogType = "هوائي";
let currentTransDialogType = "transformer";

// اتجاه تدفق الرسم: 'down' (من أعلى لأسفل) أو 'up' (من أسفل لأعلى)
window.drawingFlowDirection = localStorage.getItem("sld_drawing_direction") || "down";

function updateDrawingDirectionUI() {
  const isUp = (window.drawingFlowDirection === "up");
  const iconEl = document.getElementById("drawing-dir-icon");
  const labelEl = document.getElementById("drawing-dir-label");
  const btn = document.getElementById("btn-toggle-drawing-dir");
  const floatBtn = document.getElementById("btn-float-dir");

  if (iconEl) iconEl.textContent = isUp ? "⬆️" : "⬇️";
  if (labelEl) labelEl.textContent = isUp ? "من أسفل لأعلى" : "من أعلى لأسفل";
  if (btn) {
    btn.title = isUp ? "اتجاه الرسم الحالي: من أسفل لأعلى ⬆️ (انقر للتبديل إلى من أعلى لأسفل)" : "اتجاه الرسم الحالي: من أعلى لأسفل ⬇️ (انقر للتبديل إلى من أسفل لأعلى)";
  }
  if (floatBtn) {
    floatBtn.textContent = isUp ? "⬆️" : "⬇️";
    floatBtn.title = isUp ? "اتجاه الرسم: من أسفل لأعلى ⬆️ (انقر للتبديل إلى من أعلى لأسفل)" : "اتجاه الرسم: من أعلى لأسفل ⬇️ (انقر للتبديل إلى من أسفل لأعلى)";
  }

  // تحديث القائمة الجانبية إذا كانت محددة بـ up أو down
  const quickDirSelect = document.getElementById("quick-line-dir");
  if (quickDirSelect && (quickDirSelect.value === "up" || quickDirSelect.value === "down")) {
    quickDirSelect.value = isUp ? "up" : "down";
  }
}

function toggleDrawingDirection(forceDir = null, silent = false) {
  if (forceDir) {
    window.drawingFlowDirection = forceDir;
  } else {
    window.drawingFlowDirection = (window.drawingFlowDirection === "up") ? "down" : "up";
  }
  localStorage.setItem("sld_drawing_direction", window.drawingFlowDirection);
  updateDrawingDirectionUI();

  // إذا كان المخطط في بدايته (نود محطة رئيسية فقط وبدون خطوط)، نقوم بتعديل موضع المحطة فوراً
  if (currentProject && currentProject.nodes && currentProject.nodes.length === 1 && (!currentProject.sections || currentProject.sections.length === 0)) {
    const onlyNode = currentProject.nodes[0];
    if (onlyNode.type === "substation") {
      onlyNode.y = (window.drawingFlowDirection === "up") ? 1000 : 80;
      if (typeof renderNetwork === "function") renderNetwork();
      if (typeof resetZoom === "function") resetZoom();
    }
  }

  if (!silent && window.showToast) {
    const isUp = (window.drawingFlowDirection === "up");
    showToast(isUp ? "⬆️ تم ضبط اتجاه الرسم: من أسفل لأعلى" : "⬇️ تم ضبط اتجاه الرسم: من أعلى لأسفل", "info");
  }
}

function flipDrawingVerticalLayout() {
  if (!currentProject || !currentProject.nodes || currentProject.nodes.length === 0) {
    toggleDrawingDirection();
    return;
  }

  saveHistoryState();
  const nodes = currentProject.nodes;
  let minY = Infinity, maxY = -Infinity;
  nodes.forEach(n => {
    if (n.y < minY) minY = n.y;
    if (n.y > maxY) maxY = n.y;
  });

  const midY = (minY + maxY) / 2;
  nodes.forEach(n => {
    n.y = Math.round(2 * midY - n.y);
  });

  if (currentProject.sections) {
    currentProject.sections.forEach(sec => {
      if (sec.direction === "up") sec.direction = "down";
      else if (sec.direction === "down") sec.direction = "up";
      if (typeof sec.deflection_dy === "number") {
        sec.deflection_dy = -sec.deflection_dy;
      }
    });
  }

  // عكس الاتجاه المرجعي ليتطابق مع الرسم الجديد
  window.drawingFlowDirection = (window.drawingFlowDirection === "up") ? "down" : "up";
  localStorage.setItem("sld_drawing_direction", window.drawingFlowDirection);
  updateDrawingDirectionUI();

  if (typeof renderNetwork === "function") renderNetwork();
  if (typeof fitToScreen === "function") fitToScreen();
  showToast(`🔃 تم عكس اتجاه المخطط رأساً على عقب (${window.drawingFlowDirection === 'up' ? 'من أسفل لأعلى ⬆️' : 'من أعلى لأسفل ⬇️'}) بنجاح!`, "success");
}

// مصفوفة سجل التراجع (Undo History Stack)
const historyStack = [];
const MAX_HISTORY = 40;

function saveHistoryState() {
  window._lastLocalEditTime = Date.now();
  if (!currentProject) return;
  const snapshot = JSON.stringify(currentProject);
  historyStack.push(snapshot);
  if (historyStack.length > MAX_HISTORY) {
    historyStack.shift();
  }
}

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-10px)";
    setTimeout(() => { toast.remove(); }, 300);
  }, 2500);
}
window.showToast = showToast;

// حفظ المخطط بشكل دائم ومؤمن 100% يمنع الحذف أو التراجع عند التحديث أو البث
async function saveCurrentProject() {
  if (window.hasPermission && !window.hasPermission('btn_save')) {
    showToast("⛔ ليس لديك صلاحية حفظ المخطط", "error");
    return;
  }
  if (!currentProject) return;

  const now = Date.now();
  currentProject.user_saved_at = now;
  currentProject.saved_at = now;
  currentProject.timestamp = now;
  if (!currentProject.id) {
    currentProject.id = "proj_" + now;
  }

  // 1. حفظ فوري محكم في التخزين المحلي للإدارة وللمتصفح
  const curAdmin = getCurrentAdminName();
  const curKey = curAdmin.trim().replace(/\s+/g, '_');
  saveFeederForAdmin(currentProject, curAdmin);
  try {
    localStorage.setItem("sld_saved_feeder", JSON.stringify(currentProject));
    localStorage.setItem("sld_proj_" + currentProject.id, JSON.stringify(currentProject));
    localStorage.setItem("sld_saved_time_" + curKey, String(now));
    localStorage.setItem("sld_authoritative_save_time", String(now));
  } catch(e) {}

  const ok = await saveProjectToStorage(currentProject);

  // 2. رفع مباشر وفوري لسحابة Firebase واعتماده كسجل موثوق
  if (window.pushDrawingToFirebase) {
    try { window.pushDrawingToFirebase(currentProject, 'user_explicit_save'); } catch(_) {}
  }

  if (window.logActivity) {
    try { logActivity("save_project", `${currentProject.name || currentProject.id || '?'}`); } catch(_) {}
  }

  showToast(`💾 تم حفظ المخطط [${currentProject.name || 'المحدد'}] بنجاح (محلياً وسحابياً)، ولن يُحذف أو يتغير!`, "success");
}

// التراجع
function undoLastStep() {
  if (window.hasPermission && !window.hasPermission('btn_undo')) {
    showToast("⛔ ليس لديك صلاحية التراجع عن الخطوات", "error");
    return;
  }
  if (historyStack.length > 0) {
    const prevSnapshot = historyStack.pop();
    currentProject = JSON.parse(prevSnapshot);
    if (window.clearSelection) clearSelection();
    updateFeederInputs();
    renderNetwork();
    showToast("↩️ تم التراجع عن الخطوة السابقة!", "warning");
  } else {
    if (currentProject && currentProject.sections.length > 0) {
      saveHistoryState();
      const removedSec = currentProject.sections.pop();
      const toNodeId = removedSec.to_node;
      const hasOtherConnections = currentProject.sections.some(s => s.from_node === toNodeId || s.to_node === toNodeId);
      if (!hasOtherConnections && currentProject.nodes.length > 1) {
        currentProject.nodes = currentProject.nodes.filter(n => n.id !== toNodeId);
      }
      if (window.clearSelection) clearSelection();
      renderNetwork();
      showToast("↩️ تم التراجع وحذف آخر خطوة!", "warning");
    } else {
      showToast("ℹ️ لا توجد خطوات سابقة للتراجع عنها", "info");
    }
  }
}

// ─── تعديل خصائص عناصر وخطوط المخطط الشامل ─────────────────────────────────
let currentEditTarget = null; // { type: 'node' | 'section', id: string }

function handleEditAction() {
  if (selectedElement) {
    openEditElementModal(selectedElement.type, selectedElement.id);
  } else {
    showToast("💡 يُرجى تحديد عنصر من الرسم أولاً بالضغط عليه ثم الضغط على تعديل (أو النقر المزدوج على أي عنصر)", "info");
  }
}

function switchFromEditToDelete() {
  if (!currentEditTarget) return;
  const target = { ...currentEditTarget };
  closeEditElementModal();
  openSmartDeleteModal(target.type, target.id);
}

function switchFromDeleteToEdit() {
  if (!smartDeleteTarget) return;
  const target = { ...smartDeleteTarget };
  closeSmartDeleteModal();
  openEditElementModal(target.type, target.id);
}

let originalNodeState = null; // { id, x, y, dir, direction }

function closeEditElementModal() {
  const modal = document.getElementById("edit-element-modal");
  if (modal) modal.classList.add("hidden");
  if (originalNodeState && currentProject) {
    const node = currentProject.nodes.find(n => n.id === originalNodeState.id);
    if (node) {
      node.x = originalNodeState.x;
      node.y = originalNodeState.y;
      if (originalNodeState.dir !== undefined) node.dir = originalNodeState.dir;
      if (originalNodeState.direction !== undefined) node.direction = originalNodeState.direction;
      renderNetwork();
    }
  }
  originalNodeState = null;
  currentEditTarget = null;
}

// تعديل إحداثيات النود يدوياً مع المعاينة الفورية
function onEditNodeCoordInput() {
  if (!currentEditTarget || currentEditTarget.type !== "node" || !currentProject) return;
  const xInput = document.getElementById("edit-node-x");
  const yInput = document.getElementById("edit-node-y");
  if (!xInput || !yInput) return;
  const valX = parseFloat(xInput.value);
  const valY = parseFloat(yInput.value);
  if (!isNaN(valX) && !isNaN(valY)) {
    const node = currentProject.nodes.find(n => n.id === currentEditTarget.id);
    if (node) {
      node.x = valX;
      node.y = valY;
      renderNetwork();
    }
  }
}

// إزاحة النود (سكينة، كشك، محول، نقطة) في مساحة الرسم بخطوات محددة
function nudgeNodePosition(stepX, stepY) {
  const xInput = document.getElementById("edit-node-x");
  const yInput = document.getElementById("edit-node-y");
  const stepSelect = document.getElementById("edit-node-step");
  const step = stepSelect ? (parseInt(stepSelect.value, 10) || 40) : 40;
  if (!xInput || !yInput) return;
  const currX = parseFloat(xInput.value) || 0;
  const currY = parseFloat(yInput.value) || 0;
  const newX = Math.round(currX + stepX * step);
  const newY = Math.round(currY + stepY * step);
  xInput.value = newX;
  yInput.value = newY;

  if (currentEditTarget && currentEditTarget.type === "node" && currentProject) {
    const node = currentProject.nodes.find(n => n.id === currentEditTarget.id);
    if (node) {
      node.x = newX;
      node.y = newY;
      renderNetwork();
    }
  }
}

// تغيير اتجاه السكينة أو الكشك أو المحول مع التحديث الفوري
function onEditNodeDirectionChange() {
  if (!currentEditTarget || currentEditTarget.type !== "node" || !currentProject) return;
  const dirSelect = document.getElementById("edit-node-direction");
  if (!dirSelect) return;
  const newDir = dirSelect.value;
  const node = currentProject.nodes.find(n => n.id === currentEditTarget.id);
  if (!node) return;

  if (node.type === "switch") {
    node.dir = newDir;
    node.direction = (newDir === "left" || newDir === "right") ? "horizontal" : "vertical";
  } else if (node.type === "transformer" || node.type === "kiosk") {
    node.direction = newDir;
  }
  renderNetwork();
}

// حذف السكينة مباشرة وإعادة توصيل المسار تلقائياً
function deleteSwitchDirectly(nodeId) {
  if (!currentProject) return;
  const node = currentProject.nodes.find(n => n.id === nodeId);
  if (!node) return;

  if (confirm(`هل أنت متأكد من رغبتك في حذف السكينة (${node.name || nodeId})؟\nسيتم دمج الخطين وتوصيل المسار تلقائياً دون انقطاع التغذية.`)) {
    originalNodeState = null;
    closeEditElementModal();
    executeSmartDelete("node", nodeId, "auto_adjust");
  }
}

// حذف الكشك أو المحول مباشرة وضبط النود
function deleteTransformerOrKioskDirectly(nodeId) {
  if (!currentProject) return;
  const node = currentProject.nodes.find(n => n.id === nodeId);
  if (!node) return;

  const typeName = (node.type === "kiosk") ? "الكشك" : "المحول";
  if (confirm(`هل أنت متأكد من رغبتك في حذف ${typeName} (${node.name || nodeId})؟\nسيتم ضبط المخطط تلقائياً.`)) {
    originalNodeState = null;
    closeEditElementModal();
    executeSmartDelete("node", nodeId, "auto_adjust");
  }
}

function openEditElementModal(type, id) {
  if (!currentProject) return;
  if (type === "annotation") {
    openEditAnnotationModal(id);
    return;
  }
  currentEditTarget = { type, id };

  const modal = document.getElementById("edit-element-modal");
  const titleEl = document.getElementById("edit-element-title");
  const summaryEl = document.getElementById("edit-element-summary");
  const fieldsEl = document.getElementById("edit-element-fields");
  if (!modal || !titleEl || !summaryEl || !fieldsEl) return;

  if (type === "section") {
    const sec = (currentProject.sections || []).find(s => s.id === id);
    if (!sec) return;

    titleEl.innerHTML = `<span>✏️</span> <span>تعديل خصائص الخط / الكابل: ${sec.id}</span>`;
    summaryEl.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <span style="font-weight:bold; color:#60A5FA;">خط المسار: [${sec.from_node} ➔ ${sec.to_node}]</span>
          <div style="font-size:11.5px; color:#94A3B8; margin-top:2px;">
            المعرف: <b>${sec.id}</b> | النوع الحالي: <b>${sec.type} ${sec.size || ''}</b>
          </div>
        </div>
        <span class="badge" style="background:#1E3A8A; color:#93C5FD; padding:4px 8px; border-radius:4px; font-size:11px;">
          ${sec.length} متر
        </span>
      </div>
    `;

    const isOverhead = (sec.type === "هوائي" || sec.type === "overhead");
    const conductorSizes = ["35", "50", "70", "95", "120", "150", "185", "240", "300", "400"];
    const currentSize = String(sec.size || "120").replace(/[^0-9]/g, "");

    const sizeOptions = conductorSizes.map(sz => 
      `<option value="${sz}" ${sz === currentSize ? 'selected' : ''}>${sz} مم²</option>`
    ).join("");

    fieldsEl.innerHTML = `
      <div class="form-group">
        <label style="font-size:12px; font-weight:bold; color:#E2E8F0; margin-bottom:4px; display:block;">اسم أو وصف الخط / التفريعة:</label>
        <input type="text" id="edit-sec-name" class="form-control" value="${sec.name || ''}" placeholder="مثال: تفريعة محول الأمل" style="background:#1E293B; border:1px solid #475569; color:#F8FAFC; padding:8px 10px; border-radius:6px; width:100%;">
      </div>

      <div class="form-group">
        <label style="font-size:12px; font-weight:bold; color:#38BDF8; margin-bottom:4px; display:block;">
          📏 الطول الفعلي للخط (بالمتر):
          <span style="font-size:10.5px; font-weight:normal; color:#94A3B8;">(يُحفظ بدقة ويستخدم في حسابات الفقد وهبوط الجهد)</span>
        </label>
        <input type="number" id="edit-sec-length" class="form-control" min="1" step="1" value="${sec.length || 100}" required style="background:#1E293B; border:1px solid #38BDF8; color:#F8FAFC; padding:8px 10px; border-radius:6px; width:100%; font-size:14px; font-weight:bold;">
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
        <div class="form-group">
          <label style="font-size:12px; font-weight:bold; color:#E2E8F0; margin-bottom:4px; display:block;">نوع الخط:</label>
          <select id="edit-sec-type" class="form-control" style="background:#1E293B; border:1px solid #475569; color:#F8FAFC; padding:8px 10px; border-radius:6px; width:100%;">
            <option value="هوائي" ${isOverhead ? 'selected' : ''}>⚡ هوائي (Overhead)</option>
            <option value="كابل" ${!isOverhead ? 'selected' : ''}>🔌 كابل أرضي (Cable)</option>
          </select>
        </div>

        <div class="form-group">
          <label style="font-size:12px; font-weight:bold; color:#E2E8F0; margin-bottom:4px; display:block;">مقطع الموصل:</label>
          <select id="edit-sec-size" class="form-control" style="background:#1E293B; border:1px solid #475569; color:#F8FAFC; padding:8px 10px; border-radius:6px; width:100%;">
            ${sizeOptions}
          </select>
        </div>
      </div>

      <div style="background:#1E293B; border:1px solid #334155; border-radius:6px; padding:10px; margin-top:4px;">
        <label style="display:flex; align-items:center; gap:8px; font-size:12.5px; font-weight:bold; color:#E2E8F0; cursor:pointer;">
          <input type="checkbox" id="edit-sec-has-switch" ${sec.has_switch ? 'checked' : ''} onchange="document.getElementById('edit-sec-switch-details').style.display = this.checked ? 'block' : 'none'">
          <span>يوجد سكينة فصل وتوصيل على هذا الخط</span>
        </label>
        <div id="edit-sec-switch-details" style="margin-top:10px; display:${sec.has_switch ? 'block' : 'none'};">
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
            <div>
              <label style="font-size:11px; color:#94A3B8; display:block; margin-bottom:3px;">اسم السكينة:</label>
              <input type="text" id="edit-sec-switch-name" class="form-control" value="${sec.switch_name || ''}" placeholder="كود السكينة" style="background:#0F172A; border:1px solid #475569; color:#F8FAFC; padding:6px 8px; border-radius:4px; width:100%; font-size:12px;">
            </div>
            <div>
              <label style="font-size:11px; color:#94A3B8; display:block; margin-bottom:3px;">حالة السكينة:</label>
              <select id="edit-sec-switch-state" class="form-control" style="background:#0F172A; border:1px solid #475569; color:#F8FAFC; padding:6px 8px; border-radius:4px; width:100%; font-size:12px;">
                <option value="closed" ${(sec.switch_state !== 'open') ? 'selected' : ''}>🟢 مغلقة (متصل)</option>
                <option value="open" ${(sec.switch_state === 'open') ? 'selected' : ''}>🔴 مفتوحة (مفصول)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- انحراف وتعديل مسار الخط للتنسيق مع الرسم -->
      <div style="background:#1E293B; border:1px solid #334155; border-radius:6px; padding:10px; margin-top:4px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
          <label style="font-size:12px; font-weight:bold; color:#38BDF8; margin:0;">
            ↕ انحراف مسار الخط (بكسل):
          </label>
          <button type="button" class="btn btn-outline" style="padding:2px 8px; font-size:11px; border-color:#64748B; color:#94A3B8;" onclick="document.getElementById('edit-sec-deflect').value = 0;">↺ مسار مستقيم</button>
        </div>
        <input type="number" id="edit-sec-deflect" class="form-control" step="5" value="${sec.deflection_offset || 0}" placeholder="0 = مستقيم، موجب = لأسفل، سالب = لأعلى" style="background:#0F172A; border:1px solid #475569; color:#F8FAFC; padding:6px 10px; border-radius:4px; width:100%; font-size:12px;">
        <div style="font-size:10.5px; color:#94A3B8; margin-top:4px;">
          💡 يمكنك أيضاً سحب الخط أو مقبض الانحراف (↕) مباشرة بالماوس في مساحة الرسم في أي وقت.
        </div>
      </div>

      <!-- توجيه زاوية الكابل القائمة 90° في أي اتجاه -->
      <div style="background:#1E293B; border:1px solid #0284C7; border-radius:6px; padding:10px; margin-top:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <label style="font-size:12px; font-weight:bold; color:#38BDF8; margin:0; display:flex; align-items:center; gap:6px;">
            <span>📐</span> <span>توجيه مسار وزاوية الكابل 90°:</span>
          </label>
          <button type="button" class="btn btn-outline" style="padding:2px 8px; font-size:11px; border-color:#0284C7; color:#38BDF8;" onclick="toggleSection90DegreeCorner('${sec.id}')">
            🔄 قلب الزاوية 90°
          </button>
        </div>

        <div class="form-group" style="margin-bottom:8px;">
          <label style="font-size:11px; color:#CBD5E1; display:block; margin-bottom:3px;">نمط الزاوية القائمة 90 درجة:</label>
          <select id="edit-sec-corner-style" class="form-control" style="background:#0F172A; border:1px solid #475569; color:#F8FAFC; padding:6px 8px; border-radius:4px; width:100%; font-size:12px;">
            <option value="auto" ${(!sec.corner_style || sec.corner_style === 'auto') ? 'selected' : ''}>🤖 تلقائي ذكي حسب وضع النودات والمحطة</option>
            <option value="hv" ${sec.corner_style === 'hv' ? 'selected' : ''}>↔️ ➔ ↕️ أفقي ثم رأسي (Horizontal ➔ Vertical)</option>
            <option value="vh" ${sec.corner_style === 'vh' ? 'selected' : ''}>↕️ ➔ ↔️ رأسي ثم أفقي (Vertical ➔ Horizontal)</option>
          </select>
        </div>

        <div>
          <label style="font-size:11px; color:#CBD5E1; display:block; margin-bottom:4px;">توجيه سريع للكابل بزاوية 90°:</label>
          <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:6px;">
            <button type="button" class="btn btn-outline" style="padding:4px 6px; font-size:11px; border-color:#475569; color:#E2E8F0;" onclick="orientSectionDirection('${sec.id}', 'down')">⬇️ أسفل</button>
            <button type="button" class="btn btn-outline" style="padding:4px 6px; font-size:11px; border-color:#475569; color:#E2E8F0;" onclick="orientSectionDirection('${sec.id}', 'up')">⬆️ أعلى</button>
            <button type="button" class="btn btn-outline" style="padding:4px 6px; font-size:11px; border-color:#475569; color:#E2E8F0;" onclick="orientSectionDirection('${sec.id}', 'right')">➡️ يمين</button>
            <button type="button" class="btn btn-outline" style="padding:4px 6px; font-size:11px; border-color:#475569; color:#E2E8F0;" onclick="orientSectionDirection('${sec.id}', 'left')">⬅️ شمال</button>
          </div>
        </div>
      </div>
    `;
  } else if (type === "node") {
    const node = (currentProject.nodes || []).find(n => n.id === id);
    if (!node) return;

    originalNodeState = {
      id: node.id,
      x: node.x,
      y: node.y,
      dir: node.dir,
      direction: node.direction
    };

    let typeTitle = "عنصر المخطط";
    let icon = "📍";
    if (node.type === "transformer") { typeTitle = "المحول المعلق"; icon = "🔄"; }
    else if (node.type === "kiosk") { typeTitle = "كشك المحولات"; icon = "🏢"; }
    else if (node.type === "switch") { typeTitle = "السكينة الهوائية / القاطع"; icon = "⚡"; }
    else if (node.type === "substation") { typeTitle = "محطة المحولات الرئيسية (المصدر)"; icon = "⚡"; }
    else if (node.type === "rmu") { typeTitle = "وحدة الربط الحلقي RMU"; icon = "🔲"; }
    else if (node.type === "avr") { typeTitle = "منظم الجهد AVR"; icon = "🔋"; }

    titleEl.innerHTML = `<span>✏️</span> <span>تعديل ${typeTitle}: ${node.id}</span>`;
    summaryEl.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <span style="font-weight:bold; color:#FBBF24;">${icon} ${typeTitle}</span>
          <div style="font-size:11.5px; color:#94A3B8; margin-top:2px;">
            كود العقدة: <b>${node.id}</b> | الاسم الحالي: <b>${node.name || 'بدون مسمى'}</b>
          </div>
        </div>
        <span class="badge" style="background:#374151; color:#F3F4F6; padding:4px 8px; border-radius:4px; font-size:11px;">
          (${Math.round(node.x)}, ${Math.round(node.y)})
        </span>
      </div>
    `;

    let specificFieldsHTML = "";
    let directDeleteButtonHTML = "";

    if (node.type === "transformer" || node.type === "kiosk") {
      const capList = [50, 100, 160, 200, 250, 315, 500, 630, 800, 1000, 1500, 2000];
      const currentCap = parseInt(node.capacity, 10) || 100;
      let capOptions = capList.map(c => 
        `<option value="${c}" ${c === currentCap ? 'selected' : ''}>${c} kVA</option>`
      ).join("");
      if (!capList.includes(currentCap)) {
        capOptions += `<option value="${currentCap}" selected>${currentCap} kVA</option>`;
      }

      const inSec = (currentProject.sections || []).find(s => s.to_node === node.id);
      let inSecHTML = "";
      if (inSec) {
        inSecHTML = `
          <div style="background:#1E293B; border:1px solid #334155; border-radius:6px; padding:10px; margin-top:8px;">
            <label style="font-size:12px; font-weight:bold; color:#38BDF8; margin-bottom:6px; display:block;">
              ⚡ خط / كابل التغذية الواصل للمحول (${inSec.from_node} ➔ ${inSec.to_node}):
            </label>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
              <div>
                <label style="font-size:11px; color:#94A3B8; display:block; margin-bottom:2px;">الطول (متر):</label>
                <input type="number" id="edit-node-insec-len" class="form-control" value="${inSec.length || 50}" min="1" style="background:#0F172A; border:1px solid #475569; color:#F8FAFC; padding:6px 8px; border-radius:4px; width:100%; font-weight:bold;">
              </div>
              <div>
                <label style="font-size:11px; color:#94A3B8; display:block; margin-bottom:2px;">النوع:</label>
                <select id="edit-node-insec-type" class="form-control" style="background:#0F172A; border:1px solid #475569; color:#F8FAFC; padding:6px 8px; border-radius:4px; width:100%;">
                  <option value="كابل" ${inSec.type === 'كابل' ? 'selected' : ''}>🔌 كابل أرضي</option>
                  <option value="هوائي" ${inSec.type === 'هوائي' ? 'selected' : ''}>⚡ خط هوائي</option>
                </select>
              </div>
            </div>
          </div>
        `;
      }

      specificFieldsHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
          <div class="form-group">
            <label style="font-size:12px; font-weight:bold; color:#4ADE80; margin-bottom:4px; display:block;">القدرة الاسمية (kVA):</label>
            <select id="edit-node-capacity" class="form-control" style="background:#1E293B; border:1px solid #475569; color:#F8FAFC; padding:8px 10px; border-radius:6px; width:100%;">
              ${capOptions}
            </select>
          </div>

          <div class="form-group">
            <label style="font-size:12px; font-weight:bold; color:#FBBF24; margin-bottom:4px; display:block;">نسبة التحميل عند الذروة (%):</label>
            <input type="number" id="edit-node-loading" class="form-control" min="0" max="150" step="1" value="${node.loading_pct != null ? node.loading_pct : 70}" style="background:#1E293B; border:1px solid #475569; color:#F8FAFC; padding:8px 10px; border-radius:6px; width:100%;">
          </div>
        </div>

        <div class="form-group" style="margin-top:6px;">
          <label style="font-size:12px; font-weight:bold; color:#E2E8F0; margin-bottom:4px; display:block;">اتجاه تفريع ${node.type === 'kiosk' ? 'الكشك' : 'المحول'} بالنسبة لنقطة الأخذ:</label>
          <select id="edit-node-direction" class="form-control" onchange="onEditNodeDirectionChange()" style="background:#1E293B; border:1px solid #475569; color:#F8FAFC; padding:8px 10px; border-radius:6px; width:100%; font-weight:bold;">
            <option value="up" ${(node.direction === "up") ? 'selected' : ''}>⬆️ أعلى</option>
            <option value="down" ${(node.direction === "down") ? 'selected' : ''}>⬇️ أسفل</option>
            <option value="right" ${(node.direction === "right") ? 'selected' : ''}>➡️ يمين</option>
            <option value="left" ${(node.direction === "left") ? 'selected' : ''}>⬅️ شمال / يسار</option>
          </select>
        </div>

        ${node.type === "kiosk" ? `
        <div class="form-group" style="margin-top:8px; background:rgba(30,58,138,0.25); border:1px solid #2563EB; border-radius:6px; padding:10px;">
          <label style="font-size:12px; font-weight:bold; color:#60A5FA; margin-bottom:4px; display:block;">
            ⚡ نقطة خروج الكابل للكشك الآخر (المسار الحلقي):
          </label>
          <select id="edit-node-outgoing-terminal" class="form-control" style="background:#0F172A; border:1px solid #475569; color:#F8FAFC; padding:8px 10px; border-radius:6px; width:100%; font-weight:bold; font-size:12px;">
            <option value="bottom" ${node.outgoing_terminal !== 'top' ? 'selected' : ''}>⬇️ خروج من أسفل القاعدة (الافتراضي عند الصعود لمنع تقاطع الكابلات)</option>
            <option value="top" ${node.outgoing_terminal === 'top' ? 'selected' : ''}>⬆️ خروج من أعلى القاعدة (يخرج مثل حرف L ومكمل لأعلى)</option>
          </select>
          <div style="font-size:11px; color:#94A3B8; margin-top:4px;">
            💡 يتيح لك الاختيار بين الخروج من أسفل (لتسهيل دخول الخط الآخر من أعلى دون تقاطع) أو الخروج كحرف L مكمل لأعلى.
          </div>
        </div>
        ` : ''}

        ${inSecHTML}
      `;

      directDeleteButtonHTML = `
        <div style="margin-top:14px; padding-top:12px; border-top:1px solid #334155;">
          <button type="button" class="btn btn-block" style="background:#7F1D1D; color:#FECACA; border:1px solid #DC2626; font-weight:bold; padding:8px 12px; border-radius:6px; display:flex; align-items:center; justify-content:center; gap:8px; width:100%; cursor:pointer;" onclick="deleteTransformerOrKioskDirectly('${node.id}')">
            <span>🗑️</span> <span>حذف ${node.type === 'kiosk' ? 'الكشك' : 'المحول'} وضبط المخطط</span>
          </button>
        </div>
      `;
    } else if (node.type === "switch") {
      const isClosed = (node.state !== "open");
      const curDir = node.dir || (node.direction === "horizontal" ? "right" : "down");
      specificFieldsHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
          <div class="form-group">
            <label style="font-size:12px; font-weight:bold; color:#E2E8F0; margin-bottom:4px; display:block;">حالة السكينة التشغيلية:</label>
            <select id="edit-node-state" class="form-control" style="background:#1E293B; border:1px solid #475569; color:#F8FAFC; padding:8px 10px; border-radius:6px; width:100%; font-weight:bold;">
              <option value="closed" ${isClosed ? 'selected' : ''}>🟢 مغلقة (توصيل)</option>
              <option value="open" ${!isClosed ? 'selected' : ''}>🔴 مفتوحة (عزل وفصل)</option>
            </select>
          </div>

          <div class="form-group">
            <label style="font-size:12px; font-weight:bold; color:#E2E8F0; margin-bottom:4px; display:block;">اتجاه ومسار السكينة:</label>
            <select id="edit-node-direction" class="form-control" onchange="onEditNodeDirectionChange()" style="background:#1E293B; border:1px solid #475569; color:#F8FAFC; padding:8px 10px; border-radius:6px; width:100%; font-weight:bold;">
              <option value="down" ${(curDir === "down") ? 'selected' : ''}>⬇️ رأسي لأسفل</option>
              <option value="up" ${(curDir === "up") ? 'selected' : ''}>⬆️ رأسي لأعلى</option>
              <option value="right" ${(curDir === "right") ? 'selected' : ''}>➡️ أفقي لليمين</option>
              <option value="left" ${(curDir === "left") ? 'selected' : ''}>⬅️ أفقي لليسار</option>
            </select>
          </div>
        </div>
      `;

      directDeleteButtonHTML = `
        <div style="margin-top:14px; padding-top:12px; border-top:1px solid #334155;">
          <button type="button" class="btn btn-block" style="background:#7F1D1D; color:#FECACA; border:1px solid #DC2626; font-weight:bold; padding:8px 12px; border-radius:6px; display:flex; align-items:center; justify-content:center; gap:8px; width:100%; cursor:pointer;" onclick="deleteSwitchDirectly('${node.id}')">
            <span>🗑️</span> <span>حذف هذه السكينة وإعادة توصيل المسار تلقائياً</span>
          </button>
          <div style="font-size:11px; color:#94A3B8; margin-top:5px; text-align:center;">
            ⚡ سيتم إزالة السكينة ودمج الخطين وتوصيل التغذية دون أي انقطاع
          </div>
        </div>
      `;
    } else if (node.type === "substation") {
      const currentVolt = node.voltage_kv || (currentProject.network_voltage_kv || 11);
      specificFieldsHTML = `
        <div class="form-group">
          <label style="font-size:12px; font-weight:bold; color:#E2E8F0; margin-bottom:4px; display:block;">جهد تشغيل المغذي (kV):</label>
          <select id="edit-node-voltage" class="form-control" style="background:#1E293B; border:1px solid #475569; color:#F8FAFC; padding:8px 10px; border-radius:6px; width:100%;">
            <option value="11" ${currentVolt == 11 ? 'selected' : ''}>11 ك.ف (11 kV)</option>
            <option value="22" ${currentVolt == 22 ? 'selected' : ''}>22 ك.ف (22 kV)</option>
            <option value="33" ${currentVolt == 33 ? 'selected' : ''}>33 ك.ف (33 kV)</option>
          </select>
        </div>
      `;
    }

    // قسم تعديل الموضع والإحداثيات (لأي نود: سكينة، كشك، محول، نقطة تفريع)
    const positionControlsHTML = `
      <div style="background:#1E293B; border:1px solid #3B82F6; border-radius:8px; padding:12px; margin-top:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <label style="font-size:12.5px; font-weight:bold; color:#60A5FA; margin:0; display:flex; align-items:center; gap:6px;">
            <span>📍</span> <span>موضع وإحداثيات العنصر في مساحة الرسم:</span>
          </label>
          <span style="font-size:11px; color:#94A3B8;">(${Math.round(node.x)}, ${Math.round(node.y)})</span>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:10px;">
          <div>
            <label style="font-size:11px; color:#CBD5E1; display:block; margin-bottom:3px;">المحور الأفقي X (بكسل):</label>
            <input type="number" id="edit-node-x" class="form-control" value="${Math.round(node.x)}" oninput="onEditNodeCoordInput()" style="background:#0F172A; border:1px solid #475569; color:#F8FAFC; padding:6px 10px; border-radius:6px; width:100%; font-weight:bold; font-size:13px;">
          </div>
          <div>
            <label style="font-size:11px; color:#CBD5E1; display:block; margin-bottom:3px;">المحور الرأسي Y (بكسل):</label>
            <input type="number" id="edit-node-y" class="form-control" value="${Math.round(node.y)}" oninput="onEditNodeCoordInput()" style="background:#0F172A; border:1px solid #475569; color:#F8FAFC; padding:6px 10px; border-radius:6px; width:100%; font-weight:bold; font-size:13px;">
          </div>
        </div>

        <div style="background:#0F172A; border-radius:6px; padding:8px 10px; border:1px solid #334155;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span style="font-size:11px; color:#94A3B8;">إزاحة وتحريك سريع في مساحة الرسم:</span>
            <div style="display:flex; align-items:center; gap:4px; font-size:11px; color:#94A3B8;">
              <span>الخطوة:</span>
              <select id="edit-node-step" style="background:#1E293B; border:1px solid #475569; color:#F8FAFC; border-radius:4px; padding:2px 4px; font-size:11px;">
                <option value="20">20 بكسل</option>
                <option value="40" selected>40 بكسل</option>
                <option value="80">80 بكسل</option>
              </select>
            </div>
          </div>
          <div style="display:flex; justify-content:center; align-items:center; gap:6px;">
            <button type="button" class="btn btn-outline" style="padding:4px 12px; font-size:11.5px; border-color:#475569; color:#E2E8F0;" onclick="nudgeNodePosition(0, -1)" title="تحريك لأعلى">⬆️ أعلى</button>
            <button type="button" class="btn btn-outline" style="padding:4px 12px; font-size:11.5px; border-color:#475569; color:#E2E8F0;" onclick="nudgeNodePosition(0, 1)" title="تحريك لأسفل">⬇️ أسفل</button>
            <button type="button" class="btn btn-outline" style="padding:4px 12px; font-size:11.5px; border-color:#475569; color:#E2E8F0;" onclick="nudgeNodePosition(-1, 0)" title="تحريك لليسار">⬅️ يسار</button>
            <button type="button" class="btn btn-outline" style="padding:4px 12px; font-size:11.5px; border-color:#475569; color:#E2E8F0;" onclick="nudgeNodePosition(1, 0)" title="تحريك لليمين">➡️ يمين</button>
          </div>
        </div>
      </div>
    `;

    fieldsEl.innerHTML = `
      <div class="form-group">
        <label style="font-size:12px; font-weight:bold; color:#E2E8F0; margin-bottom:4px; display:block;">اسم العنصر / المسمى:</label>
        <input type="text" id="edit-node-name" class="form-control" value="${node.name || ''}" placeholder="اسم العنصر" required style="background:#1E293B; border:1px solid #475569; color:#F8FAFC; padding:8px 10px; border-radius:6px; width:100%;">
      </div>
      ${specificFieldsHTML}
      ${positionControlsHTML}
      ${directDeleteButtonHTML}
    `;
  }

  modal.classList.remove("hidden");
}

function saveElementEdits(event) {
  if (event) event.preventDefault();
  if (!currentProject || !currentEditTarget) return;

  const { type, id } = currentEditTarget;

  if (type === "section") {
    const sec = (currentProject.sections || []).find(s => s.id === id);
    if (!sec) return;

    const nameInput = document.getElementById("edit-sec-name");
    const lengthInput = document.getElementById("edit-sec-length");
    const typeInput = document.getElementById("edit-sec-type");
    const sizeInput = document.getElementById("edit-sec-size");
    const hasSwitchInput = document.getElementById("edit-sec-has-switch");
    const switchNameInput = document.getElementById("edit-sec-switch-name");
    const switchStateInput = document.getElementById("edit-sec-switch-state");

    if (nameInput) sec.name = nameInput.value.trim() || sec.name;
    if (lengthInput) {
      const val = parseInt(lengthInput.value, 10);
      if (!isNaN(val) && val > 0) sec.length = val;
    }
    if (typeInput) sec.type = typeInput.value;
    if (sizeInput) sec.size = sizeInput.value;

    if (hasSwitchInput && hasSwitchInput.checked) {
      sec.has_switch = true;
      sec.switch_name = switchNameInput ? switchNameInput.value.trim() : (sec.switch_name || `سكينة ${sec.id}`);
      sec.switch_state = switchStateInput ? switchStateInput.value : "closed";
    } else {
      delete sec.has_switch;
      delete sec.switch_name;
      delete sec.switch_state;
    }

    const deflectInput = document.getElementById("edit-sec-deflect");
    if (deflectInput) {
      const dVal = parseInt(deflectInput.value, 10);
      sec.deflection_offset = isNaN(dVal) ? 0 : dVal;
    }

    const cornerStyleInput = document.getElementById("edit-sec-corner-style");
    if (cornerStyleInput) {
      const cVal = cornerStyleInput.value;
      if (cVal === "auto" || !cVal) {
        delete sec.corner_style;
      } else {
        sec.corner_style = cVal;
      }
    }

    if (selectedElement && selectedElement.id === id) {
      selectedElement.label = `${sec.type} ${sec.size} (${sec.length}م) [${sec.from_node} ➔ ${sec.to_node}]`;
    }
  } else if (type === "node") {
    const node = (currentProject.nodes || []).find(n => n.id === id);
    if (!node) return;

    originalNodeState = null; // تثبيت التعديل وعدم التراجع عنه عند الإغلاق

    const nameInput = document.getElementById("edit-node-name");
    if (nameInput) node.name = nameInput.value.trim();

    // حفظ الموضع والإحداثيات المعدلة
    const xInput = document.getElementById("edit-node-x");
    const yInput = document.getElementById("edit-node-y");
    if (xInput && yInput) {
      const newX = parseFloat(xInput.value);
      const newY = parseFloat(yInput.value);
      if (!isNaN(newX) && !isNaN(newY)) {
        node.x = newX;
        node.y = newY;
      }
    }

    // حفظ الاتجاه المعدل للسكينة أو الكشك أو المحول
    const dirInput = document.getElementById("edit-node-direction");
    if (dirInput) {
      const dVal = dirInput.value;
      if (node.type === "switch") {
        node.dir = dVal;
        node.direction = (dVal === "left" || dVal === "right") ? "horizontal" : "vertical";
      } else if (node.type === "transformer" || node.type === "kiosk") {
        node.direction = dVal;
      }
    }

    // تعديل طول ونوع خط التغذية الواصل للمحول/الكشك إن وجد
    const inSecLenInput = document.getElementById("edit-node-insec-len");
    const inSecTypeInput = document.getElementById("edit-node-insec-type");
    if (inSecLenInput && inSecTypeInput) {
      const inSec = (currentProject.sections || []).find(s => s.to_node === node.id);
      if (inSec) {
        const lVal = parseFloat(inSecLenInput.value);
        if (!isNaN(lVal) && lVal > 0) inSec.length = lVal;
        inSec.type = inSecTypeInput.value;
      }
    }

    if (node.type === "transformer" || node.type === "kiosk") {
      const capInput = document.getElementById("edit-node-capacity");
      const loadInput = document.getElementById("edit-node-loading");
      if (capInput) {
        const cVal = parseInt(capInput.value, 10);
        if (!isNaN(cVal) && cVal > 0) node.capacity = cVal;
      }
      if (loadInput) {
        const lVal = parseFloat(loadInput.value);
        if (!isNaN(lVal)) node.loading_pct = lVal;
      }
      if (node.type === "kiosk") {
        const outTermInput = document.getElementById("edit-node-outgoing-terminal");
        if (outTermInput) {
          node.outgoing_terminal = outTermInput.value;
        }
      }
    } else if (node.type === "switch") {
      const stateInput = document.getElementById("edit-node-state");
      if (stateInput) node.state = stateInput.value;
    } else if (node.type === "substation") {
      const voltInput = document.getElementById("edit-node-voltage");
      if (voltInput) {
        const vVal = parseFloat(voltInput.value);
        if (!isNaN(vVal)) {
          node.voltage_kv = vVal;
          currentProject.network_voltage_kv = vVal;
        }
      }
    }

    if (selectedElement && selectedElement.id === id) {
      selectedElement.label = node.name || node.id;
    }
  }

  // إعادة الرسم الشامل وحفظ الحالة وتحديث المؤشرات والتحليلات
  renderNetwork();
  if (typeof updateLiveMetrics === "function") updateLiveMetrics();
  if (typeof saveHistoryState === "function") saveHistoryState();

  closeEditElementModal();
  showToast("✅ تم حفظ وتطبيق التعديلات بنجاح دون أي خلل في الرسم", "success");
}

// إجراء الحذف الذكي وضبط النود تلقائياً
let smartDeleteTarget = null; // { type: 'node' | 'section', id: string }

function handleDeleteAction() {
  if (window.hasPermission && !window.hasPermission('btn_delete')) {
    showToast("⛔ ليس لديك صلاحية استخدام زر الحذف", "error");
    return;
  }
  if (selectedElement) {
    openSmartDeleteModal(selectedElement.type, selectedElement.id);
  } else {
    openDeleteOptionsModal();
  }
}

// فتح نافذة الحذف الذكي مع الضبط التلقائي
function openSmartDeleteModal(type, id) {
  if (!currentProject) return;
  smartDeleteTarget = { type, id };

  const modal = document.getElementById("smart-delete-modal");
  const infoBox = document.getElementById("smart-delete-elem-info");
  const planBox = document.getElementById("smart-delete-plan-text");
  const autoBtnText = document.getElementById("btn-smart-delete-autoadjust-text");
  if (!modal || !infoBox || !planBox || !autoBtnText) return;

  if (type === "annotation") {
    const anno = (currentProject.annotations || []).find(a => a.id === id);
    if (!anno) return;
    const cleanSample = (anno.text || '').replace(/\n/g, ' ');
    infoBox.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <span style="font-size:15.5px; font-weight:bold; color:#f59e0b;">📝 كارت تنويه / ملاحظة: ${anno.badgeTitle || 'ملاحظة'}</span>
          <div style="font-size:12.5px; color:#E2E8F0; margin-top:4px;">
            النص: <b style="color:#FDE68A;">${cleanSample.substring(0, 45)}${cleanSample.length > 45 ? '...' : ''}</b>
          </div>
        </div>
      </div>
    `;
    planBox.innerHTML = `سيتم إزالة وحذف كارت التنويه هذا نهائياً من المخطط وإلغاء ظهوره.`;
    autoBtnText.textContent = `🗑️ تأكيد حذف التنويه نهائياً`;
    modal.classList.remove("hidden");
    return;
  }

  if (type === "node") {
    const node = currentProject.nodes.find(n => n.id === id);
    if (!node) return;

    const inSecs = currentProject.sections.filter(s => s.to_node === id);
    const outSecs = currentProject.sections.filter(s => s.from_node === id);
    const allSecs = [...inSecs, ...outSecs];

    let typeLabel = "نقطة تفريع / عمود";
    let icon = "📍";
    if (node.type === "switch") { typeLabel = "سكينة هوائية"; icon = "⚡"; }
    else if (node.type === "transformer") { typeLabel = "محول معلق"; icon = "🔄"; }
    else if (node.type === "kiosk") { typeLabel = "كشك كهربائي"; icon = "🏢"; }
    else if (node.type === "substation") { typeLabel = "محطة المحولات الرئيسية"; icon = "⚡"; }
    else if (node.type === "rmu") { typeLabel = "وحدة ربط حلقي (RMU)"; icon = "🔲"; }
    else if (node.type === "avr") { typeLabel = "منظم جهد (AVR)"; icon = "🔄"; }

    infoBox.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <span style="font-size:15.5px; font-weight:bold; color:#F6E05E;">${icon} ${typeLabel}: ${node.name || node.id}</span>
          <div style="font-size:12px; color:#A0AEC0; margin-top:4px;">
            كود النود: <b style="color:#90CDF4;">${node.id}</b> 
            ${node.capacity ? `| القدرة: <b style="color:#68D391;">${node.capacity} kVA</b>` : ''}
            ${node.state ? `| الحالة: <b>${node.state === 'open' ? 'مفتوحة 🔴' : 'مغلقة 🟢'}</b>` : ''}
          </div>
        </div>
        <span class="badge" style="background:#2C5282; color:#BEE3F8; padding:4px 9px; border-radius:4px; font-size:11px;">عدد الخطوط: ${allSecs.length}</span>
      </div>
    `;

    // تحليل خطة الضبط التلقائي
    if (node.type === "substation") {
      planBox.innerHTML = `⚠️ هذا هو المصدر الرئيسي للمغذي. حذفه سيؤدي لإزالة محطة التغذية.`;
      autoBtnText.textContent = `🗑️ تأكيد حذف محطة التغذية الرئيسية`;
    } else if ((node.type === "transformer" || node.type === "kiosk") && (inSecs.length > 0 && outSecs.length > 0)) {
      // محول/كشك على نفس النود المارة بالخط الرئيسي
      const prevNode = inSecs[0].from_node;
      const nextNode = outSecs[0].to_node;
      planBox.innerHTML = `
        المحول مثبت على النود <b>(${node.id})</b> المارة على مسار الخط الرئيسي بين <b>(${prevNode})</b> و <b>(${nextNode})</b>.<br>
        <span style="color:#68D391; font-weight:bold;">الضبط التلقائي:</span> سيتم إزالة المحول وقدرته وحمله بالكامل، وتحويل النود تلقائياً إلى <b>نقطة تفريع/عمود عادية</b> للحفاظ على اتصال الخط الرئيسي دون أي انقطاع للتغذية.
      `;
      autoBtnText.textContent = `⚡ إزالة المحول وتحويل النود لنقطة عادية على الخط`;
    } else if (inSecs.length === 1 && outSecs.length >= 1) {
      // سكينة أو نود وسطية بين خطين
      const prevNode = inSecs[0].from_node;
      const nextNode = outSecs[0].to_node;
      const totalLen = (parseFloat(inSecs[0].length) || 50) + (parseFloat(outSecs[0].length) || 50);
      planBox.innerHTML = `
        العنصر يقع بين النود السابقة <b>(${prevNode})</b> واللاحقة <b>(${nextNode})</b>.<br>
        <span style="color:#68D391; font-weight:bold;">الضبط التلقائي:</span> سيتم دمج الخطين وتوصيل <b>(${prevNode})</b> مباشرة بـ <b>(${nextNode})</b> بطول إجمالي <b>(${totalLen}م)</b>، وضبط باقي التفريعات إن وجدت لضمان استمرار التغذية الكهربائية بدون أي فجوة.
      `;
      autoBtnText.textContent = `⚡ حذف وتوصيل المسار تلقائياً (${prevNode} ➔ ${nextNode})`;
    } else if (allSecs.length === 2) {
      const secA = allSecs[0];
      const secB = allSecs[1];
      const otherA = (secA.from_node === id) ? secA.to_node : secA.from_node;
      const otherB = (secB.from_node === id) ? secB.to_node : secB.from_node;
      const totalLen = (parseFloat(secA.length) || 50) + (parseFloat(secB.length) || 50);
      planBox.innerHTML = `
        متصل بين النودين <b>(${otherA})</b> و <b>(${otherB})</b>.<br>
        <span style="color:#68D391; font-weight:bold;">الضبط التلقائي:</span> سيتم ربط <b>(${otherA})</b> بـ <b>(${otherB})</b> مباشرة بطول إجمالي <b>(${totalLen}م)</b> وإزالة النود المعنية.
      `;
      autoBtnText.textContent = `⚡ حذف وتوصيل الخط تلقائياً (${otherA} ➔ ${otherB})`;
    } else if (allSecs.length === 1) {
      // تفريع أو نهاية طرفية
      const sec = allSecs[0];
      const parentId = (sec.from_node === id) ? sec.to_node : sec.from_node;
      planBox.innerHTML = `
        العنصر متفرع من النود <b>(${parentId})</b> بكابل/خط طوله <b>(${sec.length || 20}م)</b>.<br>
        <span style="color:#68D391; font-weight:bold;">الضبط التلقائي:</span> سيتم حذف العنصر وكابل التفريع الواصل إليه وضبط النود الأصلية <b>(${parentId})</b> لتبقى نظيفة في المخطط.
      `;
      autoBtnText.textContent = `⚡ حذف العنصر وإزالة كابل التفريع وضبط النود (${parentId})`;
    } else {
      planBox.innerHTML = `عنصر منفرد غير متصل بأي كابلات. سيتم حذفه من المخطط وضبط القائمة.`;
      autoBtnText.textContent = `⚡ حذف العنصر وضبط المخطط`;
    }

  } else if (type === "section") {
    const sec = currentProject.sections.find(s => s.id === id);
    if (!sec) return;

    infoBox.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <span style="font-size:15.5px; font-weight:bold; color:#63B3ED;">〰️ ${sec.type === 'كابل' ? 'كابل أرضي' : 'خط هوائي'}: ${sec.size || '3×150 مم²'}</span>
          <div style="font-size:12px; color:#A0AEC0; margin-top:4px;">
            من النود <b style="color:#90CDF4;">(${sec.from_node})</b> إلى النود <b style="color:#90CDF4;">(${sec.to_node})</b> | الطول: <b style="color:#ECC94B;">${sec.length} متر</b>
          </div>
        </div>
        <span class="badge" style="background:#2C5282; color:#BEE3F8; padding:4px 9px; border-radius:4px; font-size:11px;">مقطع خط</span>
      </div>
    `;

    planBox.innerHTML = `
      سيتم إزالة مقطع الخط من المخطط، وفحص النودين بطرفيه <b>(${sec.from_node})</b> و <b>(${sec.to_node})</b> تلقائياً؛ فإذا أصبحت إحداهما نود تفريع فارغة غير مستخدمة سيتم تنظيفها تلقائياً ليبقى المخطط مرتباً دون نقاط يتيمة.
    `;
    autoBtnText.textContent = `⚡ حذف الخط وفحص وتنظيف النودات المتصلة تلقائياً`;
  }

  modal.classList.remove("hidden");
}

function closeSmartDeleteModal() {
  const modal = document.getElementById("smart-delete-modal");
  if (modal) modal.classList.add("hidden");
  smartDeleteTarget = null;
}

function confirmSmartDelete(mode = "auto_adjust") {
  if (!smartDeleteTarget) return;
  const { type, id } = smartDeleteTarget;
  executeSmartDelete(type, id, mode);
}

function executeSmartDelete(type, id, mode = "auto_adjust") {
  if (!currentProject) return;

  if (type === "annotation") {
    deleteAnnotation(id);
    closeSmartDeleteModal();
    return;
  }

  saveHistoryState();

  if (!currentProject.deleted_node_ids) currentProject.deleted_node_ids = [];
  if (!currentProject.deleted_sec_ids) currentProject.deleted_sec_ids = [];
  if (type === "node") {
    if (!currentProject.deleted_node_ids.includes(id)) currentProject.deleted_node_ids.push(id);
  } else if (type === "section") {
    if (!currentProject.deleted_sec_ids.includes(id)) currentProject.deleted_sec_ids.push(id);
  }
  if (window.currentProject) {
    window.currentProject.deleted_node_ids = currentProject.deleted_node_ids;
    window.currentProject.deleted_sec_ids = currentProject.deleted_sec_ids;
  }

  if (type === "node") {
    const node = currentProject.nodes.find(n => n.id === id);
    if (!node) return;

    if (node.type === "substation") {
      if (currentProject.nodes.length > 1 && !confirm("هل ترغب بالفعل في حذف محطة التغذية الرئيسية؟")) {
        return;
      }
      currentProject.nodes = currentProject.nodes.filter(n => n.id !== id);
      currentProject.sections = currentProject.sections.filter(s => s.from_node !== id && s.to_node !== id);
      showToast(`🗑️ تم حذف المحطة الرئيسية (${id})`, "danger");
      clearSelection();
      closeSmartDeleteModal();
      renderNetwork();
      return;
    }

    if (mode === "auto_adjust") {
      const inSecs = currentProject.sections.filter(s => s.to_node === id);
      const outSecs = currentProject.sections.filter(s => s.from_node === id);
      const allSecs = currentProject.sections.filter(s => s.from_node === id || s.to_node === id);

      // 1. محول أو كشك مركب على نفس النود (Same Node) على المسار الرئيسي
      if ((node.type === "transformer" || node.type === "kiosk") && inSecs.length > 0 && outSecs.length > 0) {
        node.type = "junction";
        delete node.capacity;
        delete node.kiosk_type;
        delete node.loading_pct;
        delete node.sec_voltage;
        delete node.direction;
        delete node.transformer_type;
        showToast(`⚡ تم ضبط النود (${id}): إزالة المحول وتحويل النود لنقطة تفريع عادية مع بقاء مسار الخط متصلاً`, "success");
        clearSelection();
        closeSmartDeleteModal();
        renderNetwork();
        return;
      }

      // 2. سكينة أو نود وسطية بين خط وارد وخط أو أكثر صادر
      if (inSecs.length === 1 && outSecs.length >= 1) {
        const inSec = inSecs[0];
        const primaryOut = outSecs[0];
        const fromNodeId = inSec.from_node;
        const toNodeId = primaryOut.to_node;

        // دمج الخط الوارد ليتصل مباشرة بالنود اللاحقة
        inSec.to_node = toNodeId;
        inSec.length = (parseFloat(inSec.length) || 50) + (parseFloat(primaryOut.length) || 50);

        // إعادة توجيه أي تفريعات أخرى خارجة من النود المحذوفة
        for (let i = 1; i < outSecs.length; i++) {
          outSecs[i].from_node = fromNodeId;
        }

        // حذف الخط الصادر المدمج
        currentProject.sections = currentProject.sections.filter(s => s.id !== primaryOut.id);
        // حذف النود
        currentProject.nodes = currentProject.nodes.filter(n => n.id !== id);

        showToast(`⚡ تم حذف (${node.name || id}) وضبط المسار: دمج الخطين وتوصيل (${fromNodeId}) مباشرة بـ (${toNodeId}) بطول ${inSec.length}م دون انقطاع التغذية`, "success");
        clearSelection();
        closeSmartDeleteModal();
        renderNetwork();
        return;
      }

      // 3. نود متصلة بخطين أياً كان اتجاههما
      if (allSecs.length === 2) {
        const secA = allSecs[0];
        const secB = allSecs[1];
        const otherA = (secA.from_node === id) ? secA.to_node : secA.from_node;
        const otherB = (secB.from_node === id) ? secB.to_node : secB.from_node;

        secA.from_node = otherA;
        secA.to_node = otherB;
        secA.length = (parseFloat(secA.length) || 50) + (parseFloat(secB.length) || 50);

        currentProject.sections = currentProject.sections.filter(s => s.id !== secB.id);
        currentProject.nodes = currentProject.nodes.filter(n => n.id !== id);

        showToast(`⚡ تم حذف (${node.name || id}) وتوصيل (${otherA}) مباشرة بـ (${otherB}) بطول ${secA.length}م`, "success");
        clearSelection();
        closeSmartDeleteModal();
        renderNetwork();
        return;
      }

      // 4. نود طرفية أو محول فرعي متصل بخط وحيد
      if (allSecs.length === 1) {
        const branchSec = allSecs[0];
        const parentId = (branchSec.from_node === id) ? branchSec.to_node : branchSec.from_node;

        currentProject.nodes = currentProject.nodes.filter(n => n.id !== id);
        currentProject.sections = currentProject.sections.filter(s => s.id !== branchSec.id);

        showToast(`🗑️ تم حذف (${node.name || id}) وإزالة كابل التفريع وضبط النود المغذية (${parentId})`, "success");
        clearSelection();
        closeSmartDeleteModal();
        renderNetwork();
        return;
      }
    }

    // حذف تقليدي بدون ضبط تلقائي (simple)
    currentProject.nodes = currentProject.nodes.filter(n => n.id !== id);
    currentProject.sections = currentProject.sections.filter(s => s.from_node !== id && s.to_node !== id);
    showToast(`🗑️ تم حذف العقدة (${node.name || id}) والمقاطع المرتبطة بها`, "danger");

  } else if (type === "section") {
    const sec = currentProject.sections.find(s => s.id === id);
    if (!sec) return;

    const fromId = sec.from_node;
    const toId = sec.to_node;

    currentProject.sections = currentProject.sections.filter(s => s.id !== id);

    if (mode === "auto_adjust") {
      [toId, fromId].forEach(nodeId => {
        const targetNode = currentProject.nodes.find(n => n.id === nodeId);
        if (targetNode && targetNode.type === "junction") {
          const remaining = currentProject.sections.filter(s => s.from_node === nodeId || s.to_node === nodeId);
          if (remaining.length === 0) {
            currentProject.nodes = currentProject.nodes.filter(n => n.id !== nodeId);
            showToast(`⚡ تم تنظيف وضبط النود غير المتصلة (${nodeId}) تلقائياً`, "info");
          }
        }
      });
      showToast(`🗑️ تم حذف الخط وضبط النودات المتصلة تلقائياً`, "success");
    } else {
      showToast(`🗑️ تم حذف الخط المحدد`, "danger");
    }
  }

  clearSelection();
  closeSmartDeleteModal();
  renderNetwork();
}

function deleteCurrentlySelectedElement() {
  if (!selectedElement || !currentProject) return;
  openSmartDeleteModal(selectedElement.type, selectedElement.id);
}

function openDeleteOptionsModal() {
  const m = document.getElementById("delete-options-modal");
  if (m) m.classList.remove("hidden");
}

function closeDeleteOptionsModal() {
  const m = document.getElementById("delete-options-modal");
  if (m) m.classList.add("hidden");
}

function clearEntireSchematic() {
  if (confirm("هل أنت متأكد من رغبتك في حذف ومسح المخطط بالكامل والبدء من جديد؟")) {
    saveHistoryState();
    currentProject = {
      id: "feeder_" + Date.now(),
      name: "مغذي جديد",
      substation: "محطة التوزيع الرئيسية",
      voltage_kv: 11,
      nodes: [
        { id: "N1", type: "substation", name: "محطة محولات", x: 400, y: (window.drawingFlowDirection === 'up') ? 1000 : 80 }
      ],
      sections: []
    };
    if (window.clearSelection) clearSelection();
    updateFeederInputs();
    renderNetwork();
    resetZoom();
    showToast("🗑️ تم مسح المخطط والبدء من جديد", "danger");
  }
}

// تحميل مخطط صورة سطح المكتب (رسم تجريبي - لوحة المركز القديمة)
async function loadRasmTagrebyProject() {
  saveHistoryState();
  try {
    const res = await fetch("/api/load-project/rasm_tagreby");
    const data = await res.json();
    if (data.success && data.project) {
      currentProject = data.project;
      updateFeederInputs();
      renderNetwork();
      fitToScreen();
      showToast("📐 تم تحميل مخطط لوحة المركز القديمة (الرسم التجريبي) بنجاح!", "success");
    }
  } catch (err) {
    console.error("Load Rasm Tagreby Error:", err);
  }
}

async function loadDemoVideoProject() {
  saveHistoryState();
  try {
    const res = await fetch("/api/load-project/video_demo_feeder");
    const data = await res.json();
    if (data.success && data.project) {
      currentProject = data.project;
      localStorage.setItem("sld_saved_feeder", JSON.stringify(currentProject));
      updateFeederInputs();
      renderNetwork();
      fitToScreen();
      showToast("📐 تم استرجاع مخطط شبكة التوزيع المعتمد (24,350م) بنجاح!", "success");
    } else {
      if (!currentProject || !currentProject.nodes || currentProject.nodes.length === 0) {
        if (typeof createNewProjectDirectly === "function") createNewProjectDirectly();
      }
    }
  } catch (err) {
    console.error("Load Demo Error:", err);
    if (!currentProject || !currentProject.nodes || currentProject.nodes.length === 0) {
      if (typeof createNewProjectDirectly === "function") createNewProjectDirectly();
    }
  }
}

function updateFeederInputs() {
  if (!currentProject) return;
  const fNameInput = document.getElementById("feeder-name-input");
  const subInput = document.getElementById("substation-name-input");
  const voltSelect = document.getElementById("feeder-voltage-select");

  if (fNameInput) fNameInput.value = currentProject.name || "مغذي رئيسي";
  if (subInput) subInput.value = currentProject.substation || "محطة محولات";
  if (voltSelect) voltSelect.value = currentProject.voltage_kv || 11;

  const tbName = document.getElementById("tb-project-name");
  if (tbName) tbName.textContent = currentProject.name || "مخطط شبكة الجهد المتوسط (SLD)";
  const tbInfo = document.getElementById("tb-feeder-info");
  if (tbInfo) tbInfo.textContent = `${currentProject.name || 'مغذي'} - ${currentProject.substation || 'محطة'} (${currentProject.voltage_kv || 11} ك.ف)`;
  
  if (window.updateDesignerName) {
    window.updateDesignerName();
  }
  
  populateNodeDropdowns();
}

function updateFeederInfo(isLive = false) {
  if (!currentProject) return;
  if (!isLive) {
    saveHistoryState();
  }
  const fNameInput = document.getElementById("feeder-name-input");
  const subInput = document.getElementById("substation-name-input");
  const voltSelect = document.getElementById("feeder-voltage-select");

  const nameVal = fNameInput ? fNameInput.value.trim() : (currentProject.name || "");
  const subVal = subInput ? subInput.value.trim() : (currentProject.substation || "");
  const voltVal = voltSelect ? (parseFloat(voltSelect.value) || 11) : (currentProject.voltage_kv || 11);

  currentProject.name = nameVal;
  currentProject.substation = subVal;
  currentProject.voltage_kv = voltVal;

  // تحديث الخرطوشة الهندسية في الرسم فوراً
  const tbName = document.getElementById("tb-project-name");
  if (tbName) tbName.textContent = nameVal || "مخطط شبكة الجهد المتوسط (SLD)";
  const tbInfo = document.getElementById("tb-feeder-info");
  if (tbInfo) tbInfo.textContent = `${nameVal || 'مغذي'} - ${subVal || 'محطة'} (${voltVal} ك.ف)`;

  // تحديث اسم المحطة في أول عقدة N1 إذا كانت من نوع substation
  if (currentProject.nodes && currentProject.nodes.length > 0 && currentProject.nodes[0].type === 'substation') {
    if (subVal) {
      currentProject.nodes[0].name = subVal;
      const n1El = document.getElementById("node-N1");
      if (n1El) {
        const titleSpan = n1El.querySelector(".node-name");
        if (titleSpan) titleSpan.textContent = subVal;
      }
    }
  }

  // حفظ فوري في التخزين المحلي لضمان عدم ضياع التعديل عند التحديث
  localStorage.setItem("sld_saved_feeder", JSON.stringify(currentProject));
  updateLiveMetrics();
}

// تعبئة قوائم العقد المتاحة في كافة النوافذ (مناول / ربط)
function populateNodeDropdowns() {
  if (!currentProject || !currentProject.nodes) return;
  const nodes = currentProject.nodes;
  
  const fromSelect = document.getElementById("dlg-from-node");
  const quickFromSelect = document.getElementById("quick-from-node");
  const lbnFromSelect = document.getElementById("lbn-from-node");
  const lbnToSelect = document.getElementById("lbn-to-node");
  const rmuSourceSelect = document.getElementById("rmu-source-node");
  const avrSourceSelect = document.getElementById("avr-source-node");
  const kfkSourceSelect = document.getElementById("kfk-source-node");
  const transSourceSelect = document.getElementById("dlg-trans-source");
  const swSourceSelect = document.getElementById("sw-source-node");

  let optionsHTML = "";
  nodes.forEach(n => {
    let typeName = "";
    if (n.type === 'transformer') typeName = `⚙️ محول (${n.capacity || 100}KVA)`;
    else if (n.type === 'kiosk') typeName = `🔺 كشك (${n.capacity || 500}KVA)`;
    else if (n.type === 'switch') typeName = `⚡ سكينة (${n.direction === 'horizontal' ? 'أفقية' : 'رأسية'})`;
    else if (n.type === 'substation') typeName = `🏭 محطة/لوحة`;
    else if (n.type === 'avr') typeName = `🔋 منظم AVR (${n.rated_amp || 200}A)`;
    else if (n.type === 'rmu') typeName = `🔄 RMU ربط حلقي`;
    else typeName = `نقطة`;

    let label = `[${n.id}] ${n.name || typeName} - ${typeName}`;
    optionsHTML += `<option value="${n.id}">${label}</option>`;
  });

  if (fromSelect) fromSelect.innerHTML = optionsHTML;
  if (quickFromSelect) quickFromSelect.innerHTML = optionsHTML;
  if (lbnFromSelect) lbnFromSelect.innerHTML = optionsHTML;
  if (lbnToSelect) lbnToSelect.innerHTML = optionsHTML;
  if (rmuSourceSelect) rmuSourceSelect.innerHTML = optionsHTML;
  if (avrSourceSelect) avrSourceSelect.innerHTML = optionsHTML;
  if (transSourceSelect) transSourceSelect.innerHTML = optionsHTML;
  if (swSourceSelect) swSourceSelect.innerHTML = optionsHTML;

  if (kfkSourceSelect) {
    const kiosksAndSubs = nodes.filter(n => n.type === 'kiosk' || n.type === 'substation' || n.type === 'rmu' || n.type === 'transformer');
    let kfkHTML = "";
    kiosksAndSubs.forEach(k => {
      kfkHTML += `<option value="${k.id}">[${k.id}] ${k.name || k.type} (${k.capacity ? k.capacity + 'kVA' : ''})</option>`;
    });
    kfkSourceSelect.innerHTML = kfkHTML;
  }
}

// --- نافذة إضافة محطة محولات أو لوحة توزيع ---
function openSubstationModal() {
  if (window.hasPermission && !window.hasPermission('btn_substation')) {
    showToast("⛔ ليس لديك صلاحية إضافة محطة أو لوحة", "error");
    return;
  }
  const modal = document.getElementById("substation-modal");
  if (!modal) return;
  if (currentProject) {
    document.getElementById("sub-name").value = currentProject.substation || "محطة محولات غرب";
    document.getElementById("sub-voltage").value = currentProject.voltage_kv || 11;
  }
  const nextId = (currentProject && currentProject.nodes.length > 0) ? "N" + (currentProject.nodes.length + 1) : "N1";
  document.getElementById("sub-node-id").value = nextId;
  modal.classList.remove("hidden");
}

function closeSubstationModal() {
  const modal = document.getElementById("substation-modal");
  if (modal) modal.classList.add("hidden");
}

function submitSubstationModal() {
  saveHistoryState();
  const name = document.getElementById("sub-name").value.trim() || "محطة محولات";
  const subType = document.getElementById("sub-type").value;
  const voltage = parseFloat(document.getElementById("sub-voltage").value) || 11;
  const nodeId = document.getElementById("sub-node-id").value.trim().toUpperCase() || "N1";

  if (!currentProject) {
    currentProject = {
      id: "feeder_" + Date.now(),
      name: "مغذي جديد",
      substation: name,
      voltage_kv: voltage,
      nodes: [],
      sections: []
    };
  }

  currentProject.substation = name;
  currentProject.voltage_kv = voltage;

  let node = currentProject.nodes.find(n => n.id === nodeId);
  if (node) {
    node.type = "substation";
    node.subType = subType;
    node.name = name;
  } else {
    const isFirst = (currentProject.nodes.length === 0);
    const startY = (window.drawingFlowDirection === 'up') ? 1000 : 80;
    const dy = (window.drawingFlowDirection === 'up') ? -180 : 180;
    const x = isFirst ? 400 : (currentProject.nodes[currentProject.nodes.length - 1].x);
    const y = isFirst ? startY : (currentProject.nodes[currentProject.nodes.length - 1].y + dy);
    currentProject.nodes.push({
      id: nodeId,
      type: "substation",
      subType: subType,
      name: name,
      x: x,
      y: y
    });
  }

  closeSubstationModal();
  updateFeederInputs();
  renderNetwork();
  showToast(`🏭 تم ضبط وإضافة ${name} (${voltage} ك.ف)`, "success");
}

// --- نافذة أخذ خط / تفريعة من خط مارر بين نقطتين أو رسم خط مباشر ---
function openLineBetweenNodesModal() {
  if (window.hasPermission && !window.hasPermission('btn_line_between')) {
    showToast("⛔ ليس لديك صلاحية أخذ خط من بين نقطتين", "error");
    return;
  }
  if (!currentProject || !currentProject.nodes || currentProject.nodes.length === 0) {
    alert("الرجاء إضافة محطة محولات أو خط أولاً.");
    return;
  }
  const modal = document.getElementById("line-between-nodes-modal");
  populateNodeDropdowns();

  // تعبئة قائمة الخطوط المارة بين نقطتين
  const passingSelect = document.getElementById("lbn-passing-section");
  if (passingSelect) {
    let opts = "";
    if (currentProject.sections && currentProject.sections.length > 0) {
      currentProject.sections.forEach(s => {
        const fromN = currentProject.nodes.find(n => n.id === s.from_node);
        const toN = currentProject.nodes.find(n => n.id === s.to_node);
        const fromLabel = fromN ? (fromN.name || fromN.id) : s.from_node;
        const toLabel = toN ? (toN.name || toN.id) : s.to_node;
        const typeIcon = (s.type === "كابل") ? "╍" : "➖";
        const dirIcon = (s.direction === "right") ? "➡️" : (s.direction === "left") ? "⬅️" : (s.direction === "up") ? "⬆️" : "⬇️";
        opts += `<option value="${s.id}">${typeIcon} [${s.id}] خط ${s.type} بين [${s.from_node}: ${fromLabel}] و [${s.to_node}: ${toLabel}] (${s.length}م) ${dirIcon}</option>`;
      });
    } else {
      opts = `<option value="">(لا توجد خطوط مارة بالمخطط حالياً)</option>`;
    }
    passingSelect.innerHTML = opts;
  }

  // تحديد الخط المارر الافتراضي بذكاء:
  // 1. إذا كان المستخدم محدد خطاً على الرسم، نختاره فوراً
  // 2. إذا كان محدد نوداً، نختار أول خط متصل بهذا النود
  // 3. وإلا نختار آخر خط تم رسمه
  let defaultSecId = null;
  if (selectedElement && selectedElement.type === "section") {
    defaultSecId = selectedElement.id;
  } else if (selectedElement && selectedElement.type === "node") {
    const connSec = currentProject.sections.find(s => s.from_node === selectedElement.id || s.to_node === selectedElement.id);
    if (connSec) defaultSecId = connSec.id;
  }
  if (!defaultSecId && currentProject.sections && currentProject.sections.length > 0) {
    defaultSecId = currentProject.sections[currentProject.sections.length - 1].id;
  }
  if (passingSelect && defaultSecId) {
    passingSelect.value = defaultSecId;
  }

  // وضع أخذ تفريعة من خط مارر هو الافتراضي
  const tapRadio = document.querySelector('input[name="lbn-mode"][value="tap"]');
  if (tapRadio) tapRadio.checked = true;

  // توليد رقم النود الجديد التالي
  let nextNum = currentProject.nodes.length + 1;
  while (currentProject.nodes.some(n => n.id === "N" + nextNum)) {
    nextNum++;
  }
  const newNodeInput = document.getElementById("lbn-new-node-id");
  if (newNodeInput) newNodeInput.value = "N" + nextNum;

  const nameInput = document.getElementById("lbn-name");
  if (nameInput) nameInput.value = "";

  document.getElementById("lbn-length").value = "800";
  document.getElementById("lbn-add-switch").checked = false;

  onLineBetweenTypeChange();
  onLbnPassingSectionChange();
  onLbnModeChange();

  modal.classList.remove("hidden");
}

function closeLineBetweenNodesModal() {
  const modal = document.getElementById("line-between-nodes-modal");
  if (modal) modal.classList.add("hidden");
}

function onLbnModeChange() {
  const mode = document.querySelector('input[name="lbn-mode"]:checked')?.value || "tap";
  const tapBox = document.getElementById("lbn-tap-box");
  const directBox = document.getElementById("lbn-direct-box");
  const dirBox = document.getElementById("lbn-dir-box");
  const submitBtn = document.getElementById("lbn-submit-btn");
  const tapLabel = document.getElementById("lbn-mode-tap-label");
  const directLabel = document.getElementById("lbn-mode-direct-label");

  if (mode === "tap") {
    if (tapBox) tapBox.classList.remove("hidden");
    if (directBox) directBox.classList.add("hidden");
    if (dirBox) dirBox.classList.remove("hidden");
    if (submitBtn) submitBtn.innerHTML = "<span>⚡ أخذ التفريعة من الخط المارر فوراً ➔</span>";
    if (tapLabel) {
      tapLabel.style.background = "#2b6cb0";
      tapLabel.style.color = "#fff";
    }
    if (directLabel) {
      directLabel.style.background = "transparent";
      directLabel.style.color = "#a0aec0";
    }
  } else {
    if (tapBox) tapBox.classList.add("hidden");
    if (directBox) directBox.classList.remove("hidden");
    if (dirBox) dirBox.classList.add("hidden");
    if (submitBtn) submitBtn.innerHTML = "<span>🔗 توصيل الخط بين النقطتين فوراً ➔</span>";
    if (directLabel) {
      directLabel.style.background = "#2b6cb0";
      directLabel.style.color = "#fff";
    }
    if (tapLabel) {
      tapLabel.style.background = "transparent";
      tapLabel.style.color = "#a0aec0";
    }
  }
}

function onLbnPassingSectionChange() {
  if (!currentProject || !currentProject.sections) return;
  const secId = document.getElementById("lbn-passing-section")?.value;
  const sec = currentProject.sections.find(s => s.id === secId);
  if (!sec) return;

  const nodeA = currentProject.nodes.find(n => n.id === sec.from_node);
  const nodeB = currentProject.nodes.find(n => n.id === sec.to_node);
  const labelA = nodeA ? (nodeA.name || nodeA.id) : sec.from_node;
  const labelB = nodeB ? (nodeB.name || nodeB.id) : sec.to_node;

  const totalLen = parseFloat(sec.length) || 1000;
  const totalEl = document.getElementById("lbn-orig-total-length");
  if (totalEl) totalEl.textContent = totalLen;

  const lblA = document.getElementById("lbn-seg-a-label");
  const lblB = document.getElementById("lbn-seg-b-label");
  if (lblA) lblA.textContent = `المسافة من [${sec.from_node}: ${labelA}] (م):`;
  if (lblB) lblB.textContent = `المسافة إلى [${sec.to_node}: ${labelB}] (م):`;

  // الاقتراح الذكي: إذا كان الخط طوله 2000م، يُقترح 200م و 1800م أو النصف
  const inputA = document.getElementById("lbn-seg-a-length");
  const inputB = document.getElementById("lbn-seg-b-length");
  let currentA = inputA ? parseFloat(inputA.value) : 0;
  if (!currentA || currentA >= totalLen || currentA <= 0) {
    currentA = (totalLen === 2000) ? 200 : Math.round(totalLen / 2);
  }
  const currentB = Math.max(1, Math.round(totalLen - currentA));
  if (inputA) inputA.value = currentA;
  if (inputB) inputB.value = currentB;

  updateLbnSliderAndHints(currentA, totalLen);

  // اقتراح الاتجاه الأنسب عمودياً على مسار الخط المارر:
  let suggestedBranchDir = "right";
  if (sec.direction === "down" || sec.direction === "up") {
    suggestedBranchDir = "right";
  } else if (sec.direction === "right" || sec.direction === "left") {
    suggestedBranchDir = (window.drawingFlowDirection === "up") ? "up" : "down";
  } else if (nodeA && nodeB) {
    if (Math.abs(nodeA.y - nodeB.y) >= Math.abs(nodeA.x - nodeB.x)) {
      suggestedBranchDir = "right";
    } else {
      suggestedBranchDir = (window.drawingFlowDirection === "up") ? "up" : "down";
    }
  }

  const dirRadio = document.querySelector(`input[name="lbn-branch-dir"][value="${suggestedBranchDir}"]`);
  if (dirRadio) dirRadio.checked = true;

  // اقتراح مسمى التفريعة
  const nameInput = document.getElementById("lbn-name");
  if (nameInput && (!nameInput.value || nameInput.value.startsWith("تفريعة"))) {
    nameInput.placeholder = `تفريعة على خط ${sec.from_node}-${sec.to_node}`;
  }
}

// ─── دوال التزامن الرياضي الفوري للمسافات بين الجهتين ─────────────────────────
function onLbnSegAChange() {
  if (!currentProject || !currentProject.sections) return;
  const secId = document.getElementById("lbn-passing-section")?.value;
  const sec = currentProject.sections.find(s => s.id === secId);
  if (!sec) return;
  const totalLen = parseFloat(sec.length) || 1000;
  const inputA = document.getElementById("lbn-seg-a-length");
  const inputB = document.getElementById("lbn-seg-b-length");
  if (!inputA || !inputB) return;

  let valA = parseFloat(inputA.value);
  if (isNaN(valA) || valA < 1) valA = 1;
  if (valA >= totalLen) {
    valA = Math.max(1, totalLen - 10);
    inputA.value = valA;
  }
  const valB = Math.max(1, Math.round(totalLen - valA));
  inputB.value = valB;
  updateLbnSliderAndHints(valA, totalLen);
}

function onLbnSegBChange() {
  if (!currentProject || !currentProject.sections) return;
  const secId = document.getElementById("lbn-passing-section")?.value;
  const sec = currentProject.sections.find(s => s.id === secId);
  if (!sec) return;
  const totalLen = parseFloat(sec.length) || 1000;
  const inputA = document.getElementById("lbn-seg-a-length");
  const inputB = document.getElementById("lbn-seg-b-length");
  if (!inputA || !inputB) return;

  let valB = parseFloat(inputB.value);
  if (isNaN(valB) || valB < 1) valB = 1;
  if (valB >= totalLen) {
    valB = Math.max(1, totalLen - 10);
    inputB.value = valB;
  }
  const valA = Math.max(1, Math.round(totalLen - valB));
  inputA.value = valA;
  updateLbnSliderAndHints(valA, totalLen);
}

function onLbnSplitSliderChange(percentVal) {
  if (!currentProject || !currentProject.sections) return;
  const secId = document.getElementById("lbn-passing-section")?.value;
  const sec = currentProject.sections.find(s => s.id === secId);
  if (!sec) return;
  const totalLen = parseFloat(sec.length) || 1000;
  const pct = Math.max(1, Math.min(99, parseFloat(percentVal) || 50));

  const valA = Math.round((totalLen * pct) / 100);
  const valB = Math.max(1, totalLen - valA);

  const inputA = document.getElementById("lbn-seg-a-length");
  const inputB = document.getElementById("lbn-seg-b-length");
  if (inputA) inputA.value = valA;
  if (inputB) inputB.value = valB;

  updateLbnSliderAndHints(valA, totalLen);
}

function setLbnSplitRatio(ratio) {
  if (!currentProject || !currentProject.sections) return;
  const secId = document.getElementById("lbn-passing-section")?.value;
  const sec = currentProject.sections.find(s => s.id === secId);
  if (!sec) return;
  const totalLen = parseFloat(sec.length) || 1000;
  const valA = Math.round(totalLen * ratio);
  const valB = Math.max(1, totalLen - valA);

  const inputA = document.getElementById("lbn-seg-a-length");
  const inputB = document.getElementById("lbn-seg-b-length");
  if (inputA) inputA.value = valA;
  if (inputB) inputB.value = valB;

  updateLbnSliderAndHints(valA, totalLen);
}

function updateLbnSliderAndHints(valA, totalLen) {
  const pct = totalLen > 0 ? Math.round((valA / totalLen) * 100) : 50;
  const slider = document.getElementById("lbn-split-slider");
  if (slider) slider.value = Math.max(1, Math.min(99, pct));

  const valB = Math.max(1, totalLen - valA);
  const hintA = document.getElementById("lbn-slider-a-hint");
  const hintB = document.getElementById("lbn-slider-b-hint");
  if (hintA) hintA.textContent = `جهة البداية: ${pct}% (${valA}م)`;
  if (hintB) hintB.textContent = `جهة النهاية: ${100 - pct}% (${valB}م)`;

  const passingHint = document.getElementById("lbn-passing-hint");
  const secId = document.getElementById("lbn-passing-section")?.value;
  const sec = currentProject?.sections?.find(s => s.id === secId);
  if (passingHint && sec) {
    passingHint.innerHTML = `📍 تقسيم الخط المار [${sec.id}] (${totalLen}م): <b>${valA}م</b> من جهة [${sec.from_node}]، و <b>${valB}م</b> إلى جهة [${sec.to_node}].`;
  }
}

function onLineBetweenTypeChange() {
  const type = document.getElementById("lbn-type")?.value || "هوائي";
  const sizeSelect = document.getElementById("lbn-size");
  if (!sizeSelect) return;
  if (type === "كابل") {
    sizeSelect.innerHTML = `
      <option value="3*240" selected>3*240 مم²</option>
      <option value="3*150">3*150 مم²</option>
      <option value="3*300">3*300 مم²</option>
      <option value="3*70">3*70 مم²</option>
    `;
  } else {
    sizeSelect.innerHTML = `
      <option value="70/12" selected>70/12 (تفريعات)</option>
      <option value="150/25">150/25 (رئيسي)</option>
      <option value="سبيكة">سبيكة ألومنيوم AAAC</option>
      <option value="35/6">35/6</option>
    `;
  }
}

function submitLineBetweenNodesModal() {
  if (!currentProject) return;
  saveHistoryState();

  const mode = document.querySelector('input[name="lbn-mode"]:checked')?.value || "tap";

  // --- الوضع الأول: أخذ تفريعة من خط مارر بين نقطتين وتوجيهها نحو ما وجهه المستخدم ---
  if (mode === "tap") {
    const secId = document.getElementById("lbn-passing-section")?.value;
    const origSec = currentProject.sections.find(s => s.id === secId);
    if (!origSec) {
      alert("الرجاء اختيار الخط المارر بين نقطتين أولاً.");
      return;
    }

    const nodeA = currentProject.nodes.find(n => n.id === origSec.from_node);
    const nodeB = currentProject.nodes.find(n => n.id === origSec.to_node);
    if (!nodeA || !nodeB) {
      alert("تعذر تحديد نقطتي الخط المارر بالمخطط!");
      return;
    }

    // 1. حساب أطوال القسمين حسب تحديد المستخدم بدقة
    const origLength = parseFloat(origSec.length) || 1000;
    let lenA = parseFloat(document.getElementById("lbn-seg-a-length")?.value);
    let lenB = parseFloat(document.getElementById("lbn-seg-b-length")?.value);
    if (isNaN(lenA) || lenA <= 0) lenA = Math.round(origLength / 2);
    if (isNaN(lenB) || lenB <= 0) lenB = Math.max(1, origLength - lenA);

    // النسبة المئوية المحددة لموقع التفرع
    const totalSplit = lenA + lenB;
    const ratio = totalSplit > 0 ? (lenA / totalSplit) : 0.5;

    // حصر النسبة الرسومية بين 0.12 و 0.88 لضمان عدم تداخل أيقونات النودات الطرفية
    const clampedRatio = Math.max(0.12, Math.min(0.88, ratio));

    const startPt = (typeof Components !== "undefined" && Components.getTerminalPoint) ?
      Components.getTerminalPoint(nodeA, true, origSec) : { x: nodeA.x, y: nodeA.y };
    const endPt = (typeof Components !== "undefined" && Components.getTerminalPoint) ?
      Components.getTerminalPoint(nodeB, false, origSec) : { x: nodeB.x, y: nodeB.y };

    const tapX = Math.round(startPt.x + (endPt.x - startPt.x) * clampedRatio);
    const tapY = Math.round(startPt.y + (endPt.y - startPt.y) * clampedRatio);

    // 2. إنشاء نود التفرع (Tap Junction Node) على الخط المارر
    let tapNum = currentProject.nodes.length + 1;
    while (currentProject.nodes.some(n => n.id === "N" + tapNum)) tapNum++;
    const tapNodeId = "N" + tapNum;

    const tapNode = {
      id: tapNodeId,
      type: "junction",
      name: `نقطة تفرع ${tapNodeId}`,
      x: tapX,
      y: tapY
    };
    currentProject.nodes.push(tapNode);

    // 3. شطر الخط المارر إلى قسمين متصلين كهربائياً عبر نقطة التفرع بالأطوال المحددة
    const savedToNode = origSec.to_node;
    origSec.to_node = tapNodeId;
    origSec.length = lenA;

    let nextSecNum = currentProject.sections.length + 1;
    while (currentProject.sections.some(s => s.id === "S" + nextSecNum)) nextSecNum++;
    const contSec = {
      id: "S" + nextSecNum,
      name: origSec.name ? `${origSec.name} (تكملة)` : undefined,
      from_node: tapNodeId,
      to_node: savedToNode,
      type: origSec.type,
      size: origSec.size,
      length: lenB,
      direction: origSec.direction
    };
    currentProject.sections.push(contSec);

    // 4. تحديد اتجاه وإحداثيات الخط المتفرع الجديد حسب توجيه المستخدم (ويتجه نحو ما أوجه)
    const branchDir = document.querySelector('input[name="lbn-branch-dir"]:checked')?.value || "right";
    let dx = 0, dy = 0;
    if (branchDir === "right") dx = 240;
    else if (branchDir === "left") dx = -240;
    else if (branchDir === "down") dy = 220;
    else if (branchDir === "up") dy = -220;

    const branchEndX = tapX + dx;
    const branchEndY = tapY + dy;

    // حساب وتعيين الجهة العكسية لمسميات الخط العمومي (لتتسع مساحة العمل للمسميات والمعدات الأخرى)
    const isMainVertical = Math.abs(endPt.y - startPt.y) >= Math.abs(endPt.x - startPt.x);
    let oppositeSide = "top";
    if (isMainVertical) {
      oppositeSide = (branchDir === "right") ? "left" : "right";
    } else {
      oppositeSide = (branchDir === "down") ? "top" : "bottom";
    }

    origSec.labelSide = oppositeSide;
    contSec.labelSide = oppositeSide;
    origSec.isMainLine = true;
    contSec.isMainLine = true;

    // 5. إنشاء نود نهاية الخط المتفرع
    let newNum = tapNum + 1;
    while (currentProject.nodes.some(n => n.id === "N" + newNum)) newNum++;
    let branchEndId = document.getElementById("lbn-new-node-id").value.trim().toUpperCase();
    if (!branchEndId || currentProject.nodes.some(n => n.id === branchEndId)) {
      branchEndId = "N" + newNum;
    }

    const customName = document.getElementById("lbn-name").value.trim();
    const branchType = document.getElementById("lbn-type").value || "هوائي";
    const branchSize = document.getElementById("lbn-size").value || "70/12";
    const branchLength = parseFloat(document.getElementById("lbn-length").value) || 800;
    const addSwitch = document.getElementById("lbn-add-switch").checked;
    const isHoriz = (branchDir === "right" || branchDir === "left");

    const branchEndNode = {
      id: branchEndId,
      type: addSwitch ? "switch" : "junction",
      name: customName || (addSwitch ? `سكينة ${branchEndId}` : `نقطة ${branchEndId}`),
      x: branchEndX,
      y: branchEndY,
      ...(addSwitch ? { direction: isHoriz ? "horizontal" : "vertical", dir: branchDir, state: "closed" } : {})
    };
    currentProject.nodes.push(branchEndNode);

    // 6. إنشاء قسم الخط المتفرع الجديد (من نقطة التفرع إلى نود النهاية)
    nextSecNum++;
    while (currentProject.sections.some(s => s.id === "S" + nextSecNum)) nextSecNum++;
    const isBranchHoriz = (branchDir === "right" || branchDir === "left");
    const branchSec = {
      id: "S" + nextSecNum,
      name: customName || `تفريعة ${branchEndId}`,
      from_node: tapNodeId,
      to_node: branchEndId,
      type: branchType,
      size: branchSize,
      length: branchLength,
      direction: branchDir,
      labelSide: isBranchHoriz ? "bottom" : "right",
      isBranch: true
    };
    currentProject.sections.push(branchSec);

    closeLineBetweenNodesModal();
    renderNetwork();
    showToast(`⚡ تم أخذ تفريعة من الخط المارر [${origSec.id}] بنجاح، وتوجيهها ${branchDir === 'right' ? 'يميناً ➡️' : (branchDir === 'left' ? 'شمالاً ⬅️' : (branchDir === 'down' ? 'لأسفل ⬇️' : 'لأعلى ⬆️'))} إلى [${branchEndId}] بطول ${branchLength}م`, "success");
    return;
  }

  // --- الوضع الثاني: توصيل مباشر بين نقطتين موجودتين ---
  const fromNodeId = document.getElementById("lbn-from-node").value;
  const toNodeId = document.getElementById("lbn-to-node").value;
  if (fromNodeId === toNodeId) {
    alert("يجب اختيار نقطتين مختلفتين للتوصيل بينهما.");
    return;
  }

  const customName = document.getElementById("lbn-name").value.trim();
  const type = document.getElementById("lbn-type").value;
  const size = document.getElementById("lbn-size").value;
  const length = parseFloat(document.getElementById("lbn-length").value) || 1000;
  const addSwitch = document.getElementById("lbn-add-switch")?.checked;

  if (addSwitch) {
    weldSwitchBetweenNodes(fromNodeId, toNodeId, {
      name: customName ? `سكينة ${customName}` : undefined,
      type: type,
      size: size,
      len1: Math.round(length / 2),
      len2: Math.max(1, length - Math.round(length / 2))
    });
    closeLineBetweenNodesModal();
    return;
  }

  let nextSecNum = currentProject.sections.length + 1;
  while (currentProject.sections.some(s => s.id === "S" + nextSecNum)) nextSecNum++;

  currentProject.sections.push({
    id: "S" + nextSecNum,
    name: customName,
    from_node: fromNodeId,
    to_node: toNodeId,
    type: type,
    size: size,
    length: length
  });

  closeLineBetweenNodesModal();
  renderNetwork();
  showToast(`🔗 تم توصيل الخط المباشر بين [${fromNodeId}] و [${toNodeId}] بنجاح`, "success");
}

// نافذة رسم خط هوائي أو كابل أرضي
function openLineDialog(type) {
  const reqPerm = (type === "كابل") ? "btn_cable" : "btn_overhead";
  if (window.hasPermission && !window.hasPermission(reqPerm)) {
    showToast(`⛔ ليس لديك صلاحية رسم ${type === 'كابل' ? 'الكابل الأرضي' : 'الخط الهوائي'}`, "error");
    return;
  }
  if (!currentProject || currentProject.nodes.length === 0) {
    alert("الرجاء إضافة محطة محولات أولاً.");
    return;
  }
  currentLineDialogType = type;
  const isCable = (type === "كابل");

  const modal = document.getElementById("line-dialog-modal");
  const titleEl = document.getElementById("line-dialog-title");
  const sizeSelect = document.getElementById("dlg-size");
  const previewNote = document.getElementById("dlg-line-preview-note");

  if (isCable) {
    titleEl.textContent = "╍ رسم كابل أرضي (خط متقطع - - -)";
    previewNote.innerHTML = "💡 <b>كابل أرضي</b>: سيتم رسم الخط بنمط <b>متقطع (Dashed: - - -)</b> باللون الأزرق المعتمد.";
    sizeSelect.innerHTML = `
      <option value="3*300">3*300 مم²</option>
      <option value="3*240" selected>3*240 مم²</option>
      <option value="3*150">3*150 مم²</option>
      <option value="3*70">3*70 مم²</option>
    `;
  } else {
    titleEl.textContent = "➖ رسم خط هوائي (خط متصل سليم)";
    previewNote.innerHTML = "💡 <b>خط هوائي</b>: سيتم رسم الخط بنمط <b>متصل سليم مكتمل (Solid: ───)</b> باللون الأخضر المعتمد.";
    sizeSelect.innerHTML = `
      <option value="150/25">150/25 (رئيسي)</option>
      <option value="70/12" selected>70/12 (تفريعات)</option>
      <option value="سبيكة">سبيكة ألومنيوم AAAC</option>
      <option value="35/6">35/6</option>
    `;
  }

  populateNodeDropdowns();

  // اقتراح آخر نود كافتراضي
  const lastNode = currentProject.nodes[currentProject.nodes.length - 1];
  const nextNum = currentProject.nodes.length + 1;
  if (lastNode) document.getElementById("dlg-from-node").value = lastNode.id;
  document.getElementById("dlg-to-node").value = "N" + nextNum;
  document.getElementById("dlg-length").value = isCable ? "1500" : "2000";
  const targetDir = window.drawingFlowDirection || "down";
  const dirRadio = document.querySelector(`input[name="dlg-dir"][value="${targetDir}"]`);
  if (dirRadio) dirRadio.checked = true;

  // إعادة ضبط وضع النود الوجهة: افتراضي = إنشاء جديد
  const toNewRadio = document.getElementById("dlg-to-new-radio");
  if (toNewRadio) toNewRadio.checked = true;
  onDlgToModeChange();

  // تعبئة dropdown النود القائم بجميع النودات (باستثناء نود البداية)
  _populateExistingNodeDropdown();

  // إعادة ضبط السكينة
  const addSwChk = document.getElementById("dlg-add-switch");
  if (addSwChk) addSwChk.checked = false;
  const swDetails = document.getElementById("dlg-switch-details");
  if (swDetails) swDetails.style.display = "none";

  onLineFromNodeChange();
  modal.classList.remove("hidden");
}

// تعبئة dropdown النودات القائمة لاختيار الوجهة
function _populateExistingNodeDropdown() {
  const sel = document.getElementById("dlg-to-existing-node");
  if (!sel || !currentProject) return;
  const fromId = document.getElementById("dlg-from-node")?.value;
  let opts = "";
  currentProject.nodes.forEach(n => {
    if (n.id === fromId) return; // استبعاد نود البداية
    const typeLabel = n.type === "substation" ? "محطة" :
                      n.type === "switch" ? "سكينة" :
                      n.type === "kiosk" ? "كشك" :
                      n.type === "transformer" ? "محول" :
                      n.type === "junction" ? "نقطة ربط" : n.type;
    opts += `<option value="${n.id}">[${n.id}] ${n.name || typeLabel}</option>`;
  });
  sel.innerHTML = opts || `<option value="">— لا توجد نودات قائمة —</option>`;
}
window._populateExistingNodeDropdown = _populateExistingNodeDropdown;

// تبديل عرض حقل الوجهة (قائم أو جديد)
function onDlgToModeChange() {
  const mode = document.querySelector('input[name="dlg-to-mode"]:checked')?.value || "new";
  const existingWrap = document.getElementById("dlg-to-existing-wrap");
  const newWrap = document.getElementById("dlg-to-new-wrap");
  if (existingWrap) existingWrap.style.display = (mode === "existing") ? "block" : "none";
  if (newWrap) newWrap.style.display = (mode === "new") ? "block" : "none";
  if (mode === "existing") _populateExistingNodeDropdown();
}
window.onDlgToModeChange = onDlgToModeChange;

function onLineFromNodeChange() {
  if (!currentProject) return;
  const fromId = document.getElementById("dlg-from-node")?.value;
  const fromNode = currentProject.nodes.find(n => n.id === fromId);
  const group = document.getElementById("dlg-switch-tap-group");
  const chk = document.getElementById("dlg-switch-tap-direct");
  if (group) {
    const isSw = (fromNode && fromNode.type === "switch");
    group.style.display = isSw ? "block" : "none";
    if (isSw && chk) {
      const dirEl = document.querySelector('input[name="dlg-dir"]:checked');
      const dir = dirEl ? dirEl.value : "down";
      const swDir = fromNode.direction || "vertical";
      const isAligned = (swDir === "vertical" && (dir === "down" || dir === "up")) ||
                        (swDir === "horizontal" && (dir === "right" || dir === "left"));
      // إذا كان الاتجاه متعامداً مع السكينة فهو تفريعة ربط مباشر قبل السكينة تلقائياً
      // وإذا كان متطابقاً مع محور السكينة فهو الخط المحكوم بسيف السكينة
      chk.checked = !isAligned;
    }
  }
}

function closeLineDialog() {
  document.getElementById("line-dialog-modal").classList.add("hidden");
}

// أخذ مناول من أي خط أو نود
function openTakeTapDialog() {
  openLineDialog("هوائي");
  document.getElementById("line-dialog-title").textContent = "⚡ أخذ مناول / تفريعة جديدة من خط";
}

// --- نافذة تفريع محول من محول آخر مع تحديد نود الأخذ ونود جديد ومنع التكرار ---
function openCascadeTransformerDialog() {
  if (window.hasPermission && !window.hasPermission('btn_cascade_trans')) {
    showToast("⛔ ليس لديك صلاحية تفريع محول من محول", "error");
    return;
  }
  if (!currentProject || !currentProject.nodes || currentProject.nodes.length === 0) {
    alert("الرجاء إضافة محطة محولات أو نود بالمخطط أولاً.");
    return;
  }

  // فرز العقد المتاحة للأخذ: المحولات، الأكشاك، المحطات، ونقاط الربط
  const allSources = currentProject.nodes.filter(n => n.type === 'transformer' || n.type === 'kiosk' || n.type === 'substation' || n.type === 'junction');
  
  if (allSources.length === 0) {
    alert("لا توجد محولات أو عقد سابقة بالمخطط لتفريع محول منها.");
    return;
  }

  const selectEl = document.getElementById("cas-source-node");
  let optsHTML = "";
  
  // وضع المحولات في أعلى القائمة لأولوية الاختيار
  const sorted = [...allSources].sort((a, b) => {
    if (a.type === 'transformer' && b.type !== 'transformer') return -1;
    if (b.type === 'transformer' && a.type !== 'transformer') return 1;
    return 0;
  });

  sorted.forEach(t => {
    const isSel = (selectedElement && selectedElement.type === 'node' && selectedElement.id === t.id);
    const typeLabel = (t.type === 'transformer') ? 'محول' : (t.type === 'kiosk' ? 'كشك' : (t.type === 'substation' ? 'محطة' : 'نقطة'));
    optsHTML += `<option value="${t.id}" ${isSel ? 'selected' : ''}>[${t.id}] ${t.name || typeLabel} (${t.capacity ? t.capacity + ' KVA' : typeLabel})</option>`;
  });
  selectEl.innerHTML = optsHTML;

  // توليد واقتراح رقم نود جديد فريد غير مكرر إطلاقاً
  let nextNum = currentProject.nodes.length + 1;
  while (currentProject.nodes.some(n => n.id === "N" + nextNum)) {
    nextNum++;
  }
  const suggestedId = "N" + nextNum;
  document.getElementById("cas-new-node-id").value = suggestedId;

  // اقتراح اسم المحول الجديد
  const transCount = currentProject.nodes.filter(n => n.type === 'transformer').length + 1;
  document.getElementById("cas-name").value = "محول " + transCount;

  // تحديث التلميح وفحص عدم التكرار الأولي
  onCascadeSourceChange();
  validateCascadeNodeId();

  const casDir = document.getElementById("cas-dir");
  if (casDir && (window.drawingFlowDirection === "up" || window.drawingFlowDirection === "down")) {
    casDir.value = window.drawingFlowDirection;
  }

  document.getElementById("cascade-transformer-modal").classList.remove("hidden");
}

function closeCascadeTransformerDialog() {
  const modal = document.getElementById("cascade-transformer-modal");
  if (modal) modal.classList.add("hidden");
}

function onCascadeSourceChange() {
  if (!currentProject) return;
  const sourceId = document.getElementById("cas-source-node").value;
  const sourceNode = currentProject.nodes.find(n => n.id === sourceId);
  const hintEl = document.getElementById("cas-source-hint");
  if (sourceNode && hintEl) {
    hintEl.textContent = `📍 نود الأخذ المحدد: [${sourceNode.id}] - ${sourceNode.name || sourceNode.type} (${sourceNode.capacity ? sourceNode.capacity + ' KVA' : ''})`;
  }
}

// دالة التحقق الحازم من عدم تكرار رقم النود الجديد
function validateCascadeNodeId() {
  const inputEl = document.getElementById("cas-new-node-id");
  const errorEl = document.getElementById("cas-node-error");
  if (!inputEl || !errorEl || !currentProject) return true;

  const candidateId = inputEl.value.trim().toUpperCase();
  if (!candidateId) {
    errorEl.style.display = "block";
    errorEl.textContent = "⚠️ يرجى كتابة رقم النود الجديد (مثل N5).";
    inputEl.style.borderColor = "#fc8181";
    return false;
  }

  // فحص هل النود مستخدم بالفعل في المشروع
  const isDuplicate = currentProject.nodes.some(n => n.id === candidateId);
  if (isDuplicate) {
    errorEl.style.display = "block";
    errorEl.textContent = `⚠️ تنبيه: رقم النود (${candidateId}) مستخدم بالفعل في المخطط! يرجى اختيار رقم نود فريد لمنع التكرار.`;
    inputEl.style.borderColor = "#fc8181";
    return false;
  } else {
    errorEl.style.display = "none";
    inputEl.style.borderColor = "#38a169";
    return true;
  }
}

function onCascadeLineTypeChange() {
  const type = document.getElementById("cas-line-type").value;
  const sizeSelect = document.getElementById("cas-line-size");
  if (type === "كابل") {
    sizeSelect.innerHTML = `
      <option value="3*150">3*150 مم²</option>
      <option value="3*70" selected>3*70 مم²</option>
      <option value="3*240">3*240 مم²</option>
    `;
  } else {
    sizeSelect.innerHTML = `
      <option value="70/12" selected>70/12</option>
      <option value="35/6">35/6</option>
      <option value="150/25">150/25</option>
      <option value="سبيكة">سبيكة AAAC</option>
    `;
  }
}

function submitCascadeTransformerDialog() {
  if (!currentProject) return;

  // التحقق الحازم من عدم تكرار رقم النود
  if (!validateCascadeNodeId()) {
    const candidateId = document.getElementById("cas-new-node-id").value.trim().toUpperCase();
    alert(`لا يمكن الحفظ: رقم النود (${candidateId}) مستخدم بالفعل بالمخطط! يرجى تغيير رقم النود لتجنب التكرار.`);
    document.getElementById("cas-new-node-id").focus();
    return;
  }

  saveHistoryState();

  const sourceId = document.getElementById("cas-source-node").value;
  const sourceNode = currentProject.nodes.find(n => n.id === sourceId);
  if (!sourceNode) {
    alert("نود المحول المغذي (المصدر) غير موجود بالمخطط!");
    return;
  }

  const newNodeId = document.getElementById("cas-new-node-id").value.trim().toUpperCase();
  const name = document.getElementById("cas-name").value.trim() || "محول جديد";
  const cap = parseFloat(document.getElementById("cas-cap").value) || 100;
  const loadPct = parseFloat(document.getElementById("cas-load").value) || 78;

  const lineType = document.getElementById("cas-line-type").value;
  const lineSize = document.getElementById("cas-line-size").value;
  const lineLen = parseFloat(document.getElementById("cas-line-len").value) || 800;
  const dir = document.getElementById("cas-dir").value;

  const startPt = (typeof Components !== "undefined" && Components.getTerminalPoint) ?
    Components.getTerminalPoint(sourceNode, true, null) :
    { x: sourceNode.x, y: sourceNode.y };

  // حساب إحداثيات المحول الجديد
  let dx = 0, dy = 0;
  if (dir === "right") dx = 260;
  else if (dir === "down") dy = 220;
  else if (dir === "up") dy = -220;
  else if (dir === "left") dx = -260;

  const newTransNode = {
    id: newNodeId,
    type: "transformer",
    name: name,
    capacity: cap,
    loading_pct: loadPct,
    direction: (dir === "down") ? "down" : "up",
    x: startPt.x + dx,
    y: startPt.y + dy
  };
  currentProject.nodes.push(newTransNode);

  // ربط الخط / الكابل بين المحول المصدر والمحول المتفرع
  currentProject.sections.push({
    id: "S" + (currentProject.sections.length + 1),
    name: `تفريعة ${name}`,
    from_node: sourceId,
    to_node: newNodeId,
    type: lineType,
    size: lineSize,
    length: lineLen,
    direction: dir
  });

  closeCascadeTransformerDialog();
  renderNetwork();
  showToast(`🔄 تم تفريع المحول [${name}] بنود [${newNodeId}] بنجاح من المحول [${sourceId}] (${lineLen}م)`, "success");
}

// نافذة إضافة كشك من كشك آخر (تغذية متتالية بكابل أرضي متقطع)
function openKioskFromKioskDialog() {
  if (window.hasPermission && !window.hasPermission('btn_kiosk_from_kiosk')) {
    showToast("⛔ ليس لديك صلاحية إضافة كشك من كشك آخر", "error");
    return;
  }
  if (!currentProject || !currentProject.nodes) return;
  const kiosksAndSubs = currentProject.nodes.filter(n => n.type === 'kiosk' || n.type === 'substation' || n.type === 'rmu');

  if (kiosksAndSubs.length === 0) {
    alert("لا يوجد أي كشك أو محطة حالية لتفريع كشك جديد منها.");
    return;
  }

  const selectEl = document.getElementById("kfk-source-node");
  let optsHTML = "";
  kiosksAndSubs.forEach(k => {
    const isSel = (selectedElement && selectedElement.type === 'node' && selectedElement.id === k.id);
    optsHTML += `<option value="${k.id}" ${isSel ? 'selected' : ''}>${k.id} - ${k.name || k.type} (${k.capacity ? k.capacity + 'kVA' : ''})</option>`;
  });
  selectEl.innerHTML = optsHTML;

  const count = currentProject.nodes.filter(n => n.type === 'kiosk').length + 1;
  document.getElementById("kfk-name").value = "كشك " + count;
  const kfkFeedthrough = document.getElementById("kfk-feedthrough");
  if (kfkFeedthrough) kfkFeedthrough.checked = false;

  document.getElementById("kiosk-from-kiosk-modal").classList.remove("hidden");
}

function closeKioskFromKioskDialog() {
  document.getElementById("kiosk-from-kiosk-modal").classList.add("hidden");
}

function submitKioskFromKioskDialog() {
  if (!currentProject) return;

  saveHistoryState();
  const sourceId = document.getElementById("kfk-source-node").value;
  const sourceNode = currentProject.nodes.find(n => n.id === sourceId);
  if (!sourceNode) {
    alert("الكشك المغذي غير موجود!");
    return;
  }

  // الكشك المصدر تم أخذ كابل منه لكشك آخر فيصبح حلقياً
  sourceNode.has_outgoing = true;
  const outTerm = document.getElementById("kfk-outgoing-term")?.value || "bottom";
  sourceNode.outgoing_terminal = outTerm;

  const name = document.getElementById("kfk-name").value.trim() || "كشك جديد";
  const cap = parseFloat(document.getElementById("kfk-cap").value) || 300;
  const loadPct = parseFloat(document.getElementById("kfk-load").value) || 65;
  const switches = parseInt(document.getElementById("kfk-switches").value) || 2;
  const isFeedthrough = !!document.getElementById("kfk-feedthrough")?.checked;

  const cableLen = parseFloat(document.getElementById("kfk-cable-len").value) || 350;
  const cableSize = document.getElementById("kfk-cable-size").value;
  const dirEl = document.querySelector('input[name="kfk-dir"]:checked');
  const dir = dirEl ? dirEl.value : "right";

  const startPt = (typeof Components !== "undefined" && Components.getTerminalPoint) ?
    Components.getTerminalPoint(sourceNode, true, null) :
    { x: sourceNode.x, y: sourceNode.y };

  let dx = 0, dy = 0;
  if (dir === "right") dx = 280;
  else if (dir === "down") dy = 240;
  else if (dir === "up") dy = -240;
  else if (dir === "left") dx = -280;

  const nextNodeId = "N" + (currentProject.nodes.length + 1);
  const targetDir = sourceNode.direction || "up";
  const tempTarget = { type: "kiosk", direction: targetDir, has_outgoing: isFeedthrough };
  const targetOff = (typeof Components !== "undefined" && Components.getKioskTerminalOffset) ?
    Components.getKioskTerminalOffset(tempTarget, false) : { dx: 0, dy: 0 };

  const newKioskNode = {
    id: nextNodeId,
    type: "kiosk",
    name: name,
    capacity: cap,
    loading_pct: loadPct,
    switches_count: switches,
    direction: targetDir,
    has_outgoing: isFeedthrough,
    x: startPt.x + dx - targetOff.dx,
    y: startPt.y + dy - targetOff.dy
  };
  currentProject.nodes.push(newKioskNode);

  // ربط الكابل المتقطع بين الكشكين
  currentProject.sections.push({
    id: "S" + (currentProject.sections.length + 1),
    from_node: sourceNode.id,
    to_node: newKioskNode.id,
    type: "كابل",
    size: cableSize,
    length: cableLen,
    direction: dir
  });

  closeKioskFromKioskDialog();
  renderNetwork();
  showToast(`🔺 تم تفريع ${name} (${cap}kVA) من ${sourceNode.name} بكابل متقطع ${cableLen}م`, "success");
}

function submitLineDialog() {
  if (!currentProject) return;

  saveHistoryState();
  const fromNodeId = document.getElementById("dlg-from-node").value.trim().toUpperCase();
  const length = parseFloat(document.getElementById("dlg-length").value) || 1000;
  const size = document.getElementById("dlg-size").value;
  const dirEl = document.querySelector('input[name="dlg-dir"]:checked');
  const dir = dirEl ? dirEl.value : "down";

  // --- تحديد وضع الوجهة: نود قائم أو جديد ---
  const toMode = document.querySelector('input[name="dlg-to-mode"]:checked')?.value || "new";
  let toNodeId;
  let connectToExisting = false;

  if (toMode === "existing") {
    toNodeId = document.getElementById("dlg-to-existing-node")?.value;
    if (!toNodeId) { alert("الرجاء اختيار النود الوجهة القائم!"); return; }
    connectToExisting = true;
  } else {
    toNodeId = document.getElementById("dlg-to-node").value.trim().toUpperCase();
  }

  const fromNode = currentProject.nodes.find(n => n.id === fromNodeId);
  if (!fromNode) {
    alert(`العقدة المصدر (${fromNodeId}) غير موجودة بالمخطط!`);
    return;
  }

  const isFromSwitch = (fromNode && fromNode.type === "switch");
  const isDirectTap = isFromSwitch && (document.getElementById("dlg-switch-tap-direct")?.checked !== false);
  const tapSide = isFromSwitch ? (isDirectTap ? "before_switch" : "after_switch") : undefined;

  // --- تحديد موقع النود الوجهة ---
  let toNode = currentProject.nodes.find(n => n.id === toNodeId);

  if (connectToExisting) {
    // ربط بنود قائم — النود موجود مسبقاً
    if (!toNode) {
      alert(`النود القائم (${toNodeId}) غير موجود بالمخطط!`);
      return;
    }
  } else {
    // إنشاء نود جديد بموقع مناسب
    let targetX = fromNode.x;
    let targetY = fromNode.y;
    if (dir === "down") targetY += 220;
    else if (dir === "up") targetY -= 220;
    else if (dir === "right") targetX += 260;
    else if (dir === "left") targetX -= 260;

    if (!toNode) {
      toNode = {
        id: toNodeId,
        type: "junction",
        name: `نقطة ${toNodeId}`,
        x: targetX,
        y: targetY
      };
      currentProject.nodes.push(toNode);
    }
  }

  // --- خيار إضافة سكينة في نهاية الخط (ربط حلقي) ---
  const addSwitch = document.getElementById("dlg-add-switch")?.checked;

  if (addSwitch) {
    const swName = document.getElementById("dlg-sw-name")?.value?.trim() || "سكينة ربط حلقي";
    const swState = document.getElementById("dlg-sw-state")?.value || "open";
    const swDirChoice = document.getElementById("dlg-sw-dir")?.value || "auto";

    // حساب اتجاه السكينة
    let swDir, swDirection;
    if (swDirChoice !== "auto") {
      swDir = swDirChoice;
      swDirection = (swDir === "left" || swDir === "right") ? "horizontal" : "vertical";
    } else {
      swDir = dir;
      swDirection = (dir === "right" || dir === "left") ? "horizontal" : "vertical";
    }

    // توليد ID فريد للسكينة
    let swNum = currentProject.nodes.length + 1;
    while (currentProject.nodes.some(n => n.id === "N" + swNum)) swNum++;
    const swNodeId = "N" + swNum;

    // موقع السكينة: قبل النود الوجهة مباشرةً
    // نحسب موقعاً قريباً من toNode لكن على امتداد خط الاتجاه
    let swX, swY;
    if (connectToExisting) {
      // موقع السكينة بين نود البداية ونود الوجهة (ثلثان من البداية)
      swX = Math.round(fromNode.x + (toNode.x - fromNode.x) * 0.7);
      swY = Math.round(fromNode.y + (toNode.y - fromNode.y) * 0.7);
    } else {
      // موقع السكينة عند نهاية الخط مع إزاحة بسيطة قبل النود الجديد
      swX = toNode.x;
      swY = toNode.y;
      if (dir === "down") swY -= 50;
      else if (dir === "up") swY += 50;
      else if (dir === "right") swX -= 50;
      else if (dir === "left") swX += 50;
    }

    // إنشاء نود السكينة
    const switchNode = {
      id: swNodeId,
      type: "switch",
      name: swName,
      direction: swDirection,
      dir: swDir,
      state: swState,
      x: swX,
      y: swY
    };
    currentProject.nodes.push(switchNode);

    // توليد IDs فريدة للمقاطع
    let nextSecNum = currentProject.sections.length + 1;
    while (currentProject.sections.some(s => s.id === "S" + nextSecNum)) nextSecNum++;

    const mainLen = Math.round(length * 0.8);
    const swLen = length - mainLen;

    // الخط الأول: من المصدر إلى السكينة
    currentProject.sections.push({
      id: "S" + nextSecNum,
      from_node: fromNodeId,
      to_node: swNodeId,
      type: currentLineDialogType,
      size: size,
      length: mainLen,
      direction: dir,
      tap_side: tapSide
    });
    nextSecNum++;
    while (currentProject.sections.some(s => s.id === "S" + nextSecNum)) nextSecNum++;

    // الخط الثاني: من السكينة إلى نود الوجهة
    currentProject.sections.push({
      id: "S" + nextSecNum,
      from_node: swNodeId,
      to_node: toNodeId,
      type: currentLineDialogType,
      size: size,
      length: swLen,
      direction: dir
    });

    closeLineDialog();
    renderNetwork();
    const modeLabel = connectToExisting ? `(ربط بنود قائم [${toNodeId}])` : `(نود جديد [${toNodeId}])`;
    showToast(`⚡ تم رسم ${currentLineDialogType === 'كابل' ? 'كابل' : 'خط هوائي'} مع سكينة [${swName}] ${modeLabel}`, "success");

  } else {
    // الحالة العادية: خط مباشر بدون سكينة
    let nextSecNum = currentProject.sections.length + 1;
    while (currentProject.sections.some(s => s.id === "S" + nextSecNum)) nextSecNum++;

    currentProject.sections.push({
      id: "S" + nextSecNum,
      from_node: fromNodeId,
      to_node: toNodeId,
      type: currentLineDialogType,
      size: size,
      length: length,
      direction: dir,
      tap_side: tapSide
    });

    closeLineDialog();
    renderNetwork();
    const modeLabel = connectToExisting ? `ربط بنود قائم [${toNodeId}]` : `نود جديد [${toNodeId}]`;
    showToast(`➕ تم رسم ${currentLineDialogType === 'كابل' ? 'كابل متقطع' : 'خط هوائي سليم'} بطول ${length}م — ${modeLabel}`, "success");
  }
}

// دالة إظهار/إخفاء تفاصيل السكينة عند تفعيل/إلغاء الخيار
function onDlgAddSwitchChange() {
  const chk = document.getElementById("dlg-add-switch");
  const details = document.getElementById("dlg-switch-details");
  if (details) {
    details.style.display = chk && chk.checked ? "block" : "none";
  }
}
window.onDlgAddSwitchChange = onDlgAddSwitchChange;

// نافذة المحولات والأكشاك المتطورة مع ربط خط التغذية فوراً
// نافذة المحولات والأكشاك المتطورة مع ربط خط التغذية فوراً
function openTransformerDialog(type) {
  const reqPerm = (type === "kiosk") ? "btn_kiosk" : "btn_trans";
  if (window.hasPermission && !window.hasPermission(reqPerm)) {
    showToast(`⛔ ليس لديك صلاحية إضافة ${type === 'kiosk' ? 'كشك محولات' : 'محول معلق'}`, "error");
    return;
  }
  if (!currentProject || currentProject.nodes.length === 0) {
    alert("الرجاء إضافة محطة محولات أو لوحة توزيع أولاً.");
    return;
  }
  currentTransDialogType = type;
  const isKiosk = (type === "kiosk");
  const modal = document.getElementById("trans-dialog-modal");
  const titleEl = document.getElementById("trans-dialog-title");
  const switchesGroup = document.getElementById("dlg-switches-group");
  const feedthroughGroup = document.getElementById("dlg-kiosk-feedthrough-group");
  const feedthroughChk = document.getElementById("dlg-kiosk-feedthrough");

  populateNodeDropdowns();

  if (isKiosk) {
    titleEl.textContent = "🔺 إضافة كشك محولات";
    switchesGroup.style.display = "block";
    if (feedthroughGroup) feedthroughGroup.style.display = "block";
    if (feedthroughChk) feedthroughChk.checked = false; // افتراضياً مغلق (محول فقط)
    document.getElementById("dlg-trans-name").value = "كشك " + (currentProject.nodes.filter(n => n.type === "kiosk").length + 1);
    document.getElementById("dlg-trans-cap").value = "500";
    document.getElementById("dlg-trans-load").value = "65";
  } else {
    titleEl.textContent = "⚙️ إضافة محول معلق";
    switchesGroup.style.display = "none";
    if (feedthroughGroup) feedthroughGroup.style.display = "none";
    document.getElementById("dlg-trans-name").value = "محول " + (currentProject.nodes.filter(n => n.type === "transformer").length + 1);
    document.getElementById("dlg-trans-cap").value = "100";
    document.getElementById("dlg-trans-load").value = "75";
  }

  // توليد رقم نود فريد غير مكرر
  let nextNum = currentProject.nodes.length + 1;
  while (currentProject.nodes.some(n => n.id === "N" + nextNum)) {
    nextNum++;
  }
  document.getElementById("dlg-trans-node").value = "N" + nextNum;

  // اختيار آخر نود أو النود المحدد كنقطة أخذ
  const lastNode = currentProject.nodes[currentProject.nodes.length - 1];
  const targetId = (selectedElement && selectedElement.type === 'node') ? selectedElement.id : (lastNode ? lastNode.id : null);
  const srcSelect = document.getElementById("dlg-trans-source");
  if (srcSelect && targetId) {
    srcSelect.value = targetId;
  }

  // ضبط حالة اتشك بوكس نفس النود
  const sameNodeChk = document.getElementById("dlg-trans-same-node");
  const sameNodeLabel = document.getElementById("dlg-trans-same-node-label");
  if (sameNodeLabel) {
    sameNodeLabel.textContent = isKiosk ? "📌 تثبيت الكشك على نفس النود دون تحديد نود آخر" : "📌 تثبيت المحول على نفس النود دون تحديد نود آخر";
  }
  if (sameNodeChk) {
    const defaultNode = currentProject.nodes.find(n => n.id === targetId);
    // إذا كان النود الحالي نقطة رسم تفريعية فارغة (junction)، نفعل التثبيت على نفس النود تلقائياً للتسهيل
    sameNodeChk.checked = !!(defaultNode && defaultNode.type === "junction");
  }

  onTransLineTypeChange();
  onTransSameNodeChange();
  modal.classList.remove("hidden");
}

function onTransSameNodeChange() {
  if (!currentProject) return;
  const isSameNode = !!document.getElementById("dlg-trans-same-node")?.checked;
  const isKiosk = (currentTransDialogType === "kiosk");
  const newNodeGroup = document.getElementById("dlg-trans-new-node-group");
  const lineGroup = document.getElementById("dlg-trans-line-group");
  const switchTapGroup = document.getElementById("dlg-trans-switch-tap-group");
  const sourceLabel = document.getElementById("dlg-trans-source-label");
  const dirLabel = document.getElementById("dlg-trans-dir-label");
  const submitBtn = document.getElementById("dlg-trans-submit-btn");
  const targetId = document.getElementById("dlg-trans-source")?.value || "";
  const targetNode = currentProject.nodes.find(n => n.id === targetId);

  if (isSameNode) {
    if (newNodeGroup) newNodeGroup.style.display = "none";
    if (lineGroup) lineGroup.style.display = "none";
    if (switchTapGroup) switchTapGroup.style.display = "none";
    if (sourceLabel) sourceLabel.innerHTML = `📍 النود المستهدف (تثبيت ${isKiosk ? 'الكشك' : 'المحول'} عليه مباشرة):`;
    if (dirLabel) dirLabel.textContent = `اتجاه وضع رمز ${isKiosk ? 'الكشك' : 'المحول'}:`;
    if (submitBtn) {
      submitBtn.innerHTML = `<span>📌 تثبيت ${isKiosk ? 'الكشك' : 'المحول'} على النود [${targetId}] فوراً ➔</span>`;
    }
    const nameInput = document.getElementById("dlg-trans-name");
    if (nameInput && targetNode) {
      if (targetNode.name && !targetNode.name.startsWith("نقطة") && !targetNode.name.startsWith("محطة")) {
        nameInput.value = targetNode.name;
      }
    }
  } else {
    if (newNodeGroup) newNodeGroup.style.display = "block";
    if (lineGroup) lineGroup.style.display = "block";
    if (switchTapGroup) {
      const isSw = (targetNode && targetNode.type === "switch");
      switchTapGroup.style.display = isSw ? "block" : "none";
      const transChk = document.getElementById("dlg-trans-switch-tap-direct");
      if (isSw && transChk) {
        const dirEl = document.querySelector('input[name="dlg-trans-dir"]:checked');
        const dir = dirEl ? dirEl.value : "right";
        const swDir = targetNode.direction || "vertical";
        const isAligned = (swDir === "vertical" && (dir === "down" || dir === "up")) ||
                          (swDir === "horizontal" && (dir === "right" || dir === "left"));
        transChk.checked = !isAligned;
      }
    }
    if (sourceLabel) sourceLabel.innerHTML = "نقطة الأخذ / النود المغذي:";
    if (dirLabel) dirLabel.textContent = "اتجاه تفريع المحول بالنسبة لنود الأخذ:";
    if (submitBtn) {
      submitBtn.innerHTML = `<span>➕ إضافة ${isKiosk ? 'الكشك' : 'المحول'} فوراً ➔</span>`;
    }
  }
}

function onTransSourceChange() {
  onTransSameNodeChange();
}

function onTransLineTypeChange() {
  if (window._updateLineSizeSelects) { window._updateLineSizeSelects(); return; }
  const lineType = document.getElementById("dlg-trans-line-type")?.value || "كابل";
  const sizeSelect = document.getElementById("dlg-trans-line-size");
  if (!sizeSelect) return;
  if (lineType === "كابل") {
    sizeSelect.innerHTML = `
      <option value="3*150" selected>3*150 مم²</option>
      <option value="3*240">3*240 مم²</option>
      <option value="3*300">3*300 مم²</option>
      <option value="3*70">3*70 مم²</option>
    `;
  } else {
    sizeSelect.innerHTML = `
      <option value="70/12" selected>70/12 (تفريعات)</option>
      <option value="150/25">150/25 (رئيسي)</option>
      <option value="35/6">35/6</option>
      <option value="سبيكة">سبيكة AAAC</option>
    `;
  }
}

function closeTransDialog() {
  document.getElementById("trans-dialog-modal").classList.add("hidden");
}

function submitTransDialog() {
  if (!currentProject) return;
  saveHistoryState();

  const isSameNode = !!document.getElementById("dlg-trans-same-node")?.checked;
  const isKiosk = (currentTransDialogType === "kiosk");
  const sourceId = document.getElementById("dlg-trans-source")?.value;
  const name = document.getElementById("dlg-trans-name").value.trim() || (isKiosk ? "كشك" : "محول");
  const cap = parseFloat(document.getElementById("dlg-trans-cap").value) || 100;
  const loadPct = parseFloat(document.getElementById("dlg-trans-load").value) || 75;
  const switches = parseInt(document.getElementById("dlg-trans-switches")?.value) || 2;
  const dirEl = document.querySelector('input[name="dlg-trans-dir"]:checked');
  const dir = dirEl ? dirEl.value : (isKiosk ? "right" : "left");
  const isFeedthrough = isKiosk && (!!document.getElementById("dlg-kiosk-feedthrough")?.checked);

  // 1. خيار التثبيت على نفس النود دون تحديد نود آخر
  if (isSameNode) {
    const targetNode = currentProject.nodes.find(n => n.id === sourceId);
    if (!targetNode) {
      alert("النود المستهدف غير موجود!");
      return;
    }

    targetNode.type = isKiosk ? "kiosk" : "transformer";
    targetNode.name = name;
    targetNode.capacity = cap;
    targetNode.loading_pct = loadPct;
    targetNode.direction = dir;
    if (isKiosk) {
      targetNode.switches_count = switches;
      targetNode.has_outgoing = isFeedthrough;
      const dlgOutTerm = document.getElementById("dlg-kiosk-outgoing-term")?.value || "bottom";
      targetNode.outgoing_terminal = dlgOutTerm;
    }

    closeTransDialog();
    renderNetwork();
    showToast(`📌 تم تثبيت ${isKiosk ? 'الكشك' : 'المحول'} [${name}] على نفس النود [${targetNode.id}] (${cap}KVA) بنجاح!`, "success");
    return;
  }

  // 2. خيار إضافة نود جديد مع خط/كابل التغذية
  let nodeId = document.getElementById("dlg-trans-node").value.trim().toUpperCase();
  const lineType = document.getElementById("dlg-trans-line-type")?.value || "كابل";
  const lineSize = document.getElementById("dlg-trans-line-size")?.value || "3*150";
  const lineLen = parseFloat(document.getElementById("dlg-trans-line-len")?.value) || 200;

  // منع تكرار النود
  if (!nodeId) {
    let num = currentProject.nodes.length + 1;
    while (currentProject.nodes.some(n => n.id === "N" + num)) num++;
    nodeId = "N" + num;
  } else if (currentProject.nodes.some(n => n.id === nodeId)) {
    alert(`رقم النود ${nodeId} مستخدم بالفعل! الرجاء اختيار رقم نود مختلف.`);
    return;
  }

  const sourceNode = currentProject.nodes.find(n => n.id === sourceId) || currentProject.nodes[currentProject.nodes.length - 1];
  if (!sourceNode) {
    alert("النود المغذي غير موجود!");
    return;
  }

  const isFromSwitch = (sourceNode.type === "switch");
  const isDirectTap = isFromSwitch && (document.getElementById("dlg-trans-switch-tap-direct")?.checked !== false);
  const tapSide = isFromSwitch ? (isDirectTap ? "before_switch" : "after_switch") : undefined;

  const startPt = (typeof Components !== "undefined" && Components.getTerminalPoint) ?
    Components.getTerminalPoint(sourceNode, true, { tap_side: tapSide }) :
    { x: sourceNode.x, y: sourceNode.y };

  let dx = 0, dy = 0;
  if (dir === "left") dx = -240;
  else if (dir === "right") dx = 240;
  else if (dir === "down") dy = 200;
  else if (dir === "up") dy = -200;

  const newNode = {
    id: nodeId,
    type: isKiosk ? "kiosk" : "transformer",
    name: name,
    capacity: cap,
    loading_pct: loadPct,
    switches_count: switches,
    direction: dir,
    has_outgoing: isFeedthrough,
    outgoing_terminal: isKiosk ? (document.getElementById("dlg-kiosk-outgoing-term")?.value || "bottom") : undefined,
    x: startPt.x + dx,
    y: startPt.y + dy
  };
  currentProject.nodes.push(newNode);

  // رسم خط/كابل التغذية الواصل من نود الأخذ إلى المحول مباشرة
  currentProject.sections.push({
    id: "S" + (currentProject.sections.length + 1),
    from_node: sourceNode.id,
    to_node: newNode.id,
    type: lineType,
    size: lineSize,
    length: lineLen,
    direction: dir,
    tap_side: isFromSwitch ? (isDirectTap ? "before_switch" : "after_switch") : undefined
  });

  closeTransDialog();
  renderNetwork();
  showToast(`⚙️ تم إضافة ${name} (${cap}KVA) متصلاً بـ ${lineType} (${lineLen}م)`, "success");
}

function onSidebarTypeChange() {
  // تحديث قائمة المقاطع من الإعدادات الديناميكية إن توفرت
  if (window._updateLineSizeSelects) {
    window._updateLineSizeSelects();
    return;
  }
  // Fallback: الخيارات الثابتة
  const type = document.getElementById("quick-line-type").value;
  const sizeSelect = document.getElementById("quick-line-size");
  if (type === "كابل") {
    sizeSelect.innerHTML = `
      <option value="3*300">3*300 مم²</option>
      <option value="3*240" selected>3*240 مم²</option>
      <option value="3*150">3*150 مم²</option>
      <option value="3*70">3*70 مم²</option>
    `;
  } else {
    sizeSelect.innerHTML = `
      <option value="150/25">150/25 (رئيسي)</option>
      <option value="70/12" selected>70/12 (تفريعات)</option>
      <option value="سبيكة">سبيكة ألومنيوم</option>
      <option value="35/6">35/6</option>
    `;
  }
}

function addQuickSection() {
  if (window.hasPermission && !window.hasPermission('btn_quick_line')) {
    showToast("⛔ ليس لديك صلاحية رسم خط من الشريط الجانبي", "error");
    return;
  }
  if (!currentProject || currentProject.nodes.length === 0) return;
  saveHistoryState();
  const nodes = currentProject.nodes;
  
  const fromSelect = document.getElementById("quick-from-node");
  const fromNodeId = fromSelect ? fromSelect.value : (nodes[nodes.length - 1] ? nodes[nodes.length - 1].id : "N1");
  const fromNode = nodes.find(n => n.id === fromNodeId) || nodes[nodes.length - 1];

  const nextNodeId = "N" + (nodes.length + 1);
  const type = document.getElementById("quick-line-type").value;
  const size = document.getElementById("quick-line-size").value;
  const length = parseFloat(document.getElementById("quick-line-len").value) || 1000;
  const dir = document.getElementById("quick-line-dir").value;

  const startPt = (typeof Components !== "undefined" && Components.getTerminalPoint) ?
    Components.getTerminalPoint(fromNode, true, null) :
    { x: fromNode.x, y: fromNode.y };

  let dx = 0, dy = 0;
  if (dir === "down") dy = 200;
  else if (dir === "right") dx = 250;
  else if (dir === "up") dy = -200;
  else if (dir === "left") dx = -250;

  const newNode = {
    id: nextNodeId,
    type: "junction",
    name: `نقطة ${nextNodeId}`,
    x: startPt.x + dx,
    y: startPt.y + dy
  };

  nodes.push(newNode);

  currentProject.sections.push({
    id: "S" + (currentProject.sections.length + 1),
    from_node: fromNode.id,
    to_node: newNode.id,
    type: type,
    size: size,
    length: length,
    direction: dir
  });

  renderNetwork();
  showToast(`➕ تم رسم ${type === 'كابل' ? 'كابل متقطع' : 'خط هوائي سليم'} من ${fromNode.id}`, "success");
}

function quickAddElement(type) {
  if (!currentProject) return;
  saveHistoryState();
  const nodes = currentProject.nodes;
  const lastNode = nodes[nodes.length - 1];
  const nextId = "N" + (nodes.length + 1);

  const dyStep = (window.drawingFlowDirection === 'up') ? -180 : 180;
  let newX = lastNode ? lastNode.x : 400;
  let newY = lastNode ? lastNode.y + dyStep : ((window.drawingFlowDirection === 'up') ? 1000 : 100);

  let newNode = { id: nextId, x: newX, y: newY };

  if (type === "switch_vert") {
    newNode = { ...newNode, type: "switch", name: `سكينة ${nextId}`, direction: "vertical", dir: "down", state: "closed" };
  } else if (type === "switch_horiz") {
    newNode = { ...newNode, type: "switch", name: `سكينة تفريعة ${nextId}`, direction: "horizontal", dir: "right", state: "closed" };
  } else if (type === "rmu") {
    newNode = { ...newNode, type: "rmu", name: `لوحة RMU ${nextId}`, switches_count: 3 };
  } else if (type === "substation") {
    newNode = { ...newNode, type: "substation", name: "لوحة التوزيع الرئيسية", x: 400, y: (window.drawingFlowDirection === 'up') ? 1000 : 80 };
  }

  nodes.push(newNode);

  if (lastNode && type !== "substation") {
    currentProject.sections.push({
      id: "S" + (currentProject.sections.length + 1),
      from_node: lastNode.id,
      to_node: newNode.id,
      type: (type === "rmu") ? "كابل" : "هوائي",
      size: (type === "rmu") ? "3*240" : "70/12",
      length: 1000,
      direction: "down"
    });
  }

  renderNetwork();
  showToast(`➕ تم إضافة ${newNode.name}`, "success");
}

async function updateLiveMetrics() {
  if (!currentProject) return;
  try {
    const res = await fetch("/api/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nodes: currentProject.nodes,
        sections: currentProject.sections,
        voltage_kv: currentProject.voltage_kv || 11
      })
    });
    const data = await res.json();
    const sum = data.summary;

    document.getElementById("st-total-len").textContent = `${sum.total_feeder_length_m} م`;
    document.getElementById("st-ohl-len").textContent = `${sum.total_ohl_length_m} م`;
    document.getElementById("st-ugc-len").textContent = `${sum.total_ugc_length_m} م`;
    document.getElementById("st-total-cap").textContent = `${sum.total_capacity_kva} KVA`;
    document.getElementById("st-actual-load").textContent = `${sum.total_actual_load_kva} KVA`;
    document.getElementById("st-feeder-amp").textContent = `${sum.total_feeder_current_a} A`;
    
    const dropEl = document.getElementById("st-max-drop");
    dropEl.textContent = `${sum.max_voltage_drop_pct}%`;
    if (sum.max_voltage_drop_pct > 5.0) {
      dropEl.style.color = "#E53E3E";
      dropEl.title = "تحذير: هبوط الجهد يتجاوز الحد المسموح به 5%!";
    } else {
      dropEl.style.color = "#63B3ED";
    }
  } catch (err) {
    console.warn("Metrics update failed", err);
  }
}

async function openCalculationsModal() {
  if (window.hasPermission && !window.hasPermission('btn_calculations')) {
    showToast("⛔ ليس لديك صلاحية فتح جدول الحسابات الهندسية", "error");
    return;
  }
  if (!currentProject) return;
  const modal = document.getElementById("calc-modal");
  const content = document.getElementById("calc-content");
  modal.classList.remove("hidden");
  content.innerHTML = "<p style='text-align:center; padding:20px;'>جاري تحليل الشبكة الكهربائية...</p>";

  try {
    const res = await fetch("/api/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nodes: currentProject.nodes,
        sections: currentProject.sections,
        voltage_kv: currentProject.voltage_kv || 11
      })
    });
    const data = await res.json();
    const sum = data.summary;

    let html = `
      <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; margin-bottom:20px;">
        <div style="background:#1a202c; padding:12px; border-radius:6px; border:1px solid #2d3748; text-align:center;">
          <div style="font-size:11px; color:#a0aec0;">طول المغذي الكلي</div>
          <div style="font-size:18px; font-weight:bold; color:#63b3ed; margin-top:4px;">${sum.total_feeder_length_m} م</div>
        </div>
        <div style="background:#1a202c; padding:12px; border-radius:6px; border:1px solid #2d3748; text-align:center;">
          <div style="font-size:11px; color:#a0aec0;">سعة المحولات الكلية</div>
          <div style="font-size:18px; font-weight:bold; color:#48bb78; margin-top:4px;">${sum.total_capacity_kva} KVA</div>
        </div>
        <div style="background:#1a202c; padding:12px; border-radius:6px; border:1px solid #2d3748; text-align:center;">
          <div style="font-size:11px; color:#a0aec0;">الحمل الفعلي المتوقع</div>
          <div style="font-size:18px; font-weight:bold; color:#ecc94b; margin-top:4px;">${sum.total_actual_load_kva} KVA</div>
        </div>
        <div style="background:#1a202c; padding:12px; border-radius:6px; border:1px solid #2d3748; text-align:center;">
          <div style="font-size:11px; color:#a0aec0;">أقصى هبوط جهد ΔV</div>
          <div style="font-size:18px; font-weight:bold; color:${sum.max_voltage_drop_pct > 5 ? '#e53e3e' : '#63b3ed'}; margin-top:4px;">${sum.max_voltage_drop_pct}%</div>
        </div>
      </div>

      <h4 style="margin:16px 0 8px; color:#edf2f7;">📋 جدول أحمال المحولات والأكشاك (Loads)</h4>
      <table style="width:100%; border-collapse:collapse; font-size:12px; margin-bottom:20px; text-align:center;">
        <thead>
          <tr style="background:#2b6cb0; color:#fff;">
            <th style="padding:8px; border:1px solid #4a5568;">النود</th>
            <th style="padding:8px; border:1px solid #4a5568;">الاسم</th>
            <th style="padding:8px; border:1px solid #4a5568;">النوع</th>
            <th style="padding:8px; border:1px solid #4a5568;">القدرة (KVA)</th>
            <th style="padding:8px; border:1px solid #4a5568;">نسبة التحميل</th>
            <th style="padding:8px; border:1px solid #4a5568;">الحمل الفعلي (KVA)</th>
            <th style="padding:8px; border:1px solid #4a5568;">تيار الحمل (A)</th>
          </tr>
        </thead>
        <tbody>
    `;

    data.loads.forEach(ld => {
      html += `
        <tr style="border-bottom:1px solid #2d3748;">
          <td style="padding:6px; border:1px solid #2d3748;">${ld.node_id}</td>
          <td style="padding:6px; border:1px solid #2d3748; text-align:right;">${ld.name}</td>
          <td style="padding:6px; border:1px solid #2d3748;">${ld.type}</td>
          <td style="padding:6px; border:1px solid #2d3748;">${ld.capacity_kva}</td>
          <td style="padding:6px; border:1px solid #2d3748; color:${ld.loading_pct > 100 ? '#fc8181' : '#a0aec0'}; font-weight:bold;">${ld.loading_pct}%</td>
          <td style="padding:6px; border:1px solid #2d3748;">${ld.actual_load_kva}</td>
          <td style="padding:6px; border:1px solid #2d3748;">${ld.actual_amp_mv}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>

      <h4 style="margin:16px 0 8px; color:#edf2f7;">📏 جدول المقاطع وهبوط الجهد التراكمي (Sections & Voltage Profile)</h4>
      <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:center;">
        <thead>
          <tr style="background:#1a365d; color:#fff;">
            <th style="padding:8px; border:1px solid #4a5568;">من نود</th>
            <th style="padding:8px; border:1px solid #4a5568;">إلى نود</th>
            <th style="padding:8px; border:1px solid #4a5568;">نوع الخط</th>
            <th style="padding:8px; border:1px solid #4a5568;">المقطع</th>
            <th style="padding:8px; border:1px solid #4a5568;">الطول (م)</th>
            <th style="padding:8px; border:1px solid #4a5568;">هبوط الجهد (V)</th>
            <th style="padding:8px; border:1px solid #4a5568;">الهبوط التراكمي (%)</th>
          </tr>
        </thead>
        <tbody>
    `;

    data.sections.forEach((sc, idx) => {
      const vProf = data.voltage_profile[idx] || {};
      html += `
        <tr style="border-bottom:1px solid #2d3748;">
          <td style="padding:6px; border:1px solid #2d3748;">${sc.from_node}</td>
          <td style="padding:6px; border:1px solid #2d3748;">${sc.to_node}</td>
          <td style="padding:6px; border:1px solid #2d3748;">${sc.type === 'كابل' ? 'كابل (متقطع)' : 'هوائي (سليم)'}</td>
          <td style="padding:6px; border:1px solid #2d3748;">${sc.size}</td>
          <td style="padding:6px; border:1px solid #2d3748; font-weight:bold; color:#ecc94b;">${sc.length}</td>
          <td style="padding:6px; border:1px solid #2d3748;">${vProf.section_drop_v || 0}</td>
          <td style="padding:6px; border:1px solid #2d3748; font-weight:bold; color:${(vProf.drop_percentage || 0) > 5 ? '#fc8181' : '#63b3ed'};">${vProf.drop_percentage || 0}%</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
      <div style="margin-top:16px; text-align:left; font-size:11px; color:#718096; font-style:italic;">
        جميع الحقوق محفوظة للمهندس مصطفى المغربي © ENG-MOSTAFAELMGHRABY
      </div>
    `;

    content.innerHTML = html;
  } catch (err) {
    content.innerHTML = "<p style='color:#fc8181;'>تعذر حساب البيانات الكهربائية.</p>";
  }
}

function closeCalculationsModal() {
  document.getElementById("calc-modal").classList.add("hidden");
}

async function exportToExcel() {
  if (window.hasPermission && !window.hasPermission('btn_excel')) {
    showToast("⛔ ليس لديك صلاحية تصدير ملف الإكسيل", "error");
    return;
  }
  if (!currentProject) return;
  try {
    const res = await fetch("/api/export-excel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project: currentProject, user: currentUser || {} })
    });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentProject.name || "Feeder"}_SLD_Report.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    showToast("📥 تم تصدير ملف Excel بنجاح!", "success");
  } catch (err) {
    alert("تعذر تصدير ملف الإكسيل. تأكد من تشغيل الخادم.");
  }
}

// --- تحميل المشروع بالكامل كعرض باور بوينت (.pptx) مع الاحتواء التلقائي التام والتنسيق المتطابق ---
async function downloadProjectPPTX() {
  if (window.hasPermission && !window.hasPermission('btn_excel')) {
    showToast("⛔ ليس لديك صلاحية تحميل المشروع", "error");
    return;
  }
  if (!currentProject) {
    showToast("⚠️ لا يوجد مشروع مفتوح حالياً للتحميل", "warning");
    return;
  }

  showToast("⏳ جاري تجهيز وتحميل المشروع كملف PowerPoint متكامل بنفس التنسيق والاحتواء التلقائي...", "info");

  try {
    // 1. الحساب الدقيق لإحداثيات وحدود المخطط بالكامل (Auto-Containment Bounding Box)
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const nodes = currentProject.nodes || [];
    const sections = currentProject.sections || [];

    nodes.forEach(n => {
      const nx = parseFloat(n.x);
      const ny = parseFloat(n.y);
      if (!isNaN(nx)) {
        minX = Math.min(minX, nx - 90);
        maxX = Math.max(maxX, nx + 90);
      }
      if (!isNaN(ny)) {
        minY = Math.min(minY, ny - 60);
        maxY = Math.max(maxY, ny + 60);
      }
    });

    sections.forEach(s => {
      const fn = nodes.find(n => n.id === s.from_node);
      const tn = nodes.find(n => n.id === s.to_node);
      if (fn && tn) {
        minX = Math.min(minX, fn.x - 30, tn.x - 30);
        maxX = Math.max(maxX, fn.x + 30, tn.x + 30);
        minY = Math.min(minY, fn.y - 30, tn.y - 30);
        maxY = Math.max(maxY, fn.y + 30, tn.y + 30);
      }
      if (s._smartLabel) {
        const lx = parseFloat(s._smartLabel.x);
        const ly = parseFloat(s._smartLabel.y);
        if (!isNaN(lx)) { minX = Math.min(minX, lx - 75); maxX = Math.max(maxX, lx + 75); }
        if (!isNaN(ly)) { minY = Math.min(minY, ly - 35); maxY = Math.max(maxY, ly + 35); }
      }
    });

    // استخدام getBBox الفعلي من المتصفح لضمان التقاط كل عنصر بدقة متناهية
    const stageEl = document.getElementById("canvas-stage");
    if (stageEl && typeof stageEl.getBBox === "function") {
      try {
        const bb = stageEl.getBBox();
        if (bb && bb.width > 20 && bb.height > 20) {
          minX = Math.min(minX, bb.x - 35);
          maxX = Math.max(maxX, bb.x + bb.width + 35);
          minY = Math.min(minY, bb.y - 35);
          maxY = Math.max(maxY, bb.y + bb.height + 35);
        }
      } catch(e) {}
    }

    if (minX === Infinity || maxX === -Infinity) {
      minX = 100; maxX = 1200; minY = 50; maxY = 800;
    }

    // هامش أمان متناسق ومريح (50px)
    const pad = 50;
    const vbX = Math.round(minX - pad);
    const vbY = Math.round(minY - pad);
    const vbW = Math.max(400, Math.round((maxX - minX) + pad * 2));
    const vbH = Math.max(300, Math.round((maxY - minY) + pad * 2));

    // 2. استنساخ عنصر SVG وتجهيزه للتصوير عالي الدقة بنفس الألوان والتنسيق الصريح
    const svgOriginal = document.getElementById("sld-canvas");
    let imageBase64 = null;

    if (svgOriginal) {
      try {
        const svgClone = svgOriginal.cloneNode(true);
        svgClone.setAttribute("viewBox", `${vbX} ${vbY} ${vbW} ${vbH}`);
        svgClone.setAttribute("width", vbW);
        svgClone.setAttribute("height", vbH);

        // إزالة شبكة الخلفية إن وجدت لتكون خلفية المخطط في الباور بوينت ناصعة ونقية
        const bgGrid = svgClone.querySelector("#bg-grid");
        if (bgGrid) bgGrid.remove();

        // إعادة ضبط التحويلات الهندسية لتعمل بإحداثيات viewBox المباشرة
        const cloneStage = svgClone.querySelector("#canvas-stage");
        if (cloneStage) {
          cloneStage.setAttribute("transform", "translate(0, 0) scale(1)");
        }

        // إزالة مقابض السحب التفاعلية للأطوال
        svgClone.querySelectorAll(".sld-stretch-handle-group, .sld-stretch-handle, .drag-tooltip").forEach(el => el.remove());

        // تضمين أنماط صريحة وثابتة داخل الـ SVG لضمان التطابق التام 100% في الباور بوينت
        const styleEl = document.createElement("style");
        styleEl.textContent = `
          text { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; }
          .line-path { stroke-linecap: round; }
          .line-path.cable { stroke: #1E88E5 !important; stroke-dasharray: 10 6 !important; stroke-width: 3.2px !important; }
          .line-path.overhead { stroke: #16A34A !important; stroke-dasharray: none !important; stroke-width: 3.2px !important; }
          .sld-length-pill { fill: #FFFFFF !important; stroke: #94A3B8 !important; stroke-width: 1.2px !important; rx: 4px; }
          .sld-badge-text { fill: #0F172A !important; font-weight: bold !important; font-size: 11px !important; }
          .sld-node-group text { user-select: none; }
          .sld-transformer-cap, .sld-kiosk-cap { font-weight: bold !important; fill: #B45309 !important; font-size: 12px !important; }
          .sld-leader-pointer line { stroke-width: 1.5px !important; }
        `;
        svgClone.insertBefore(styleEl, svgClone.firstChild);

        // تحويل الـ SVG إلى صورة عالية الدقة عبر HTML5 Canvas
        const svgXml = new XMLSerializer().serializeToString(svgClone);
        const svgBlob = new Blob([svgXml], { type: "image/svg+xml;charset=utf-8" });
        const URL = window.URL || window.webkitURL || window;
        const blobUrl = URL.createObjectURL(svgBlob);

        imageBase64 = await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            try {
              const canvas = document.createElement("canvas");
              // معامل مضاعفة الدقة مع ضبط الحد الأقصى لمنع تضخم الذاكرة وضمان سرعة التحميل الفورية
              const maxDim = Math.max(vbW, vbH);
              let scale = 2.0;
              if (maxDim * scale > 2400) {
                scale = Math.max(1.0, 2400 / maxDim);
              }
              canvas.width = Math.round(vbW * scale);
              canvas.height = Math.round(vbH * scale);
              const ctx = canvas.getContext("2d");

              // خلفية بيضاء نقية للمخطط في الباور بوينت
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

              URL.revokeObjectURL(blobUrl);
              // محاولة الضغط بصيغة JPEG بجودة 92% لتقليل حجم النقل والحفاظ على وضوح فائق
              try {
                const jpegData = canvas.toDataURL("image/jpeg", 0.92);
                if (jpegData && jpegData.length > 200) {
                  resolve(jpegData);
                  return;
                }
              } catch (e) {}
              resolve(canvas.toDataURL("image/png"));
            } catch (canvasErr) {
              console.warn("Canvas capture warning:", canvasErr);
              URL.revokeObjectURL(blobUrl);
              resolve(null);
            }
          };
          img.onerror = () => {
            URL.revokeObjectURL(blobUrl);
            resolve(null);
          };
          img.src = blobUrl;
        });
      } catch (cloneErr) {
        console.warn("SVG processing note:", cloneErr);
      }
    }

    // 3. إرسال البيانات والصورة إلى الخادم لتوليد ملف الـ PowerPoint مع الاحتواء التلقائي
    const res = await fetch("/api/export-powerpoint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project: currentProject,
        user: currentUser || {},
        image: imageBase64,
        viewBox: { x: vbX, y: vbY, width: vbW, height: vbH }
      })
    });

    if (!res.ok) {
      let errorMsg = `Server returned ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson && errJson.error) errorMsg = errJson.error;
      } catch (e) {}
      throw new Error(errorMsg);
    }

    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    const safeName = (currentProject.name || currentProject.id || "مشروع_المخطط_الهندسي").replace(/[\\/:*?"<>|]/g, "_");
    a.download = `${safeName}.pptx`;
    document.body.appendChild(a);
    a.click();
    
    // تأخير إزالة الرابط لضمان اكتمال التنزيل في متصفحات Chrome و Edge دون إلغاء
    setTimeout(() => {
      try {
        if (a.parentNode) a.parentNode.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
      } catch (e) {}
    }, 15000);

    showToast("📥 تم تحميل المشروع بنجاح كملف PowerPoint جاهز للفتح والعرض!", "success");

    // إظهار لافتة كلمة المرور المعتمدة وإرشادات التعديل للمستخدم فوراً
    showPowerPointDownloadModal();
  } catch (err) {
    console.error("Download Project Error:", err);
    alert("تعذر تحميل المشروع بصيغة باور بوينت: " + (err.message || "تأكد من تشغيل الخادم والاتصال بالشبكة."));
  }
}

function showPowerPointDownloadModal() {
  const modal = document.getElementById("pptx-download-success-modal");
  if (modal) {
    modal.classList.remove("hidden");
  }
}

function closePowerPointDownloadModal() {
  const modal = document.getElementById("pptx-download-success-modal");
  if (modal) {
    modal.classList.add("hidden");
  }
}

function copyPowerPointPassword() {
  const pwdField = document.getElementById("pptx-modal-pwd-field");
  if (pwdField) {
    pwdField.select();
    pwdField.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(pwdField.value).then(() => {
      showToast("📋 تم نسخ كلمة المرور (1234500) بنجاح!", "success");
    }).catch(() => {
      showToast("تم النسخ: 1234500", "info");
    });
  }
}

window.downloadProjectPPTX = downloadProjectPPTX;
window.exportToPowerPoint = downloadProjectPPTX;
window.showPowerPointDownloadModal = showPowerPointDownloadModal;
window.closePowerPointDownloadModal = closePowerPointDownloadModal;
window.copyPowerPointPassword = copyPowerPointPassword;

// ==================== استيراد عروض الباور بوينت والترتيب التلقائي النظامي ====================
let pendingImportProject = null;
let pendingImportSummary = null;
let currentPptxFile = null;

function openImportPowerPointDialog() {
  pendingImportProject = null;
  pendingImportSummary = null;
  currentPptxFile = null;

  const modal = document.getElementById("import-powerpoint-modal");
  if (modal) modal.classList.remove("hidden");

  const preview = document.getElementById("pptx-preview-section");
  if (preview) preview.style.display = "none";

  const fileName = document.getElementById("pptx-file-name");
  if (fileName) { fileName.style.display = "none"; fileName.textContent = ""; }

  const loader = document.getElementById("pptx-loading-indicator");
  if (loader) loader.style.display = "none";

  const applyBtn = document.getElementById("btn-apply-pptx-import");
  if (applyBtn) applyBtn.disabled = true;

  const fileInput = document.getElementById("pptx-file-input");
  if (fileInput) fileInput.value = "";
}

function closeImportPowerPointDialog() {
  const modal = document.getElementById("import-powerpoint-modal");
  if (modal) modal.classList.add("hidden");
  pendingImportProject = null;
  pendingImportSummary = null;
  currentPptxFile = null;
}

function handlePptxDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  const dz = document.getElementById("pptx-dropzone");
  if (dz) dz.style.borderColor = "#68d391";
}

function handlePptxDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  const dz = document.getElementById("pptx-dropzone");
  if (dz) dz.style.borderColor = "#4299e1";
}

function handlePptxDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  const dz = document.getElementById("pptx-dropzone");
  if (dz) dz.style.borderColor = "#4299e1";

  if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0];
    if (file.name.toLowerCase().endsWith(".pptx")) {
      processPptxFile(file);
    } else {
      alert("يرجى اختيار ملف باور بوينت بصيغة (.pptx)");
    }
  }
}

function handlePowerPointFileInput(e) {
  if (e.target.files && e.target.files.length > 0) {
    processPptxFile(e.target.files[0]);
  }
}

async function processPptxFile(file) {
  currentPptxFile = file;
  const fileNameEl = document.getElementById("pptx-file-name");
  if (fileNameEl) {
    fileNameEl.textContent = `📄 الملف المختار: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    fileNameEl.style.display = "block";
  }

  const loader = document.getElementById("pptx-loading-indicator");
  if (loader) loader.style.display = "block";

  const preview = document.getElementById("pptx-preview-section");
  if (preview) preview.style.display = "none";

  const applyBtn = document.getElementById("btn-apply-pptx-import");
  if (applyBtn) applyBtn.disabled = true;

  try {
    let data = null;

    // 1. محاولة الاستيراد عبر الخادم إن كان متاحاً
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("force_autolayout", "false");
      formData.append("user", JSON.stringify(currentUser || {}));

      const res = await fetch("/api/import-powerpoint", {
        method: "POST",
        body: formData
      });

      if (res.ok) {
        data = await res.json();
      }
    } catch (netErr) {
      console.warn("Backend import endpoint unavailable, switching to browser-native parser:", netErr);
    }

    // 2. إذا لم يتوفر الخادم (الاستضافة السحابية أو GitHub Pages) نقوم بفك واستخراج المخطط محلياً بالمتصفح فوراً
    if (!data || !data.success || !data.project) {
      data = await parsePowerPointClientSide(file);
    }

    if (!data || !data.success || !data.project) {
      throw new Error(data?.message || "تعذر قراءة محتوى ملف الباور بوينت");
    }

    pendingImportProject = data.project;
    pendingImportSummary = data.summary || {};

    // عرض الملخص في واجهة المعاينة
    const sumFeeder = document.getElementById("pptx-sum-feeder");
    if (sumFeeder) sumFeeder.textContent = pendingImportSummary.feeder_name || data.project.name || "مغذي مستورد";

    const sumSub = document.getElementById("pptx-sum-sub");
    if (sumSub) sumSub.textContent = pendingImportSummary.substation || data.project.substation || "محطة المحولات";

    const sumVolt = document.getElementById("pptx-sum-volt");
    if (sumVolt) sumVolt.textContent = `${pendingImportSummary.voltage_kv || data.project.voltage_kv || 11} ك.ف`;

    const sumLen = document.getElementById("pptx-sum-len");
    if (sumLen) sumLen.textContent = `${(pendingImportSummary.total_length || 0).toLocaleString()} متر`;

    const sumTrans = document.getElementById("pptx-sum-trans");
    if (sumTrans) sumTrans.textContent = pendingImportSummary.transformers_count || 0;

    const sumKiosks = document.getElementById("pptx-sum-kiosks");
    if (sumKiosks) sumKiosks.textContent = pendingImportSummary.kiosks_count || 0;

    const sumSwitches = document.getElementById("pptx-sum-switches");
    if (sumSwitches) sumSwitches.textContent = pendingImportSummary.switches_count || 0;

    const nativeLabel = document.getElementById("pptx-native-layout-label");
    const radNative = document.getElementById("rad-pptx-native");
    const radAuto = document.getElementById("rad-pptx-auto");

    if (nativeLabel) {
      if (pendingImportSummary.mode === "lossless_embedded") {
        nativeLabel.style.display = "flex";
        if (radNative) radNative.checked = true;
      } else {
        nativeLabel.style.display = "none";
        if (radAuto) radAuto.checked = true;
      }
    }

    if (loader) loader.style.display = "none";
    if (preview) preview.style.display = "block";
    if (applyBtn) applyBtn.disabled = false;

  } catch (err) {
    console.error("PPTX Process Error:", err);
    if (loader) loader.style.display = "none";
    alert(`تعذر استيراد ملف الباور بوينت: ${err.message}`);
  }
}

// دالة فك واستخراج بيانات المخطط من ملف PowerPoint داخل المتصفح مباشرة (Client-Side)
async function parsePowerPointClientSide(file) {
  // فحص ما إذا كان الملف JSON / SLD مباشرة
  if (file.name.endsWith('.sld') || file.name.endsWith('.json')) {
    const text = await file.text();
    const project = JSON.parse(text);
    return {
      success: true,
      project: project,
      summary: {
        feeder_name: project.name || "مخطط مستورد",
        substation: project.substation || "محطة المحولات",
        voltage_kv: project.voltage_kv || 11,
        total_length: project.sections ? project.sections.reduce((a, s) => a + (Number(s.length_m) || 0), 0) : 0,
        transformers_count: project.nodes ? project.nodes.filter(n => n.type === 'transformer').length : 0,
        kiosks_count: project.nodes ? project.nodes.filter(n => n.type === 'kiosk').length : 0,
        switches_count: project.nodes ? project.nodes.filter(n => n.type === 'switch').length : 0,
        mode: "lossless_embedded"
      }
    };
  }

  if (typeof JSZip === "undefined") {
    throw new Error("جاري تحميل مكتبة قراءة العروض التقديمية... يرجى إعادة المحاولة خلال ثانية واحدة");
  }

  const zip = await JSZip.loadAsync(file);
  const slideFile = zip.file("ppt/slides/slide1.xml");
  if (!slideFile) {
    throw new Error("لم يتم العثور على الشريحة الأولى في ملف PowerPoint");
  }

  const slideXml = await slideFile.async("text");
  
  // استخراج المخطط المدمج فائق الدقة (Embedded Lossless SLD)
  const idx = slideXml.indexOf("SLD_DATA_JSON::");
  if (idx !== -1) {
    const sub = slideXml.substring(idx + "SLD_DATA_JSON::".length);
    const endIdx = sub.indexOf("</a:t>");
    const jsonStr = endIdx !== -1 ? sub.substring(0, endIdx) : sub;
    const unescaped = jsonStr.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    const project = JSON.parse(unescaped);
    return {
      success: true,
      project: project,
      summary: {
        feeder_name: project.name || "مخطط شبكة التوزيع",
        substation: project.substation || "محطة المحولات",
        voltage_kv: project.voltage_kv || 11,
        total_length: project.sections ? project.sections.reduce((a, s) => a + (Number(s.length_m) || 0), 0) : 0,
        transformers_count: project.nodes ? project.nodes.filter(n => n.type === 'transformer').length : 0,
        kiosks_count: project.nodes ? project.nodes.filter(n => n.type === 'kiosk').length : 0,
        switches_count: project.nodes ? project.nodes.filter(n => n.type === 'switch').length : 0,
        mode: "lossless_embedded"
      }
    };
  }

  // في حال كان ملف PowerPoint خارجي بدون بيانات مدمجة، استخراج النصوص والعناصر تلقائياً
  const textMatches = slideXml.match(/<a:t>([^<]+)<\/a:t>/g) || [];
  const extractedTexts = textMatches.map(m => m.replace(/<\/?a:t>/g, "").trim()).filter(t => t.length > 0);

  let feederName = "مغذي مستورد من PowerPoint";
  let substationName = "محطة المحولات الرئيسية";
  for (const t of extractedTexts) {
    if (t.includes("مغذي") || t.includes("خروج")) feederName = t;
    if (t.includes("محطة") || t.includes("محولات")) substationName = t;
  }

  const fallbackProject = {
    id: "feeder_pptx_" + Date.now(),
    name: feederName,
    substation: substationName,
    voltage_kv: 11.0,
    sector: "المنيا شمال",
    administration: "بني مزار شرق",
    nodes: [
      { id: "node_sub", name: substationName, type: "substation", x: 450, y: 120, status: "closed" }
    ],
    sections: []
  };

  let currentY = 240;
  let prevNodeId = "node_sub";
  let count = 1;

  for (const text of extractedTexts) {
    if (text === feederName || text === substationName || text.length < 2) continue;
    let nodeType = "switch";
    if (text.includes("محول") || text.includes("KVA") || text.includes("ك.ف.أ")) nodeType = "transformer";
    else if (text.includes("كشك") || text.includes("لوحة")) nodeType = "kiosk";

    const nodeId = "node_" + count;
    fallbackProject.nodes.push({
      id: nodeId,
      name: text,
      type: nodeType,
      x: 450,
      y: currentY,
      capacity_kva: nodeType === "transformer" ? 100 : undefined,
      status: "closed"
    });

    fallbackProject.sections.push({
      id: "sec_" + count,
      name: "مقطع " + count,
      from_node: prevNodeId,
      to_node: nodeId,
      type: "overhead",
      size: "70/12",
      length_m: 250
    });

    prevNodeId = nodeId;
    currentY += 120;
    count++;
    if (count > 30) break;
  }

  return {
    success: true,
    project: fallbackProject,
    summary: {
      feeder_name: fallbackProject.name,
      substation: fallbackProject.substation,
      voltage_kv: 11,
      total_length: fallbackProject.sections.length * 250,
      transformers_count: fallbackProject.nodes.filter(n => n.type === 'transformer').length,
      kiosks_count: fallbackProject.nodes.filter(n => n.type === 'kiosk').length,
      switches_count: fallbackProject.nodes.filter(n => n.type === 'switch').length,
      mode: "native_layout"
    }
  };
}

async function applyPowerPointImport() {
  if (!pendingImportProject) {
    alert("لم يتم تحميل أي بيانات صالحة من الملف");
    return;
  }

  // فحص خيار الترتيب التلقائي الإجباري
  const radAuto = document.getElementById("rad-pptx-auto");
  const forceAuto = radAuto && radAuto.checked && pendingImportSummary && pendingImportSummary.mode === "lossless_embedded";

  if (forceAuto && currentPptxFile) {
    try {
      const formData = new FormData();
      formData.append("file", currentPptxFile);
      formData.append("force_autolayout", "true");
      formData.append("user", JSON.stringify(currentUser || {}));

      const res = await fetch("/api/import-powerpoint", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.success && data.project) {
        pendingImportProject = data.project;
      }
    } catch (err) {
      console.warn("Force autolayout note:", err);
    }
  }

  // تعيين المشروع المستورد كمشروع نشط
  currentProject = pendingImportProject;
  currentProjectId = currentProject.id || `feeder_${Date.now()}`;

  // تحديث الحقول العلوية
  const feederInput = document.getElementById("feeder-name-input");
  if (feederInput) feederInput.value = currentProject.name || "مغذي مستورد";
  const subInput = document.getElementById("substation-name-input");
  if (subInput) subInput.value = currentProject.substation || "محطة المحولات";
  const voltSelect = document.getElementById("feeder-voltage-select");
  if (voltSelect) voltSelect.value = String(currentProject.voltage_kv || 11);

  // تحديث اتجاه الرسم
  if (currentProject.drawing_direction) {
    currentDrawingDirection = currentProject.drawing_direction;
    if (typeof updateDrawingDirButtonUI === "function") updateDrawingDirButtonUI();
  }

  // إعادة رسم الكانفاس وتشغيل الحسابات
  selectedNodeId = null;
  selectedSectionId = null;
  if (typeof renderCanvas === "function") renderCanvas();
  if (typeof calculateAndRenderMetrics === "function") calculateAndRenderMetrics();
  if (typeof updateKPIs === "function") updateKPIs();

  closeImportPowerPointDialog();
  showToast(`🎉 تم استيراد وترتيب مخطط [${currentProject.name}] بنجاح تام بنظام هندسي متناسق!`, "success");
}

window.openImportPowerPointDialog = openImportPowerPointDialog;
window.closeImportPowerPointDialog = closeImportPowerPointDialog;
window.handlePptxDragOver = handlePptxDragOver;
window.handlePptxDragLeave = handlePptxDragLeave;
window.handlePptxDrop = handlePptxDrop;
window.handlePowerPointFileInput = handlePowerPointFileInput;
window.applyPowerPointImport = applyPowerPointImport;

// --- فحص الفروع المتصلة بالنود (يمين، شمال، أسفل، أعلى) ---
function getNodeBranches(sourceNode) {
  const branches = {
    right: null,
    left: null,
    down: null,
    up: null
  };

  if (!sourceNode || !currentProject || !currentProject.sections) return branches;

  currentProject.sections.forEach(sec => {
    let otherNode = null;
    let isOutgoing = false;
    if (sec.from_node === sourceNode.id) {
      otherNode = currentProject.nodes.find(n => n.id === sec.to_node);
      isOutgoing = true;
    } else if (sec.to_node === sourceNode.id) {
      otherNode = currentProject.nodes.find(n => n.id === sec.from_node);
      isOutgoing = false;
    }

    if (otherNode) {
      const dx = otherNode.x - sourceNode.x;
      const dy = otherNode.y - sourceNode.y;
      let relDir = "";
      if (Math.abs(dx) >= Math.abs(dy)) {
        relDir = (dx >= 0) ? "right" : "left";
      } else {
        relDir = (dy >= 0) ? "down" : "up";
      }

      if (relDir === "right" && Math.abs(dx) > 15) {
        if (!branches.right || isOutgoing) branches.right = { sec, otherNode, isOutgoing, dir: "right" };
      } else if (relDir === "left" && Math.abs(dx) > 15) {
        if (!branches.left || isOutgoing) branches.left = { sec, otherNode, isOutgoing, dir: "left" };
      } else if (relDir === "down" && Math.abs(dy) > 15) {
        if (!branches.down || isOutgoing) branches.down = { sec, otherNode, isOutgoing, dir: "down" };
      } else if (relDir === "up" && Math.abs(dy) > 15) {
        if (!branches.up || isOutgoing) branches.up = { sec, otherNode, isOutgoing, dir: "up" };
      }
    }
  });

  return branches;
}

// ─── لحام وتركيب سكينة هوائية تلقائياً بين نقطتين متقاطعتين أو متصلتين بأي اتجاه كان ───
function weldSwitchBetweenNodes(nodeAId, nodeBId, options = {}) {
  if (!currentProject || !currentProject.nodes) return null;
  const nodeA = currentProject.nodes.find(n => n.id === nodeAId);
  const nodeB = currentProject.nodes.find(n => n.id === nodeBId);
  if (!nodeA || !nodeB) {
    if (window.showToast) window.showToast("⚠️ تعذر العثور على النقطتين المطلوبتين!", "warning");
    return null;
  }

  saveHistoryState();

  // 1. حساب الاتجاه التلقائي الدقيق بين النقطتين (وعلى أي اتجاه كان)
  const dx = nodeB.x - nodeA.x;
  const dy = nodeB.y - nodeA.y;
  let autoDir = "down";
  if (Math.abs(dx) >= Math.abs(dy)) {
    autoDir = (dx >= 0) ? "right" : "left";
  } else {
    autoDir = (dy >= 0) ? "down" : "up";
  }

  const finalDir = (options.dir && ["right", "left", "down", "up"].includes(options.dir)) ? options.dir : autoDir;

  // موضع السكينة في منتصف المسافة بالضبط بين النقطتين
  const midX = Math.round((nodeA.x + nodeB.x) / 2);
  const midY = Math.round((nodeA.y + nodeB.y) / 2);

  // توليد رقم نود فريد للسكينة
  let swNum = currentProject.nodes.length + 1;
  while (currentProject.nodes.some(n => n.id === "N" + swNum)) swNum++;
  const swNodeId = options.id || ("N" + swNum);
  const swName = options.name || ("سكينة " + swNodeId);

  const switchNode = {
    id: swNodeId,
    type: "switch",
    name: swName,
    direction: (finalDir === "right" || finalDir === "left") ? "horizontal" : "vertical",
    dir: finalDir,
    state: options.state || "closed",
    x: midX,
    y: midY,
    updated_at: Date.now()
  };
  currentProject.nodes.push(switchNode);

  // 2. فحص ما إذا كان هناك خط قائم بالفعل بين النقطتين A و B
  const existingSec = (currentProject.sections || []).find(s => 
    (s.from_node === nodeAId && s.to_node === nodeBId) || 
    (s.from_node === nodeBId && s.to_node === nodeAId)
  );

  let nextSecNum = currentProject.sections.length + 1;
  while (currentProject.sections.some(s => s.id === "S" + nextSecNum)) nextSecNum++;

  if (existingSec) {
    // شطر الخط القائم إلى قسمين مع لحام السكينة بالمنتصف
    const isForward = (existingSec.from_node === nodeAId);
    const firstNode = isForward ? nodeAId : nodeBId;
    const secondNode = isForward ? nodeBId : nodeAId;

    const totalLen = parseFloat(existingSec.length) || 1000;
    const len1 = options.len1 || Math.round(totalLen / 2);
    const len2 = options.len2 || Math.max(1, totalLen - len1);

    existingSec.from_node = firstNode;
    existingSec.to_node = swNodeId;
    existingSec.length = len1;
    existingSec.direction = finalDir;

    currentProject.sections.push({
      id: "S" + nextSecNum,
      name: existingSec.name ? `${existingSec.name} (تكملة)` : undefined,
      from_node: swNodeId,
      to_node: secondNode,
      type: existingSec.type,
      size: existingSec.size,
      length: len2,
      direction: finalDir,
      corner_style: existingSec.corner_style,
      status: existingSec.status
    });
  } else {
    // لا يوجد خط قائم مسبقاً بين النقطتين: إنشاء خطين يربطان النقطتين عبر السكينة
    const lineType = options.type || "هوائي";
    const lineSize = options.size || (lineType === "كابل" ? "3*240" : "70/12");
    const len1 = options.len1 || 500;
    const len2 = options.len2 || 500;

    currentProject.sections.push({
      id: "S" + nextSecNum++,
      from_node: nodeAId,
      to_node: swNodeId,
      type: lineType,
      size: lineSize,
      length: len1,
      direction: finalDir
    });

    currentProject.sections.push({
      id: "S" + nextSecNum,
      from_node: swNodeId,
      to_node: nodeBId,
      type: lineType,
      size: lineSize,
      length: len2,
      direction: finalDir
    });
  }

  renderNetwork();
  try {
    localStorage.setItem("sld_saved_feeder", JSON.stringify(currentProject));
  } catch (_) {}

  if (window.broadcastProjectUpdate) {
    window.broadcastProjectUpdate("switch_welded_between_nodes");
  }

  const dirArabic = (finalDir === "right") ? "يمين ➡️" : (finalDir === "left") ? "شمال ⬅️" : (finalDir === "down") ? "أسفل ⬇️" : "أعلى ⬆️";
  if (window.showToast) {
    window.showToast(`⚡ تم لحام ${swName} [${swNodeId}] بين النقطتين [${nodeAId}] و [${nodeBId}] بالاتجاه (${dirArabic}) بنجاح!`, "success");
  }

  return switchNode;
}
window.weldSwitchBetweenNodes = weldSwitchBetweenNodes;

function populateSwitchBetweenNodesDropdowns(selectedAId, selectedBId) {
  if (!currentProject || !currentProject.nodes) return;
  const selectA = document.getElementById("sw-between-node-a");
  const selectB = document.getElementById("sw-between-node-b");
  if (!selectA || !selectB) return;

  let optsA = "";
  currentProject.nodes.forEach(n => {
    optsA += `<option value="${n.id}">[${n.id}] ${n.name || n.type}</option>`;
  });
  selectA.innerHTML = optsA;

  const nodeA = selectedAId || selectA.value;
  selectA.value = nodeA;

  updateSwitchBetweenNodeBDropdown(nodeA, selectedBId);
}

function updateSwitchBetweenNodeBDropdown(nodeAId, selectedBId) {
  if (!currentProject || !currentProject.nodes) return;
  const selectB = document.getElementById("sw-between-node-b");
  if (!selectB) return;

  const connectedNodeIds = new Set();
  (currentProject.sections || []).forEach(s => {
    if (s.from_node === nodeAId) connectedNodeIds.add(s.to_node);
    if (s.to_node === nodeAId) connectedNodeIds.add(s.from_node);
  });

  let optsB = "";
  currentProject.nodes.forEach(n => {
    if (n.id === nodeAId) return;
    const isConn = connectedNodeIds.has(n.id);
    const star = isConn ? "⚡ (متصل بـ A) " : "";
    optsB += `<option value="${n.id}">${star}[${n.id}] ${n.name || n.type}</option>`;
  });
  selectB.innerHTML = optsB;

  if (selectedBId && selectB.querySelector(`option[value="${selectedBId}"]`)) {
    selectB.value = selectedBId;
  } else if (connectedNodeIds.size > 0) {
    const firstConn = Array.from(connectedNodeIds)[0];
    if (selectB.querySelector(`option[value="${firstConn}"]`)) {
      selectB.value = firstConn;
    }
  }
}

function onSwitchBetweenNodeAChange() {
  const nodeAId = document.getElementById("sw-between-node-a")?.value;
  updateSwitchBetweenNodeBDropdown(nodeAId);
}
window.onSwitchBetweenNodeAChange = onSwitchBetweenNodeAChange;

// --- السكاكين الهوائية المفصلية المعتمدة - واجهة ديناميكية ذكية وسلسة ---
function openSwitchModal(suggestedDir = 'down') {
  window._lastSuggestedSwitchDir = suggestedDir;
  const modal = document.getElementById("switch-modal");
  if (!modal) {
    console.error("switch-modal element not found in DOM");
    alert("تعذر العثور على نافذة السكينة");
    return;
  }

  // إظهار النافذة المنبثقة فوراً وبأعلى أولوية ممكنة
  modal.classList.remove("hidden");
  modal.style.display = "flex";
  modal.style.setProperty("display", "flex", "important");
  modal.style.setProperty("z-index", "99999", "important");

  try {
    // إذا لم يكن هناك مشروع، ننشئ مشروعاً جديداً تلقائياً
    if (!currentProject) {
      if (typeof createNewProjectDirectly === 'function') {
        createNewProjectDirectly();
      } else {
        currentProject = { id: "feeder_" + Date.now(), name: "مخطط جديد", nodes: [], sections: [] };
        window.currentProject = currentProject;
      }
    }
    if (!currentProject.nodes) currentProject.nodes = [];
    if (!currentProject.sections) currentProject.sections = [];

    // إذا لم تكن هناك أي نقطة بالرسم، ننشئ محطة/نقطة بداية افتراضية حتى تتوفر نقطة ربط
    if (currentProject.nodes.length === 0) {
      currentProject.nodes.push({
        id: "N1",
        type: "substation",
        name: "محطة محولات",
        x: 400,
        y: (window.drawingFlowDirection === 'up') ? 800 : 100
      });
      if (typeof renderNetwork === 'function') renderNetwork();
    }

    try { populateNodeDropdowns(); } catch (e) { console.warn("populateNodeDropdowns:", e); }

    // تعبئة قائمة النود المستهدف
    const mainSelect = document.getElementById("sw-main-node");
    let opts = "";
    (currentProject.nodes || []).forEach(n => {
      if (!n) return;
      let typeDesc = "";
      if (n.type === "junction") typeDesc = "نقطة ربط مباشر";
      else if (n.type === "switch") typeDesc = "سكينة";
      else if (n.type === "transformer") typeDesc = "محول";
      else if (n.type === "kiosk") typeDesc = "كشك";
      else if (n.type === "substation") typeDesc = "محطة";
      else typeDesc = n.type || "نود";

      opts += `<option value="${n.id}">[${n.id}] ${n.name || typeDesc} (${typeDesc})</option>`;
    });
    if (mainSelect) mainSelect.innerHTML = opts;

    // تحديد النود الافتراضي: إذا كان هناك نود محدد بالماوس، أو آخر نود تم رسمه بالمخطط
    const lastNode = currentProject.nodes[currentProject.nodes.length - 1];
    let defaultTargetId = (selectedElement && selectedElement.type === 'node') ? selectedElement.id : (lastNode ? lastNode.id : null);
    if (defaultTargetId && mainSelect) {
      mainSelect.value = defaultTargetId;
    }

    const titleEl = document.getElementById("switch-modal-title");
    if (titleEl) {
      if (suggestedDir === 'right' || suggestedDir === 'horizontal' || suggestedDir === 'left') {
        titleEl.innerHTML = "➖ إضافة وضبط سكينة هوائية (أفقية)";
      } else {
        titleEl.innerHTML = "⚡ إضافة وضبط سكينة هوائية (رأسية)";
      }
    }

    try { onSwitchNewLineTypeChange(); } catch(e) { console.warn("onSwitchNewLineTypeChange error:", e); }
    try { onSwitchMainNodeChange(); } catch(e) { console.warn("onSwitchMainNodeChange error:", e); }
  } catch (err) {
    console.error("Error in openSwitchModal setup:", err);
  }
}

function closeSwitchModal() {
  const modal = document.getElementById("switch-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.style.display = "none";
    modal.style.removeProperty("display");
    modal.style.removeProperty("z-index");
  }
}

window.openSwitchModal = openSwitchModal;
window.closeSwitchModal = closeSwitchModal;

// عند تغيير النود المختار: نقوم فوراً بفحص تفرعاته وتحديث الخيارات ديناميكياً
function onSwitchMainNodeChange() {
  if (!currentProject) return;
  const nodeId = document.getElementById("sw-main-node")?.value;
  const sourceNode = currentProject.nodes.find(n => n.id === nodeId);
  if (!sourceNode) {
    // لا يوجد نود — نُظهر رسالة توجيهية
    const container = document.getElementById("sw-dynamic-options");
    if (container) {
      container.innerHTML = `<div style="color:#fc8181; font-size:12px; padding:8px; background:rgba(252,129,129,0.1); border:1px solid #fc8181; border-radius:6px;">
        ⚠️ لا يوجد نود في المشروع الحالي. يرجى إضافة محطة أو كشك أو نقطة ربط أولاً.
      </div>`;
    }
    return;
  }


  const branches = getNodeBranches(sourceNode);
  const container = document.getElementById("sw-dynamic-options");
  const summaryEl = document.getElementById("sw-node-branches-summary");

  let branchDescList = [];
  if (branches.right) branchDescList.push(`➡️ يمين نحو [${branches.right.otherNode.id}]`);
  if (branches.down) branchDescList.push(`⬇️ أسفل نحو [${branches.down.otherNode.id}]`);
  if (branches.left) branchDescList.push(`⬅️ شمال نحو [${branches.left.otherNode.id}]`);
  if (branches.up) branchDescList.push(`⬆️ أعلى نحو [${branches.up.otherNode.id}]`);

  if (summaryEl) {
    summaryEl.textContent = branchDescList.length > 0 ? `(المتصل: ${branchDescList.join(" | ")})` : "(نقطة طرفية)";
  }

  // بناء الخيارات ديناميكياً حسب تفرعات هذا النود المختار والاتجاه المطلوب
  let optionsHTML = "";
  const sug = window._lastSuggestedSwitchDir || "down";
  let defaultAction = "new_line";

  if (sug === "right" || sug === "horizontal") {
    if (branches.right) defaultAction = "branch_right";
    else defaultAction = "new_line"; // مد خط جديد أفقي
  } else if (sug === "left") {
    if (branches.left) defaultAction = "branch_left";
    else defaultAction = "new_line";
  } else if (sug === "up") {
    if (branches.up) defaultAction = "branch_up";
    else defaultAction = "new_line";
  } else {
    // اتجاه رأسي (down)
    if (branches.down) defaultAction = "branch_down";
    else defaultAction = "new_line"; // مد خط جديد رأسي
  }

  // خيار 1: تثبيت على نفس النود (دائماً متاح ومباشر)
  optionsHTML += `
    <label style="background:var(--bg-tertiary); padding:9px 12px; border-radius:6px; cursor:pointer; font-size:12.5px; border:1px solid var(--border-color); display:flex; align-items:center; gap:8px;">
      <input type="radio" name="sw-action" value="same_node" onchange="onSwitchActionChange()">
      <span>📌 <b>تثبيت على نفس النود [${sourceNode.id}]</b> (يتحول النود نفسه إلى سكينة دون إنشاء نود جديد)</span>
  `;


  // إذا كان هناك تفرعات فعلية:
  if (branches.right) {
    optionsHTML += `
      <label style="background:var(--bg-tertiary); padding:9px 12px; border-radius:6px; cursor:pointer; font-size:12.5px; border:1px solid var(--border-color); display:flex; align-items:center; gap:8px;">
        <input type="radio" name="sw-action" value="branch_right" onchange="onSwitchActionChange()">
        <span>➡️ <b>سكينة على تفريعة اليمين</b> (المتجهة إلى [${branches.right.otherNode.id}])</span>
      </label>
    `;
  }

  if (branches.down) {
    optionsHTML += `
      <label style="background:var(--bg-tertiary); padding:9px 12px; border-radius:6px; cursor:pointer; font-size:12.5px; border:1px solid var(--border-color); display:flex; align-items:center; gap:8px;">
        <input type="radio" name="sw-action" value="branch_down" onchange="onSwitchActionChange()">
        <span>⬇️ <b>سكينة على تفريعة الأسفل</b> (المتجهة إلى [${branches.down.otherNode.id}])</span>
      </label>
    `;
  }

  if (branches.left) {
    optionsHTML += `
      <label style="background:var(--bg-tertiary); padding:9px 12px; border-radius:6px; cursor:pointer; font-size:12.5px; border:1px solid var(--border-color); display:flex; align-items:center; gap:8px;">
        <input type="radio" name="sw-action" value="branch_left" onchange="onSwitchActionChange()">
        <span>⬅️ <b>سكينة على تفريعة الشمال</b> (المتجهة إلى [${branches.left.otherNode.id}])</span>
      </label>
    `;
  }

  if (branches.up) {
    optionsHTML += `
      <label style="background:var(--bg-tertiary); padding:9px 12px; border-radius:6px; cursor:pointer; font-size:12.5px; border:1px solid var(--border-color); display:flex; align-items:center; gap:8px;">
        <input type="radio" name="sw-action" value="branch_up" onchange="onSwitchActionChange()">
        <span>⬆️ <b>سكينة على تفريعة الأعلى</b> (المتجهة إلى [${branches.up.otherNode.id}])</span>
      </label>
    `;
  }

  // خيار سكينتين مستقلتين إذا كان النود نقطة تفرع لكلا المسارين أو أكثر
  if (branches.right && branches.down) {
    optionsHTML += `
      <label style="background:var(--bg-tertiary); padding:9px 12px; border-radius:6px; cursor:pointer; font-size:12.5px; border:1px solid var(--border-color); display:flex; align-items:center; gap:8px;">
        <input type="radio" name="sw-action" value="branch_both" onchange="onSwitchActionChange()">
        <span>⚡ <b>سكينتان مستقلتان</b> (سكينة يمين + سكينة أسفل بنودين مختلفين)</span>
      </label>
    `;
  }

  // خيار مد خط جديد مع سكينة
  optionsHTML += `
    <label style="background:var(--bg-tertiary); padding:9px 12px; border-radius:6px; cursor:pointer; font-size:12.5px; border:1px solid var(--border-color); display:flex; align-items:center; gap:8px;">
      <input type="radio" name="sw-action" value="new_line" onchange="onSwitchActionChange()">
      <span>➕ <b>مد خط جديد مع سكينة</b> (امتداد خط هوائي أو كابل جديد بسكينة)</span>
    </label>
  `;

  if (container) container.innerHTML = optionsHTML;

  // اختيار الخيار الافتراضي
  if (container) {
    const radioToSelect = container.querySelector(`input[name="sw-action"][value="${defaultAction}"]`) || container.querySelector('input[name="sw-action"]');
    if (radioToSelect) radioToSelect.checked = true;
  }

  onSwitchActionChange();
}

// عند تغيير موضع السكينة: إظهار الحقول المخصصة فقط وإخفاء أي حقول أخرى
function onSwitchActionChange() {
  if (!currentProject) return;
  const nodeId = document.getElementById("sw-main-node")?.value;
  const sourceNode = currentProject.nodes.find(n => n.id === nodeId);
  if (!sourceNode) return;

  const sug = window._lastSuggestedSwitchDir || "down";
  const action = document.querySelector('input[name="sw-action"]:checked')?.value || "same_node";

  const fieldsSingle = document.getElementById("sw-fields-single");
  const nodeIdGroup = document.getElementById("sw-single-nodeid-group");
  const nameGroup = document.getElementById("sw-single-name-group");
  const nameInput = document.getElementById("sw-single-name");
  const nodeIdInput = document.getElementById("sw-single-node-id");
  const dirSelect = document.getElementById("sw-single-dir");
  const fieldsDual = document.getElementById("sw-fields-dual");
  const fieldsNewLine = document.getElementById("sw-fields-new-line");
  const submitBtn = document.getElementById("sw-submit-btn");

  // توليد أرقام نود فريدة تلقائية
  let nextNum = currentProject.nodes.length + 1;
  while (currentProject.nodes.some(n => n.id === "N" + nextNum)) nextNum++;

  if (action === "same_node") {
    // تثبيت على نفس النود
    if (fieldsSingle) fieldsSingle.classList.remove("hidden");
    if (nodeIdGroup) nodeIdGroup.classList.add("hidden"); // لا نحتاج نود جديد
    if (nameGroup) nameGroup.style.gridColumn = "span 2";
    if (nameInput) nameInput.value = (sourceNode.name && !sourceNode.name.startsWith("نقطة")) ? sourceNode.name : ("سكينة " + sourceNode.id);
    if (fieldsDual) fieldsDual.classList.add("hidden");
    if (fieldsNewLine) fieldsNewLine.classList.add("hidden");
    if (dirSelect) {
      if (sug === "right" || sug === "horizontal") dirSelect.value = "right";
      else if (sug === "left") dirSelect.value = "left";
      else if (sug === "up") dirSelect.value = "up";
      else if (sug === "down") dirSelect.value = "down";
    }
    if (submitBtn) submitBtn.innerHTML = `<span>📌 تثبيت السكينة على النود [${sourceNode.id}] فوراً ➔</span>`;
  } else if (action === "branch_both") {
    // سكينتان مستقلتان
    if (fieldsSingle) fieldsSingle.classList.add("hidden");
    if (fieldsDual) fieldsDual.classList.remove("hidden");
    if (fieldsNewLine) fieldsNewLine.classList.add("hidden");

    const swRightNode = document.getElementById("sw-dual-right-node");
    const swDownNode = document.getElementById("sw-dual-down-node");
    if (swRightNode) swRightNode.value = "N" + nextNum;
    if (swDownNode) swDownNode.value = "N" + (nextNum + 1);
    if (submitBtn) submitBtn.innerHTML = `<span>⚡ إضافة السكينتين المستقلتين فوراً ➔</span>`;
  } else if (action === "new_line") {
    // مد خط جديد مع سكينة
    if (fieldsSingle) fieldsSingle.classList.remove("hidden");
    if (nodeIdGroup) nodeIdGroup.classList.remove("hidden");
    if (nameGroup) nameGroup.style.gridColumn = "span 1";
    if (nodeIdInput) nodeIdInput.value = "N" + nextNum;
    if (nameInput) nameInput.value = "سكينة " + ("N" + nextNum);
    if (fieldsDual) fieldsDual.classList.add("hidden");
    if (fieldsNewLine) fieldsNewLine.classList.remove("hidden");

    const targetLineDir = (sug === "right" || sug === "horizontal") ? "right" : (sug === "left" ? "left" : (sug === "up" ? "up" : "down"));
    const lineRadio = document.querySelector(`input[name="sw-line-dir"][value="${targetLineDir}"]`);
    if (lineRadio) lineRadio.checked = true;

    if (submitBtn) submitBtn.innerHTML = `<span>➕ مد الخط وإضافة السكينة ➔</span>`;
  } else {
    // سكينة على تفريعة واحدة (يمين أو أسفل أو شمال أو أعلى)
    if (fieldsSingle) fieldsSingle.classList.remove("hidden");
    if (nodeIdGroup) nodeIdGroup.classList.remove("hidden");
    if (nameGroup) nameGroup.style.gridColumn = "span 1";
    if (nodeIdInput) nodeIdInput.value = "N" + nextNum;

    let branchTitle = "سكينة تفريعة";
    if (action === "branch_right") {
      branchTitle = "سكينة تفريعة يمين";
      if (dirSelect) dirSelect.value = "right";
    } else if (action === "branch_down") {
      branchTitle = "سكينة تفريعة أسفل";
      if (dirSelect) dirSelect.value = "down";
    } else if (action === "branch_left") {
      branchTitle = "سكينة تفريعة شمال";
      if (dirSelect) dirSelect.value = "left";
    } else if (action === "branch_up") {
      branchTitle = "سكينة تفريعة أعلى";
      if (dirSelect) dirSelect.value = "up";
    }

    if (nameInput) nameInput.value = branchTitle;
    if (fieldsDual) fieldsDual.classList.add("hidden");
    if (fieldsNewLine) fieldsNewLine.classList.add("hidden");
    if (submitBtn) submitBtn.innerHTML = `<span>⚡ تشغيل السكينة على التفريعة ➔</span>`;
  }
}

function onSwitchNewLineTypeChange() {
  if (window._updateLineSizeSelects) { window._updateLineSizeSelects(); return; }
  const lineType = document.getElementById("sw-new-line-type")?.value || "هوائي";
  const sizeSelect = document.getElementById("sw-new-line-size");
  if (!sizeSelect) return;
  if (lineType === "كابل") {
    sizeSelect.innerHTML = `
      <option value="3*240" selected>3*240 مم²</option>
      <option value="3*150">3*150 مم²</option>
      <option value="3*300">3*300 مم²</option>
      <option value="3*70">3*70 مم²</option>
    `;
  } else {
    sizeSelect.innerHTML = `
      <option value="150/25" selected>150/25 (رئيسي)</option>
      <option value="70/12">70/12 (فرعي)</option>
      <option value="35/6">35/6</option>
      <option value="سبيكة">سبيكة AAAC</option>
    `;
  }
}

function submitSwitchModal() {
  if (!currentProject) return;
  saveHistoryState();

  const sourceId = document.getElementById("sw-main-node")?.value;
  const sourceNode = currentProject.nodes.find(n => n.id === sourceId);
  if (!sourceNode) {
    alert("الرجاء اختيار النود المستهدف.");
    return;
  }

  const action = document.querySelector('input[name="sw-action"]:checked')?.value || "same_node";

  // --- الحالة 1: تثبيت على نفس النود مباشرة ---
  if (action === "same_node") {
    const swName = document.getElementById("sw-single-name").value.trim() || ("سكينة " + sourceNode.id);
    const swState = document.getElementById("sw-single-state").value || "closed";
    const swChoiceDir = document.getElementById("sw-single-dir")?.value || "auto";

    sourceNode.type = "switch";
    sourceNode.name = swName;
    sourceNode.state = swState;

    if (swChoiceDir !== "auto") {
      sourceNode.dir = swChoiceDir;
      sourceNode.direction = (swChoiceDir === "left" || swChoiceDir === "right") ? "horizontal" : "vertical";
    } else {
      const incoming = currentProject.sections.find(s => s.to_node === sourceNode.id);
      const outgoing = currentProject.sections.find(s => s.from_node === sourceNode.id);
      const sec = incoming || outgoing;
      if (sec && (sec.direction === "right" || sec.direction === "left")) {
        sourceNode.dir = sec.direction;
        sourceNode.direction = "horizontal";
      } else if (sec && (sec.direction === "down" || sec.direction === "up")) {
        sourceNode.dir = sec.direction;
        sourceNode.direction = "vertical";
      } else {
        sourceNode.dir = "down";
        sourceNode.direction = "vertical";
      }
    }

    closeSwitchModal();
    renderNetwork();
    showToast(`⚡ تم تثبيت ${swName} بنجاح على نفس النود [${sourceNode.id}]`, "success");
    return;
  }

  // --- الحالة 2: سكينتان مستقلتان (يمين + أسفل) ---
  if (action === "branch_both") {
    if (sourceNode.type === "switch") {
      sourceNode.type = "junction";
      if (!sourceNode.name || sourceNode.name.startsWith("سكينة")) {
        sourceNode.name = "نقطة ربط " + sourceNode.id;
      }
    }

    const branches = getNodeBranches(sourceNode);
    let nextSecNum = currentProject.sections.length + 1;
    while (currentProject.sections.some(s => s.id === "S" + nextSecNum)) nextSecNum++;

    const swRightId = document.getElementById("sw-dual-right-node").value.trim().toUpperCase() || ("N" + (currentProject.nodes.length + 1));
    const swRightName = document.getElementById("sw-dual-right-name").value.trim() || ("سكينة " + swRightId);
    const swRightState = document.getElementById("sw-dual-right-state").value || "closed";

    const swDownId = document.getElementById("sw-dual-down-node").value.trim().toUpperCase() || ("N" + (currentProject.nodes.length + 2));
    const swDownName = document.getElementById("sw-dual-down-name").value.trim() || ("سكينة " + swDownId);
    const swDownState = document.getElementById("sw-dual-down-state").value || "closed";

    // 1. سكينة اليمين
    let swRightX = sourceNode.x + 110;
    let swRightY = sourceNode.y;
    if (branches.right && branches.right.otherNode) {
      const oNode = branches.right.otherNode;
      swRightX = Math.round(sourceNode.x + (oNode.x - sourceNode.x) * 0.45);
      if (Math.abs(oNode.x - sourceNode.x) < 80) swRightX = sourceNode.x + 70;
    }
    currentProject.nodes.push({
      id: swRightId,
      type: "switch",
      name: swRightName,
      direction: "horizontal",
      dir: "right",
      state: swRightState,
      x: swRightX,
      y: swRightY
    });

    if (branches.right) {
      const origSec = branches.right.sec;
      const oldTargetId = (origSec.from_node === sourceNode.id) ? origSec.to_node : origSec.from_node;
      const oldLen = parseFloat(origSec.length) || 1000;
      const jumpLen = Math.min(50, Math.round(oldLen * 0.1));

      origSec.from_node = sourceNode.id;
      origSec.to_node = swRightId;
      origSec.length = jumpLen;
      origSec.direction = "right";

      currentProject.sections.push({
        id: "S" + nextSecNum++,
        name: origSec.name ? `${origSec.name} (تكملة)` : undefined,
        from_node: swRightId,
        to_node: oldTargetId,
        type: origSec.type,
        size: origSec.size,
        length: oldLen - jumpLen,
        direction: "right"
      });
    }

    // 2. سكينة الأسفل
    let swDownX = sourceNode.x;
    let swDownY = sourceNode.y + 110;
    if (branches.down && branches.down.otherNode) {
      const oNode = branches.down.otherNode;
      swDownY = Math.round(sourceNode.y + (oNode.y - sourceNode.y) * 0.45);
      if (Math.abs(oNode.y - sourceNode.y) < 80) swDownY = sourceNode.y + 70;
    }
    currentProject.nodes.push({
      id: swDownId,
      type: "switch",
      name: swDownName,
      direction: "vertical",
      dir: "down",
      state: swDownState,
      x: swDownX,
      y: swDownY
    });

    if (branches.down) {
      const origSec = branches.down.sec;
      const oldTargetId = (origSec.from_node === sourceNode.id) ? origSec.to_node : origSec.from_node;
      const oldLen = parseFloat(origSec.length) || 1000;
      const jumpLen = Math.min(50, Math.round(oldLen * 0.1));

      origSec.from_node = sourceNode.id;
      origSec.to_node = swDownId;
      origSec.length = jumpLen;
      origSec.direction = "down";

      currentProject.sections.push({
        id: "S" + nextSecNum++,
        name: origSec.name ? `${origSec.name} (تكملة)` : undefined,
        from_node: swDownId,
        to_node: oldTargetId,
        type: origSec.type,
        size: origSec.size,
        length: oldLen - jumpLen,
        direction: "down"
      });
    }

    closeSwitchModal();
    renderNetwork();
    showToast(`⚡ تم إضافة سكينتين مستقلتين يميناً وأسفلاً بنودين مختلفين [${swRightId}] و [${swDownId}]`, "success");
    return;
  }

  // --- الحالة 3: مد خط جديد مع سكينة ---
  if (action === "new_line") {
    let nodeId = document.getElementById("sw-single-node-id").value.trim().toUpperCase();
    const name = document.getElementById("sw-single-name").value.trim() || ("سكينة " + nodeId);
    const state = document.getElementById("sw-single-state").value || "closed";
    const dirEl = document.querySelector('input[name="sw-line-dir"]:checked');
    const dir = dirEl ? dirEl.value : "down";
    const isHoriz = (dir === "right" || dir === "left");

    const lineType = document.getElementById("sw-new-line-type")?.value || "هوائي";
    const lineSize = document.getElementById("sw-new-line-size")?.value || "150/25";
    const lineLen = parseFloat(document.getElementById("sw-new-line-len")?.value) || 500;

    if (!nodeId) {
      let num = currentProject.nodes.length + 1;
      while (currentProject.nodes.some(n => n.id === "N" + num)) num++;
      nodeId = "N" + num;
    } else if (currentProject.nodes.some(n => n.id === nodeId)) {
      alert(`رقم النود ${nodeId} مستخدم بالفعل!`);
      return;
    }

    let dx = 0, dy = 0;
    if (dir === "down") dy = 160;
    else if (dir === "up") dy = -160;
    else if (dir === "right") dx = 200;
    else if (dir === "left") dx = -200;

    const switchNode = {
      id: nodeId,
      type: "switch",
      name: name,
      direction: isHoriz ? "horizontal" : "vertical",
      dir: dir,
      state: state,
      x: sourceNode.x + dx,
      y: sourceNode.y + dy
    };
    currentProject.nodes.push(switchNode);

    currentProject.sections.push({
      id: "S" + (currentProject.sections.length + 1),
      from_node: sourceNode.id,
      to_node: switchNode.id,
      type: lineType,
      size: lineSize,
      length: lineLen,
      direction: dir
    });

    closeSwitchModal();
    renderNetwork();
    showToast(`⚡ تم مد الخط وإضافة ${name} [${nodeId}] بنجاح`, "success");
    return;
  }

  // --- الحالة 4: سكينة على تفريعة واحدة (يمين أو أسفل أو شمال أو أعلى) ---
  const swNodeId = document.getElementById("sw-single-node-id").value.trim().toUpperCase() || ("N" + (currentProject.nodes.length + 1));
  const swName = document.getElementById("sw-single-name").value.trim() || ("سكينة " + swNodeId);
  const swState = document.getElementById("sw-single-state").value || "closed";

  if (sourceNode.type === "switch") {
    sourceNode.type = "junction";
    if (!sourceNode.name || sourceNode.name.startsWith("سكينة")) {
      sourceNode.name = "نقطة ربط " + sourceNode.id;
    }
  }

  const branches = getNodeBranches(sourceNode);
  let nextSecNum = currentProject.sections.length + 1;
  while (currentProject.sections.some(s => s.id === "S" + nextSecNum)) nextSecNum++;

  let targetDir = "right";
  if (action === "branch_down") targetDir = "down";
  else if (action === "branch_left") targetDir = "left";
  else if (action === "branch_up") targetDir = "up";

  const branchData = branches[targetDir];
  const isHoriz = (targetDir === "right" || targetDir === "left");

  let swX = sourceNode.x;
  let swY = sourceNode.y;

  if (targetDir === "right") swX += 110;
  else if (targetDir === "left") swX -= 110;
  else if (targetDir === "down") swY += 110;
  else if (targetDir === "up") swY -= 110;

  if (branchData && branchData.otherNode) {
    const oNode = branchData.otherNode;
    if (isHoriz) {
      swX = Math.round(sourceNode.x + (oNode.x - sourceNode.x) * 0.45);
      if (Math.abs(oNode.x - sourceNode.x) < 80) swX = sourceNode.x + (targetDir === "right" ? 70 : -70);
    } else {
      swY = Math.round(sourceNode.y + (oNode.y - sourceNode.y) * 0.45);
      if (Math.abs(oNode.y - sourceNode.y) < 80) swY = sourceNode.y + (targetDir === "down" ? 70 : -70);
    }
  }

  const swChoiceDir = document.getElementById("sw-single-dir")?.value;
  if (swChoiceDir && swChoiceDir !== "auto" && ["left", "right", "down", "up"].includes(swChoiceDir)) {
    targetDir = swChoiceDir;
  }
  const isFinalHoriz = (targetDir === "right" || targetDir === "left");

  currentProject.nodes.push({
    id: swNodeId,
    type: "switch",
    name: swName,
    direction: isFinalHoriz ? "horizontal" : "vertical",
    dir: targetDir,
    state: swState,
    x: swX,
    y: swY
  });

  if (branchData) {
    const origSec = branchData.sec;
    const oldTargetId = (origSec.from_node === sourceNode.id) ? origSec.to_node : origSec.from_node;
    const oldLen = parseFloat(origSec.length) || 1000;
    const jumpLen = Math.min(50, Math.round(oldLen * 0.1));

    origSec.from_node = sourceNode.id;
    origSec.to_node = swNodeId;
    origSec.length = jumpLen;
    origSec.direction = targetDir;

    currentProject.sections.push({
      id: "S" + nextSecNum++,
      name: origSec.name ? `${origSec.name} (تكملة)` : undefined,
      from_node: swNodeId,
      to_node: oldTargetId,
      type: origSec.type,
      size: origSec.size,
      length: oldLen - jumpLen,
      direction: targetDir
    });
  } else {
    // إنشاء تفريعة جديدة في هذا الاتجاه
    let newEndNum = currentProject.nodes.length + 1;
    while (currentProject.nodes.some(n => n.id === "N" + newEndNum)) newEndNum++;
    const endNodeId = "N" + newEndNum;

    let endX = sourceNode.x;
    let endY = sourceNode.y;
    if (targetDir === "right") endX += 240;
    else if (targetDir === "left") endX -= 240;
    else if (targetDir === "down") endY += 220;
    else if (targetDir === "up") endY -= 220;

    currentProject.nodes.push({
      id: endNodeId,
      type: "junction",
      name: "نقطة " + endNodeId,
      x: endX,
      y: endY
    });

    currentProject.sections.push({
      id: "S" + nextSecNum++,
      from_node: sourceNode.id,
      to_node: swNodeId,
      type: "هوائي",
      size: "70/12",
      length: 50,
      direction: targetDir
    });

    currentProject.sections.push({
      id: "S" + nextSecNum++,
      from_node: swNodeId,
      to_node: endNodeId,
      type: "هوائي",
      size: "70/12",
      length: 800,
      direction: targetDir
    });
  }

  closeSwitchModal();
  renderNetwork();
  showToast(`⚡ تم تشغيل ${swName} [${swNodeId}] على تفريعة ${targetDir === 'right' ? 'اليمين' : (targetDir === 'down' ? 'الأسفل' : targetDir)} بنجاح`, "success");
}

function quickAddSwitch(direction = 'vertical') {
  try {
    const isHoriz = (direction === 'horizontal');
    const targetDir = isHoriz ? 'right' : ((window.drawingFlowDirection === 'up') ? 'up' : 'down');
    openSwitchModal(targetDir);
  } catch (err) {
    console.error("quickAddSwitch error:", err);
    openSwitchModal('down');
  }
}

function quickAddSwitchPrompt() {
  try {
    const targetDir = (window.drawingFlowDirection === 'up') ? 'up' : 'down';
    openSwitchModal(targetDir);
  } catch (err) {
    console.error("quickAddSwitchPrompt error:", err);
    openSwitchModal('down');
  }
}

window.quickAddSwitch = quickAddSwitch;
window.quickAddSwitchPrompt = quickAddSwitchPrompt;

// --- نافذة ودوال رسم كوع (مسار منكسر 90°) بجميع الاتجاهات ---
function openElbowModal() {
  if (!currentProject || !currentProject.nodes || currentProject.nodes.length === 0) {
    if (typeof createNewProjectDirectly === 'function') {
      createNewProjectDirectly();
    } else {
      currentProject = { id: "feeder_" + Date.now(), name: "مخطط جديد", nodes: [], sections: [] };
      window.currentProject = currentProject;
    }
  }
  if (!currentProject.nodes) currentProject.nodes = [];
  if (!currentProject.sections) currentProject.sections = [];

  // إذا كان المشروع فارغاً ننشئ محطة كبداية
  if (currentProject.nodes.length === 0) {
    currentProject.nodes.push({
      id: "N1",
      type: "substation",
      name: "محطة محولات",
      x: 400,
      y: (window.drawingFlowDirection === 'up') ? 800 : 100
    });
    if (typeof renderNetwork === 'function') renderNetwork();
  }

  const modal = document.getElementById("elbow-modal");
  if (!modal) return;

  try { populateNodeDropdowns(); } catch (_) {}

  // تعبئة قائمة نود البداية
  const fromSelect = document.getElementById("elbow-from-node");
  if (fromSelect) {
    let opts = "";
    currentProject.nodes.forEach(n => {
      let desc = n.name || n.type || "نود";
      opts += `<option value="${n.id}">[${n.id}] ${desc}</option>`;
    });
    fromSelect.innerHTML = opts;

    // تحديد النود الافتراضي (المحدد أو آخر نود)
    const lastNode = currentProject.nodes[currentProject.nodes.length - 1];
    let defaultId = (selectedElement && selectedElement.type === 'node') ? selectedElement.id : (lastNode ? lastNode.id : null);
    if (defaultId) fromSelect.value = defaultId;
  }

  // إعادة ضبط وضع الوجهة: افتراضي = نود جديد
  const toNewRadio = document.getElementById("elbow-to-new-radio");
  if (toNewRadio) toNewRadio.checked = true;
  onElbowToModeChange();

  // اقتراح رقم النود التالي
  let nextNum = currentProject.nodes.length + 1;
  while (currentProject.nodes.some(n => n.id === "N" + nextNum)) nextNum++;
  const toNodeInput = document.getElementById("elbow-to-node");
  if (toNodeInput) toNodeInput.value = "N" + nextNum;

  // تعبئة dropdown النودات القائمة لقائمة الوجهة
  _populateElbowExistingNodes();

  modal.classList.remove("hidden");
  modal.style.display = "flex";
}

// تعبئة قائمة النودات القائمة في نافذة الكوع
function _populateElbowExistingNodes() {
  const sel = document.getElementById("elbow-to-existing-node");
  if (!sel || !currentProject) return;
  const fromId = document.getElementById("elbow-from-node")?.value;
  let opts = "";
  currentProject.nodes.forEach(n => {
    if (n.id === fromId) return;
    const typeLabel = n.type === "substation" ? "محطة" :
                      n.type === "switch" ? "سكينة" :
                      n.type === "kiosk" ? "كشك" :
                      n.type === "transformer" ? "محول" :
                      n.type === "junction" ? "نقطة ربط" : n.type;
    opts += `<option value="${n.id}">[${n.id}] ${n.name || typeLabel}</option>`;
  });
  sel.innerHTML = opts || `<option value="">— لا توجد نودات أخرى —</option>`;
}
window._populateElbowExistingNodes = _populateElbowExistingNodes;

// عند تغيير نود البداية → تحديث قائمة الوجهة القائمة
function onElbowFromNodeChange() {
  _populateElbowExistingNodes();
}
window.onElbowFromNodeChange = onElbowFromNodeChange;

// تبديل عرض حقل الوجهة (قائم أو جديد)
function onElbowToModeChange() {
  const mode = document.querySelector('input[name="elbow-to-mode"]:checked')?.value || "new";
  const existingWrap = document.getElementById("elbow-to-existing-wrap");
  const newWrap = document.getElementById("elbow-to-new-wrap");
  if (existingWrap) existingWrap.style.display = (mode === "existing") ? "block" : "none";
  if (newWrap) newWrap.style.display = (mode === "new") ? "block" : "none";
  if (mode === "existing") _populateElbowExistingNodes();
}
window.onElbowToModeChange = onElbowToModeChange;

function closeElbowModal() {
  const modal = document.getElementById("elbow-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.style.display = "none";
  }
}

function submitElbowModal() {
  if (!currentProject) return;

  const fromNodeId = document.getElementById("elbow-from-node")?.value;
  const dirRadio = document.querySelector('input[name="elbow-dir"]:checked');
  const elbowDir = dirRadio ? dirRadio.value : "right-down";
  const lineType = document.getElementById("elbow-line-type")?.value || "هوائي";
  const lineSize = document.getElementById("elbow-line-size")?.value || "70/12";
  const lineLen = parseFloat(document.getElementById("elbow-line-len")?.value) || 800;

  // --- تحديد وضع الوجهة ---
  const toMode = document.querySelector('input[name="elbow-to-mode"]:checked')?.value || "new";
  let toNodeId;
  let connectToExisting = false;

  if (toMode === "existing") {
    toNodeId = document.getElementById("elbow-to-existing-node")?.value;
    if (!toNodeId) { alert("الرجاء اختيار النود القائم كوجهة!"); return; }
    connectToExisting = true;
  } else {
    toNodeId = document.getElementById("elbow-to-node")?.value?.trim()?.toUpperCase();
    if (!toNodeId) {
      let nextNum = currentProject.nodes.length + 1;
      while (currentProject.nodes.some(n => n.id === "N" + nextNum)) nextNum++;
      toNodeId = "N" + nextNum;
    }
  }

  const fromNode = currentProject.nodes.find(n => n.id === fromNodeId);
  if (!fromNode) {
    alert("الرجاء اختيار نقطة البداية!");
    return;
  }

  // عند وضع "نود جديد": تحقق من عدم تكرار الـ ID
  if (!connectToExisting && currentProject.nodes.some(n => n.id === toNodeId)) {
    // إذا كان النود موجوداً مسبقاً: ألحم به تلقائياً بدلاً من الخطأ
    connectToExisting = true;
    showToast(`💡 النود [${toNodeId}] موجود مسبقاً — سيتم الربط به تلقائياً`, "info");
  }

  const toNode = currentProject.nodes.find(n => n.id === toNodeId);

  saveHistoryState();

  // حساب إزاحة النود الجديد بناءً على اتجاه الكوع
  const STEP_X = 200;
  const STEP_Y = 180;
  let dx = 0, dy = 0;
  let cornerStyle = "hv";
  let secDirection = "right";

  switch (elbowDir) {
    case "right-down": dx = STEP_X;  dy = STEP_Y;  cornerStyle = "hv"; secDirection = "right"; break;
    case "right-up":   dx = STEP_X;  dy = -STEP_Y; cornerStyle = "hv"; secDirection = "right"; break;
    case "left-down":  dx = -STEP_X; dy = STEP_Y;  cornerStyle = "hv"; secDirection = "left";  break;
    case "left-up":    dx = -STEP_X; dy = -STEP_Y; cornerStyle = "hv"; secDirection = "left";  break;
    case "down-right": dx = STEP_X;  dy = STEP_Y;  cornerStyle = "vh"; secDirection = "down";  break;
    case "down-left":  dx = -STEP_X; dy = STEP_Y;  cornerStyle = "vh"; secDirection = "down";  break;
    case "up-right":   dx = STEP_X;  dy = -STEP_Y; cornerStyle = "vh"; secDirection = "up";    break;
    case "up-left":    dx = -STEP_X; dy = -STEP_Y; cornerStyle = "vh"; secDirection = "up";    break;
    default:           dx = STEP_X;  dy = STEP_Y;  cornerStyle = "hv"; secDirection = "right";
  }

  if (connectToExisting) {
    // الربط بنود قائم: لا ننشئ نوداً جديداً
    // الكوع يُرسم من fromNode إلى toNode القائم بالاتجاه المختار
    if (!toNode) {
      alert(`النود القائم [${toNodeId}] غير موجود!`);
      return;
    }
  } else {
    // إنشاء النود الجديد (نقطة ربط طرفية بعد الكوع)
    const newNode = {
      id: toNodeId,
      type: "junction",
      name: `نقطة ${toNodeId}`,
      x: fromNode.x + dx,
      y: fromNode.y + dy
    };
    currentProject.nodes.push(newNode);
  }

  // إنشاء الخط المنكسر 90°
  let nextSecNum = currentProject.sections.length + 1;
  while (currentProject.sections.some(s => s.id === "S" + nextSecNum)) nextSecNum++;

  const newSec = {
    id: "S" + nextSecNum,
    from_node: fromNode.id,
    to_node: toNodeId,
    type: lineType,
    size: lineSize,
    length: lineLen,
    direction: secDirection,
    corner_style: cornerStyle,
    deflection_offset: 0,
    is_slanted: false
  };
  currentProject.sections.push(newSec);

  closeElbowModal();
  renderNetwork();

  const dirLabels = {
    "right-down": "يمين ثم لأسفل ↘️",
    "right-up":   "يمين ثم لأعلى ↗️",
    "left-down":  "شمال ثم لأسفل ↙️",
    "left-up":    "شمال ثم لأعلى ↖️",
    "down-right": "لأسفل ثم يمين ↳",
    "down-left":  "لأسفل ثم شمال ↲",
    "up-right":   "لأعلى ثم يمين ↱",
    "up-left":    "لأعلى ثم شمال ↰"
  };

  const modeLabel = connectToExisting ? `(ربط بنود قائم)` : `(نود جديد)`;
  showToast(`📐 تم رسم كوع 90° (${dirLabels[elbowDir] || elbowDir}) من [${fromNode.id}] إلى [${toNodeId}] ${modeLabel} بنجاح!`, "success");
}

window.openElbowModal = openElbowModal;
window.closeElbowModal = closeElbowModal;
window.submitElbowModal = submitElbowModal;



// --- وحدة الربط الحلقي RMU (بدون كابلات، وتوصيل حسب الاتجاه فقط) ---
function openRMUModal() {
  if (window.hasPermission && !window.hasPermission('btn_rmu')) {
    showToast("⛔ ليس لديك صلاحية إضافة وحدة RMU", "error");
    return;
  }
  if (!currentProject || currentProject.nodes.length === 0) {
    alert("الرجاء إضافة محطة محولات أولاً.");
    return;
  }
  const modal = document.getElementById("rmu-modal");
  populateNodeDropdowns();
  document.getElementById("rmu-name").value = "لوحة RMU " + (currentProject.nodes.filter(n => n.type === 'rmu').length + 1);
  const lastNode = currentProject.nodes[currentProject.nodes.length - 1];
  if (lastNode) document.getElementById("rmu-source-node").value = lastNode.id;
  const targetDir = window.drawingFlowDirection || "down";
  const rmuDirRadio = document.querySelector(`input[name="rmu-dir"][value="${targetDir}"]`);
  if (rmuDirRadio) rmuDirRadio.checked = true;
  modal.classList.remove("hidden");
}

function closeRMUModal() {
  const modal = document.getElementById("rmu-modal");
  if (modal) modal.classList.add("hidden");
}

function submitRMUModal() {
  if (!currentProject) return;
  saveHistoryState();

  const name = document.getElementById("rmu-name").value.trim() || "وحدة RMU";
  const sourceId = document.getElementById("rmu-source-node").value;
  const switches = parseInt(document.getElementById("rmu-switches").value) || 3;
  const dirRadio = document.querySelector('input[name="rmu-dir"]:checked');
  const dir = dirRadio ? dirRadio.value : "down";

  const sourceNode = currentProject.nodes.find(n => n.id === sourceId);
  if (!sourceNode) {
    alert("النود المغذي غير موجود!");
    return;
  }

  // توليد رقم نود فريد للـ RMU
  let rmuNum = currentProject.nodes.length + 1;
  while (currentProject.nodes.some(n => n.id === "N" + rmuNum)) {
    rmuNum++;
  }
  const nodeId = "N" + rmuNum;

  let dx = 0, dy = 0;
  if (dir === "down") dy = 160;
  else if (dir === "right") dx = 180;
  else if (dir === "up") dy = -160;
  else if (dir === "left") dx = -180;

  const rmuNode = {
    id: nodeId,
    type: "rmu",
    name: name,
    switches_count: switches,
    direction: dir,
    x: sourceNode.x + dx,
    y: sourceNode.y + dy
  };
  currentProject.nodes.push(rmuNode);

  // توصيل مباشر بنظام الربط الحلقي بدون كابلات
  currentProject.sections.push({
    id: "S" + (currentProject.sections.length + 1),
    from_node: sourceId,
    to_node: nodeId,
    type: "هوائي",
    size: "ربط حلقي",
    name: "ربط حلقي",
    length: 0,
    direction: dir
  });

  closeRMUModal();
  renderNetwork();
  showToast(`🔄 تم إضافة ${name} (${switches} سكاكين) بنظام الربط الحلقي المباشر`, "success");
}

// --- منظم الجهد AVR (الحمل بالأمبير وسهم موجه ونقطتا توصيل بدون رقم نود) ---
function openAVRModal() {
  if (window.hasPermission && !window.hasPermission('btn_avr')) {
    showToast("⛔ ليس لديك صلاحية إضافة منظم AVR", "error");
    return;
  }
  if (!currentProject || currentProject.nodes.length === 0) {
    alert("الرجاء إضافة محطة محولات أولاً.");
    return;
  }
  const modal = document.getElementById("avr-modal");
  populateNodeDropdowns();
  document.getElementById("avr-name").value = "منظم جهد AVR " + (currentProject.nodes.filter(n => n.type === 'avr').length + 1);
  const lastNode = currentProject.nodes[currentProject.nodes.length - 1];
  if (lastNode) document.getElementById("avr-source-node").value = lastNode.id;
  modal.classList.remove("hidden");
}

function closeAVRModal() {
  const modal = document.getElementById("avr-modal");
  if (modal) modal.classList.add("hidden");
}

function submitAVRModal() {
  if (!currentProject) return;
  saveHistoryState();

  const name = document.getElementById("avr-name").value.trim() || "منظم جهد AVR";
  const sourceId = document.getElementById("avr-source-node").value;
  const ratedAmp = parseFloat(document.getElementById("avr-amp").value) || 200;
  const dirRadio = document.querySelector('input[name="avr-dir"]:checked');
  const dir = dirRadio ? dirRadio.value : "down";

  const sourceNode = currentProject.nodes.find(n => n.id === sourceId);
  if (!sourceNode) {
    alert("نود الأخذ غير موجود!");
    return;
  }

  // توليد نود فريد داخلي للمنظم حتى يمكن أخذ خطوط أخرى منه، لكنه لا يعرض رقم نود على الرسم
  let avrNum = currentProject.nodes.length + 1;
  while (currentProject.nodes.some(n => n.id === "N" + avrNum)) {
    avrNum++;
  }
  const nodeId = "N" + avrNum;

  let dx = 0, dy = 0;
  if (dir === "down") dy = 160;
  else if (dir === "right") dx = 180;
  else if (dir === "up") dy = -160;
  else if (dir === "left") dx = -180;

  const avrNode = {
    id: nodeId,
    type: "avr",
    name: name,
    rated_amp: ratedAmp,
    direction: dir,
    x: sourceNode.x + dx,
    y: sourceNode.y + dy
  };
  currentProject.nodes.push(avrNode);

  // توصيل نود الأخذ بمنظم الجهد
  currentProject.sections.push({
    id: "S" + (currentProject.sections.length + 1),
    from_node: sourceId,
    to_node: nodeId,
    type: "هوائي",
    size: `${ratedAmp}A`,
    name: "تغذية AVR",
    length: 0,
    direction: dir
  });

  closeAVRModal();
  renderNetwork();
  showToast(`🔋 تم إضافة ${name} بحمل ${ratedAmp} A وتوجيه للأمام بنجاح`, "success");
}

// ==================== محرك إدارة وتخزين المشاريع (محلي + سحابي + خادم) ====================

// ═══════════════════════════════════════════════════════════════════════════════
// 🏛️ عزل وفصل بيانات ومشاريع كل إدارة على حدة (Administration Data Isolation)
// ═══════════════════════════════════════════════════════════════════════════════

function getCurrentAdminName() {
  if (window.currentUser && window.currentUser.administration && window.currentUser.administration !== "all") {
    return window.currentUser.administration;
  }
  const savedUser = sessionStorage.getItem("sld_user");
  if (savedUser) {
    try {
      const u = JSON.parse(savedUser);
      if (u && u.administration && u.administration !== "all") return u.administration;
    } catch (_) {}
  }
  return localStorage.getItem("sld_current_admin") || "بني مزار شرق";
}

function getCurrentAdminKey() {
  return getCurrentAdminName().trim().replace(/\s+/g, '_');
}

window.getCurrentAdminName = getCurrentAdminName;
window.getCurrentAdminKey = getCurrentAdminKey;

function getSavedFeederForAdmin(adminName = null) {
  const aName = adminName || getCurrentAdminName();
  const aKey = aName.trim().replace(/\s+/g, '_');
  const key = "sld_feeder_" + aKey;
  let data = localStorage.getItem(key);
  if (!data) {
    // ترحيل المخطط الأصلي لـ بني مزار شرق
    const legacy = localStorage.getItem("sld_saved_feeder");
    if (legacy && (aKey === "بني_مزار_شرق" || !localStorage.getItem("sld_feeder_بني_مزار_شرق"))) {
      localStorage.setItem("sld_feeder_بني_مزار_شرق", legacy);
      if (aKey === "بني_مزار_شرق") {
        data = legacy;
      }
    }
  }
  try {
    return data ? JSON.parse(data) : null;
  } catch(e) {
    return null;
  }
}

function saveFeederForAdmin(project, adminName = null) {
  if (!project) return;
  const aName = adminName || getCurrentAdminName();
  const aKey = aName.trim().replace(/\s+/g, '_');
  const key = "sld_feeder_" + aKey;
  const now = Date.now();
  if (!project.saved_at) project.saved_at = now;
  if (!project.user_saved_at) project.user_saved_at = now;
  try {
    localStorage.setItem(key, JSON.stringify(project));
    localStorage.setItem("sld_saved_feeder", JSON.stringify(project));
    localStorage.setItem("sld_saved_time_" + aKey, String(now));
    localStorage.setItem("sld_authoritative_save_time", String(now));
  } catch(e) {}
}

function getCatalogForAdmin(adminName = null) {
  const aName = adminName || getCurrentAdminName();
  const aKey = aName.trim().replace(/\s+/g, '_');
  const key = "sld_catalog_" + aKey;
  let raw = localStorage.getItem(key);
  if (!raw) {
    const legacy = localStorage.getItem("sld_projects_catalog");
    if (legacy && (aKey === "بني_مزار_شرق" || !localStorage.getItem("sld_catalog_بني_مزار_شرق"))) {
      localStorage.setItem("sld_catalog_بني_مزار_شرق", legacy);
      if (aKey === "بني_مزار_شرق") raw = legacy;
    }
  }
  try {
    return raw ? JSON.parse(raw) : [];
  } catch(e) {
    return [];
  }
}

function saveCatalogForAdmin(catalog, adminName = null) {
  const aName = adminName || getCurrentAdminName();
  const aKey = aName.trim().replace(/\s+/g, '_');
  const key = "sld_catalog_" + aKey;
  try {
    localStorage.setItem(key, JSON.stringify(catalog));
    if (aKey === "بني_مزار_شرق") {
      localStorage.setItem("sld_projects_catalog", JSON.stringify(catalog));
    }
  } catch(e) {}
}

function initAdminDefaultProject(adminName) {
  const pId = "feeder_" + Date.now();
  return {
    id: pId,
    name: "مغذي " + adminName + " 1",
    substation: "محطة محولات " + adminName,
    voltage_kv: 11,
    nodes: [
      {
        id: "N1",
        type: "substation",
        name: "محطة محولات " + adminName,
        x: 400,
        y: 80,
        subType: "substation"
      }
    ],
    sections: []
  };
}

function loadAdminWorkspace(adminName) {
  if (!adminName) adminName = getCurrentAdminName();
  localStorage.setItem("sld_current_admin", adminName);

  if (window.currentUser) {
    window.currentUser.administration = adminName;
    try { sessionStorage.setItem("sld_user", JSON.stringify(window.currentUser)); } catch(_) {}
  }

  // تحديث الترويسة في القائمة الجانبية
  const sidebarTitle = document.getElementById("sidebar-brand-title");
  if (sidebarTitle) sidebarTitle.textContent = "هندسة كهرباء " + adminName;

  const mainTitle = document.getElementById("main-system-title");
  if (mainTitle) mainTitle.textContent = "هندسة كهرباء " + adminName;

  let proj = getSavedFeederForAdmin(adminName);
  if (!proj || !proj.nodes || proj.nodes.length === 0) {
    if (adminName === "بني مزار شرق" && window.DEFAULT_BUNDLED_PROJECTS && window.DEFAULT_BUNDLED_PROJECTS.length > 0) {
      proj = JSON.parse(JSON.stringify(window.DEFAULT_BUNDLED_PROJECTS[0]));
    } else {
      proj = initAdminDefaultProject(adminName);
    }
    saveFeederForAdmin(proj, adminName);
  }

  currentProject = proj;
  window.currentProject = proj;

  if (typeof updateFeederInputs === "function") updateFeederInputs();
  if (typeof renderNetwork === "function") renderNetwork();
  if (typeof fitToScreen === "function") fitToScreen();

  if (window.reconnectFirebaseForAdmin) {
    window.reconnectFirebaseForAdmin(adminName);
  }

  if (window.showToast) {
    window.showToast(`🏛️ تم فتح مساحة عمل ومخططات [هندسة كهرباء ${adminName}]`, "info");
  }
}

window.loadAdminWorkspace = loadAdminWorkspace;
window.getSavedFeederForAdmin = getSavedFeederForAdmin;
window.saveFeederForAdmin = saveFeederForAdmin;
window.getCatalogForAdmin = getCatalogForAdmin;
window.saveCatalogForAdmin = saveCatalogForAdmin;

// استرجاع الفهرس المحلي للمشاريع من التخزين (مخصص للإدارة الحالية)
function getLocalProjectsCatalog() {
  let catalog = getCatalogForAdmin();
  if (!Array.isArray(catalog)) catalog = [];

  // دمج المشاريع المدمجة الافتراضية إذا كانت الإدارة بني مزار شرق
  if (getCurrentAdminKey() === "بني_مزار_شرق" && window.DEFAULT_BUNDLED_PROJECTS && Array.isArray(window.DEFAULT_BUNDLED_PROJECTS)) {
    window.DEFAULT_BUNDLED_PROJECTS.forEach(bp => {
      const exists = catalog.some(p => p.id === bp.id || p.name === bp.name);
      if (!exists) {
        catalog.push({
          id: bp.id,
          name: bp.name || bp.id,
          substation: bp.substation || "لوحة المركز",
          voltage_kv: bp.voltage_kv || 11,
          nodes_count: (bp.nodes || []).length,
          sections_count: (bp.sections || []).length,
          updated_at: bp.updated_at || "مخطط معتمد"
        });
        try {
          if (!localStorage.getItem("sld_proj_" + bp.id)) {
            localStorage.setItem("sld_proj_" + bp.id, JSON.stringify(bp));
          }
        } catch(e) {}
      }
    });
    saveCatalogForAdmin(catalog);
  }
  return catalog;
}

// حفظ المشروع شاملاً في التخزين المحلي، السحابي، والسيرفر
async function saveProjectToStorage(project) {
  if (!project) return false;
  const pId = project.id || ("feeder_" + Date.now());
  project.id = pId;
  const nowTs = Date.now();
  const nowStr = new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
  project.updated_at = nowStr;
  project.user_saved_at = nowTs;
  project.saved_at = nowTs;
  project.timestamp = nowTs;

  // 1. التخزين المحلي المخصص للإدارة
  let catalog = [];
  try {
    saveFeederForAdmin(project);
    localStorage.setItem("sld_proj_" + pId, JSON.stringify(project));
    localStorage.setItem("sld_saved_feeder", JSON.stringify(project));

    const curAdmin = getCurrentAdminName();
    const curKey = curAdmin.trim().replace(/\s+/g, '_');
    localStorage.setItem("sld_saved_time_" + curKey, String(nowTs));
    localStorage.setItem("sld_authoritative_save_time", String(nowTs));

    catalog = getCatalogForAdmin();
    const meta = {
      id: pId,
      name: project.name || "مخطط شبكة توزيع",
      substation: project.substation || "محطة محولات",
      voltage_kv: project.voltage_kv || 11,
      nodes_count: (project.nodes || []).length,
      sections_count: (project.sections || []).length,
      updated_at: nowStr,
      saved_at: nowTs,
      user_saved_at: nowTs
    };

    const idx = catalog.findIndex(c => c.id === pId || (project.name && c.name === project.name));
    if (idx >= 0) {
      catalog[idx] = meta;
    } else {
      catalog.unshift(meta);
    }
    saveCatalogForAdmin(catalog);
  } catch(e) {
    console.warn("LocalStorage save warning:", e);
  }

  // 2. المزامنة اللحظية مع جميع الأجهزة المتصلة
  if (typeof window.broadcastProjectSaved === "function") {
    try { window.broadcastProjectSaved(project, catalog); } catch(e) {}
  } else if (typeof window.broadcastProjectUpdate === "function") {
    try { window.broadcastProjectUpdate("save"); } catch(e) {}
  }

  // 3. إرسال إلى خادم Python المحلي إن كان متصلاً
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch("/api/save-project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project: project, user: currentUser || {} }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success) return true;
    }
  } catch(netErr) {
    // تجاوز مهلة الخادم في وضع الويب السحابي
  }

  return true;
}

// جلب بيانات المشروع بالمعرف
async function loadProjectDataById(p_id) {
  if (!p_id) return null;

  // 1. فحص LocalStorage المخصص للمشروع
  try {
    const localRaw = localStorage.getItem("sld_proj_" + p_id);
    if (localRaw) {
      const parsed = JSON.parse(localRaw);
      if (parsed && Array.isArray(parsed.nodes)) return parsed;
    }
  } catch(e) {}

  // 2. فحص المشاريع الافتراضية المدمجة
  if (window.DEFAULT_BUNDLED_PROJECTS && Array.isArray(window.DEFAULT_BUNDLED_PROJECTS)) {
    const bundled = window.DEFAULT_BUNDLED_PROJECTS.find(p => p.id === p_id || p.name === p_id);
    if (bundled) return JSON.parse(JSON.stringify(bundled));
  }

  // 3. فحص المخطط النشط الحالي إذا تطابق المعرف
  if (currentProject && (currentProject.id === p_id || currentProject.name === p_id)) {
    return currentProject;
  }

  // 4. محاولة الاتصال بالخادم المحلي
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const encodedId = encodeURIComponent(p_id);
    const res = await fetch(`/api/load-project/${encodedId}`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.project) {
        return data.project;
      }
    }
  } catch(e) {}

  return null;
}

// نافذة إدارة المشاريع والمخططات
async function openProjectsManager() {
  if (window.hasPermission && !window.hasPermission('btn_projects')) {
    showToast("⛔ ليس لديك صلاحية استعراض وإدارة المشاريع", "error");
    return;
  }
  const modal = document.getElementById("projects-manager-modal");
  const container = document.getElementById("projects-list-container");
  if (!modal || !container) return;

  modal.classList.remove("hidden");
  container.innerHTML = "<p style='text-align:center; padding:20px; color:#a0aec0;'>جاري فحص وتحديث قائمة المشاريع...</p>";

  let projects = [];
  let isServerOnline = false;

  // محاولة الجلب من الخادم
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const res = await fetch("/api/projects", { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.projects)) {
        projects = data.projects;
        isServerOnline = true;
      }
    }
  } catch(e) {}

  // دمج المشاريع المحلية
  const localCatalog = getLocalProjectsCatalog();
  if (projects.length === 0) {
    projects = [...localCatalog];
  } else {
    localCatalog.forEach(lp => {
      if (!projects.some(p => p.id === lp.id || p.name === lp.name)) {
        projects.push(lp);
      }
    });
  }

  // ضمان عدم فراغ القائمة عبر المشاريع المدمجة
  if (projects.length === 0 && window.DEFAULT_BUNDLED_PROJECTS) {
    projects = window.DEFAULT_BUNDLED_PROJECTS.map(bp => ({
      id: bp.id,
      name: bp.name || bp.id,
      substation: bp.substation || "محطة محولات",
      voltage_kv: bp.voltage_kv || 11,
      nodes_count: (bp.nodes || []).length,
      sections_count: (bp.sections || []).length,
      updated_at: bp.updated_at || "مخطط معتمد"
    }));
  }

  renderProjectsTable(projects, isServerOnline);
}

// رسم جدول المشاريع
function renderProjectsTable(projects, isServerOnline) {
  const container = document.getElementById("projects-list-container");
  if (!container) return;

  const statusBadge = isServerOnline
    ? `<span style="display:inline-flex; align-items:center; gap:6px; font-size:12px; color:#48bb78; background:rgba(72,187,120,0.15); padding:4px 12px; border-radius:20px; border:1px solid rgba(72,187,120,0.35);">
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#48bb78;"></span>
        <span>⚡ متصل بالخادم المحلي والمزامنة السحابية</span>
       </span>`
    : `<span style="display:inline-flex; align-items:center; gap:6px; font-size:12px; color:#63b3ed; background:rgba(99,179,237,0.15); padding:4px 12px; border-radius:20px; border:1px solid rgba(99,179,237,0.35);">
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#63b3ed;"></span>
        <span>🟢 التخزين المحلي والسحابي نشط (جاهز للعمل والمزامنة)</span>
       </span>`;

  const curAdmin = getCurrentAdminName();
  const adminList = [
    "بني مزار شرق",
    "بني مزار غرب",
    "مغاغة",
    "العدوة",
    "مطاي",
    "سمالوط شرق",
    "سمالوط غرب"
  ];
  const adminOptions = adminList.map(adm => `<option value="${adm}" ${adm === curAdmin ? "selected" : ""}>هندسة كهرباء ${adm}</option>`).join("");

  let html = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        ${statusBadge}
        <div style="display:inline-flex; align-items:center; gap:6px; background:rgba(45, 55, 72, 0.7); padding:4px 10px; border-radius:8px; border:1px solid var(--border-color);">
          <span style="font-size:12px; color:#ecc94b; font-weight:bold;">🏛️ الإدارة:</span>
          <select id="projects-admin-switcher" style="background:#1a202c; color:#fff; border:1px solid #4a5568; border-radius:6px; padding:3px 8px; font-size:12px; font-weight:600; cursor:pointer;" onchange="switchAdminWorkspace(this.value)">
            ${adminOptions}
          </select>
        </div>
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn btn-outline btn-sm" onclick="triggerSLDFileImport()" style="border-color:#38b2ac; color:#4fd1c5; font-size:11.5px; padding:5px 10px;">
          <span>📥 استيراد ملف مشروع .sld</span>
        </button>
        <button class="btn btn-outline btn-sm" onclick="exportCurrentProjectAsSLD()" style="border-color:#ecc94b; color:#ecc94b; font-size:11.5px; padding:5px 10px;" title="تنزيل المشروع المفتوح كملف .sld">
          <span>💾 تصدير المشروع الحالي .sld</span>
        </button>
      </div>
    </div>
  `;

  if (!projects || projects.length === 0) {
    html += "<p style='text-align:center; padding:30px; color:#a0aec0;'>لا توجد مشاريع محفوظة حالياً.</p>";
    container.innerHTML = html;
    return;
  }

  html += `
    <div style="max-height:430px; overflow-y:auto; border-radius:8px; border:1px solid var(--border-color); background:rgba(26, 32, 44, 0.4);">
      <table class="projects-table" style="width:100%; border-collapse:collapse;">
        <thead>
          <tr style="background:var(--bg-tertiary); position:sticky; top:0; z-index:2; border-bottom:1px solid var(--border-color);">
            <th style="text-align:right; padding:10px 12px;">اسم المخطط / الخط</th>
            <th>المحطة الرئيسية</th>
            <th>الجهد</th>
            <th>العقد</th>
            <th>المقاطع</th>
            <th>تاريخ التعديل</th>
            <th style="min-width:210px; text-align:center;">الإجراءات</th>
          </tr>
        </thead>
        <tbody>
  `;

  projects.forEach(p => {
    const displayName = (p.name || p.id).replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const displaySub = (p.substation || '-').replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const encId = encodeURIComponent(p.id);
    const encName = encodeURIComponent(p.name || p.id);
    const isCurrent = currentProject && (currentProject.id === p.id || currentProject.name === p.name);
    const rowBg = isCurrent ? "background:rgba(49, 130, 206, 0.15);" : "";

    html += `
      <tr style="${rowBg}">
        <td style="font-weight:bold; color:#fff; text-align:right; padding-right:12px;">
          ${displayName}
          ${isCurrent ? '<span style="margin-right:6px; font-size:10px; background:#3182ce; color:#fff; padding:2px 7px; border-radius:10px;">نشط حالياً</span>' : ''}
        </td>
        <td>${displaySub}</td>
        <td style="color:#ecc94b; font-weight:bold;">${p.voltage_kv || 11} ك.ف</td>
        <td>${p.nodes_count !== undefined ? p.nodes_count : '-'}</td>
        <td>${p.sections_count !== undefined ? p.sections_count : '-'}</td>
        <td style="font-size:11px; color:#a0aec0;">${p.updated_at || '-'}</td>
        <td style="text-align:center;">
          <div style="display:inline-flex; gap:5px; justify-content:center;">
            <button class="btn btn-primary btn-sm" style="padding:3px 8px; font-size:11px;" onclick="loadProjectFromManager(decodeURIComponent('${encId}'))" title="فتح وعرض المخطط">
              <span>👁️ فتح</span>
            </button>
            <button class="btn btn-outline btn-sm" style="padding:3px 8px; font-size:11px; border-color:#ecc94b; color:#ecc94b;" onclick="exportProjectAsSLD(decodeURIComponent('${encId}'))" title="تنزيل كملف .sld">
              <span>💾 .sld</span>
            </button>
            <button class="btn btn-outline btn-sm" style="padding:3px 8px; font-size:11px; border-color:#48bb78; color:#9ae6b4;" onclick="printProjectFromManager(decodeURIComponent('${encId}'))" title="طباعة المخطط بالكامل">
              <span>🖨️ طباعة</span>
            </button>
            <button class="btn btn-delete btn-sm" style="padding:3px 8px; font-size:11px;" onclick="deleteProjectFromManager(decodeURIComponent('${encId}'), decodeURIComponent('${encName}'))" title="حذف هذا المشروع">
              <span>🗑️</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;
}

function switchAdminWorkspace(adminName) {
  if (!adminName) return;
  loadAdminWorkspace(adminName);
  openProjectsManager();
}
window.switchAdminWorkspace = switchAdminWorkspace;

function closeProjectsManager() {
  const modal = document.getElementById("projects-manager-modal");
  if (modal) modal.classList.add("hidden");
}

// فتح مشروع محدد من مدير المشاريع
async function loadProjectFromManager(p_id) {
  if (!p_id) return;
  saveHistoryState();
  const projectData = await loadProjectDataById(p_id);
  if (!projectData || !projectData.nodes) {
    showToast("⚠️ تعذر العثور على بيانات المخطط المطلوب", "danger");
    return;
  }

  currentProject = projectData;
  window.currentProject = projectData;
  try {
    saveFeederForAdmin(currentProject);
    localStorage.setItem("sld_saved_feeder", JSON.stringify(currentProject));
    localStorage.setItem("sld_proj_" + currentProject.id, JSON.stringify(currentProject));
  } catch(e) {}

  if (window.clearSelection) clearSelection();
  updateFeederInputs();
  renderNetwork();
  fitToScreen();
  closeProjectsManager();
  showToast(`📁 تم فتح المخطط [${currentProject.name || 'المحدد'}] بنجاح!`, "success");
}

// حذف مشروع
async function deleteProjectFromManager(p_id, p_name) {
  if (!confirm(`هل أنت متأكد من رغبتك في حذف المخطط [${p_name}]؟`)) {
    return;
  }
  // 1. حذف من التخزين المحلي
  try {
    let catalog = JSON.parse(localStorage.getItem("sld_projects_catalog") || "[]");
    catalog = catalog.filter(p => p.id !== p_id && p.name !== p_name && p.name !== p_id);
    localStorage.setItem("sld_projects_catalog", JSON.stringify(catalog));
    localStorage.removeItem("sld_proj_" + p_id);

    if (typeof window.broadcastProjectDeleted === "function") {
      try { window.broadcastProjectDeleted(p_id, catalog); } catch(e) {}
    }
  } catch(e) {}

  // 2. حذف من الخادم إن وجد
  try {
    const encodedId = encodeURIComponent(p_id);
    await fetch(`/api/delete-project/${encodedId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: currentUser || {} })
    });
  } catch(e) {}

  showToast(`🗑️ تم حذف المشروع [${p_name}]`, "warning");
  openProjectsManager();
}

// تصدير وتنزيل المشروع كملف .sld
async function exportProjectAsSLD(p_id) {
  let projectData = (currentProject && (currentProject.id === p_id || currentProject.name === p_id)) ? currentProject : await loadProjectDataById(p_id);
  if (!projectData) {
    showToast("⚠️ تعذر العثور على بيانات المشروع للتصدير", "error");
    return;
  }
  const str = JSON.stringify(projectData, null, 2);
  const blob = new Blob([str], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const fileName = (projectData.name || projectData.id || "sld_project").replace(/[\\/*?:"<>|]/g, "_") + ".sld";
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`💾 تم تنزيل ملف المشروع [${fileName}] بنجاح!`, "success");
}

function exportCurrentProjectAsSLD() {
  if (!currentProject) {
    showToast("⚠️ لا يوجد مشروع مفتوح حالياً لتنزيله", "warning");
    return;
  }
  exportProjectAsSLD(currentProject.id);
}

// فتح نافذة اختيار ملف .sld
function triggerSLDFileImport() {
  const fileInput = document.getElementById("sld-file-import-input");
  if (fileInput) {
    fileInput.value = "";
    fileInput.click();
  }
}

// قراءة واستيراد ملف .sld
async function handleSLDFileInput(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async function(evt) {
    try {
      const content = evt.target.result;
      const parsed = JSON.parse(content);
      if (!parsed || !Array.isArray(parsed.nodes)) {
        showToast("❌ الملف غير صالح: لا يحتوي على عقد شبكية صالحة", "error");
        return;
      }
      if (!parsed.id) parsed.id = "feeder_" + Date.now();
      if (!parsed.name) parsed.name = file.name.replace(/\.[^/.]+$/, "");
      await saveProjectToStorage(parsed);
      currentProject = parsed;
      window.currentProject = parsed;
      if (window.clearSelection) clearSelection();
      updateFeederInputs();
      renderNetwork();
      fitToScreen();
      closeProjectsManager();
      showToast(`🎉 تم استيراد وحفظ المخطط [${parsed.name}] بنجاح!`, "success");
    } catch(err) {
      console.error("Import SLD Error:", err);
      showToast("❌ تعذر استيراد ملف المشروع: " + err.message, "error");
    }
  };
  reader.readAsText(file, "UTF-8");
}

function createNewProjectDirectly() {
  saveHistoryState();
  currentProject = {
    id: "feeder_" + Date.now(),
    name: "مخطط جديد",
    substation: "محطة محولات غرب",
    voltage_kv: 11,
    nodes: [
      { id: "N1", type: "substation", name: "محطة محولات غرب", x: 400, y: (window.drawingFlowDirection === 'up') ? 1000 : 80 }
    ],
    sections: []
  };
  window.currentProject = currentProject;
  if (window.clearSelection) clearSelection();
  updateFeederInputs();
  renderNetwork();
  resetZoom();
  closeProjectsManager();
  showToast("✨ تم فتح مشروع جديد مباشر - جاهز للرسم والعمل فوراً", "success");
}

function createNewProjectFromManager() {
  createNewProjectDirectly();
}

async function printProjectFromManager(p_id) {
  await loadProjectFromManager(p_id);
  setTimeout(() => {
    printFullSchematic();
  }, 400);
}

function printFullSchematic() {
  if (window.hasPermission && !window.hasPermission('btn_print')) {
    showToast("⛔ ليس لديك صلاحية طباعة المخطط", "error");
    return;
  }
  if (!currentProject || !currentProject.nodes || currentProject.nodes.length === 0) {
    showToast("⚠️ لا توجد شبكة للطباعة في المخطط الحالي", "warning");
    return;
  }

  showToast("🖨️ جاري ضبط المخطط والورقة هندسياً حسب اتجاه الرسم...", "info");

  // 1. حساب أبعاد ومحيط المخطط الفعلي (Bounding Box)
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  currentProject.nodes.forEach(n => {
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.y > maxY) maxY = n.y;
  });

  const drawingWidth = Math.max(maxX - minX, 100);
  const drawingHeight = Math.max(maxY - minY, 100);

  // تحديد اتجاه الورقة حسب اتجاه الرسم (أفقي Landscape إذا كان العرض أكبر، أو رأسي Portrait)
  const isLandscape = drawingWidth >= drawingHeight;

  // 2. تطبيق اتجاه الورقة ديناميكياً على المتصفح عبر @page
  let printStyleEl = document.getElementById("sld-dynamic-print-style");
  if (!printStyleEl) {
    printStyleEl = document.createElement("style");
    printStyleEl.id = "sld-dynamic-print-style";
    document.head.appendChild(printStyleEl);
  }
  printStyleEl.textContent = `
    @media print {
      @page {
        size: ${isLandscape ? 'A4 landscape' : 'A4 portrait'};
        margin: 6mm 8mm;
      }
    }
  `;

  // 3. ضبط viewBox للـ SVG ليبدأ المخطط في الورقة بدقة متناهية دون فراغات أو قص
  const svg = document.getElementById("sld-canvas");
  const stage = document.getElementById("canvas-stage");
  if (!svg || !stage) return;

  const padX = 60;
  const padY = 60;
  const vbX = minX - padX;
  const vbY = minY - padY;
  const vbW = drawingWidth + padX * 2;
  const vbH = drawingHeight + padY * 2;

  // حفظ الحالة التفاعلية الحالية قبل الطباعة
  const savedTransform = stage.getAttribute("transform");
  const savedViewBox = svg.getAttribute("viewBox");

  // ضبط الـ SVG للطباعة: يبدأ المخطط من أول الورقة متناسقاً تماماً
  svg.setAttribute("viewBox", `${vbX} ${vbY} ${vbW} ${vbH}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  stage.setAttribute("transform", "translate(0, 0) scale(1)");

  // 4. استعادة الحالة التفاعلية للمستخدم بعد انتهاء أمر الطباعة أو إلغائه
  let restored = false;
  const restoreAfterPrint = () => {
    if (restored) return;
    restored = true;

    if (savedTransform) stage.setAttribute("transform", savedTransform);
    else updateTransform();

    if (savedViewBox) svg.setAttribute("viewBox", savedViewBox);
    else svg.removeAttribute("viewBox");
    svg.removeAttribute("preserveAspectRatio");

    window.removeEventListener("afterprint", restoreAfterPrint);
  };
  window.addEventListener("afterprint", restoreAfterPrint);

  setTimeout(() => {
    window.print();
    setTimeout(restoreAfterPrint, 2000);
  }, 350);
}

// اختصارات الكيبورد
window.addEventListener("keydown", (e) => {
  const editModal = document.getElementById("edit-element-modal");
  const isEditModalOpen = editModal && !editModal.classList.contains("hidden");
  if (isEditModalOpen && e.key === "Escape") {
    e.preventDefault();
    closeEditElementModal();
    return;
  }

  const smartModal = document.getElementById("smart-delete-modal");
  const isSmartModalOpen = smartModal && !smartModal.classList.contains("hidden");

  if (isSmartModalOpen) {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmSmartDelete("auto_adjust");
      return;
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeSmartDeleteModal();
      return;
    }
  }

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
    e.preventDefault();
    undoLastStep();
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
    e.preventDefault();
    saveCurrentProject();
  } else if (e.key === "Delete" || e.key === "Backspace") {
    if (selectedElement && !e.target.closest("input") && !e.target.closest("select")) {
      e.preventDefault();
      openSmartDeleteModal(selectedElement.type, selectedElement.id);
    }
  }
});

// ─── فرد وطي القائمة الجانبية (Expand / Collapse Sidebar) ───────────────────
function toggleSidebarCollapse() {
  const sidebar = document.getElementById("sidebar-palette");
  const expandBtn = document.getElementById("sidebar-expand-tab");
  const ribbonIcon = document.getElementById("ribbon-sidebar-icon");
  const ribbonText = document.getElementById("ribbon-sidebar-text");
  if (!sidebar) return;

  const isCurrentlyCollapsed = sidebar.classList.contains("collapsed") || sidebar.style.display === "none";
  const willCollapse = !isCurrentlyCollapsed;

  if (willCollapse) {
    sidebar.classList.add("collapsed");
    sidebar.style.display = "none";
    if (expandBtn) {
      expandBtn.classList.remove("hidden");
      expandBtn.style.display = "flex";
    }
    if (ribbonIcon) ribbonIcon.textContent = "▶";
    if (ribbonText) ribbonText.textContent = "فرد القائمة";
    showToast("◀ تم طي القائمة الجانبية لتوسيع مساحة المخطط", "info");
  } else {
    sidebar.classList.remove("collapsed");
    sidebar.style.display = "";
    if (expandBtn) {
      expandBtn.classList.add("hidden");
      expandBtn.style.display = "none";
    }
    if (ribbonIcon) ribbonIcon.textContent = "◀";
    if (ribbonText) ribbonText.textContent = "طي القائمة";
    showToast("▶ تم فرد القائمة الجانبية ومكتبة العناصر", "info");
  }

  localStorage.setItem("sld_sidebar_collapsed", willCollapse ? "true" : "false");

  setTimeout(() => {
    if (window.fitToScreen) window.fitToScreen();
  }, 100);
}

function initSidebarState() {
  const isCollapsed = localStorage.getItem("sld_sidebar_collapsed") === "true";
  const sidebar = document.getElementById("sidebar-palette");
  const expandBtn = document.getElementById("sidebar-expand-tab");
  const ribbonIcon = document.getElementById("ribbon-sidebar-icon");
  const ribbonText = document.getElementById("ribbon-sidebar-text");
  if (!sidebar) return;

  if (isCollapsed) {
    sidebar.classList.add("collapsed");
    sidebar.style.display = "none";
    if (expandBtn) {
      expandBtn.classList.remove("hidden");
      expandBtn.style.display = "flex";
    }
    if (ribbonIcon) ribbonIcon.textContent = "▶";
    if (ribbonText) ribbonText.textContent = "فرد القائمة";
  } else {
    sidebar.classList.remove("collapsed");
    sidebar.style.display = "";
    if (expandBtn) {
      expandBtn.classList.add("hidden");
      expandBtn.style.display = "none";
    }
    if (ribbonIcon) ribbonIcon.textContent = "◀";
    if (ribbonText) ribbonText.textContent = "طي القائمة";
  }
}

// ─── تحديث هوية واسم المنظومة / الجهة ديناميكياً ─────────────────────────────
function updateAppBranding(appName) {
  // إذا كان هناك مستخدم مسجل دخول، فإن إدارته العامة هي التي تحدد اسم الهندسة في الشريط والقائمة الجانبية (المكتبة)
  let adminName = null;
  try {
    const saved = sessionStorage.getItem("sld_user");
    if (saved) {
      const u = JSON.parse(saved);
      if (u && u.administration) adminName = u.administration;
    }
  } catch(e) {}
  if (!adminName && window.currentUser && window.currentUser.administration) {
    adminName = window.currentUser.administration;
  }

  const engineeringTitle = adminName ? `هندسة كهرباء ${adminName}` : (appName || "شركة مصر الوسطى لتوزيع الكهرباء");

  const mainTitle = document.getElementById("main-system-title");
  if (mainTitle) mainTitle.textContent = engineeringTitle;

  const sidebarTitle = document.getElementById("sidebar-brand-title");
  if (sidebarTitle) sidebarTitle.textContent = engineeringTitle;

  // صفحة تسجيل الدخول تحمل دائماً هوية الشركة: شركة مصر الوسطى لتوزيع الكهرباء
  const loginTitle = document.getElementById("login-app-title");
  if (loginTitle) loginTitle.textContent = "شركة مصر الوسطى لتوزيع الكهرباء";

  const settingInput = document.getElementById("setting-system-app-name");
  if (settingInput && appName) settingInput.value = appName;

  document.title = `${engineeringTitle} | ENG-MOSTAFAELMGHRABY`;
}

// استعادة حالة طي القائمة الجانبية واتجاه الرسم عند تحميل الصفحة
window.addEventListener("DOMContentLoaded", () => {
  initSidebarState();
  updateDrawingDirectionUI();
});

window.toggleSidebarCollapse = toggleSidebarCollapse;
window.initSidebarState = initSidebarState;
window.updateAppBranding = updateAppBranding;
window.createNewProjectDirectly = createNewProjectDirectly;
window.createNewProjectFromManager = createNewProjectFromManager;
window.loadDemoVideoProject = loadDemoVideoProject;

window.toggleDrawingDirection = toggleDrawingDirection;
window.flipDrawingVerticalLayout = flipDrawingVerticalLayout;
window.updateDrawingDirectionUI = updateDrawingDirectionUI;

window.onLbnSegAChange = onLbnSegAChange;
window.onLbnSegBChange = onLbnSegBChange;
window.onLbnSplitSliderChange = onLbnSplitSliderChange;
window.setLbnSplitRatio = setLbnSplitRatio;

window.onEditNodeCoordInput = onEditNodeCoordInput;
window.nudgeNodePosition = nudgeNodePosition;
window.onEditNodeDirectionChange = onEditNodeDirectionChange;
window.deleteSwitchDirectly = deleteSwitchDirectly;
window.deleteTransformerOrKioskDirectly = deleteTransformerOrKioskDirectly;

window.saveCurrentProject = saveCurrentProject;
window.openProjectsManager = openProjectsManager;
window.closeProjectsManager = closeProjectsManager;
window.loadProjectFromManager = loadProjectFromManager;
window.deleteProjectFromManager = deleteProjectFromManager;
window.exportProjectAsSLD = exportProjectAsSLD;
window.exportCurrentProjectAsSLD = exportCurrentProjectAsSLD;
window.triggerSLDFileImport = triggerSLDFileImport;
window.handleSLDFileInput = handleSLDFileInput;
window.saveProjectToStorage = saveProjectToStorage;
window.getLocalProjectsCatalog = getLocalProjectsCatalog;

// ─── توجيه وتبديل زوايا الكابلات القائمة 90 درجة ──────────────────────────────
function toggleSection90DegreeCorner(secId) {
  if (!currentProject || !currentProject.sections) return;
  const sec = currentProject.sections.find(s => s.id === secId);
  if (!sec) return;

  const fromNode = currentProject.nodes.find(n => n.id === sec.from_node);
  const toNode = currentProject.nodes.find(n => n.id === sec.to_node);
  if (!fromNode || !toNode) return;

  const dx = Math.abs(toNode.x - fromNode.x);
  const dy = Math.abs(toNode.y - fromNode.y);

  // إذا كان الخط متعامداً، تبديل بين hv و vh
  let currentStyle = sec.corner_style;
  if (!currentStyle || currentStyle === "auto") {
    if (fromNode.type === "kiosk" && toNode.type === "kiosk") {
      currentStyle = "vh";
    } else if (toNode.type === "kiosk") {
      currentStyle = (toNode.direction === "up") ? "hv" : "vh";
    } else if (fromNode.type === "kiosk") {
      currentStyle = "hv";
    } else {
      currentStyle = (dx >= dy) ? "hv" : "vh";
    }
  }

  sec.corner_style = (currentStyle === "hv") ? "vh" : "hv";
  sec.deflection_offset = 0; // مسار زاوية نظيف 90° بدون انحراف عشوائي
  sec.is_slanted = false;

  if (typeof saveHistoryState === "function") saveHistoryState();
  if (typeof renderNetwork === "function") renderNetwork();
  if (typeof updateSectionFloatingToolbar === "function") updateSectionFloatingToolbar();

  const styleArabic = (sec.corner_style === "hv") ? "أفقي ➔ رأسي" : "رأسي ➔ أفقي";
  showToast(`📐 تم تبديل مسار زاوية الكابل 90° (${styleArabic})`, "info");
}

function orientSectionDirection(secId, direction) {
  if (!currentProject || !currentProject.sections) return;
  const sec = currentProject.sections.find(s => s.id === secId);
  if (!sec) return;

  const fromNode = currentProject.nodes.find(n => n.id === sec.from_node);
  const toNode = currentProject.nodes.find(n => n.id === sec.to_node);
  if (!fromNode || !toNode) return;

  const toNodeDegree = (currentProject.sections || []).filter(s => s.from_node === toNode.id || s.to_node === toNode.id).length;
  const isMovableLeaf = (toNodeDegree <= 1) || (toNode.type === "transformer" || toNode.type === "switch" || toNode.type === "kiosk");
  const minSpacing = 140;

  if (direction === "down") {
    sec.corner_style = "vh";
    if (isMovableLeaf && toNode.y <= fromNode.y) {
      toNode.y = fromNode.y + minSpacing;
    }
    if (toNode.type === "transformer" || toNode.type === "kiosk") toNode.direction = "down";
  } else if (direction === "up") {
    sec.corner_style = "vh";
    if (isMovableLeaf && toNode.y >= fromNode.y) {
      toNode.y = fromNode.y - minSpacing;
    }
    if (toNode.type === "transformer" || toNode.type === "kiosk") toNode.direction = "up";
  } else if (direction === "right") {
    sec.corner_style = "hv";
    if (isMovableLeaf && toNode.x <= fromNode.x) {
      toNode.x = fromNode.x + minSpacing;
    }
    if (toNode.type === "transformer" || toNode.type === "kiosk") toNode.direction = "right";
  } else if (direction === "left") {
    sec.corner_style = "hv";
    if (isMovableLeaf && toNode.x >= fromNode.x) {
      toNode.x = fromNode.x - minSpacing;
    }
    if (toNode.type === "transformer" || toNode.type === "kiosk") toNode.direction = "left";
  }

  sec.deflection_offset = 0;
  sec.is_slanted = false;
  sec.direction = direction;

  if (typeof saveHistoryState === "function") saveHistoryState();
  if (typeof renderNetwork === "function") renderNetwork();
  if (typeof updateSectionFloatingToolbar === "function") updateSectionFloatingToolbar();

  const dirNames = { down: "لأسفل ⬇️", up: "لأعلى ⬆️", right: "لليمين ➡️", left: "لليسار ⬅️" };
  showToast(`📐 تم توجيه الكابل 90° (${dirNames[direction] || direction}) بنجاح`, "info");
}

function quickToggleSelectedSectionCorner() {
  if (selectedElement && selectedElement.type === "section") {
    toggleSection90DegreeCorner(selectedElement.id);
  }
}

function quickOrientSelectedSection(direction) {
  if (selectedElement && selectedElement.type === "section") {
    orientSectionDirection(selectedElement.id, direction);
  }
}

function quickResetSelectedSectionDeflect() {
  if (selectedElement && selectedElement.type === "section" && currentProject) {
    const sec = currentProject.sections.find(s => s.id === selectedElement.id);
    if (sec) {
      sec.deflection_offset = 0;
      sec.is_slanted = false;
      delete sec.corner_style;
      if (typeof saveHistoryState === "function") saveHistoryState();
      if (typeof renderNetwork === "function") renderNetwork();
      if (typeof updateSectionFloatingToolbar === "function") updateSectionFloatingToolbar();
      showToast("↺ تم إعادة مسار الخط / الكابل للوضع الطبيعي المستقيم", "info");
    }
  }
}

function quickEditSelectedSection() {
  if (selectedElement && selectedElement.type === "section") {
    openEditElementModal("section", selectedElement.id);
  }
}

window.toggleSection90DegreeCorner = toggleSection90DegreeCorner;
window.orientSectionDirection = orientSectionDirection;
window.quickToggleSelectedSectionCorner = quickToggleSelectedSectionCorner;
window.quickOrientSelectedSection = quickOrientSelectedSection;
window.quickResetSelectedSectionDeflect = quickResetSelectedSectionDeflect;
window.quickEditSelectedSection = quickEditSelectedSection;

// ─── استقبال ومزامنة المشاريع سحابياً فور وصولها من جهاز آخر ───────────────────
function applySyncedProject(project, catalog) {
  if (project && project.id) {
    try {
      localStorage.setItem("sld_proj_" + project.id, JSON.stringify(project));
      saveFeederForAdmin(project);
      localStorage.setItem("sld_saved_feeder", JSON.stringify(project));
      currentProject = project;
      window.currentProject = project;
      if (typeof updateFeederInputs === "function") updateFeederInputs();
      if (typeof renderNetwork === "function") renderNetwork();
      if (typeof fitToScreen === "function") fitToScreen();
      else if (window.fitToScreen) window.fitToScreen();
    } catch(e) {}
  }
  if (Array.isArray(catalog)) {
    try {
      saveCatalogForAdmin(catalog);
      localStorage.setItem("sld_projects_catalog", JSON.stringify(catalog));
      const modal = document.getElementById("projects-manager-modal");
      if (modal && !modal.classList.contains("hidden") && typeof renderProjectsManagerList === "function") {
        renderProjectsManagerList();
      }
    } catch(e) {}
  }
}

function applySyncedCatalog(catalog) {
  if (Array.isArray(catalog)) {
    try {
      saveCatalogForAdmin(catalog);
      localStorage.setItem("sld_projects_catalog", JSON.stringify(catalog));
      const modal = document.getElementById("projects-manager-modal");
      if (modal && !modal.classList.contains("hidden") && typeof renderProjectsManagerList === "function") {
        renderProjectsManagerList();
      }
    } catch(e) {}
  }
}

window.applySyncedProject = applySyncedProject;
window.applySyncedCatalog = applySyncedCatalog;

// ═══════════════════════════════════════════════════════════════════════════════
// 🔍 محرك البحث الفوري عن العقد والمعدات وتوسيطها في الرسم (Node Search Engine)
// ═══════════════════════════════════════════════════════════════════════════════

let nodeSearchResults = [];
let nodeSearchCurrentIndex = -1;

function normalizeArabicSearch(text) {
  if (!text) return "";
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[\u064B-\u065F]/g, "");
}

function getNodeTypeArabicLabel(node) {
  if (!node) return "عقدة";
  switch (node.type) {
    case "substation":
      return (node.subType === "board" || (node.name && node.name.includes("لوحة"))) ? "لوحة توزيع" : "محطة محولات";
    case "switch":
      return `سكينة هوائية (${node.state === "open" ? "🔴 مفتوحة" : "🟢 مغلقة"})`;
    case "transformer":
      return `محول معلق (${node.rating || 300} ك.ف.أ)`;
    case "kiosk":
      return `كشك محولات (${node.rating || 500} ك.ف.أ)`;
    case "rmu":
      return "وحدة ربط RMU";
    case "avr":
      return "منظم جهد AVR";
    default:
      return "نقطة تفرع";
  }
}

function getNodeIcon(node) {
  if (!node) return "⭕";
  switch (node.type) {
    case "substation": return "🏭";
    case "switch": return "⚡";
    case "transformer": return "⚙️";
    case "kiosk": return "🔺";
    case "rmu": return "🔄";
    case "avr": return "🔋";
    default: return "⭕";
  }
}

function handleNodeSearchInput(query) {
  const clearBtn = document.getElementById("btn-node-search-clear");
  const prevBtn = document.getElementById("btn-node-search-prev");
  const nextBtn = document.getElementById("btn-node-search-next");
  const counter = document.getElementById("node-search-counter");
  const dropdown = document.getElementById("node-search-dropdown");

  const cleanQ = normalizeArabicSearch(query);

  if (!cleanQ) {
    if (clearBtn) clearBtn.style.display = "none";
    if (prevBtn) prevBtn.style.display = "none";
    if (nextBtn) nextBtn.style.display = "none";
    if (counter) counter.style.display = "none";
    if (dropdown) dropdown.classList.add("hidden");
    nodeSearchResults = [];
    nodeSearchCurrentIndex = -1;
    document.querySelectorAll(".sld-search-highlight").forEach(el => el.classList.remove("sld-search-highlight"));
    return;
  }

  if (clearBtn) clearBtn.style.display = "inline-block";

  const proj = (window.getCurrentProject ? window.getCurrentProject() : null) || window.currentProject || currentProject;
  if (!proj || !proj.nodes || proj.nodes.length === 0) {
    if (counter) {
      counter.textContent = "0/0";
      counter.style.display = "inline-block";
    }
    if (dropdown) {
      dropdown.innerHTML = `<div class="node-search-empty">⚠️ لا توجد عقد في هذا المشروع</div>`;
      dropdown.classList.remove("hidden");
    }
    return;
  }

  // تصفية وترتيب العقد بحسب التطابق
  const matches = [];

  proj.nodes.forEach(node => {
    const idNorm = normalizeArabicSearch(node.id);
    const nameNorm = normalizeArabicSearch(node.name || "");
    const typeNorm = normalizeArabicSearch(node.type || "");
    const ratingStr = node.rating ? String(node.rating) : "";

    let score = 0;

    // 1. تطابق تام للـ ID (مثل N14 أو 14)
    if (idNorm === cleanQ || idNorm.replace("n", "") === cleanQ.replace("n", "")) {
      score = 1000;
    } else if (idNorm.startsWith(cleanQ) || idNorm.replace("n", "").startsWith(cleanQ)) {
      score = 800;
    } else if (nameNorm.startsWith(cleanQ)) {
      score = 700;
    } else if (idNorm.includes(cleanQ)) {
      score = 600;
    } else if (nameNorm.includes(cleanQ)) {
      score = 500;
    } else if (typeNorm.includes(cleanQ)) {
      score = 400;
    } else if (cleanQ === "كشك" && node.type === "kiosk") {
      score = 450;
    } else if (cleanQ.includes("محول") && (node.type === "transformer" || node.type === "kiosk")) {
      score = 450;
    } else if (cleanQ.includes("سكين") && node.type === "switch") {
      score = 450;
    } else if ((cleanQ.includes("محط") || cleanQ.includes("لوح")) && node.type === "substation") {
      score = 450;
    } else if (cleanQ.includes("ربط") && node.type === "rmu") {
      score = 450;
    } else if (cleanQ.includes("منظم") && node.type === "avr") {
      score = 450;
    } else if (ratingStr && ratingStr.includes(cleanQ)) {
      score = 300;
    }

    if (score > 0) {
      matches.push({ node, score });
    }
  });

  matches.sort((a, b) => b.score - a.score);
  nodeSearchResults = matches.map(m => m.node);

  if (nodeSearchResults.length === 0) {
    nodeSearchCurrentIndex = -1;
    if (counter) {
      counter.textContent = "0/0";
      counter.style.display = "inline-block";
    }
    if (prevBtn) prevBtn.style.display = "none";
    if (nextBtn) nextBtn.style.display = "none";
    if (dropdown) {
      dropdown.innerHTML = `<div class="node-search-empty">🔍 لا توجد عقدة تطابق "${query}"</div>`;
      dropdown.classList.remove("hidden");
    }
    document.querySelectorAll(".sld-search-highlight").forEach(el => el.classList.remove("sld-search-highlight"));
    return;
  }

  nodeSearchCurrentIndex = 0;
  if (counter) {
    counter.textContent = `${nodeSearchCurrentIndex + 1}/${nodeSearchResults.length}`;
    counter.style.display = "inline-block";
  }
  if (prevBtn) prevBtn.style.display = "inline-flex";
  if (nextBtn) nextBtn.style.display = "inline-flex";

  renderNodeSearchDropdown();

  // توسيط وتحديد أول نتيجة فوراً
  const targetNode = nodeSearchResults[0];
  if (window.centerOnNode) {
    window.centerOnNode(targetNode.id, true);
  }
}

function renderNodeSearchDropdown() {
  const dropdown = document.getElementById("node-search-dropdown");
  if (!dropdown) return;

  if (nodeSearchResults.length === 0) {
    dropdown.classList.add("hidden");
    return;
  }

  let html = "";
  const displayLimit = Math.min(nodeSearchResults.length, 30);

  for (let i = 0; i < displayLimit; i++) {
    const node = nodeSearchResults[i];
    const icon = getNodeIcon(node);
    const typeLabel = getNodeTypeArabicLabel(node);
    const activeClass = (i === nodeSearchCurrentIndex) ? "active" : "";

    html += `
      <div class="node-search-item ${activeClass}" onclick="selectSearchedNode('${node.id}', ${i})">
        <div class="node-search-item-info">
          <span class="node-search-item-icon">${icon}</span>
          <span class="node-search-item-id">[${node.id}]</span>
          <span class="node-search-item-name" title="${node.name || ''}">${node.name || typeLabel}</span>
        </div>
        <span class="node-search-item-type">${typeLabel}</span>
      </div>
    `;
  }

  if (nodeSearchResults.length > displayLimit) {
    html += `<div style="padding:6px 12px; font-size:10.5px; color:#64748b; text-align:center;">... والمزيد (${nodeSearchResults.length - displayLimit} عقدة إضافية)</div>`;
  }

  dropdown.innerHTML = html;
  dropdown.classList.remove("hidden");
}

function selectSearchedNode(nodeId, index = -1) {
  if (index >= 0) {
    nodeSearchCurrentIndex = index;
  } else {
    nodeSearchCurrentIndex = nodeSearchResults.findIndex(n => n.id === nodeId);
  }

  const counter = document.getElementById("node-search-counter");
  if (counter && nodeSearchResults.length > 0 && nodeSearchCurrentIndex >= 0) {
    counter.textContent = `${nodeSearchCurrentIndex + 1}/${nodeSearchResults.length}`;
  }

  if (window.centerOnNode) {
    window.centerOnNode(nodeId, true);
  }

  const dropdown = document.getElementById("node-search-dropdown");
  if (dropdown) dropdown.classList.add("hidden");

  // تحديث حالة العنصر النشط في القائمة
  document.querySelectorAll(".node-search-item").forEach((el, idx) => {
    if (idx === nodeSearchCurrentIndex) el.classList.add("active");
    else el.classList.remove("active");
  });
}

function navigateNodeSearch(direction) {
  if (nodeSearchResults.length === 0) return;

  nodeSearchCurrentIndex += direction;
  if (nodeSearchCurrentIndex >= nodeSearchResults.length) {
    nodeSearchCurrentIndex = 0;
  } else if (nodeSearchCurrentIndex < 0) {
    nodeSearchCurrentIndex = nodeSearchResults.length - 1;
  }

  const counter = document.getElementById("node-search-counter");
  if (counter) {
    counter.textContent = `${nodeSearchCurrentIndex + 1}/${nodeSearchResults.length}`;
  }

  const targetNode = nodeSearchResults[nodeSearchCurrentIndex];
  if (targetNode && window.centerOnNode) {
    window.centerOnNode(targetNode.id, true);
  }

  renderNodeSearchDropdown();

  // تمرير القائمة المنسدلة إلى العنصر النشط
  const dropdown = document.getElementById("node-search-dropdown");
  const activeEl = dropdown?.querySelector(".node-search-item.active");
  if (activeEl) {
    activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

function clearNodeSearch() {
  const input = document.getElementById("node-search-input");
  const clearBtn = document.getElementById("btn-node-search-clear");
  const prevBtn = document.getElementById("btn-node-search-prev");
  const nextBtn = document.getElementById("btn-node-search-next");
  const counter = document.getElementById("node-search-counter");
  const dropdown = document.getElementById("node-search-dropdown");

  if (input) input.value = "";
  if (clearBtn) clearBtn.style.display = "none";
  if (prevBtn) prevBtn.style.display = "none";
  if (nextBtn) nextBtn.style.display = "none";
  if (counter) counter.style.display = "none";
  if (dropdown) dropdown.classList.add("hidden");

  nodeSearchResults = [];
  nodeSearchCurrentIndex = -1;

  document.querySelectorAll(".sld-search-highlight").forEach(el => el.classList.remove("sld-search-highlight"));
}

function focusNodeSearch() {
  const input = document.getElementById("node-search-input");
  if (input) {
    input.focus();
    input.select();
    if (input.value.trim() && nodeSearchResults.length > 0) {
      renderNodeSearchDropdown();
    }
  }
}

function handleNodeSearchFocus() {
  const input = document.getElementById("node-search-input");
  if (input && input.value.trim() && nodeSearchResults.length > 0) {
    renderNodeSearchDropdown();
  }
}

function handleNodeSearchKeydown(e) {
  if (e.key === "Enter") {
    e.preventDefault();
    if (e.shiftKey) {
      navigateNodeSearch(-1);
    } else {
      navigateNodeSearch(1);
    }
  } else if (e.key === "Escape") {
    const dropdown = document.getElementById("node-search-dropdown");
    if (dropdown) dropdown.classList.add("hidden");
    document.getElementById("node-search-input")?.blur();
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    navigateNodeSearch(1);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    navigateNodeSearch(-1);
  }
}

// اختصار لوحة المفاتيح الفوري: Ctrl+F أو Ctrl+K لفتح البحث عن نود
window.addEventListener("keydown", function(e) {
  if ((e.ctrlKey || e.metaKey) && (e.key === "f" || e.key === "F" || e.key === "k" || e.key === "K")) {
    const activeModal = document.querySelector(".modal:not(.hidden), .settings-overlay:not(.hidden)");
    if (!activeModal) {
      e.preventDefault();
      focusNodeSearch();
    }
  }
});

// إغلاق قائمة نتائج البحث عند النقر خارجها
document.addEventListener("click", function(e) {
  const capsule = document.getElementById("node-search-capsule");
  const dropdown = document.getElementById("node-search-dropdown");
  if (capsule && dropdown && !capsule.contains(e.target)) {
    dropdown.classList.add("hidden");
  }
});

window.handleNodeSearchInput = handleNodeSearchInput;
window.handleNodeSearchKeydown = handleNodeSearchKeydown;
window.handleNodeSearchFocus = handleNodeSearchFocus;
window.navigateNodeSearch = navigateNodeSearch;
window.clearNodeSearch = clearNodeSearch;
window.focusNodeSearch = focusNodeSearch;
window.selectSearchedNode = selectSearchedNode;

// ─── إدارة كروت التنويهات والملاحظات الهندسية (Annotations Manager) ─────────
let currentEditingAnnotationId = null;
let pendingAnnotationPos = null;
window.isPickingAnnotationPos = false;

function openAddAnnotationModal(initialX, initialY) {
  currentEditingAnnotationId = null;
  const modal = document.getElementById("annotation-modal");
  if (!modal) return;

  const titleInput = document.getElementById("anno-title-input");
  const textInput = document.getElementById("anno-text-input");
  const colorSelect = document.getElementById("anno-color-select");
  const fontSelect = document.getElementById("anno-font-size");
  const borderSelect = document.getElementById("anno-border-style");
  const modalTitle = document.getElementById("annotation-modal-title");
  const deleteBtn = document.getElementById("btn-delete-annotation-modal");
  const coordDisplay = document.getElementById("anno-coord-display");

  if (modalTitle) modalTitle.innerHTML = "<span>📝</span> <span>إضافة كارت تنويه / ملاحظة هندسية</span>";
  if (deleteBtn) deleteBtn.style.display = "none";

  if (titleInput) titleInput.value = "";
  if (textInput) textInput.value = "";
  if (colorSelect) colorSelect.value = "#f59e0b";
  if (fontSelect) fontSelect.value = "13";
  if (borderSelect) borderSelect.value = "solid";

  if (typeof initialX === "number" && typeof initialY === "number") {
    pendingAnnotationPos = { x: Math.round(initialX), y: Math.round(initialY) };
  } else {
    const viewport = document.getElementById("viewport");
    const rect = viewport ? viewport.getBoundingClientRect() : { width: 800, height: 600 };
    const centerScreen = (typeof screenToStage === "function") ? 
      screenToStage(rect.width / 2, rect.height / 2) : { x: 150, y: 150 };
    pendingAnnotationPos = { x: Math.round(centerScreen.x || 150), y: Math.round(centerScreen.y || 150) };
  }

  if (coordDisplay) {
    coordDisplay.textContent = `(${pendingAnnotationPos.x}, ${pendingAnnotationPos.y})`;
  }

  modal.classList.remove("hidden");
  setTimeout(() => textInput?.focus(), 150);
}
window.openAddAnnotationModal = openAddAnnotationModal;

function openEditAnnotationModal(annoId, e) {
  if (e && typeof e.stopPropagation === "function") e.stopPropagation();
  if (!currentProject || !currentProject.annotations) return;
  const anno = currentProject.annotations.find(a => a.id === annoId);
  if (!anno) return;

  currentEditingAnnotationId = annoId;
  const modal = document.getElementById("annotation-modal");
  if (!modal) return;

  const titleInput = document.getElementById("anno-title-input");
  const textInput = document.getElementById("anno-text-input");
  const colorSelect = document.getElementById("anno-color-select");
  const fontSelect = document.getElementById("anno-font-size");
  const borderSelect = document.getElementById("anno-border-style");
  const modalTitle = document.getElementById("annotation-modal-title");
  const deleteBtn = document.getElementById("btn-delete-annotation-modal");
  const coordDisplay = document.getElementById("anno-coord-display");

  if (modalTitle) modalTitle.innerHTML = "<span>✏️</span> <span>تعديل كارت التنويه والملاحظة</span>";
  if (deleteBtn) deleteBtn.style.display = "inline-flex";

  if (titleInput) titleInput.value = anno.badgeTitle || "";
  if (textInput) textInput.value = anno.text || "";
  if (colorSelect) colorSelect.value = anno.color || "#f59e0b";
  if (fontSelect) fontSelect.value = String(anno.fontSize || 13);
  if (borderSelect) borderSelect.value = anno.borderStyle || "solid";

  pendingAnnotationPos = { x: Math.round(anno.x || 100), y: Math.round(anno.y || 100) };
  if (coordDisplay) {
    coordDisplay.textContent = `(${pendingAnnotationPos.x}, ${pendingAnnotationPos.y})`;
  }

  modal.classList.remove("hidden");
  setTimeout(() => textInput?.focus(), 150);
}
window.openEditAnnotationModal = openEditAnnotationModal;

function closeAnnotationModal() {
  const modal = document.getElementById("annotation-modal");
  if (modal) modal.classList.add("hidden");
  currentEditingAnnotationId = null;
  window.isPickingAnnotationPos = false;
  document.body.classList.remove("picking-annotation-pos");
}
window.closeAnnotationModal = closeAnnotationModal;

function saveAnnotationFromModal() {
  if (!currentProject) return;
  const textInput = document.getElementById("anno-text-input");
  const titleInput = document.getElementById("anno-title-input");
  const colorSelect = document.getElementById("anno-color-select");
  const fontSelect = document.getElementById("anno-font-size");
  const borderSelect = document.getElementById("anno-border-style");

  const text = (textInput?.value || "").trim();
  if (!text) {
    showToast("⚠️ يرجى كتابة نص التنويه أولاً", "warning");
    textInput?.focus();
    return;
  }

  const badgeTitle = (titleInput?.value || "").trim();
  const color = colorSelect?.value || "#f59e0b";
  const fontSize = parseInt(fontSelect?.value, 10) || 13;
  const borderStyle = borderSelect?.value || "solid";

  if (!currentProject.annotations) currentProject.annotations = [];

  saveHistoryState();

  if (currentEditingAnnotationId) {
    const anno = currentProject.annotations.find(a => a.id === currentEditingAnnotationId);
    if (anno) {
      anno.text = text;
      anno.badgeTitle = badgeTitle;
      anno.color = color;
      anno.borderColor = color;
      anno.fontSize = fontSize;
      anno.borderStyle = borderStyle;
      if (pendingAnnotationPos) {
        anno.x = pendingAnnotationPos.x;
        anno.y = pendingAnnotationPos.y;
      }
      anno.updated_at = Date.now();
      showToast("✅ تم تعديل كارت التنويه بنجاح", "success");
    }
  } else {
    const newId = "anno_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    const newAnno = {
      id: newId,
      text: text,
      badgeTitle: badgeTitle,
      x: pendingAnnotationPos ? pendingAnnotationPos.x : 150,
      y: pendingAnnotationPos ? pendingAnnotationPos.y : 150,
      color: color,
      bgColor: "rgba(15, 23, 42, 0.92)",
      borderColor: color,
      textColor: "#ffffff",
      borderStyle: borderStyle,
      fontSize: fontSize,
      updated_at: Date.now()
    };
    currentProject.annotations.push(newAnno);
    if (typeof selectElement === "function") {
      selectElement("annotation", newId, "تنويه: " + (badgeTitle || text.substring(0, 20)));
    }
    showToast("✅ تم إضافة كارت التنويه في الرسم بنجاح (يمكنك سحبه لأي مكان)", "success");
  }

  if (window.currentProject) {
    window.currentProject.annotations = currentProject.annotations;
  }

  closeAnnotationModal();
  if (typeof renderNetwork === "function") renderNetwork();
  if (window.broadcastProjectUpdate) window.broadcastProjectUpdate("annotation_saved");
}
window.saveAnnotationFromModal = saveAnnotationFromModal;

function deleteAnnotation(annoId, e) {
  if (e && typeof e.stopPropagation === "function") e.stopPropagation();
  if (!currentProject || !currentProject.annotations) return;

  saveHistoryState();
  currentProject.annotations = currentProject.annotations.filter(a => a.id !== annoId);
  if (window.currentProject) {
    window.currentProject.annotations = currentProject.annotations;
  }
  if (typeof selectedElement !== "undefined" && selectedElement && selectedElement.type === "annotation" && selectedElement.id === annoId) {
    if (typeof clearSelection === "function") clearSelection();
  }
  if (typeof renderNetwork === "function") renderNetwork();
  showToast("🗑️ تم حذف كارت التنويه بنجاح", "info");
  if (window.broadcastProjectUpdate) window.broadcastProjectUpdate("annotation_deleted");
}
window.deleteAnnotation = deleteAnnotation;

function deleteAnnotationFromModal() {
  if (!currentEditingAnnotationId) return;
  deleteAnnotation(currentEditingAnnotationId);
  closeAnnotationModal();
}
window.deleteAnnotationFromModal = deleteAnnotationFromModal;

function applyQuickAnnoPreset(title, text, color, borderStyle) {
  const titleInput = document.getElementById("anno-title-input");
  const textInput = document.getElementById("anno-text-input");
  const colorSelect = document.getElementById("anno-color-select");
  const borderSelect = document.getElementById("anno-border-style");

  if (titleInput && title) titleInput.value = title;
  if (textInput && text && !textInput.value) textInput.value = text;
  if (colorSelect && color) colorSelect.value = color;
  if (borderSelect && borderStyle) borderSelect.value = borderStyle;
}
window.applyQuickAnnoPreset = applyQuickAnnoPreset;

function pickAnnotationPositionOnCanvas() {
  const modal = document.getElementById("annotation-modal");
  if (modal) modal.classList.add("hidden");

  window.isPickingAnnotationPos = true;
  document.body.classList.add("picking-annotation-pos");
  showToast("🎯 انقر الآن في أي مكان على مساحة الرسم لتحديد موقع التنويه", "info", 5000);
}
window.pickAnnotationPositionOnCanvas = pickAnnotationPositionOnCanvas;

function finalizeAnnotationPick(x, y) {
  window.isPickingAnnotationPos = false;
  document.body.classList.remove("picking-annotation-pos");
  pendingAnnotationPos = { x: Math.round(x), y: Math.round(y) };

  const coordDisplay = document.getElementById("anno-coord-display");
  if (coordDisplay) {
    coordDisplay.textContent = `(${pendingAnnotationPos.x}, ${pendingAnnotationPos.y})`;
  }

  const modal = document.getElementById("annotation-modal");
  if (modal) modal.classList.remove("hidden");
  showToast("📍 تم تحديد الموضع بنجاح", "success");
}
window.finalizeAnnotationPick = finalizeAnnotationPick;






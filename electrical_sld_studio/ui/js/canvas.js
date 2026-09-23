/**
 * Smart Grid SLD Studio - Infinite Canvas & Pan/Zoom Manager
 * Copyright (C) ENG-MOSTAFAELMGHRABY - All Rights Reserved
 */

let canvasScale = 1.0;
let panX = 120;
let panY = 60;
let isPanning = false;
let startX = 0;
let startY = 0;
let showGrid = true;
let isSimulationActive = false;
let selectedElement = null; // { type: 'node' | 'section', id: string, name: string }
var currentProject = window.currentProject || null;

let isDraggingNode = false;
let dragNodeId = null;
let dragStartClient = { x: 0, y: 0 };
let dragStartStage = { x: 0, y: 0 };
let initialNodePositions = new Map();
let downstreamNodeIds = new Set();
let incomingSection = null;
let initialDist = 0;
let initialMeters = 1000;
let hasDragged = false;
let lastDragEndTime = 0;

let isDraggingAnnotation = false;
let dragAnnoId = null;
let dragAnnoStartClient = { x: 0, y: 0 };
let dragAnnoStartPos = { x: 0, y: 0 };
let hasAnnoDragged = false;

function screenToStage(clientX, clientY) {
  const viewport = document.getElementById("viewport");
  if (!viewport) return { x: 0, y: 0 };
  const rect = viewport.getBoundingClientRect();
  const mouseX = clientX - rect.left;
  const mouseY = clientY - rect.top;
  return {
    x: (mouseX - panX) / canvasScale,
    y: (mouseY - panY) / canvasScale
  };
}

function getDownstreamNodes(startNodeId) {
  const descendants = new Set();
  const queue = [startNodeId];
  const sections = (currentProject && currentProject.sections) ? currentProject.sections : [];

  while (queue.length > 0) {
    const currId = queue.shift();
    const outgoing = sections.filter(s => s.from_node === currId);
    for (const sec of outgoing) {
      if (!descendants.has(sec.to_node) && sec.to_node !== startNodeId) {
        descendants.add(sec.to_node);
        queue.push(sec.to_node);
      }
    }
  }
  return descendants;
}

function startNodeDrag(e, nodeId) {
  if (!currentProject || !currentProject.nodes) return;
  const node = currentProject.nodes.find(n => n.id === nodeId);
  if (!node) return;

  isDraggingNode = true;
  dragNodeId = nodeId;
  hasDragged = false;
  dragStartClient = { x: e.clientX, y: e.clientY };
  dragStartStage = screenToStage(e.clientX, e.clientY);

  initialNodePositions = new Map();
  currentProject.nodes.forEach(n => {
    initialNodePositions.set(n.id, { x: n.x, y: n.y });
  });

  // إذا كان العنصر كشك أو محول، أو تم الضغط على مفتاح Alt، يتم تحريك هذا العنصر بمفرده دون تحريك الفروع التابعة لتوسيع المسافة
  if (node.type === "kiosk" || node.type === "transformer" || (e && e.altKey)) {
    downstreamNodeIds = new Set();
  } else {
    downstreamNodeIds = getDownstreamNodes(nodeId);
  }

  // البحث عن الخط المغذي الواصل لهذه العقدة
  incomingSection = (currentProject.sections || []).find(s => s.to_node === nodeId);
  if (incomingSection) {
    const fromNode = currentProject.nodes.find(n => n.id === incomingSection.from_node);
    if (fromNode) {
      initialDist = Math.hypot(node.x - fromNode.x, node.y - fromNode.y);
      initialMeters = incomingSection.length || 1000;
    }
  } else {
    initialDist = 0;
    initialMeters = 0;
  }

  document.body.classList.add("dragging-node");
}

function handleNodeDrag(e) {
  if (!isDraggingNode || !dragNodeId || !currentProject) return;

  const dxClient = e.clientX - dragStartClient.x;
  const dyClient = e.clientY - dragStartClient.y;
  if (!hasDragged && Math.hypot(dxClient, dyClient) > 4) {
    hasDragged = true;
  }
  if (!hasDragged) return;

  const currStage = screenToStage(e.clientX, e.clientY);
  const dxStage = currStage.x - dragStartStage.x;
  const dyStage = currStage.y - dragStartStage.y;

  const dragNode = currentProject.nodes.find(n => n.id === dragNodeId);
  const initDragPos = initialNodePositions.get(dragNodeId);
  if (!dragNode || !initDragPos) return;

  let finalDx = dxStage;
  let finalDy = dyStage;

  if (dragNode.type === "kiosk") {
    // إتاحة حرية كاملة لسحب الكشك وتوسيع المسافة لليمين دون تشويه المحاذاة أو تغيير الاتجاه
    const absDx = Math.abs(dxStage);
    const absDy = Math.abs(dyStage);
    if (absDx >= absDy) {
      finalDx = dxStage;
      finalDy = 0;
    } else {
      finalDx = 0;
      finalDy = dyStage;
    }
  } else if (incomingSection) {
    const fromNode = currentProject.nodes.find(n => n.id === incomingSection.from_node);
    const initFromPos = fromNode ? initialNodePositions.get(fromNode.id) : null;

    if (initFromPos) {
      const fromTerm = (typeof Components !== "undefined" && Components.getTerminalPoint) ?
        Components.getTerminalPoint(fromNode, true, incomingSection) : initFromPos;

      // حساب الإزاحة الحالية للماوس بالنسبة لنقطة بداية الخط لتحديد الاتجاه وزاوية الميلان بحرية تامة
      const currTargetX = currStage.x;
      const currTargetY = currStage.y;
      const relDx = currTargetX - fromTerm.x;
      const relDy = currTargetY - fromTerm.y;

      const snapThreshold = 18;
      let newX, newY, newDir, isSlanted = false;

      if (Math.abs(relDy) < snapThreshold && Math.abs(relDx) >= snapThreshold) {
        // استقامة أفقية تامة 100% يميناً أو يساراً
        newY = fromTerm.y;
        newX = (relDx >= 0) ? Math.max(fromTerm.x + 35, currTargetX) : Math.min(fromTerm.x - 35, currTargetX);
        newDir = (relDx >= 0) ? "right" : "left";
      } else if (Math.abs(relDx) < snapThreshold && Math.abs(relDy) >= snapThreshold) {
        // استقامة رأسية تامة 100% لأسفل أو لأعلى
        newX = fromTerm.x;
        newY = (relDy >= 0) ? Math.max(fromTerm.y + 35, currTargetY) : Math.min(fromTerm.y - 35, currTargetY);
        newDir = (relDy >= 0) ? "down" : "up";
      } else {
        // سحب بزاوية: للخطوط الهوائية يسمح بالسحب المائل الحر (شكل ٧)، وللكابلات تظل الزاوية 90 درجة قائمة
        const isIncomingCable = incomingSection && (incomingSection.type === "كابل" || (incomingSection.size && incomingSection.size.includes("*")) || dragNode.type === "kiosk" || incomingSection.corner_style);
        if (!isIncomingCable) {
          isSlanted = true;
        }
        newX = currTargetX;
        newY = currTargetY;

        // التقاط ذكي لزاوية 45 درجة متناظرة لرسم رقم سبعة (٧) للخطوط الهوائية
        const absRelDx = Math.abs(relDx);
        const absRelDy = Math.abs(relDy);
        if (!isIncomingCable && Math.abs(absRelDx - absRelDy) < 14 && absRelDx > 25) {
          const avgDist = (absRelDx + absRelDy) / 2;
          newX = fromTerm.x + (relDx >= 0 ? avgDist : -avgDist);
          newY = fromTerm.y + (relDy >= 0 ? avgDist : -avgDist);
        }

        newDir = (absRelDx >= absRelDy) ? (relDx >= 0 ? "right" : "left") : (relDy >= 0 ? "down" : "up");
      }

      finalDx = newX - initDragPos.x;
      finalDy = newY - initDragPos.y;

      // تحديث اتجاه الخط والعنصر ليتطابق مع اتجاه السحب الجديد
      if (incomingSection) {
        incomingSection.direction = newDir;
        incomingSection.is_slanted = isSlanted;
      }
      if (dragNode.type === "switch") {
        dragNode.dir = newDir;
        dragNode.direction = (newDir === "left" || newDir === "right") ? "horizontal" : "vertical";
      } else if (dragNode.type === "transformer" || dragNode.type === "kiosk") {
        dragNode.direction = newDir;
      }
    }
  }

  dragNode.x = initDragPos.x + finalDx;
  dragNode.y = initDragPos.y + finalDy;

  // تحريك العقد التابعة المنبثقة عنها بنفس الإزاحة للحفاظ على تماسك الفروع
  downstreamNodeIds.forEach(descId => {
    const descNode = currentProject.nodes.find(n => n.id === descId);
    const initDescPos = initialNodePositions.get(descId);
    if (descNode && initDescPos) {
      descNode.x = initDescPos.x + finalDx;
      descNode.y = initDescPos.y + finalDy;
    }
  });

  renderNetwork();

  const tip = document.getElementById("drag-tooltip");
  if (tip) {
    tip.style.left = `${e.clientX}px`;
    tip.style.top = `${e.clientY - 12}px`;
    if (dragNode.type === "kiosk") {
      const dirText = finalDx > 0 ? "توسيع المسافة لليمين ➡️" : (finalDx < 0 ? "تحريك لليسار ⬅️" : (finalDy > 0 ? "تحريك لأسفل ⬇️" : "تحريك لأعلى ⬆️"));
      tip.innerHTML = `🏢 <b>سحب الكشك (${dragNode.name || dragNode.id})</b> | ${dirText} (${Math.round(dragNode.x)}, ${Math.round(dragNode.y)})`;
    } else if (incomingSection) {
      const relDy = dragNode.y - (initialNodePositions.get(incomingSection.from_node)?.y ?? dragNode.y);
      const relDx = dragNode.x - (initialNodePositions.get(incomingSection.from_node)?.x ?? dragNode.x);
      const isAngle = Math.abs(relDx) > 20 && Math.abs(relDy) > 20;

      if (isAngle) {
        tip.innerHTML = `📐 <b>رسم مائل (شكل رقم ٧)</b> (${relDy > 0 ? 'مائل لأسفل' : 'مائل لأعلى'}) | الطول المحفوظ: <b>${incomingSection.length} م</b>`;
      } else {
        const dirArabic = incomingSection.direction === "right" ? "يمين ➡️" : 
                         (incomingSection.direction === "left" ? "يسار ⬅️" : 
                         (incomingSection.direction === "down" ? "أسفل ⬇️" : "أعلى ⬆️"));
        tip.innerHTML = `📍 <b>خط مستقيم</b> (${dirArabic}) | الطول المحفوظ: <b>${incomingSection.length} م</b>`;
      }
    } else {
      tip.innerHTML = `📍 <b>تحريك الموقع</b> (${Math.round(dragNode.x)}, ${Math.round(dragNode.y)})`;
    }
    tip.classList.remove("hidden");
  }
}

function finishNodeDrag(e) {
  document.body.classList.remove("dragging-node");
  const tip = document.getElementById("drag-tooltip");
  if (tip) tip.classList.add("hidden");

  const didDrag = hasDragged;
  const targetNodeId = dragNodeId;

  isDraggingNode = false;
  dragNodeId = null;
  hasDragged = false;

  if (didDrag) {
    lastDragEndTime = Date.now();
    let welded = false;
    if (currentProject && currentProject.nodes) {
      const draggedNode = currentProject.nodes.find(n => n.id === targetNodeId);
      if (draggedNode) {
        draggedNode.updated_at = Date.now();
        if (draggedNode.type === "switch") {
          welded = checkAndWeldSwitchOnDrop(draggedNode);
        }
      }
    }
    if (typeof saveHistoryState === "function") saveHistoryState();
    if (typeof updateLiveMetrics === "function") updateLiveMetrics();
    if (!welded) {
      if (incomingSection) {
        showToast(`📍 تم ضبط موضع الخط بنجاح (مع الحفاظ على طول الخط: ${incomingSection.length} م)`, "info");
      } else {
        showToast("📍 تم تعديل موضع العنصر بنجاح", "info");
      }
    }
  } else if (targetNodeId) {
    handleNodeClick(e, targetNodeId);
  }

  incomingSection = null;
}

// ─── فحص ولحام السكينة تلقائياً بين نقطتين عند السحب والإفلات على أي خط أو مسار ───
function checkAndWeldSwitchOnDrop(swNode) {
  if (!currentProject || !currentProject.sections || !currentProject.nodes) return false;

  let bestSec = null;
  let minDistance = 35; // مسافة التقاط بكسل
  let bestProj = null;

  currentProject.sections.forEach(sec => {
    // تجاهل الخطوط المتصلة أصلاً بهذه السكينة
    if (sec.from_node === swNode.id || sec.to_node === swNode.id) return;

    const fromNode = currentProject.nodes.find(n => n.id === sec.from_node);
    const toNode = currentProject.nodes.find(n => n.id === sec.to_node);
    if (!fromNode || !toNode) return;

    const x1 = fromNode.x, y1 = fromNode.y;
    const x2 = toNode.x, y2 = toNode.y;
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 < 400) return;

    let t = ((swNode.x - x1) * (x2 - x1) + (swNode.y - y1) * (y2 - y1)) / l2;
    if (t > 0.08 && t < 0.92) {
      const projX = x1 + t * (x2 - x1);
      const projY = y1 + t * (y2 - y1);
      const dist = Math.hypot(swNode.x - projX, swNode.y - projY);
      if (dist < minDistance) {
        minDistance = dist;
        bestSec = sec;
        bestProj = { projX, projY, t, fromNode, toNode };
      }
    }
  });

  if (bestSec && bestProj) {
    const { projX, projY, t, fromNode, toNode } = bestProj;
    swNode.x = Math.round(projX);
    swNode.y = Math.round(projY);

    // حساب الاتجاه تلقائياً حسب مسار الخط بين النقطتين (وعلى أي اتجاه كان)
    const dx = toNode.x - fromNode.x;
    const dy = toNode.y - fromNode.y;
    let autoDir = "down";
    if (Math.abs(dx) >= Math.abs(dy)) {
      autoDir = (dx >= 0) ? "right" : "left";
    } else {
      autoDir = (dy >= 0) ? "down" : "up";
    }

    swNode.dir = autoDir;
    swNode.direction = autoDir;

    // لحام وشطر الخط بين النقطتين عبر السكينة
    const origToNodeId = bestSec.to_node;
    const origLen = parseFloat(bestSec.length) || 1000;
    const len1 = Math.max(1, Math.round(origLen * t));
    const len2 = Math.max(1, Math.round(origLen - len1));

    bestSec.to_node = swNode.id;
    bestSec.length = len1;
    bestSec.direction = autoDir;

    let nextSecNum = currentProject.sections.length + 1;
    while (currentProject.sections.some(s => s.id === "S" + nextSecNum)) nextSecNum++;

    const newSec = {
      id: "S" + nextSecNum,
      name: bestSec.name ? `${bestSec.name} (تكملة)` : undefined,
      from_node: swNode.id,
      to_node: origToNodeId,
      type: bestSec.type,
      size: bestSec.size,
      length: len2,
      direction: autoDir,
      corner_style: bestSec.corner_style,
      status: bestSec.status
    };
    currentProject.sections.push(newSec);

    renderNetwork();
    try {
      localStorage.setItem("sld_saved_feeder", JSON.stringify(currentProject));
    } catch (_) {}

    if (window.broadcastProjectUpdate) {
      window.broadcastProjectUpdate("switch_auto_welded_on_drop");
    }

    const dirArabic = (autoDir === "right") ? "يمين ➡️" : (autoDir === "left") ? "شمال ⬅️" : (autoDir === "down") ? "أسفل ⬇️" : "أعلى ⬆️";
    showToast(`⚡ تم لحام السكينة (${swNode.name || swNode.id}) تلقائياً بين النقطتين [${fromNode.id}] و [${origToNodeId}] بالاتجاه (${dirArabic})`, "success");
    return true;
  }
  return false;
}
window.checkAndWeldSwitchOnDrop = checkAndWeldSwitchOnDrop;

// لحام سكينة هوائية تلقائياً على الخط المحدد بين النقطتين
function quickWeldSwitchOnSelectedSection(preferredDir) {
  if (!currentProject || !selectedElement || selectedElement.type !== "section") {
    if (window.showToast) window.showToast("⚠️ يرجى تحديد الخط المراد لحام السكينة عليه أولاً!", "warning");
    return;
  }
  const sec = (currentProject.sections || []).find(s => s.id === selectedElement.id);
  if (!sec) return;

  if (typeof window.weldSwitchBetweenNodes === "function") {
    window.weldSwitchBetweenNodes(sec.from_node, sec.to_node, { dir: preferredDir });
  }
}
window.quickWeldSwitchOnSelectedSection = quickWeldSwitchOnSelectedSection;

// ─── سحب وانحراف مسار الخطوط لأعلى أو لأسفل (Section Deflection / Jog Dragging) ───
let isDraggingDeflect = false;
let dragSecId = null;
let hasDeflectDragged = false;
let deflectStartClient = { x: 0, y: 0 };
let deflectStartStage = { x: 0, y: 0 };
let initialDeflectOffset = 0;

function startSectionDeflectDrag(e, secId) {
  if (!currentProject || !currentProject.sections) return;
  const sec = currentProject.sections.find(s => s.id === secId);
  if (!sec) return;

  // تحديد العنصر فوراً لإظهار مقابض الانحراف والتوجيه
  selectElement("section", secId, `${sec.type} ${sec.size} (${sec.length}م) [${sec.from_node} ➔ ${sec.to_node}]`);

  isDraggingDeflect = true;
  dragSecId = secId;
  hasDeflectDragged = false;
  deflectStartClient = { x: e.clientX, y: e.clientY };
  deflectStartStage = screenToStage(e.clientX, e.clientY);
  initialDeflectOffset = sec.deflection_offset || 0;

  document.body.classList.add("dragging-deflect");
}

function handleSectionDeflectDrag(e) {
  if (!isDraggingDeflect || !dragSecId || !currentProject) return;

  const dxClient = e.clientX - deflectStartClient.x;
  const dyClient = e.clientY - deflectStartClient.y;
  if (!hasDeflectDragged && Math.hypot(dxClient, dyClient) > 4) {
    hasDeflectDragged = true;
  }
  if (!hasDeflectDragged) return;

  const currStage = screenToStage(e.clientX, e.clientY);
  const sec = currentProject.sections.find(s => s.id === dragSecId);
  if (!sec) return;

  const fromNode = (currentProject.nodes || []).find(n => n.id === sec.from_node);
  const toNode = (currentProject.nodes || []).find(n => n.id === sec.to_node);
  const isVertical = (fromNode && toNode) ? (Math.abs(toNode.y - fromNode.y) > Math.abs(toNode.x - fromNode.x)) : false;

  let newOffset;
  if (isVertical) {
    const dxStage = currStage.x - deflectStartStage.x;
    newOffset = initialDeflectOffset + dxStage;
  } else {
    const dyStage = currStage.y - deflectStartStage.y;
    newOffset = initialDeflectOffset + dyStage;
  }

  // التقاط ذكي للاستقامة (Snap to Straight Line) عند الاقتراب من الصفر
  if (Math.abs(newOffset) < 12) {
    newOffset = 0;
  } else {
    // خطوة ناعمة بمقدار 5 بكسل
    newOffset = Math.round(newOffset / 5) * 5;
  }

  sec.deflection_offset = newOffset;
  renderNetwork();

  const tip = document.getElementById("drag-tooltip");
  if (tip) {
    tip.style.left = `${e.clientX}px`;
    tip.style.top = `${e.clientY - 12}px`;
    if (newOffset === 0) {
      tip.innerHTML = `📏 <b>مسار مستقيم 100%</b> <span style="font-size:10px; color:#38bdf8;">(حرر الماوس للتثبيت)</span>`;
    } else if (isVertical) {
      tip.innerHTML = `↔ <b>انحراف المسار:</b> <b>${newOffset > 0 ? 'يميناً +' + newOffset : 'يساراً ' + newOffset}px</b>`;
    } else {
      tip.innerHTML = `↕ <b>انحراف المسار:</b> <b>${newOffset > 0 ? 'لأسفل +' + newOffset : 'لأعلى ' + Math.abs(newOffset)}px</b>`;
    }
    tip.classList.remove("hidden");
  }
}

function finishSectionDeflectDrag(e) {
  document.body.classList.remove("dragging-deflect");
  const tip = document.getElementById("drag-tooltip");
  if (tip) tip.classList.add("hidden");

  const didDrag = hasDeflectDragged;
  const targetSecId = dragSecId;

  isDraggingDeflect = false;
  dragSecId = null;
  hasDeflectDragged = false;

  if (didDrag) {
    lastDragEndTime = Date.now();
    if (typeof saveHistoryState === "function") saveHistoryState();
    if (typeof updateLiveMetrics === "function") updateLiveMetrics();

    const sec = currentProject?.sections?.find(s => s.id === targetSecId);
    if (sec) {
      const offset = sec.deflection_offset || 0;
      if (offset === 0) {
        showToast("📏 تم إعادة مسار الخط مستقيماً بنجاح", "info");
      } else {
        showToast(`↕ تم ضبط انحراف مسار الخط بنجاح (${offset > 0 ? 'لأسفل +' + offset : 'لأعلى ' + Math.abs(offset)} بكسل)`, "success");
      }
    }
  } else if (targetSecId) {
    handleSectionClick(e, targetSecId);
  }
}

// ─── دوال سحب وتحريك وتحديد كروت التنويهات والملاحظات الهندسية ───────────────
function startAnnotationDrag(e, annoId) {
  if (!currentProject || !currentProject.annotations) return;
  const anno = currentProject.annotations.find(a => a.id === annoId);
  if (!anno) return;

  if (e) {
    if (typeof e.stopPropagation === "function") e.stopPropagation();
  }

  isDraggingAnnotation = true;
  dragAnnoId = annoId;
  hasAnnoDragged = false;
  dragAnnoStartClient = { x: e.clientX, y: e.clientY };
  dragAnnoStartPos = { x: Math.round(anno.x || 100), y: Math.round(anno.y || 100) };
  document.body.classList.add("dragging-node");
}
window.startAnnotationDrag = startAnnotationDrag;

function handleAnnotationDrag(e) {
  if (!isDraggingAnnotation || !dragAnnoId || !currentProject || !currentProject.annotations) return;
  const dxClient = e.clientX - dragAnnoStartClient.x;
  const dyClient = e.clientY - dragAnnoStartClient.y;
  if (!hasAnnoDragged && Math.hypot(dxClient, dyClient) > 3) {
    hasAnnoDragged = true;
  }
  if (!hasAnnoDragged) return;

  const dxStage = (e.clientX - dragAnnoStartClient.x) / canvasScale;
  const dyStage = (e.clientY - dragAnnoStartClient.y) / canvasScale;

  const anno = currentProject.annotations.find(a => a.id === dragAnnoId);
  if (!anno) return;

  anno.x = Math.round(dragAnnoStartPos.x + dxStage);
  anno.y = Math.round(dragAnnoStartPos.y + dyStage);
  anno.updated_at = Date.now();

  renderNetwork();
}

function finishAnnotationDrag(e) {
  if (!isDraggingAnnotation) return;
  document.body.classList.remove("dragging-node");
  const didDrag = hasAnnoDragged;
  const targetId = dragAnnoId;

  isDraggingAnnotation = false;
  dragAnnoId = null;
  hasAnnoDragged = false;

  if (didDrag) {
    if (typeof saveHistoryState === "function") saveHistoryState();
    if (typeof updateLiveMetrics === "function") updateLiveMetrics();
    if (window.broadcastProjectUpdate) window.broadcastProjectUpdate("annotation_moved");
  } else if (targetId) {
    selectAnnotation(e, targetId);
  }
}

function selectAnnotation(e, annoId) {
  if (e && typeof e.stopPropagation === "function") e.stopPropagation();
  if (!currentProject || !currentProject.annotations) return;
  const anno = currentProject.annotations.find(a => a.id === annoId);
  if (!anno) return;
  selectElement("annotation", annoId, "تنويه: " + (anno.badgeTitle || (anno.text ? anno.text.substring(0, 20) : '')));
}
window.selectAnnotation = selectAnnotation;

function initCanvas() {
  const viewport = document.getElementById("viewport");
  const stage = document.getElementById("canvas-stage");

  // التكبير والتصغير بعجلة الماوس
  viewport.addEventListener("wheel", (e) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    let newScale = (e.deltaY < 0) ? canvasScale * zoomFactor : canvasScale / zoomFactor;
    newScale = Math.min(Math.max(0.2, newScale), 4.0);

    const rect = viewport.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    panX = mouseX - (mouseX - panX) * (newScale / canvasScale);
    panY = mouseY - (mouseY - panY) * (newScale / canvasScale);
    canvasScale = newScale;

    updateTransform();
  });

  // السحب والتحريك وتطويل الخطوط وانحراف المسارات (Drag to Deflect, Stretch & Pan)
  viewport.addEventListener("mousedown", (e) => {
    if (e.target.closest(".floating-canvas-controls") || 
        e.target.closest(".official-title-block")) return;

    if (e.button !== 0) return; // النقر الأيسر فقط

    // إذا كان المستخدم في وضع تحديد مكان التنويه على الرسم
    if (window.isPickingAnnotationPos) {
      e.preventDefault();
      e.stopPropagation();
      const st = screenToStage(e.clientX, e.clientY);
      if (typeof window.finalizeAnnotationPick === "function") {
        window.finalizeAnnotationPick(st.x, st.y);
      }
      return;
    }

    // إذا تم النقر على كارت التنويهات، لا نبدأ تحريك الكانفاس
    const annoGroup = e.target.closest(".canvas-annotation");
    if (annoGroup) {
      return;
    }

    const deflectGroup = e.target.closest(".sld-deflect-handle-group");
    const stretchGroup = e.target.closest(".sld-stretch-handle-group");
    const nodeGroup = e.target.closest(".sld-node-group");
    const sectionGroup = e.target.closest(".sld-section-group");

    // التحقق من حالة إيقاف وتجميد المشروع لمنع العبث بالرسم
    if (deflectGroup || stretchGroup || (nodeGroup && !isSimulationActive) || (sectionGroup && !e.target.closest(".sld-length-pill"))) {
      if (typeof window.isProjectLockedForUser === "function" && window.isProjectLockedForUser()) {
        if (typeof showToast === "function") {
          showToast("🔒 هذا المخطط موقوف ومجمد من قبل الإدارة لمنع التعديل أو العبث به", "warning");
        }
        return;
      }
    }

    // مقبض انحراف مسار الخط لأعلى أو لأسفل
    if (deflectGroup) {
      e.preventDefault();
      e.stopPropagation();
      const secId = deflectGroup.dataset.secId;
      startSectionDeflectDrag(e, secId);
      return;
    }

    // مقبض إطالة وتقصير الخط أو سحب العقدة
    if (stretchGroup || nodeGroup) {
      const nodeId = stretchGroup ? stretchGroup.dataset.nodeId : nodeGroup.id.replace("node-", "");
      if (isSimulationActive) {
        const targetNode = currentProject?.nodes?.find(n => n.id === nodeId);
        if (targetNode && targetNode.type === "switch") {
          e.preventDefault();
          e.stopPropagation();
          toggleSwitch(nodeId);
          return;
        }
      }
      startNodeDrag(e, nodeId);
      return;
    }

    // النقر والسحب المباشر على جسم الخط نفسه لانحرافه
    if (sectionGroup && !e.target.closest(".sld-length-pill")) {
      const secId = sectionGroup.id.replace("sec-", "");
      startSectionDeflectDrag(e, secId);
      return;
    }

    // إذا كان النقر على الكانفاس الفارغ، إلغاء التحديد وبدء التحريك
    if (e.target.id === "sld-canvas" || e.target.id === "bg-grid") {
      clearSelection();
    }

    isPanning = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
    viewport.classList.add("panning");
  });

  window.addEventListener("mousemove", (e) => {
    if (isDraggingAnnotation) {
      handleAnnotationDrag(e);
      return;
    }
    if (isDraggingDeflect) {
      handleSectionDeflectDrag(e);
      return;
    }
    if (isDraggingNode) {
      handleNodeDrag(e);
      return;
    }
    if (!isPanning) return;
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    updateTransform();
  });

  window.addEventListener("mouseup", (e) => {
    if (isDraggingAnnotation) {
      finishAnnotationDrag(e);
      return;
    }
    if (isDraggingDeflect) {
      finishSectionDeflectDrag(e);
      return;
    }
    if (isDraggingNode) {
      finishNodeDrag(e);
      return;
    }
    isPanning = false;
    viewport.classList.remove("panning");
  });

  updateTransform();
}

function updateTransform() {
  const stage = document.getElementById("canvas-stage");
  if (stage) {
    stage.setAttribute("transform", `translate(${panX}, ${panY}) scale(${canvasScale})`);
  }
}

function zoomIn() {
  canvasScale = Math.min(canvasScale * 1.2, 4.0);
  updateTransform();
}

function zoomOut() {
  canvasScale = Math.max(canvasScale / 1.2, 0.2);
  updateTransform();
}

function resetZoom() {
  canvasScale = 1.0;
  panX = 120;
  panY = (window.drawingFlowDirection === "up") ? -600 : 60;
  updateTransform();
}

function fitToScreen() {
  const proj = (window.getCurrentProject ? window.getCurrentProject() : null) || window.currentProject || currentProject;
  if (!proj || !proj.nodes || proj.nodes.length === 0) return;
  
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  proj.nodes.forEach(n => {
    if (typeof n.x === 'number') {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
    }
    if (typeof n.y === 'number') {
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    }
  });

  if (!isFinite(minX) || !isFinite(maxX) || !isFinite(minY) || !isFinite(maxY)) return;

  const width = Math.max(maxX - minX + 350, 450);
  const height = Math.max(maxY - minY + 350, 450);
  const viewport = document.getElementById("viewport");
  const vpWidth = (viewport && viewport.clientWidth > 100) ? viewport.clientWidth : (window.innerWidth || 1200);
  const vpHeight = (viewport && viewport.clientHeight > 100) ? viewport.clientHeight : (window.innerHeight ? window.innerHeight - 150 : 800);

  canvasScale = Math.min((vpWidth - 80) / width, (vpHeight - 80) / height, 1.15);
  if (canvasScale < 0.25) canvasScale = 0.25;
  panX = (vpWidth - width * canvasScale) / 2 - (minX - 175) * canvasScale;
  panY = (vpHeight - height * canvasScale) / 2 - (minY - 175) * canvasScale;
  updateTransform();
}

// ─── توسيط وضبط الكانفاس على نود محدد وإبرازه فوراً (Center On Node) ───
function centerOnNode(nodeId, shouldHighlight = true) {
  const proj = (window.getCurrentProject ? window.getCurrentProject() : null) || window.currentProject || currentProject;
  if (!proj || !proj.nodes) return false;
  const node = proj.nodes.find(n => n.id === nodeId);
  if (!node || typeof node.x !== 'number' || typeof node.y !== 'number') return false;

  const viewport = document.getElementById("viewport");
  const vpWidth = (viewport && viewport.clientWidth > 100) ? viewport.clientWidth : (window.innerWidth || 1200);
  const vpHeight = (viewport && viewport.clientHeight > 100) ? viewport.clientHeight : (window.innerHeight ? window.innerHeight - 150 : 800);

  // إذا كان مستوى التكبير بعيداً جداً، نكبر قليلاً لنرى النود ومحيطه بوضوح
  if (canvasScale < 0.85) {
    canvasScale = 0.95;
  }

  panX = (vpWidth / 2) - (node.x * canvasScale);
  panY = (vpHeight / 2) - (node.y * canvasScale);
  updateTransform();

  // تحديد النود في المنظومة لفتح أشرطة الأدوات العائمة ومطابقة الحالة
  selectElement("node", node.id, node.name || node.id);

  if (shouldHighlight) {
    triggerNodeSearchGlow(node.id);
  }
  return true;
}

function triggerNodeSearchGlow(nodeId) {
  document.querySelectorAll(".sld-search-highlight").forEach(el => el.classList.remove("sld-search-highlight"));
  const nodeGroup = document.getElementById("node-" + nodeId);
  if (nodeGroup) {
    nodeGroup.classList.add("sld-search-highlight");
    setTimeout(() => {
      nodeGroup.classList.remove("sld-search-highlight");
    }, 4500);
  }
}

window.centerOnNode = centerOnNode;
window.triggerNodeSearchGlow = triggerNodeSearchGlow;

function toggleGrid() {
  showGrid = !showGrid;
  const bgGrid = document.getElementById("bg-grid");
  const btn = document.getElementById("grid-toggle-btn");
  if (bgGrid) {
    bgGrid.style.display = showGrid ? "block" : "none";
    btn.style.color = showGrid ? "#fff" : "#718096";
  }
}

function toggleSimulationMode() {
  if (window.hasPermission && !window.hasPermission('btn_simulation')) {
    showToast("⛔ ليس لديك صلاحية تشغيل وضع المحاكاة", "error");
    return;
  }
  isSimulationActive = !isSimulationActive;
  const btn = document.getElementById("btn-sim-mode");
  const banner = document.getElementById("sim-banner");
  if (isSimulationActive) {
    btn.classList.add("btn-primary");
    btn.classList.remove("btn-outline");
    if (banner) banner.classList.add("hidden");
    showToast("⚡ تم تفعيل وضع محاكاة السكاكين والفصل والتوصيل", "warning");
  } else {
    btn.classList.remove("btn-primary");
    btn.classList.add("btn-outline");
    if (banner) banner.classList.add("hidden");
    showToast("تم إيقاف وضع المحاكاة والعودة لوضع التصميم", "info");
  }
  renderNetwork();
}

let lastSwitchToggleTime = 0;

// دالة موحدة وفورية لتبديل حالة السكينة مع تحديث المحاكاة
function toggleSwitch(nodeId) {
  if (!currentProject) return;
  const node = currentProject.nodes.find(n => n.id === nodeId);
  if (!node || node.type !== "switch") return;

  if (Date.now() - lastSwitchToggleTime < 150) return;
  lastSwitchToggleTime = Date.now();

  node.state = (node.state === "open") ? "closed" : "open";
  const isOpen = (node.state === "open");

  showToast(
    `⚡ ${node.name || 'سكينة'} (${node.id}): تم ${isOpen ? 'فصل الدائرة (فتح السكينة 🔴)' : 'توصيل الدائرة (إغلاق السكينة 🟢)'}`,
    isOpen ? 'danger' : 'success'
  );

  renderNetwork();
  if (window.broadcastProjectUpdate) {
    window.broadcastProjectUpdate(isOpen ? "switch_opened" : "switch_closed");
  }
}

// ─── فتح جميع السكاكين الهوائية في المخطط (فصل الدوائر بالكامل 🔴) ───────────
function openAllSwitches() {
  if (!currentProject || !Array.isArray(currentProject.nodes)) {
    if (window.showToast) window.showToast("⚠️ لا يوجد مخطط محمل حالياً!", "warning");
    return;
  }
  const switches = currentProject.nodes.filter(n => n && n.type === "switch");
  if (switches.length === 0) {
    if (window.showToast) window.showToast("ℹ️ لا توجد سكاكين هوائية مضافة في هذا المخطط.", "info");
    return;
  }

  switches.forEach(sw => {
    sw.state = "open";
  });

  try {
    localStorage.setItem("sld_saved_feeder", JSON.stringify(currentProject));
  } catch(e) {}

  if (window.showToast) {
    window.showToast(`🔴 تم فتح وفصل جميع السكاكين (${switches.length} سكينة) وتحديث مسارات التغذية.`, "danger");
  }

  renderNetwork();
  if (window.broadcastProjectUpdate) {
    window.broadcastProjectUpdate("all_switches_opened");
  }
}

// ─── غلق وتوصيل جميع السكاكين الهوائية في المخطط (توصيل التيار بالكامل 🟢) ───────
function closeAllSwitches() {
  if (!currentProject || !Array.isArray(currentProject.nodes)) {
    if (window.showToast) window.showToast("⚠️ لا يوجد مخطط محمل حالياً!", "warning");
    return;
  }
  const switches = currentProject.nodes.filter(n => n && n.type === "switch");
  if (switches.length === 0) {
    if (window.showToast) window.showToast("ℹ️ لا توجد سكاكين هوائية مضافة في هذا المخطط.", "info");
    return;
  }

  switches.forEach(sw => {
    sw.state = "closed";
  });

  try {
    localStorage.setItem("sld_saved_feeder", JSON.stringify(currentProject));
  } catch(e) {}

  if (window.showToast) {
    window.showToast(`🟢 تم غلق وتوصيل جميع السكاكين (${switches.length} سكينة) وتغذية الشبكة بالكامل.`, "success");
  }

  renderNetwork();
  if (window.broadcastProjectUpdate) {
    window.broadcastProjectUpdate("all_switches_closed");
  }
}

// ─── زر تبديلي ذكي لجميع السكاكين (فتح أو غلق الكل) ─────────────────────────
function toggleAllSwitches() {
  if (!currentProject || !Array.isArray(currentProject.nodes)) return;
  const switches = currentProject.nodes.filter(n => n && n.type === "switch");
  if (switches.length === 0) {
    if (window.showToast) window.showToast("ℹ️ لا توجد سكاكين في هذا المخطط.", "info");
    return;
  }
  const openCount = switches.filter(n => n.state === "open").length;
  if (openCount >= switches.length / 2) {
    closeAllSwitches();
  } else {
    openAllSwitches();
  }
}

// التفاعل مع العقد (المحولات، السكاكين، الأكشاك) بالنقر الفردي
function handleNodeClick(e, nodeId) {
  if (e && typeof e.stopPropagation === "function") e.stopPropagation();
  if (!currentProject) return;

  const node = currentProject.nodes.find(n => n.id === nodeId);
  if (!node) return;

  // في وضع المحاكاة: النقر يبدل حالة السكينة فوراً للفصل والتوصيل
  if (isSimulationActive && node.type === "switch") {
    toggleSwitch(nodeId);
    return;
  }

  // في وضع التصميم العادي: نحدد السكينة أو العقدة فوراً لتفعيل الحذف والتعديل وتغيير الاتجاه
  selectElement("node", nodeId, node.name || node.id);
}

// النقر المزدوج (Double Click) على العقد للتعديل المباشر أو المحاكاة
function handleNodeDblClick(e, nodeId) {
  if (e && typeof e.stopPropagation === "function") e.stopPropagation();
  if (e && typeof e.preventDefault === "function") e.preventDefault();
  if (!currentProject) return;

  // في وضع المحاكاة: النقر المزدوج أيضاً يبدل السكينة ولا يفتح نافذة التعديل لضمان سلاسة المحاكاة
  if (isSimulationActive) {
    const node = currentProject.nodes.find(n => n.id === nodeId);
    if (node && node.type === "switch") {
      toggleSwitch(nodeId);
      return;
    }
  }

  const node = currentProject.nodes.find(n => n.id === nodeId);
  if (!node) return;

  // تحديد العنصر وإبرازه فوراً
  selectElement("node", nodeId, node.name || node.id);

  // فتح نافذة التعديل الشامل لأي جزء في المخطط
  if (typeof openEditElementModal === "function") {
    openEditElementModal("node", nodeId);
  } else if (typeof openSmartDeleteModal === "function") {
    openSmartDeleteModal("node", nodeId);
  }
}

// التفاعل مع الخطوط والكابلات بالنقر الفردي
function handleSectionClick(e, secId) {
  if (e && typeof e.stopPropagation === "function") e.stopPropagation();
  if (Date.now() - lastDragEndTime < 80) return;
  if (!currentProject) return;

  const sec = currentProject.sections.find(s => s.id === secId);
  if (!sec) return;

  selectElement("section", secId, `${sec.type} ${sec.size} (${sec.length}م) [${sec.from_node} ➔ ${sec.to_node}]`);
}

// النقر المزدوج (Double Click) على الخطوط والكابلات لفتح نافذة التعديل المباشر
function handleSectionDblClick(e, secId) {
  if (e && typeof e.stopPropagation === "function") e.stopPropagation();
  if (e && typeof e.preventDefault === "function") e.preventDefault();
  if (!currentProject) return;

  const sec = currentProject.sections.find(s => s.id === secId);
  if (!sec) return;

  // تحديد الخط فوراً وإبرازه
  selectElement("section", secId, `${sec.type} ${sec.size} (${sec.length}م) [${sec.from_node} ➔ ${sec.to_node}]`);

  // فتح نافذة التعديل الشامل للخط
  if (typeof openEditElementModal === "function") {
    openEditElementModal("section", secId);
  } else if (typeof openSmartDeleteModal === "function") {
    openSmartDeleteModal("section", secId);
  }
}

// تحديد عنصر
function selectElement(type, id, label) {
  selectedElement = { type, id, label };
  renderNetwork();
  updateSectionFloatingToolbar();
  updateSwitchFloatingToolbar();
}

// إلغاء التحديد
function clearSelection() {
  selectedElement = null;
  renderNetwork();
  updateSectionFloatingToolbar();
  updateSwitchFloatingToolbar();
}

// تحديث شريط التحكم السريع العائم للسكينة المحددة (توجيه، تعديل، حذف، فتح/غلق)
function updateSwitchFloatingToolbar() {
  const toolbar = document.getElementById("switch-floating-toolbar");
  if (!toolbar) return;

  if (!selectedElement || selectedElement.type !== "node" || !currentProject) {
    toolbar.style.display = "none";
    return;
  }

  const node = (currentProject.nodes || []).find(n => n.id === selectedElement.id);
  if (!node || node.type !== "switch") {
    toolbar.style.display = "none";
    return;
  }

  const nameEl = document.getElementById("sw-tool-name");
  const iconEl = document.getElementById("sw-tool-icon");
  const toggleBtn = document.getElementById("btn-sw-tool-toggle");

  const isClosed = (node.state !== "open");
  const curDir = Components.getSwitchDirection(node);
  const dirArabic = (curDir === "right") ? "يمين ➡️" : (curDir === "left") ? "شمال ⬅️" : (curDir === "down") ? "أسفل ⬇️" : "أعلى ⬆️";

  if (iconEl) iconEl.textContent = isClosed ? "🟢" : "🔴";
  if (nameEl) {
    nameEl.innerHTML = `${node.name || node.id} (${dirArabic}) | ${isClosed ? '<span style="color:#4ade80;">مغلقة (متصلة)</span>' : '<span style="color:#f87171;">مفتوحة (مفصولة)</span>'}`;
  }
  if (toggleBtn) {
    toggleBtn.innerHTML = isClosed ? "🔴 فتح السكينة" : "🟢 غلق السكينة";
  }

  toolbar.style.display = "flex";
}
window.updateSwitchFloatingToolbar = updateSwitchFloatingToolbar;

// تغيير اتجاه السكينة المحددة فوراً بنقرة واحدة
function quickSetSelectedSwitchDirection(newDir) {
  if (!selectedElement || selectedElement.type !== "node" || !currentProject) return;
  const node = currentProject.nodes.find(n => n.id === selectedElement.id);
  if (!node || node.type !== "switch") return;
  saveHistoryState();
  node.dir = newDir;
  node.direction = newDir;
  try {
    localStorage.setItem("sld_saved_feeder", JSON.stringify(currentProject));
  } catch (_) {}
  renderNetwork();
  updateSwitchFloatingToolbar();
  if (window.broadcastProjectUpdate) {
    window.broadcastProjectUpdate("switch_direction_" + newDir);
  }
  showToast(`⚡ تم ضبط اتجاه ${node.name || node.id} إلى (${newDir === 'right' ? 'أفقي يمين ➡️' : newDir === 'left' ? 'أفقي شمال ⬅️' : newDir === 'down' ? 'رأسي لأسفل ⬇️' : 'رأسي لأعلى ⬆️'}) بنجاح`, "success");
}
window.quickSetSelectedSwitchDirection = quickSetSelectedSwitchDirection;

// تبديل حالة السكينة المحددة (فتح / غلق)
function quickToggleSelectedSwitchState() {
  if (!selectedElement || selectedElement.type !== "node" || !currentProject) return;
  toggleSwitch(selectedElement.id);
  updateSwitchFloatingToolbar();
}
window.quickToggleSelectedSwitchState = quickToggleSelectedSwitchState;

// تعديل السكينة المحددة
function quickEditSelectedSwitch() {
  if (!selectedElement || selectedElement.type !== "node" || !currentProject) return;
  openEditElementModal("node", selectedElement.id);
}
window.quickEditSelectedSwitch = quickEditSelectedSwitch;

// حذف السكينة المحددة
function quickDeleteSelectedSwitch() {
  if (!selectedElement || selectedElement.type !== "node" || !currentProject) return;
  openSmartDeleteModal("node", selectedElement.id);
}
window.quickDeleteSelectedSwitch = quickDeleteSelectedSwitch;

// تحديث شريط التحكم السريع العائم لتوجيه زوايا الكابلات 90°
function updateSectionFloatingToolbar() {
  const toolbar = document.getElementById("section-floating-toolbar");
  if (!toolbar) return;

  if (!selectedElement || selectedElement.type !== "section" || !currentProject) {
    toolbar.style.display = "none";
    return;
  }

  const sec = (currentProject.sections || []).find(s => s.id === selectedElement.id);
  if (!sec) {
    toolbar.style.display = "none";
    return;
  }

  const nameEl = document.getElementById("sec-tool-name");
  const iconEl = document.getElementById("sec-tool-icon");
  const isCable = (sec.type === "كابل" || (sec.size && sec.size.includes("*")));

  if (iconEl) iconEl.textContent = isCable ? "🔌" : "⚡";
  if (nameEl) {
    const titleText = `${sec.type || 'خط'} ${sec.size || ''} (${sec.length || 0}م)`;
    nameEl.textContent = titleText;
  }

  toolbar.style.display = "flex";
}
window.updateSectionFloatingToolbar = updateSectionFloatingToolbar;

function renderNetwork() {
  const proj = (window.getCurrentProject ? window.getCurrentProject() : null) || window.currentProject || currentProject;
  if (!proj) return;
  currentProject = proj;
  window.currentProject = proj;

  const sectionsLayer = document.getElementById("sections-layer");
  const nodesLayer = document.getElementById("nodes-layer");
  if (!sectionsLayer || !nodesLayer) return;

  const nodes = proj.nodes || [];
  const sections = proj.sections || [];

  // 1. حساب حالة السريان والتغذية
  const { energizedNodes, energizedSections } = SimulationEngine.computeConnectivity(nodes, sections);

  // 2. رسم المقاطع والخطوط
  let sectionsHTML = "";
  const nodeMap = {};
  nodes.forEach(n => { nodeMap[n.id] = n; });

  // الترتيب الذكي للمسميات وتفادي التداخل ووضع مسميات الخط العمومي في الجهة العكسية
  if (window.Components && typeof window.Components.computeSmartLabelPositions === "function") {
    window.Components.computeSmartLabelPositions(sections, nodeMap);
  }

  sections.forEach(sec => {
    const fromNode = nodeMap[sec.from_node];
    const toNode = nodeMap[sec.to_node];
    const isEnergized = isSimulationActive ? energizedSections.has(sec.id) : true;
    const isSelected = (selectedElement && selectedElement.type === "section" && selectedElement.id === sec.id);
    sectionsHTML += Components.renderSection(sec, fromNode, toNode, isEnergized, isSelected);
  });
  sectionsLayer.innerHTML = sectionsHTML;

  // 3. رسم العقد والمعدات
  let nodesHTML = "";
  nodes.forEach(node => {
    const isEnergized = isSimulationActive ? energizedNodes.has(node.id) : true;
    const isSelected = (selectedElement && selectedElement.type === "node" && selectedElement.id === node.id);

    switch (node.type) {
      case "substation":
        nodesHTML += Components.renderSubstation(node, isSelected);
        break;
      case "switch":
        nodesHTML += Components.renderSwitch(node, isEnergized, isSelected, isSimulationActive);
        break;
      case "transformer":
        nodesHTML += Components.renderTransformer(node, isEnergized, isSelected);
        break;
      case "kiosk":
        nodesHTML += Components.renderKiosk(node, isEnergized, isSelected);
        break;
      case "rmu":
        nodesHTML += Components.renderRMU(node, isEnergized, isSelected);
        break;
      case "avr":
        nodesHTML += Components.renderAVR(node, isEnergized, isSelected);
        break;
      default:
        nodesHTML += Components.renderJunction(node, isEnergized, isSelected);
        break;
    }
  });
  nodesLayer.innerHTML = nodesHTML;

  // 4. رسم كروت التنويهات والملاحظات الهندسية الحرة
  const labelsLayer = document.getElementById("labels-layer");
  if (labelsLayer) {
    const annotations = proj.annotations || [];
    let annoHTML = "";
    annotations.forEach(anno => {
      const isSelected = (selectedElement && selectedElement.type === "annotation" && selectedElement.id === anno.id);
      if (Components && typeof Components.renderAnnotation === "function") {
        annoHTML += Components.renderAnnotation(anno, isSelected);
      }
    });
    labelsLayer.innerHTML = annoHTML;
  }

  updateLiveMetrics();

  // حفظ فوري في التخزين المحلي لضمان استرجاع المخطط بدقة عند عمل F5 أو إعادة تحميل الصفحة
  window._lastLocalEditTime = Date.now();
  if (currentProject && currentProject.nodes && currentProject.nodes.length > 0) {
    const now = Date.now();
    currentProject.updated_at = now;
    if (!currentProject.saved_at) currentProject.saved_at = now;
    if (!currentProject.user_saved_at) currentProject.user_saved_at = now;
    try {
      localStorage.setItem("sld_saved_feeder", JSON.stringify(currentProject));
      if (typeof window.saveFeederForAdmin === "function") {
        window.saveFeederForAdmin(currentProject);
      }
    } catch(e) {}
  }
  if (window.broadcastProjectUpdate) {
    window.broadcastProjectUpdate("render");
  }
}

// ─── تبديل لون خلفية صفحة الرسم (أبيض / داكن) ──────────────────────────────────
function toggleCanvasBackground(forceState = null) {
  const vp = document.getElementById("viewport");
  const bgGrid = document.getElementById("bg-grid");
  const btnRibbonText = document.getElementById("btn-toggle-bg-text");
  const btnFloat = document.getElementById("btn-float-bg");
  if (!vp) return;

  const willBeLight = (forceState !== null) ? forceState : !vp.classList.contains("canvas-light");
  if (willBeLight) {
    vp.classList.add("canvas-light");
    if (bgGrid) bgGrid.setAttribute("fill", "url(#grid-pattern-light)");
    if (btnRibbonText) btnRibbonText.textContent = "🌙 خلفية داكنة";
    if (btnFloat) {
      btnFloat.textContent = "🌙";
      btnFloat.title = "التبديل إلى الخلفية الداكنة";
    }
    localStorage.setItem("sld_canvas_theme", "light");
    if (forceState === null && window.showToast) {
      showToast("☀️ تم تفعيل الخلفية البيضاء لصفحة الرسم بنجاح", "info");
    }
  } else {
    vp.classList.remove("canvas-light");
    if (bgGrid) bgGrid.setAttribute("fill", "url(#grid-pattern)");
    if (btnRibbonText) btnRibbonText.textContent = "🎨 خلفية بيضاء";
    if (btnFloat) {
      btnFloat.textContent = "🎨";
      btnFloat.title = "التبديل إلى الخلفية البيضاء";
    }
    localStorage.setItem("sld_canvas_theme", "dark");
    if (forceState === null && window.showToast) {
      showToast("🌙 تم العودة إلى الخلفية الداكنة الهندسية", "info");
    }
  }
}

// استعادة الثيم المحفوظ للكانفاس
function initCanvasTheme() {
  const saved = localStorage.getItem("sld_canvas_theme");
  if (saved === "light") {
    toggleCanvasBackground(true);
  }
}

// ─── نافذة وصفحة المطور ENG-MOSTAFA ELMGHRABY ────────────────────────────────
function openDeveloperModal() {
  const modal = document.getElementById("developer-modal");
  if (modal) {
    modal.classList.remove("hidden");
    const u = (typeof _getLoggedInUser === "function") ? _getLoggedInUser() : (window.currentUser || null);
    const uName = u ? (u.name || u.id) : "غير مسجل";
    const uRole = u ? (u.role === 'admin' ? 'المدير العام (صلاحيات كاملة)' : (u.role === 'engineer' ? 'مهندس تشغيل وتخطيط' : (u.role || 'مستخدم'))) : "-";
    const uAdmin = (u && u.administration) ? ("هندسة كهرباء " + u.administration) : (window.getCurrentAdminName ? ("هندسة كهرباء " + window.getCurrentAdminName()) : "-");
    const uSector = (u && u.sector) ? ("قطاع " + u.sector) : "قطاع المنيا شمال";

    const nameEl = document.getElementById("dev-active-user-name");
    const roleEl = document.getElementById("dev-active-user-role");
    const adminEl = document.getElementById("dev-active-user-admin");
    const sectorEl = document.getElementById("dev-active-user-sector");
    if (nameEl) nameEl.textContent = uName;
    if (roleEl) roleEl.textContent = uRole;
    if (adminEl) adminEl.textContent = uAdmin;
    if (sectorEl) sectorEl.textContent = uSector;
  }
}

function closeDeveloperModal() {
  const modal = document.getElementById("developer-modal");
  if (modal) modal.classList.add("hidden");
}

// إغلاق النافذة بزر Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeDeveloperModal();
    if (window.closeSelfPasswordModal) window.closeSelfPasswordModal();
    clearSelection();
  }
});

// تهيئة تلقائية للثيم عند تحميل الكانفاس
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    initCanvasTheme();
  });
}

// ─── طي وفرد لافتة المخطط الهندسية في مساحة الرسم ────────────────────────────
function toggleTitleBlockMinimize(event) {
  if (event) {
    if (typeof event.stopPropagation === "function") event.stopPropagation();
    if (typeof event.preventDefault === "function") event.preventDefault();
  }
  const block = document.getElementById("official-title-block");
  const body = document.getElementById("tb-content-body");
  const icon = document.getElementById("tb-toggle-icon");
  const text = document.getElementById("tb-toggle-text");
  const floatBtn = document.getElementById("btn-float-tb");
  if (!body || !block) return;

  const isHidden = body.classList.contains("hidden") || block.classList.contains("collapsed");
  if (isHidden) {
    body.classList.remove("hidden");
    block.classList.remove("collapsed");
    if (icon) icon.textContent = "▼";
    if (text) text.textContent = "طي اللافتة";
    if (floatBtn) {
      floatBtn.title = "طي لافتة المخطط";
      floatBtn.classList.remove("active-collapsed");
    }
  } else {
    body.classList.add("hidden");
    block.classList.add("collapsed");
    if (icon) icon.textContent = "▲";
    if (text) text.textContent = "فرد اللافتة";
    if (floatBtn) {
      floatBtn.title = "فرد لافتة المخطط";
      floatBtn.classList.add("active-collapsed");
    }
  }
}

window.toggleCanvasBackground = toggleCanvasBackground;
window.initCanvasTheme = initCanvasTheme;
window.initCanvas = initCanvas;
window.openDeveloperModal = openDeveloperModal;
window.closeDeveloperModal = closeDeveloperModal;
window.toggleTitleBlockMinimize = toggleTitleBlockMinimize;
window.renderNetwork = renderNetwork;
window.fitToScreen = fitToScreen;
window.resetZoom = resetZoom;
window.openAllSwitches = openAllSwitches;
window.closeAllSwitches = closeAllSwitches;
window.toggleAllSwitches = toggleAllSwitches;

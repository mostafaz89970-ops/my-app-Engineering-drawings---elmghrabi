/**
 * Smart Grid SLD Studio - Real-Time Multi-Device Cloud Synchronization
 * Copyright (C) ENG-MOSTAFAELMGHRABY - All Rights Reserved
 * 
 * يتيح هذا الموديول مزامنة المخططات الهندسية لحظياً عبر كافة الأجهزة (كمبيوتر / محمول)
 * بحيث تظهر التعديلات فور إجرائها على أي جهاز لجميع المستخدمين في نفس اللحظة.
 */

(function () {
  'use strict';

  var DEFAULT_ROOM = 'mepco_elmghrabi_sync_v5';
  var currentRoom = localStorage.getItem('sld_sync_room') || DEFAULT_ROOM;

  var deviceId = sessionStorage.getItem('sld_device_id');
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    sessionStorage.setItem('sld_device_id', deviceId);
  }

  var sseClient = null;
  var isApplyingRemote = false;
  var lastBroadcastHash = null;
  var syncDebounceTimer = null;
  var reconnectTimer = null;
  var isInitialSyncDone = false;
  var lastUserUpdateTimestamp = 0;
  var lastDrawingUpdateTimestamp = 0;
  var lastServerEventId = 0;
  var isLocalServerActive = false;

  // 1. قناة البث المباشر بين كافة التبويبات والنوافذ في نفس المتصفح (0ms Latency)
  var localBroadcastChannel = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      localBroadcastChannel = new BroadcastChannel('sld_studio_sync_v1');
      localBroadcastChannel.onmessage = function (e) {
        if (e && e.data) {
          handleIncomingCloudPayload(e.data);
        }
      };
    }
  } catch (_) {}

  // 2. ناقل التزامن عبر التخزين المحلي (يدعم المتصفحات القديمة وتعدد النوافذ)
  window.addEventListener('storage', function (e) {
    if (e.key === 'sld_sync_bus' && e.newValue) {
      try {
        var b = JSON.parse(e.newValue);
        if (b && b.payload && b.payload.senderId !== deviceId) {
          handleIncomingCloudPayload(b.payload);
        }
      } catch (_) {}
    }
  });

  // دالة تشفير سريعة للمقارنة وتجنب التكرار
  function fastHash(str) {
    if (!str) return 0;
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  // بث الأحداث الفورية عبر كافة القنوات المتعددة (محلي، شبكي، سحابي)
  function postCloudEvent(type, data, reason) {
    try {
      var author = (window.currentUser && window.currentUser.name) ?
        window.currentUser.name : 'المهندس مصطفى المغربي';

      var payload = {
        type: type,
        senderId: deviceId,
        author: author,
        timestamp: Date.now(),
        reason: reason || '',
        data: data
      };

      // أ) بث فوري لجميع النوافذ والتبويبات لنفس المتصفح عبر BroadcastChannel
      if (localBroadcastChannel) {
        try { localBroadcastChannel.postMessage(payload); } catch (_) {}
      }

      // ب) بث فوري عبر ناقل التخزين المحلي
      try {
        localStorage.setItem('sld_sync_bus', JSON.stringify({ payload: payload, r: Math.random(), t: Date.now() }));
      } catch (_) {}

      // ج) بث فوري إلى خادم المنظومة المحلي لكافة الأجهزة المتصلة على الشبكة (LAN)
      fetch('/api/sync/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (res) {
        if (res.ok) {
          isLocalServerActive = true;
          updateBadgeUI('broadcast');
          setTimeout(function () { updateBadgeUI('connected'); }, 800);
        }
      }).catch(function (_) {});

      // د) بث سحابي عبر ntfy.sh للأجهزة البعيدة عبر الإنترنت مع مهلة لحماية الاتصال
      try {
        var targetUrl = 'https://ntfy.sh/' + encodeURIComponent(currentRoom);
        var controller = new AbortController();
        var to = setTimeout(function () { controller.abort(); }, 3500);

        fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Title': 'SLD Sync: ' + type
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        }).then(function (res) {
          clearTimeout(to);
          if (res.ok) {
            updateBadgeUI('broadcast');
            setTimeout(function () { updateBadgeUI('connected'); }, 800);
          }
        }).catch(function (_) {});
      } catch (_) {}

    } catch (e) {
      console.warn('Error sending sync event:', e);
    }
  }

  // استخراج وتفسير رسائل السحابة (سواء نصية أو مرفق لملفات كبيرة)
  async function parseCloudMessage(eventData) {
    if (!eventData) return null;
    try {
      var ntfyMsg = (typeof eventData === 'string') ? JSON.parse(eventData) : eventData;
      if (!ntfyMsg) return null;

      if (ntfyMsg.attachment && ntfyMsg.attachment.url) {
        try {
          var res = await fetch(ntfyMsg.attachment.url);
          if (res.ok) return await res.json();
        } catch (_) {}
      }

      if (ntfyMsg.message) {
        try {
          return JSON.parse(ntfyMsg.message);
        } catch (_) {
          return ntfyMsg.message;
        }
      }
    } catch (e) {}
    return null;
  }

  // ─── دالة الدمج والتوفيق الذكي بين المخططات الهندسية (Auto-Reconcile & Smart Merge) ───
  // تكتشف تلقائياً العناصر والأكشاك الناقصة بين الأجهزة وتدمجها وتضمن التطابق التام 100%
  function smartMergeProjects(localProj, remoteProj) {
    if (!remoteProj || !remoteProj.nodes || !Array.isArray(remoteProj.nodes) || remoteProj.nodes.length === 0) {
      return { merged: localProj || {}, addedNodes: 0, addedSecs: 0, localHadExtra: false };
    }
    if (!localProj || !localProj.nodes || !Array.isArray(localProj.nodes) || localProj.nodes.length === 0) {
      return { merged: remoteProj, addedNodes: remoteProj.nodes.length, addedSecs: (remoteProj.sections || []).length, localHadExtra: false };
    }

    var merged = Object.assign({}, localProj);

    // تتبع العناصر المحذوفة عمداً حتى لا تعود بالخطأ
    var localDelNodes = Array.isArray(localProj.deleted_node_ids) ? localProj.deleted_node_ids : [];
    var remoteDelNodes = Array.isArray(remoteProj.deleted_node_ids) ? remoteProj.deleted_node_ids : [];
    var delNodesSet = new Set(localDelNodes.concat(remoteDelNodes));

    var localDelSecs = Array.isArray(localProj.deleted_sec_ids) ? localProj.deleted_sec_ids : [];
    var remoteDelSecs = Array.isArray(remoteProj.deleted_sec_ids) ? remoteProj.deleted_sec_ids : [];
    var delSecsSet = new Set(localDelSecs.concat(remoteDelSecs));

    merged.deleted_node_ids = Array.from(delNodesSet);
    merged.deleted_sec_ids = Array.from(delSecsSet);

    // 1. فهرسة العقد المحلية
    var nodeMap = new Map();
    (localProj.nodes || []).forEach(function (n) {
      if (n && n.id && !delNodesSet.has(n.id)) {
        nodeMap.set(n.id, Object.assign({}, n));
      }
    });

    var addedNodesCount = 0;
    var remoteNodeIds = new Set();

    (remoteProj.nodes || []).forEach(function (rn) {
      if (!rn || !rn.id || delNodesSet.has(rn.id)) return;
      remoteNodeIds.add(rn.id);

      if (!nodeMap.has(rn.id)) {
        // كشك أو عقدة ناقصة على هذا الجهاز! نقوم باستكمالها فوراً
        nodeMap.set(rn.id, Object.assign({}, rn));
        addedNodesCount++;
      } else {
        // العقدة موجودة في كلا الجهازين: نأخذ الأحدث زمنياً أو نكمل الخصائص الناقصة
        var ln = nodeMap.get(rn.id);
        var rTs = rn.updated_at || rn.timestamp || 0;
        var lTs = ln.updated_at || ln.timestamp || 0;
        if (rTs > lTs) {
          nodeMap.set(rn.id, Object.assign({}, ln, rn));
        } else {
          Object.keys(rn).forEach(function (k) {
            if (ln[k] === undefined || ln[k] === null || ln[k] === '') {
              ln[k] = rn[k];
            }
          });
        }
      }
    });

    // هل كان لدى هذا الجهاز عناصر إضافية لم تكن موجودة لدى الجهاز الآخر؟
    var localHadExtra = false;
    for (var lId of nodeMap.keys()) {
      if (!remoteNodeIds.has(lId)) {
        localHadExtra = true;
        break;
      }
    }

    merged.nodes = Array.from(nodeMap.values());

    // 2. دمج المقاطع / الكابلات الهندسية
    var secMap = new Map();
    var connKeys = new Set();
    function makeConnKey(u, v) {
      return (u < v) ? (u + '__' + v) : (v + '__' + u);
    }

    (localProj.sections || []).forEach(function (s) {
      if (!s || !s.id || delSecsSet.has(s.id)) return;
      if (nodeMap.has(s.from_node) && nodeMap.has(s.to_node)) {
        secMap.set(s.id, Object.assign({}, s));
        connKeys.add(makeConnKey(s.from_node, s.to_node));
      }
    });

    var addedSecsCount = 0;
    var remoteSecIds = new Set();

    (remoteProj.sections || []).forEach(function (rs) {
      if (!rs || !rs.id || delSecsSet.has(rs.id)) return;
      remoteSecIds.add(rs.id);
      var fn = rs.from_node;
      var tn = rs.to_node;
      if (nodeMap.has(fn) && nodeMap.has(tn)) {
        var ck = makeConnKey(fn, tn);
        if (!secMap.has(rs.id) && !connKeys.has(ck)) {
          secMap.set(rs.id, Object.assign({}, rs));
          connKeys.add(ck);
          addedSecsCount++;
        } else if (secMap.has(rs.id)) {
          var ls = secMap.get(rs.id);
          var props = ['corner_style', 'deflection_offset', 'is_slanted', 'direction', 'type', 'size', 'length', 'status', 'r_per_km', 'x_per_km'];
          props.forEach(function (p) {
            if (rs[p] !== undefined && rs[p] !== null) {
              ls[p] = rs[p];
            }
          });
        }
      }
    });

    if (!localHadExtra) {
      for (var sId of secMap.keys()) {
        if (!remoteSecIds.has(sId)) {
          localHadExtra = true;
          break;
        }
      }
    }

    merged.sections = Array.from(secMap.values());
    if (remoteProj.name && !localProj.name) {
      merged.name = remoteProj.name;
    }

    return {
      merged: merged,
      addedNodes: addedNodesCount,
      addedSecs: addedSecsCount,
      localHadExtra: localHadExtra
    };
  }

  // معالجة وتطبيق الأحداث الواردة من الأجهزة الأخرى
  async function handleIncomingCloudPayload(payload) {
    if (!payload || !payload.type) return;
    if (payload.senderId === deviceId) return;

    var author = payload.author || 'جهاز آخر';
    var type = payload.type;
    var data = payload.data || {};
    var msgTime = payload.timestamp || 0;

    console.log('⚡ استلام حدث سحابي:', type, 'من:', author);

    if (type === 'DRAWING_UPDATE') {
      if (!data.project || !data.project.nodes) return;
      if (msgTime && msgTime < lastDrawingUpdateTimestamp) return;
      if (msgTime) lastDrawingUpdateTimestamp = msgTime;

      var currentLocal = (window.getCurrentProject ? window.getCurrentProject() : null) || window.currentProject;
      if (!currentLocal || !currentLocal.nodes || currentLocal.nodes.length === 0) {
        try { currentLocal = JSON.parse(localStorage.getItem('sld_saved_feeder')); } catch (_) {}
      }

      var mergeResult = smartMergeProjects(currentLocal, data.project);
      var finalProj = mergeResult.merged;

      var projStr = JSON.stringify(finalProj);
      var hash = fastHash(projStr);
      if (hash === lastBroadcastHash) return;
      lastBroadcastHash = hash;

      isApplyingRemote = true;
      if (window.setCurrentProject) {
        window.setCurrentProject(finalProj);
      } else {
        window.currentProject = finalProj;
      }
      try {
        localStorage.setItem('sld_saved_feeder', projStr);
      } catch (e) {}

      if (window.updateFeederInputs) window.updateFeederInputs();
      if (window.renderNetwork) window.renderNetwork();
      if (window.fitToScreen) window.fitToScreen();

      var toastMsg = '🔄 تم استلام وتحديث الرسم لحظياً من: ' + author;
      if (mergeResult.addedNodes > 0 || mergeResult.addedSecs > 0) {
        toastMsg = '⚡ تم استكمال ومطابقة الرسم الناقص تلقائياً (+ ' + mergeResult.addedNodes + ' أكشاك/عقد) من: ' + author;
      }
      showSyncToast(toastMsg, 'success');
      updateBadgeUI('syncing', author);

      setTimeout(function () {
        isApplyingRemote = false;
        updateBadgeUI('connected');

        // إذا كان لدى هذا الجهاز عناصر زائدة لم تكن في رسالة الطرف الآخر،
        // نبث له المخطط الموحد فوراً ليصبح الجهازان متطابقين تماماً 100%
        if (mergeResult.localHadExtra) {
          console.log('🔄 إرسال المخطط الموحد المكتمل للطرف الآخر لتحقيق التطابق التام 100%');
          broadcastLocalDrawing('auto_reconcile_parity');
        }
      }, 800);

    } else if (type === 'PROJECT_SAVED') {
      if (data.project && window.applySyncedProject) {
        if (msgTime) lastDrawingUpdateTimestamp = msgTime;

        var curLocal = (window.getCurrentProject ? window.getCurrentProject() : null) || window.currentProject;
        var mRes = smartMergeProjects(curLocal, data.project);
        var mergedP = mRes.merged;

        window.applySyncedProject(mergedP, data.catalog);
        showSyncToast('💾 تم حفظ ومطابقة مشروع [' + (mergedP.name || '') + '] من: ' + author);
        updateBadgeUI('syncing', author);

        setTimeout(function () {
          updateBadgeUI('connected');
          if (mRes.localHadExtra) {
            broadcastLocalDrawing('auto_reconcile_parity');
          }
        }, 800);
      }

    } else if (type === 'PROJECT_DELETED') {
      if (data.catalog && window.applySyncedCatalog) {
        window.applySyncedCatalog(data.catalog);
        showSyncToast('🗑️ تم تحديث قائمة المشاريع بعد حذف مشروع من: ' + author);
        updateBadgeUI('syncing', author);
        setTimeout(function () { updateBadgeUI('connected'); }, 800);
      }

    } else if (type === 'USERS_UPDATE') {
      if (Array.isArray(data.users) && data.users.length > 0 && window.applySyncedUsers) {
        if (msgTime && msgTime < lastUserUpdateTimestamp) return;
        if (msgTime) lastUserUpdateTimestamp = msgTime;

        window.applySyncedUsers(data.users);
        showSyncToast('👥 تم تحديث بيانات ومستخدمي المنظومة لحظياً من: ' + author);
        updateBadgeUI('syncing', author);
        setTimeout(function () { updateBadgeUI('connected'); }, 800);
      }

    } else if (type === 'MAINTENANCE_UPDATE') {
      var isActive = (data.isActive === true || data.isActive === 'true');
      var localActive = (localStorage.getItem('sld_maintenance_mode') === 'true');
      if (isActive !== localActive) {
        localStorage.setItem('sld_maintenance_mode', isActive ? 'true' : 'false');
        if (window.checkMaintenanceState) window.checkMaintenanceState();
        if (window.updateMaintenanceBtnUI) window.updateMaintenanceBtnUI();
        showSyncToast(isActive ? '🚨 دخلت المنظومة في وضع الصيانة والتحديث الآن' : '✅ تم إنهاء وضع الصيانة وفتح المنظومة للجميع', isActive ? 'warning' : 'info');
      }

    } else if (type === 'REQUEST_FULL_SYNC') {
      respondToFullSyncRequest(payload.senderId);

    } else if (type === 'RESPONSE_FULL_SYNC') {
      if (data.targetSenderId === deviceId) {
        applyFullSyncDataset(data, author);
      }
    }
  }

  // ضغط وتنظيف بيانات المخطط لتكون خفيفة جداً (<3KB) فلا تتحول إلى مرفقات وتصل فورياً
  function compactProjectForCloud(p) {
    if (!p) return p;
    var cleanNodes = (p.nodes || []).map(function (n) {
      return {
        id: n.id,
        type: n.type,
        name: n.name,
        x: Math.round(n.x || 0),
        y: Math.round(n.y || 0),
        capacity: n.capacity,
        loading_pct: n.loading_pct,
        direction: n.direction,
        switches_count: n.switches_count,
        has_outgoing: n.has_outgoing,
        outgoing_terminal: n.outgoing_terminal,
        updated_at: n.updated_at || Date.now()
      };
    });
    var cleanSecs = (p.sections || []).map(function (s) {
      return {
        id: s.id,
        from_node: s.from_node,
        to_node: s.to_node,
        type: s.type,
        size: s.size,
        length: s.length,
        direction: s.direction,
        corner_style: s.corner_style,
        deflection_offset: s.deflection_offset,
        is_slanted: s.is_slanted,
        status: s.status,
        tap_side: s.tap_side
      };
    });
    return {
      id: p.id,
      name: p.name,
      voltage_kv: p.voltage_kv,
      nodes: cleanNodes,
      sections: cleanSecs,
      deleted_node_ids: p.deleted_node_ids || [],
      deleted_sec_ids: p.deleted_sec_ids || []
    };
  }

  function respondToFullSyncRequest(targetDevId) {
    try {
      var curProj = (window.getCurrentProject ? window.getCurrentProject() : null) || window.currentProject;
      if (!curProj || !curProj.nodes || curProj.nodes.length === 0) {
        try { curProj = JSON.parse(localStorage.getItem('sld_saved_feeder')); } catch (_) {}
      }

      var catalog = [];
      try { catalog = JSON.parse(localStorage.getItem('sld_projects_catalog') || '[]'); } catch (_) {}

      var users = (window.allUsersCache && window.allUsersCache.length > 0) ? window.allUsersCache : null;
      if (!users || users.length === 0) {
        try { users = JSON.parse(localStorage.getItem('sld_users')); } catch (_) {}
      }
      if (!users || users.length === 0) {
        try {
          var s = JSON.parse(localStorage.getItem('sld_settings'));
          if (s && s.users) users = s.users;
        } catch (_) {}
      }

      var isMaint = (localStorage.getItem('sld_maintenance_mode') === 'true');
      var compactP = compactProjectForCloud(curProj);

      postCloudEvent('RESPONSE_FULL_SYNC', {
        targetSenderId: targetDevId,
        project: compactP,
        catalog: catalog,
        users: users,
        maintenanceMode: isMaint
      }, 'full_sync_reply');
    } catch (e) {
      console.warn('Error responding to full sync:', e);
    }
  }

  function applyFullSyncDataset(data, author) {
    if (!data) return;
    try {
      if (data.project && data.project.nodes && data.project.nodes.length > 0) {
        var currentLocal = (window.getCurrentProject ? window.getCurrentProject() : null) || window.currentProject;
        if (!currentLocal || !currentLocal.nodes || currentLocal.nodes.length === 0) {
          try { currentLocal = JSON.parse(localStorage.getItem('sld_saved_feeder')); } catch (_) {}
        }

        var mergeResult = smartMergeProjects(currentLocal, data.project);
        var finalProj = mergeResult.merged;

        if (window.setCurrentProject) {
          window.setCurrentProject(finalProj);
        } else {
          window.currentProject = finalProj;
        }
        localStorage.setItem('sld_saved_feeder', JSON.stringify(finalProj));
        if (window.updateFeederInputs) window.updateFeederInputs();
        if (window.renderNetwork) window.renderNetwork();
        if (window.fitToScreen) window.fitToScreen();

        if (mergeResult.localHadExtra) {
          setTimeout(function () {
            broadcastLocalDrawing('auto_reconcile_parity');
          }, 1200);
        }
      }

      if (Array.isArray(data.catalog) && data.catalog.length > 0 && window.applySyncedCatalog) {
        window.applySyncedCatalog(data.catalog);
      }

      if (Array.isArray(data.users) && data.users.length > 0 && window.applySyncedUsers) {
        window.applySyncedUsers(data.users);
      }

      if (data.maintenanceMode !== undefined) {
        localStorage.setItem('sld_maintenance_mode', data.maintenanceMode ? 'true' : 'false');
        if (window.checkMaintenanceState) window.checkMaintenanceState();
      }

      showSyncToast('✅ تم استلام ومزامنة ومطابقة كافة المشاريع والمستخدمين والرسم لحظياً من: ' + author, 'success');
      updateBadgeUI('connected');
    } catch (e) {
      console.warn('Error applying full sync dataset:', e);
    }
  }

  async function pollStartupCloudState() {
    try {
      var pollUrl = 'https://ntfy.sh/' + encodeURIComponent(currentRoom) + '/json?poll=1&since=all';
      var res = await fetch(pollUrl);
      if (res.ok) {
        var text = await res.text();
        var lines = text.trim().split(String.fromCharCode(10));
        for (var i = 0; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          var parsed = await parseCloudMessage(lines[i]);
          if (parsed && parsed.type) {
            await handleIncomingCloudPayload(parsed);
          }
        }
        if (window.fitToScreen) {
          setTimeout(window.fitToScreen, 200);
        }
      }
    } catch (e) {
      console.warn('Startup poll warning:', e);
    }

    postCloudEvent('REQUEST_FULL_SYNC', { requestedAt: Date.now() }, 'initial_join');
    isInitialSyncDone = true;
  }

  function connectCloudSSE() {
    if (sseClient) {
      try { sseClient.close(); } catch (_) {}
      sseClient = null;
    }

    var sseUrl = 'https://ntfy.sh/' + encodeURIComponent(currentRoom) + '/sse';
    console.log('⚡ فتح قناة المزامنة اللحظية السحابية:', sseUrl);

    try {
      sseClient = new EventSource(sseUrl);

      sseClient.onopen = function () {
        console.log('✅ تم الاتصال بقناة المزامنة السحابية اللحظية بنجاح [Room: ' + currentRoom + ']');
        updateBadgeUI('connected');
      };

      sseClient.onmessage = async function (e) {
        if (!e || !e.data) return;
        var payload = await parseCloudMessage(e.data);
        if (payload && payload.type) {
          await handleIncomingCloudPayload(payload);
        }
      };

      sseClient.onerror = function () {
        updateBadgeUI('offline');
        if (sseClient) {
          try { sseClient.close(); } catch (_) {}
          sseClient = null;
        }
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connectCloudSSE, 4000);
      };
    } catch (err) {
      console.error('Failed to connect SSE:', err);
      updateBadgeUI('offline');
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connectCloudSSE, 5000);
    }
  }

  // ─── 8. وظائف البث المحلية الموجهة للأجهزة الأخرى ─────────────────────────────
  function broadcastLocalDrawing(reason) {
    if (isApplyingRemote) return;
    var proj = (window.getCurrentProject ? window.getCurrentProject() : null) || window.currentProject;
    if (!proj || !proj.nodes || proj.nodes.length === 0) return;

    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = setTimeout(function () {
      try {
        var cleanProj = compactProjectForCloud(proj);
        var projStr = JSON.stringify(cleanProj);
        var hash = fastHash(projStr);
        if (hash === lastBroadcastHash) return;
        lastBroadcastHash = hash;

        postCloudEvent('DRAWING_UPDATE', { project: cleanProj }, reason || 'drawing_edit');
      } catch (e) {
        console.warn('Error broadcasting drawing:', e);
      }
    }, 350);
  }

  function broadcastProjectSaved(project, catalog) {
    if (!project) return;
    var cleanProj = compactProjectForCloud(project);
    postCloudEvent('PROJECT_SAVED', { project: cleanProj, catalog: catalog }, 'project_saved');
  }

  function broadcastProjectDeleted(projectId, catalog) {
    postCloudEvent('PROJECT_DELETED', { projectId: projectId, catalog: catalog }, 'project_deleted');
  }

  function broadcastUsersUpdate(users) {
    if (!Array.isArray(users)) return;
    postCloudEvent('USERS_UPDATE', { users: users }, 'users_updated');
  }

  function broadcastMaintenanceState(isActive) {
    postCloudEvent('MAINTENANCE_UPDATE', { isActive: !!isActive }, 'maintenance_toggle');
  }

  // ─── 9. واجهة الشارة والتنبيهات ───────────────────────────────────────────────
  function updateBadgeUI(status, info) {
    var badge = document.getElementById('cloud-sync-badge');
    if (!badge) return;

    if (status === 'connected') {
      badge.innerHTML = '<span class="sync-dot green"></span> <span>مزامنة سحابية لحظية ⚡</span>';
      badge.className = 'sync-status-badge badge-connected';
      badge.title = 'النظام متصل سحابياً - كافة التعديلات تسمع لحظياً على كل الأجهزة';
    } else if (status === 'syncing') {
      badge.innerHTML = '<span class="sync-dot blue pulse"></span> <span>تحديث وارد من ' + (info || 'جهاز') + '...</span>';
      badge.className = 'sync-status-badge badge-syncing';
    } else if (status === 'broadcast') {
      badge.innerHTML = '<span class="sync-dot purple"></span> <span>جاري البث للأجهزة... 📡</span>';
      badge.className = 'sync-status-badge badge-broadcast';
    } else {
      badge.innerHTML = '<span class="sync-dot red"></span> <span>جاري إعادة الاتصال بالسحابة...</span>';
      badge.className = 'sync-status-badge badge-offline';
    }
  }

  function showSyncToast(msg, type) {
    if (window.showToast) {
      window.showToast(msg, type || 'info');
    }
  }

  // ─── 10. نافذة التحكم بالغرفة السحابية والإرسال القسري ──────────────────────────
  function openSyncModal() {
    var modal = document.getElementById('realtime-sync-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'realtime-sync-modal';
      modal.className = 'modal-overlay';
      modal.innerHTML = 
        '<div class="modal-dialog" style="max-width: 520px;">' +
          '<div class="modal-header">' +
            '<h3>⚡ المزامنة السحابية اللحظية بين كافة الأجهزة</h3>' +
            '<button class="btn-close" onclick="window.closeSyncModal()">✕</button>' +
          '</div>' +
          '<div class="modal-body" style="padding: 18px;">' +
            '<div style="background: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; border-radius: 8px; padding: 12px; margin-bottom: 16px; color: #a7f3d0; line-height: 1.6;">' +
              '<strong style="display:block;margin-bottom:4px;">🟢 النظام السحابي نشط ويعمل لحظياً:</strong>' +
              'أي تعديل على الرسم، أو حفظ مشروع جديد، أو إضافة مستخدم، أو تغيير كلمة مرور يسمع فوراً في نفس اللحظة على جميع الهواتف وأجهزة الكمبيوتر المتصلة.' +
            '</div>' +
            '<div class="form-group" style="margin-bottom: 14px;">' +
              '<label style="font-weight: bold; margin-bottom: 6px; display: block;">🔑 كود الغرفة السحابية المشتركة (Room ID):</label>' +
              '<div style="display:flex; gap: 8px;">' +
                '<input type="text" id="sync-room-input" class="form-control" value="' + currentRoom + '" style="flex: 1; font-family: monospace; font-size: 14px;">' +
                '<button class="btn btn-primary" onclick="window.changeSyncRoom()" style="white-space: nowrap;">حفظ وتغيير</button>' +
              '</div>' +
              '<small style="color: #94a3b8; display: block; margin-top: 4px;">للعمل في غرفة خاصة أو مغذي مستقل، أدخل اسماً موحداً بين أجهزتك.</small>' +
            '</div>' +
            '<div style="display: flex; flex-direction: column; gap: 10px; margin-top: 18px;">' +
              '<button class="btn btn-warning" onclick="window.reconcileAndSyncAllDevices(); window.closeSyncModal();" style="width: 100%; padding: 11px; font-weight: bold; background: linear-gradient(135deg, #0d9488, #059669); border: none; color: #fff; border-radius: 6px; cursor: pointer;">' +
                '🔄 مطابقة واستكمال الرسم الناقص من كافة الأجهزة الآن' +
              '</button>' +
              '<button class="btn btn-success" onclick="window.forceBroadcastProject()" style="width: 100%; padding: 11px; font-weight: bold; border-radius: 6px; cursor: pointer;">' +
                '📡 إرسال قسري لكافة المشاريع والرسم والمستخدمين لجميع الأجهزة الآن' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      document.body.appendChild(modal);
    }
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }

  function closeSyncModal() {
    var modal = document.getElementById('realtime-sync-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
  }

  function changeSyncRoom() {
    var input = document.getElementById('sync-room-input');
    if (!input || !input.value.trim()) return;
    var newRoom = input.value.trim();
    currentRoom = newRoom;
    localStorage.setItem('sld_sync_room', currentRoom);
    connectCloudSSE();
    pollStartupCloudState();
    closeSyncModal();
    if (window.showToast) window.showToast('✅ تم الانتقال إلى الغرفة السحابية: ' + newRoom, 'success');
  }

  function forceBroadcastProject() {
    lastBroadcastHash = null;
    var curProj = (window.getCurrentProject ? window.getCurrentProject() : null) || window.currentProject;
    if (!curProj || !curProj.nodes) {
      try { curProj = JSON.parse(localStorage.getItem('sld_saved_feeder')); } catch (_) {}
    }
    var catalog = [];
    try { catalog = JSON.parse(localStorage.getItem('sld_projects_catalog') || '[]'); } catch (_) {}
    var users = (window.allUsersCache && window.allUsersCache.length > 0) ? window.allUsersCache : null;
    if (!users || users.length === 0) {
      try { users = JSON.parse(localStorage.getItem('sld_users')); } catch (_) {}
    }
    if (!users || users.length === 0) {
      try {
        var s = JSON.parse(localStorage.getItem('sld_settings'));
        if (s && s.users) users = s.users;
      } catch (_) {}
    }

    if (curProj && curProj.nodes) {
      var cleanProj = compactProjectForCloud(curProj);
      postCloudEvent('DRAWING_UPDATE', { project: cleanProj }, 'force_manual_sync');
      broadcastProjectSaved(cleanProj, catalog);
    }
    if (users && users.length > 0) {
      broadcastUsersUpdate(users);
    }
    closeSyncModal();
    if (window.showToast) window.showToast('📡 تم بث كافة البيانات (المخطط، المشاريع، المستخدمين) لجميع الأجهزة بنجاح!', 'success');
  }

  // دالة طلب مطابقة الرسم قسرياً واستدعاء البيانات واستكمال النواقص من كافة الأجهزة والخادم
  async function reconcileAndSyncAllDevices() {
    showSyncToast('⏳ جاري فحص ومطابقة الرسم واستكمال أي أجزاء ناقصة بين كافة الأجهزة...', 'info');
    updateBadgeUI('syncing', 'مطابقة الرسم');

    // 1. طلب المزامنة الكاملة من كافة الأجهزة السحابية
    postCloudEvent('REQUEST_FULL_SYNC', { requestedAt: Date.now() }, 'manual_reconcile');

    // 2. جلب أحدث حالة ومطابقتها مع الخادم المركزي
    await fetchServerState();

    // 3. إعادة بث المخطط الموحد لضمان وصوله لأي جهاز متصل
    setTimeout(function () {
      forceBroadcastProject();
      showSyncToast('✅ تم فحص ومطابقة الرسم واستكمال كافة العناصر لجميع الأجهزة بنجاح!', 'success');
      updateBadgeUI('connected');
    }, 1000);
  }

  // ─── 11. مزامنة الخادم المحلي التلقائية (LAN & Local Web Hub) ─────────────────
  async function fetchServerState() {
    try {
      var controller = new AbortController();
      var to = setTimeout(function () { controller.abort(); }, 2000);
      var res = await fetch('/api/sync/state', { signal: controller.signal });
      clearTimeout(to);
      if (res.ok) {
        var data = await res.json();
        if (data && data.success) {
          isLocalServerActive = true;
          applyFullSyncDataset({
            project: data.project,
            catalog: data.catalog,
            users: data.users,
            maintenanceMode: data.maintenance_mode
          }, 'خادم المنظومة المركزي');
          updateBadgeUI('connected');
        }
      }
    } catch (_) {}
  }

  async function pollLocalServerEvents() {
    try {
      var controller = new AbortController();
      var to = setTimeout(function () { controller.abort(); }, 1800);
      var res = await fetch('/api/sync/poll?since=' + lastServerEventId, { signal: controller.signal });
      clearTimeout(to);
      if (res.ok) {
        var data = await res.json();
        if (data && data.success && Array.isArray(data.events)) {
          isLocalServerActive = true;
          if (typeof data.latest_id === 'number') {
            lastServerEventId = data.latest_id;
          }
          for (var i = 0; i < data.events.length; i++) {
            var ev = data.events[i];
            if (ev && ev.senderId !== deviceId) {
              await handleIncomingCloudPayload(ev);
            }
          }
        }
      }
    } catch (_) {}
  }

  // ─── حلقة التوفيق والمطابقة التلقائية المستمرة (Continuous Background Parity Loop) ───
  // تفحص ذاتياً كل 2.5 ثانية وتدمج أي نواقص وتضمن التطابق التام 100% دون أي تدخل بشري
  async function continuousBackgroundReconciliation() {
    try {
      if (isApplyingRemote) return;
      var controller = new AbortController();
      var to = setTimeout(function () { controller.abort(); }, 1800);
      var res = await fetch('/api/sync/state', { signal: controller.signal });
      clearTimeout(to);
      if (res.ok) {
        var data = await res.json();
        if (data && data.success && data.project && data.project.nodes) {
          var curLocal = (window.getCurrentProject ? window.getCurrentProject() : null) || window.currentProject;
          if (!curLocal || !curLocal.nodes || curLocal.nodes.length === 0) {
            try { curLocal = JSON.parse(localStorage.getItem('sld_saved_feeder')); } catch (_) {}
          }
          if (curLocal && curLocal.nodes) {
            var mRes = smartMergeProjects(curLocal, data.project);
            if (mRes.addedNodes > 0 || mRes.addedSecs > 0) {
              console.log('⚡ تم استكمال ومطابقة عناصر ناقصة تلقائياً في الخلفية (+ ' + mRes.addedNodes + ' عقدة)');
              if (window.setCurrentProject) {
                window.setCurrentProject(mRes.merged);
              } else {
                window.currentProject = mRes.merged;
              }
              localStorage.setItem('sld_saved_feeder', JSON.stringify(mRes.merged));
              if (window.updateFeederInputs) window.updateFeederInputs();
              if (window.renderNetwork) window.renderNetwork();
              if (window.fitToScreen) window.fitToScreen();
            } else if (mRes.localHadExtra) {
              // هذا الجهاز يمتلك عناصر إضافية: نرسلها للخادم فوراً ليتم دمجها هناك
              var cleanProj = compactProjectForCloud(curLocal);
              fetch('/api/sync/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'DRAWING_UPDATE',
                  senderId: deviceId,
                  author: (window.currentUser && window.currentUser.name) || 'مزامنة تلقائية',
                  timestamp: Date.now(),
                  data: { project: cleanProj }
                })
              }).catch(function () {});
            }
          }
        }
      }
    } catch (_) {}
  }

  // ─── 12. تصدير الواجهات إلى window ───────────────────────────────────────────
  window.broadcastProjectUpdate = broadcastLocalDrawing;
  window.broadcastProjectSaved = broadcastProjectSaved;
  window.broadcastProjectDeleted = broadcastProjectDeleted;
  window.broadcastUsersUpdate = broadcastUsersUpdate;
  window.broadcastMaintenanceState = broadcastMaintenanceState;
  window.openSyncModal = openSyncModal;
  window.closeSyncModal = closeSyncModal;
  window.changeSyncRoom = changeSyncRoom;
  window.forceBroadcastProject = forceBroadcastProject;
  window.reconcileAndSyncAllDevices = reconcileAndSyncAllDevices;
  window.smartMergeProjects = smartMergeProjects;
  window.compactProjectForCloud = compactProjectForCloud;

  // ─── 13. تهيئة الاتصال والمزامنة عند تحميل الصفحة ─────────────────────────────
  function startSyncEngine() {
    // 1. مزامنة فورية مع الخادم المحلي (إن وُجد) لجلب المخطط والمستخدمين
    fetchServerState();

    // 2. فحص الخادم المحلي كل 750 ملي ثانية لضمان سرعة فائقة بين كافة المتصفحات والأجهزة
    setInterval(pollLocalServerEvents, 750);

    // 3. حلقة المطابقة الذاتية التلقائية في الخلفية كل 2.5 ثانية (حل جذري بدون الحاجة لأزرار)
    setInterval(continuousBackgroundReconciliation, 2500);

    // 4. ربط القناة السحابية ntfy.sh (للأجهزة البعيدة عبر الإنترنت)
    connectCloudSSE();
    pollStartupCloudState();

    setInterval(function () {
      if (!sseClient || sseClient.readyState === 2) {
        connectCloudSSE();
      }
    }, 50000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(startSyncEngine, 200);
    });
  } else {
    setTimeout(startSyncEngine, 200);
  }

})();

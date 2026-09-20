/**
 * Smart Grid SLD Studio - Real-Time Multi-Device Cloud Synchronization
 * Copyright (C) ENG-MOSTAFAELMGHRABY - All Rights Reserved
 * 
 * يتيح هذا الموديول مزامنة المخططات الهندسية لحظياً عبر كافة الأجهزة (كمبيوتر / محمول)
 * بحيث تظهر التعديلات فور إجرائها على أي جهاز لجميع المستخدمين في نفس اللحظة.
 */

(function () {
  'use strict';

  // الغرفة السحابية الافتراضية الموحدة لشركة مصر الوسطى
  var DEFAULT_ROOM = 'mepco_elmghrabi_sld_live_v1';
  var currentRoom = localStorage.getItem('sld_sync_room') || DEFAULT_ROOM;

  // معرف الجهاز الحالي لتجنب إعادة تطبيق التعديل الصادر من نفس الجهاز
  var deviceId = sessionStorage.getItem('sld_device_id');
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    sessionStorage.setItem('sld_device_id', deviceId);
  }

  // خوادم الريلاي السحابية للمزامنة الفورية
  var RELAY_PEERS = [
    'https://gun-manhattan.herokuapp.com/gun',
    'https://peer.wallie.io/gun',
    'https://relay.peer.ooo/gun'
  ];

  var gunInstance = null;
  var isApplyingRemote = false;
  var lastBroadcastHash = null;
  var syncDebounceTimer = null;
  var lastRemoteTimestamp = 0;

  // دالة تشفير سريعة للمقارنة وتجنب التكرار
  function fastHash(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  // تهيئة نظام المزامنة السحابية اللحظية
  function initSync() {
    if (typeof Gun === 'undefined') {
      console.warn('GunDB library not found yet, retrying in 1s...');
      setTimeout(initSync, 1000);
      return;
    }

    try {
      gunInstance = Gun({
        peers: RELAY_PEERS,
        localStorage: false
      });
      window.gunInstance = gunInstance;
      console.log('⚡ تم تفعيل محرك المزامنة السحابية اللحظية [Room: ' + currentRoom + ']');

      listenToCloudRoom(currentRoom);
      updateBadgeUI('connected');
    } catch (e) {
      console.error('Failed to init Gun sync:', e);
      updateBadgeUI('error');
    }
  }

  // الاستماع للتحديثات الواردة من الأجهزة الأخرى
  function listenToCloudRoom(roomName) {
    if (!gunInstance) return;

    var roomNode = gunInstance.get(roomName);
    roomNode.get('active_network_payload').on(function (data) {
      if (!data) return;

      try {
        var payload = typeof data === 'string' ? JSON.parse(data) : data;
        if (!payload || !payload.project || !payload.project.nodes) return;

        // تجاهل التحديث إذا كان قادماً من نفس هذا الجهاز
        if (payload.senderId === deviceId) return;

        // تجاهل التحديثات الأقدم من آخر تحديث محلي تم اعتماده
        if (payload.timestamp && payload.timestamp <= lastRemoteTimestamp) return;
        lastRemoteTimestamp = payload.timestamp || Date.now();

        var projectStr = JSON.stringify(payload.project);
        var hash = fastHash(projectStr);
        if (hash === lastBroadcastHash) return;

        console.log('⚡ استلام تحديث لحظي جديد من:', payload.author || 'جهاز آخر');

        isApplyingRemote = true;

        // تطبيق المخطط على بيئة العمل
        if (typeof currentProject !== 'undefined') {
          currentProject = payload.project;
        }
        window.currentProject = payload.project;
        try {
          localStorage.setItem('sld_saved_feeder', projectStr);
        } catch (e) {}

        // إعادة رسم الشبكة وتحديث الواجهة
        if (window.updateFeederInputs) window.updateFeederInputs();
        if (window.renderNetwork) window.renderNetwork();

        var authorName = payload.author || 'مهندس آخر';
        showSyncToast('🔄 تم استلام وتحديث المخطط لحظياً من: ' + authorName);
        updateBadgeUI('syncing', authorName);

        setTimeout(function () {
          isApplyingRemote = false;
          updateBadgeUI('connected');
        }, 800);

      } catch (err) {
        console.error('Error applying remote sync update:', err);
      }
    });
  }

  // بث التحديثات لجميع الأجهزة عند إجراء أي تعديل
  function broadcastLocalChange(reason) {
    if (isApplyingRemote) return;
    if (!gunInstance) return;

    var proj = window.currentProject || (typeof currentProject !== 'undefined' ? currentProject : null);
    if (!proj || !proj.nodes) return;

    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = setTimeout(function () {
      try {
        var projectStr = JSON.stringify(proj);
        var hash = fastHash(projectStr);
        if (hash === lastBroadcastHash) return;
        lastBroadcastHash = hash;

        var userName = (window.currentUser && window.currentUser.name) ?
          window.currentUser.name : 'المهندس مصطفى المغربي';

        var payload = {
          senderId: deviceId,
          author: userName,
          timestamp: Date.now(),
          reason: reason || 'edit',
          project: proj
        };

        var roomNode = gunInstance.get(currentRoom);
        roomNode.get('active_network_payload').put(JSON.stringify(payload));
        console.log('📡 تم بث التحديث السحابي لجميع الأجهزة [Reason: ' + (reason || 'edit') + ']');
        updateBadgeUI('broadcast');

        setTimeout(function () {
          updateBadgeUI('connected');
        }, 1200);

      } catch (e) {
        console.error('Error broadcasting local change:', e);
      }
    }, 400); // 400ms debounce
  }

  // واجهة مستخدم شارة المزامنة
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
      badge.innerHTML = '<span class="sync-dot red"></span> <span>غير متصل بالسحابة</span>';
      badge.className = 'sync-status-badge badge-offline';
    }
  }

  function showSyncToast(msg) {
    if (window.showToast) {
      window.showToast(msg, 'info');
    }
  }

  // نافذة إدارة المزامنة السحابية
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
            '<button class="btn-close" onclick="window.closeSyncModal()">&times;</button>' +
          '</div>' +
          '<div class="modal-body" style="padding: 18px;">' +
            '<div style="background: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; border-radius: 8px; padding: 12px; margin-bottom: 16px; color: #a7f3d0;">' +
              '<strong style="display:block;margin-bottom:4px;">🟢 النظام السحابي نشط ويعمل لحظياً:</strong>' +
              'أي تعديل على المخطط (إضافة محول، سحب خط، تغيير سكينة، أو تعديل مسار) يسمع في نفس الثانية على كافة أجهزة الكمبيوتر والمحمول المفتوحة.' +
            '</div>' +
            '<div class="form-group" style="margin-bottom: 14px;">' +
              '<label style="font-weight: bold; margin-bottom: 6px; display: block;">🔑 كود الغرفة السحابية المشتركة (Room ID):</label>' +
              '<div style="display:flex; gap: 8px;">' +
                '<input type="text" id="sync-room-input" class="form-control" value="' + currentRoom + '" style="flex: 1; font-family: monospace; font-size: 14px;">' +
                '<button class="btn btn-primary" onclick="window.changeSyncRoom()" style="white-space: nowrap;">حفظ وتغيير</button>' +
              '</div>' +
              '<small style="color: #94a3b8; display: block; margin-top: 4px;">لفتح مغذي مستقل أو شبكة خاصة، اكتب اسماً للغرفة وشاركه مع زملائك.</small>' +
            '</div>' +
            '<div style="display: flex; gap: 10px; margin-top: 20px;">' +
              '<button class="btn btn-success" onclick="window.forceBroadcastProject()" style="flex: 1;">' +
                '📡 إرسال قسري للمخطط لجميع الأجهزة الآن' +
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
    listenToCloudRoom(currentRoom);
    closeSyncModal();
    if (window.showToast) window.showToast('✅ تم الانتقال إلى الغرفة السحابية: ' + newRoom, 'success');
  }

  function forceBroadcastProject() {
    lastBroadcastHash = null;
    broadcastLocalChange('force_manual_sync');
    closeSyncModal();
    if (window.showToast) window.showToast('📡 تم إرسال المخطط الحالي قسرياً لجميع الأجهزة المتصلة بنجاح!', 'success');
  }

  // تصدير الواجهات
  window.broadcastProjectUpdate = broadcastLocalChange;
  window.openSyncModal = openSyncModal;
  window.closeSyncModal = closeSyncModal;
  window.changeSyncRoom = changeSyncRoom;
  window.forceBroadcastProject = forceBroadcastProject;

  // بدء التشغيل عند تحميل المستند
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(initSync, 500);
    });
  }

})();

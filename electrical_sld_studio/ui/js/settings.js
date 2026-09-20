/**
 * Smart Grid SLD Studio - Settings & Administration Module
 * Copyright (C) ENG-MOSTAFAELMGHRABY - All Rights Reserved
 */

// ─── State ────────────────────────────────────────────────────────────────────
let appSettings = null;        // الإعدادات المحملة من الخادم
let settingsActiveTab = 'dropdowns'; // التبويب النشط
let editingUserId = null;      // مستخدم يجري تعديله حالياً

// ─── Open / Close ─────────────────────────────────────────────────────────────
async function openSettingsPanel() {
  const panel = document.getElementById('settings-panel');
  if (!panel) return;

  // فحص الصلاحية
  if (!currentUser || (!currentUser.permissions.includes('settings') && !currentUser.permissions.includes('all'))) {
    showToast('⛔ ليس لديك صلاحية الوصول إلى الإعدادات', 'error');
    return;
  }

  panel.classList.remove('hidden');
  await loadSettings();
  switchSettingsTab(settingsActiveTab);
}

function closeSettingsPanel() {
  const panel = document.getElementById('settings-panel');
  if (panel) panel.classList.add('hidden');
}

// ─── Data Loading ─────────────────────────────────────────────────────────────
async function loadSettings() {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    if (data.success) {
      appSettings = data;
      if (data.system_info && data.system_info.app_name && window.updateAppBranding) {
        window.updateAppBranding(data.system_info.app_name);
      }
      populateDropdownsFromSettings(data.dropdowns);
      return data;
    }
  } catch (e) {
    console.error('Error loading settings:', e);
  }
  return null;
}

/**
 * يملأ جميع القوائم المنسدلة في التطبيق من الإعدادات المحفوظة.
 * يُستدعى بعد تسجيل الدخول وبعد حفظ الإعدادات.
 */
function populateDropdownsFromSettings(dropdowns) {
  if (!dropdowns) return;

  const { overhead_sizes, cable_sizes, transformer_capacities, voltage_levels, substation_types, rmu_switch_counts } = dropdowns;

  // ── مقاطع الكابلات ──
  const cableIds = ['dlg-size', 'dlg-trans-line-size', 'kfk-cable-size', 'cas-line-size'];
  cableIds.forEach(id => _fillSelect(id, cable_sizes, null));

  // ── مقاطع الهوائي ──
  const ohlIds = ['quick-line-size'];
  ohlIds.forEach(id => _fillSelect(id, overhead_sizes, null));

  // ── قوائم الحجم تبعاً لنوع الخط (overhead/cable) ──
  _updateLineSizeSelects();

  // ── قدرات المحولات ──
  const transCapIds = ['dlg-trans-cap', 'kfk-cap', 'cas-cap'];
  transCapIds.forEach(id => _fillSelect(id, transformer_capacities, null));

  // ── مستويات الجهد ──
  _fillSelect('feeder-voltage-select', voltage_levels, null);
  _fillSelect('sub-voltage', voltage_levels, null);

  // ── أنواع المحطات ──
  _fillSelect('sub-type', substation_types, null);

  // ── عدد سكاكين RMU ──
  _fillSelect('rmu-switches', rmu_switch_counts, null);
}

function _fillSelect(selectId, items, defaultValue) {
  const el = document.getElementById(selectId);
  if (!el || !items) return;
  const current = el.value;
  el.innerHTML = items.map(item =>
    `<option value="${item.value}"${item.value === (defaultValue || current) ? ' selected' : ''}>${item.label}</option>`
  ).join('');
  // حاول الإبقاء على القيمة المختارة مسبقاً
  if (current && [...el.options].some(o => o.value === current)) el.value = current;
}

/** تحديث قوائم المقطع بناءً على نوع الخط المختار (هوائي/كابل) */
function _updateLineSizeSelects() {
  if (!appSettings) return;
  const { overhead_sizes, cable_sizes } = appSettings.dropdowns || {};

  const mapping = [
    { typeId: 'quick-line-type',     sizeId: 'quick-line-size' },
    { typeId: 'dlg-trans-line-type', sizeId: 'dlg-trans-line-size' },
    { typeId: 'sw-new-line-type',    sizeId: 'sw-new-line-size' },
    { typeId: 'lbn-type',            sizeId: 'lbn-size' },
    { typeId: 'cas-line-type',       sizeId: 'cas-line-size' },
  ];
  mapping.forEach(({ typeId, sizeId }) => {
    const typeEl = document.getElementById(typeId);
    if (!typeEl) return;
    const isOhl = typeEl.value === 'هوائي';
    _fillSelect(sizeId, isOhl ? overhead_sizes : cable_sizes, null);
  });
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
function switchSettingsTab(tab) {
  settingsActiveTab = tab;
  document.querySelectorAll('.settings-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  document.querySelectorAll('.settings-tab-pane').forEach(pane => {
    pane.classList.toggle('hidden', pane.dataset.tabPane !== tab);
  });

  if (tab === 'dropdowns') renderDropdownsTab();
  if (tab === 'users')     renderUsersTab();
  if (tab === 'sectors')   renderSectorsTab();
  if (tab === 'activity')  renderActivityTab();
}

// ─── Tab 1: Dropdowns ─────────────────────────────────────────────────────────
function renderDropdownsTab() {
  if (!appSettings) return;
  const dd = appSettings.dropdowns;

  const groups = [
    { key: 'cable_sizes',            title: '🔌 مقاطع الكابلات الأرضية (مم²)' },
    { key: 'overhead_sizes',         title: '⚡ مقاطع الخطوط الهوائية' },
    { key: 'transformer_capacities', title: '⚙️ قدرات المحولات (KVA)' },
    { key: 'voltage_levels',         title: '⚡ مستويات الجهد (ك.ف)' },
    { key: 'substation_types',       title: '🏭 أنواع المحطات واللوحات' },
    { key: 'rmu_switch_counts',      title: '🔄 عدد سكاكين وحدات RMU' }
  ];

  const container = document.getElementById('settings-dropdowns-container');
  if (!container) return;

  container.innerHTML = groups.map(g => `
    <div class="dd-group" data-key="${g.key}">
      <div class="dd-group-header">
        <span class="dd-group-title">${g.title}</span>
        <button class="btn-sm-icon" onclick="addDropdownItem('${g.key}')" title="إضافة عنصر جديد">➕ إضافة</button>
      </div>
      <div class="dd-items-list" id="dd-items-${g.key}">
        ${(dd[g.key] || []).map((item, i) => _renderDdItem(g.key, item, i)).join('')}
      </div>
    </div>
  `).join('');
}

function _renderDdItem(key, item, idx) {
  return `
    <div class="dd-item" data-key="${key}" data-idx="${idx}">
      <input class="dd-item-value" type="text" value="${item.value}" placeholder="القيمة (value)" onchange="onDdItemChange('${key}',${idx},'value',this.value)">
      <input class="dd-item-label" type="text" value="${item.label}" placeholder="التسمية (label)" onchange="onDdItemChange('${key}',${idx},'label',this.value)">
      <button class="btn-icon-danger" onclick="removeDdItem('${key}',${idx})" title="حذف">🗑️</button>
    </div>`;
}

function onDdItemChange(key, idx, field, val) {
  if (!appSettings || !appSettings.dropdowns[key]) return;
  appSettings.dropdowns[key][idx][field] = val;
}

function addDropdownItem(key) {
  if (!appSettings) return;
  if (!appSettings.dropdowns[key]) appSettings.dropdowns[key] = [];
  appSettings.dropdowns[key].push({ value: '', label: '' });
  renderDropdownsTab();
}

function removeDdItem(key, idx) {
  if (!appSettings) return;
  appSettings.dropdowns[key].splice(idx, 1);
  renderDropdownsTab();
}

async function saveDropdownSettings() {
  if (!appSettings) return;
  // التحقق من عدم وجود عناصر فارغة
  const hasEmpty = Object.values(appSettings.dropdowns).some(arr =>
    arr.some(item => !item.value.trim() || !item.label.trim())
  );
  if (hasEmpty) {
    showToast('⚠️ يوجد عناصر بقيمة أو تسمية فارغة، يرجى تعبئتها أولاً', 'warning');
    return;
  }
  try {
    const res = await fetch('/api/settings/dropdowns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dropdowns: appSettings.dropdowns, user: currentUser })
    });
    const data = await res.json();
    if (data.success) {
      populateDropdownsFromSettings(appSettings.dropdowns);
      showToast('✅ تم حفظ إعدادات القوائم بنجاح!', 'success');
    } else {
      showToast('❌ فشل حفظ الإعدادات: ' + data.message, 'error');
    }
  } catch (e) {
    showToast('❌ خطأ في الاتصال بالخادم', 'error');
  }
}

async function saveSystemInfoSetting() {
  const input = document.getElementById('setting-system-app-name');
  if (!input) return;
  const newName = input.value.trim();
  if (!newName) {
    showToast('⚠️ يرجى كتابة اسم المنظومة / الجهة', 'warning');
    return;
  }
  try {
    const res = await fetch('/api/settings/system-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_info: { app_name: newName },
        user: currentUser
      })
    });
    const data = await res.json();
    if (data.success) {
      if (appSettings) {
        if (!appSettings.system_info) appSettings.system_info = {};
        appSettings.system_info.app_name = newName;
      }
      if (window.updateAppBranding) {
        window.updateAppBranding(newName);
      }
      showToast('✅ تم حفظ وتحديث اسم الجهة بنجاح!', 'success');
    } else {
      showToast('❌ فشل حفظ اسم الجهة: ' + data.message, 'error');
    }
  } catch (e) {
    showToast('❌ خطأ في الاتصال بالخادم', 'error');
  }
}

// ─── Tab 2: Users ─────────────────────────────────────────────────────────────
const LOCAL_SECTORS_MAP = {
  "المنيا شمال": ["بني مزار شرق", "بني مزار غرب", "مغاغة", "العدوة", "مطاي", "سمالوط شرق", "سمالوط غرب"],
  "المنيا جنوب": ["المنيا شرق", "المنيا غرب", "أبو قرقاص", "ملوي", "ديرمواس"],
  "بني سويف": ["مدينة بني سويف", "مركز بني سويف", "ناصر", "ببا", "الفشن", "إهناسيا", "الواسطى", "سمسطا"],
  "الفيوم": ["شرق الفيوم", "غرب الفيوم", "مركز الفيوم", "إطسا", "طامية", "سنورس", "يوسف الصديق", "إبشواي"],
  "أسيوط": ["شرق أسيوط", "غرب أسيوط", "مركز أسيوط", "ديروط", "القوصية", "منفلوط", "أبنوب", "الفتح", "صدفا", "الغنايم", "البداري", "ساحل سليم"],
  "الوادي الجديد": ["الخارجة", "الداخلة", "الفرافرة", "باريس", "بلاط"]
};

function toggleUserPwDisplay(userId, plainPw) {
  const el = document.getElementById(`pw-user-${userId}`);
  if (!el) return;
  if (el.dataset.shown === "true") {
    el.textContent = "••••••";
    el.dataset.shown = "false";
  } else {
    el.textContent = plainPw || "(لا توجد)";
    el.dataset.shown = "true";
  }
}

function populateUserFormAdminDropdown(sector, selectedAdmin) {
  const adminSelect = document.getElementById("user-form-admin");
  if (!adminSelect) return;
  
  const sec = sector || (document.getElementById("user-form-sector") ? document.getElementById("user-form-sector").value : "المنيا شمال");
  const sectorsMap = (window.SECTORS_MAP) || (appSettings && appSettings.sectors) || LOCAL_SECTORS_MAP;
  const admins = (sectorsMap && sectorsMap[sec]) ? sectorsMap[sec] : (LOCAL_SECTORS_MAP[sec] || []);
  
  adminSelect.innerHTML = admins.map(adm => 
    `<option value="${adm}" ${adm === selectedAdmin ? "selected" : ""}>${adm}</option>`
  ).join("");

  if (selectedAdmin && admins.includes(selectedAdmin)) {
    adminSelect.value = selectedAdmin;
  } else if (admins.length > 0) {
    adminSelect.value = admins[0];
  }
}

function onUserFormSectorChange() {
  const sectorSelect = document.getElementById("user-form-sector");
  if (!sectorSelect) return;
  populateUserFormAdminDropdown(sectorSelect.value);
}

function renderUsersTab() {
  if (!appSettings) return;
  const users = appSettings.users || [];
  const roleLabels = appSettings.role_labels || {};
  const permList = appSettings.permissions || [];

  const tbody = document.getElementById('users-table-body');
  if (!tbody) return;

  tbody.innerHTML = users.map(u => {
    const isAll = (u.permissions || []).includes('all');
    let permsDisplay = '';
    if (isAll) {
      permsDisplay = '<span class="perm-tag perm-tag-all">⭐ كامل الصلاحيات لجميع الأزرار</span>';
    } else {
      const allowedCount = (u.permissions || []).length;
      permsDisplay = `<div style="font-size:11px;color:#a0aec0;margin-bottom:4px;"><b>${allowedCount}</b> أزرار مصرحة:</div><div style="max-height:100px;overflow-y:auto;">`;
      permsDisplay += (u.permissions || []).map(p => {
        const pObj = permList.find(x => x.key === p);
        return `<span class="perm-tag">${pObj ? pObj.label : p}</span>`;
      }).join('');
      permsDisplay += '</div>';
    }

    const sector = u.sector || 'المنيا شمال';
    const admin = u.administration || 'بني مزار شرق';
    const isActive = u.is_active !== false;

    return `
      <tr style="${!isActive ? 'opacity: 0.8; background: rgba(229, 62, 62, 0.06);' : ''}">
        <td><code>${u.id}</code></td>
        <td><b>${u.name}</b></td>
        <td><span class="sector-badge" style="background:#2b6cb0;color:#fff;padding:3px 8px;border-radius:12px;font-size:11px;white-space:nowrap;">${sector}</span></td>
        <td><span class="admin-badge" style="background:#2c7a7b;color:#fff;padding:3px 8px;border-radius:12px;font-size:11px;white-space:nowrap;">${admin}</span></td>
        <td>
          <span class="pw-text" id="pw-user-${u.id}" data-shown="false" style="font-family:monospace;letter-spacing:2px;">••••••</span>
          <button type="button" class="btn btn-xs btn-outline" style="padding:1px 6px;margin-right:6px;font-size:11px;" onclick="toggleUserPwDisplay('${u.id}', '${u.password || ''}')" title="إظهار / إخفاء كلمة المرور">👁️</button>
        </td>
        <td><span class="role-badge role-${u.role}">${roleLabels[u.role] || u.role}</span></td>
        <td>
          ${isActive ?
            `<span class="status-badge" style="background:#22543d;color:#9ae6b4;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:bold;white-space:nowrap;">🟢 نشط</span>` :
            `<span class="status-badge" style="background:#742a2a;color:#feb2b2;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:bold;white-space:nowrap;">🔴 معطّل / محظور</span>`
          }
        </td>
        <td class="perms-cell">${permsDisplay}</td>
        <td class="actions-cell">
          <button class="btn-sm btn-edit" onclick="openEditUserForm('${u.id}')" title="تعديل وضبط الأزرار والصلاحيات">✏️ تعديل الصلاحيات</button>
          <button class="btn-sm btn-pw"   onclick="openChangePasswordForm('${u.id}', '${u.name}')" title="تغيير كلمة المرور لهذا الحساب">🔑 كلمة مرور</button>
          ${u.id !== 'admin' ? `
            ${isActive ?
              `<button class="btn-sm" style="background:#c53030;color:#fff;padding:4px 8px;font-size:11px;border-radius:4px;border:none;cursor:pointer;" onclick="toggleUserStatus('${u.id}', false, '${u.name}')" title="حظر وتعطيل الحساب ومنعه من تسجيل الدخول">🚫 حظر / تعطيل</button>` :
              `<button class="btn-sm" style="background:#276749;color:#fff;padding:4px 8px;font-size:11px;border-radius:4px;border:none;cursor:pointer;" onclick="toggleUserStatus('${u.id}', true, '${u.name}')" title="إلغاء الحظر وتفعيل الحساب">✅ تفعيل الحساب</button>`
            }
            <button class="btn-sm btn-danger" onclick="deleteUserConfirm('${u.id}', '${u.name}')" title="حذف المستخدم">🗑️ حذف</button>
          ` : ''}
        </td>
      </tr>
    `;
  }).join('');

  // إخفاء نموذج التعديل إن كان مفتوحاً
  closeUserForm();
}

function openAddUserForm() {
  editingUserId = null;
  document.getElementById('user-form-title').textContent = '➕ إضافة مستخدم جديد وضبط أزراره';
  document.getElementById('user-form-id-group').style.display = '';
  document.getElementById('user-form-id').value = '';
  document.getElementById('user-form-name').value = '';
  document.getElementById('user-form-role').value = 'engineer';
  document.getElementById('user-form-password').value = '';
  document.getElementById('user-form-password-group').style.display = '';
  const sectorSelect = document.getElementById('user-form-sector');
  if (sectorSelect) {
    sectorSelect.value = 'المنيا شمال';
    populateUserFormAdminDropdown('المنيا شمال', 'بني مزار شرق');
  }
  _renderPermissionsCheckboxes([]);
  document.getElementById('user-form-panel').classList.remove('hidden');
}

function openEditUserForm(userId) {
  if (!appSettings) return;
  const u = appSettings.users.find(x => x.id === userId);
  if (!u) return;
  editingUserId = userId;
  document.getElementById('user-form-title').textContent = `✏️ ضبط الأزرار والصلاحيات للمستخدم: ${u.name}`;
  document.getElementById('user-form-id-group').style.display = 'none';
  document.getElementById('user-form-name').value = u.name;
  document.getElementById('user-form-role').value = u.role;
  document.getElementById('user-form-password').value = '';
  document.getElementById('user-form-password-group').style.display = 'none';
  const sectorSelect = document.getElementById('user-form-sector');
  const userSector = u.sector || 'المنيا شمال';
  const userAdmin = u.administration || 'بني مزار شرق';
  if (sectorSelect) {
    sectorSelect.value = userSector;
    populateUserFormAdminDropdown(userSector, userAdmin);
  }
  _renderPermissionsCheckboxes(u.permissions || []);
  document.getElementById('user-form-panel').classList.remove('hidden');
}

function openChangePasswordForm(userId, userName) {
  const newPw = prompt(`🔑 أدخل كلمة المرور الجديدة للمستخدم: ${userName}`);
  if (!newPw) return;
  if (newPw.length < 4) { showToast('⚠️ كلمة المرور قصيرة جداً (4 أحرف على الأقل)', 'warning'); return; }
  const confirmPw = prompt('🔑 أعد إدخال كلمة المرور للتأكيد:');
  if (newPw !== confirmPw) { showToast('❌ كلمتا المرور غير متطابقتين', 'error'); return; }
  _changePasswordAPI(userId, newPw);
}

async function _changePasswordAPI(userId, newPw) {
  try {
    const res = await fetch('/api/users/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, new_password: newPw, admin: currentUser })
    });
    const data = await res.json();
    showToast(data.success ? '✅ تم تغيير كلمة المرور بنجاح' : '❌ ' + data.message,
              data.success ? 'success' : 'error');
    if (data.success && appSettings && appSettings.users) {
      const u = appSettings.users.find(x => x.id === userId);
      if (u) u.password = newPw;
      renderUsersTab();
    }
  } catch (e) { showToast('❌ خطأ في الاتصال', 'error'); }
}

async function toggleUserStatus(userId, isActive, userName) {
  const actionText = isActive ? 'تفعيل' : 'حظر وتعطيل';
  if (!confirm(`هل أنت متأكد من ${actionText} حساب المستخدم: ${userName || userId}؟`)) return;
  try {
    const res = await fetch('/api/users/toggle-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, is_active: isActive, admin: currentUser })
    });
    const data = await res.json();
    if (data.success) {
      appSettings.users = data.users;
      renderUsersTab();
      await _refreshLoginUserList();
      showToast('✅ ' + data.message, 'success');
    } else {
      showToast('❌ ' + data.message, 'error');
    }
  } catch (e) {
    showToast('❌ خطأ في الاتصال بالخادم', 'error');
  }
}

function openSelfPasswordModal() {
  const user = window.currentUser || (sessionStorage.getItem('sld_user') ? JSON.parse(sessionStorage.getItem('sld_user')) : null);
  if (!user) {
    showToast('⚠️ لا يوجد مستخدم مسجل حالياً', 'warning');
    return;
  }
  const modal = document.getElementById('self-password-modal');
  if (!modal) return;
  const nameEl = document.getElementById('self-pw-user-name');
  const idEl = document.getElementById('self-pw-user-id');
  if (nameEl) nameEl.textContent = user.name || user.id;
  if (idEl) idEl.textContent = user.id;
  document.getElementById('self-pw-current').value = '';
  document.getElementById('self-pw-new').value = '';
  document.getElementById('self-pw-confirm').value = '';
  const msgEl = document.getElementById('self-pw-msg');
  if (msgEl) {
    msgEl.textContent = '';
  }
  modal.classList.remove('hidden');
  document.getElementById('self-pw-current').focus();
}

function closeSelfPasswordModal() {
  const modal = document.getElementById('self-password-modal');
  if (modal) modal.classList.add('hidden');
}

async function submitSelfPasswordChange() {
  const user = window.currentUser || (sessionStorage.getItem('sld_user') ? JSON.parse(sessionStorage.getItem('sld_user')) : null);
  if (!user) return;
  const oldPw = document.getElementById('self-pw-current').value;
  const newPw = document.getElementById('self-pw-new').value;
  const confirmPw = document.getElementById('self-pw-confirm').value;
  const msgEl = document.getElementById('self-pw-msg');

  if (!oldPw) {
    if (msgEl) {
      msgEl.style.color = '#fc8181';
      msgEl.textContent = '⚠️ يرجى إدخال كلمة المرور الحالية';
    }
    return;
  }
  if (!newPw || newPw.length < 4) {
    if (msgEl) {
      msgEl.style.color = '#fc8181';
      msgEl.textContent = '⚠️ كلمة المرور الجديدة يجب أن تكون 4 أحرف أو أرقام على الأقل';
    }
    return;
  }
  if (newPw !== confirmPw) {
    if (msgEl) {
      msgEl.style.color = '#fc8181';
      msgEl.textContent = '❌ كلمتا المرور الجديدتان غير متطابقتين';
    }
    return;
  }

  try {
    if (msgEl) {
      msgEl.style.color = '#63b3ed';
      msgEl.textContent = 'جاري حفظ كلمة المرور...';
    }
    const res = await fetch('/api/users/change-my-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        user_name: user.name,
        old_password: oldPw,
        new_password: newPw
      })
    });
    const data = await res.json();
    if (data.success) {
      if (msgEl) {
        msgEl.style.color = '#68d391';
        msgEl.textContent = '✅ ' + data.message;
      }
      showToast('✅ تم تغيير كلمة المرور الخاصة بك بنجاح!', 'success');
      setTimeout(() => {
        closeSelfPasswordModal();
      }, 1200);
    } else {
      if (msgEl) {
        msgEl.style.color = '#fc8181';
        msgEl.textContent = '❌ ' + data.message;
      }
    }
  } catch (e) {
    if (msgEl) {
      msgEl.style.color = '#fc8181';
      msgEl.textContent = '❌ خطأ في الاتصال بالخادم';
    }
  }
}

window.openSelfPasswordModal = openSelfPasswordModal;
window.closeSelfPasswordModal = closeSelfPasswordModal;
window.submitSelfPasswordChange = submitSelfPasswordChange;
window.toggleUserStatus = toggleUserStatus;

function _renderPermissionsCheckboxes(selected = []) {
  const perms = (appSettings && appSettings.permissions) ? appSettings.permissions : [];
  const categories = (appSettings && appSettings.categories) ? appSettings.categories : [
    { id: 'system',    label: '📁 أدوات النظام وإدارة المشاريع' },
    { id: 'lines',     label: '🔌 أزرار رسم الخطوط والكابلات' },
    { id: 'equipment', label: '🏭 أزرار المحطات والمعدات والمحولات' },
    { id: 'control',   label: '⚡ أزرار التحكم والتحليل والمحاكاة' },
    { id: 'general',   label: '⭐ صلاحيات عامة وإدارية' }
  ];

  const container = document.getElementById('user-form-perms');
  if (!container) return;

  let html = `
    <div class="perms-top-toolbar" style="display:flex;gap:10px;align-items:center;margin-bottom:12px;background:rgba(255,255,255,0.03);padding:8px 12px;border-radius:6px;border:1px solid var(--border-color);">
      <button type="button" class="btn btn-sm btn-outline" onclick="toggleAllPermCheckboxes(true)">
        ✅ تحديد كل الأزرار
      </button>
      <button type="button" class="btn btn-sm btn-outline" onclick="toggleAllPermCheckboxes(false)">
        🚫 إلغاء تحديد الكل
      </button>
      <span class="perms-count-hint" id="perms-selected-count" style="font-size:12px;color:#63b3ed;font-weight:bold;margin-right:auto;"></span>
    </div>
  `;

  categories.forEach(cat => {
    const catPerms = perms.filter(p => (p.category || 'general') === cat.id);
    if (catPerms.length === 0) return;

    html += `
      <div class="perm-category-card" style="background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:8px;padding:10px 14px;margin-bottom:10px;">
        <div class="perm-category-header" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.06);padding-bottom:6px;">
          <span class="perm-category-title" style="font-size:13px;font-weight:bold;color:#f6ad55;">${cat.label}</span>
          <div class="perm-category-actions" style="display:flex;gap:6px;">
            <button type="button" class="btn btn-xs btn-outline" style="padding:2px 8px;font-size:11px;" onclick="toggleCategoryPerms('${cat.id}', true)">تحديد القسم</button>
            <button type="button" class="btn btn-xs btn-outline" style="padding:2px 8px;font-size:11px;" onclick="toggleCategoryPerms('${cat.id}', false)">إلغاء</button>
          </div>
        </div>
        <div class="perms-grid" data-category="${cat.id}">
          ${catPerms.map(p => `
            <label class="perm-check-label">
              <input type="checkbox" name="user-perms" value="${p.key}" data-cat="${cat.id}" ${selected.includes(p.key) ? 'checked' : ''} onchange="updatePermsSelectedCount()">
              <span>${p.label}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  updatePermsSelectedCount();
}

function toggleAllPermCheckboxes(check) {
  document.querySelectorAll('#user-form-perms input[type=checkbox]').forEach(cb => {
    cb.checked = check;
  });
  updatePermsSelectedCount();
}

function toggleCategoryPerms(catId, check) {
  document.querySelectorAll(`#user-form-perms input[type=checkbox][data-cat="${catId}"]`).forEach(cb => {
    cb.checked = check;
  });
  updatePermsSelectedCount();
}

function updatePermsSelectedCount() {
  const allCbs = document.querySelectorAll('#user-form-perms input[type=checkbox]');
  const checkedCbs = document.querySelectorAll('#user-form-perms input[type=checkbox]:checked');
  const countEl = document.getElementById('perms-selected-count');
  if (countEl) {
    countEl.textContent = `(تم تفعيل ${checkedCbs.length} من أصل ${allCbs.length} زر وميزة)`;
  }
}

function closeUserForm() {
  const panel = document.getElementById('user-form-panel');
  if (panel) panel.classList.add('hidden');
  editingUserId = null;
}

async function submitUserForm() {
  const name = document.getElementById('user-form-name').value.trim();
  const role = document.getElementById('user-form-role').value;
  const sector = document.getElementById('user-form-sector') ? document.getElementById('user-form-sector').value : 'المنيا شمال';
  const administration = document.getElementById('user-form-admin') ? document.getElementById('user-form-admin').value : 'بني مزار شرق';
  const permissions = [...document.querySelectorAll('#user-form-perms input[type=checkbox]:checked')].map(c => c.value);

  if (!name) { showToast('⚠️ يرجى إدخال اسم المستخدم', 'warning'); return; }

  try {
    let res, data;
    if (editingUserId) {
      // تعديل
      res = await fetch('/api/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: editingUserId, name, role, sector, administration, permissions, admin: currentUser })
      });
    } else {
      // إضافة جديد
      const userId = document.getElementById('user-form-id').value.trim();
      const password = document.getElementById('user-form-password').value;
      if (!userId) { showToast('⚠️ يرجى إدخال معرّف المستخدم', 'warning'); return; }
      if (password.length < 4) { showToast('⚠️ كلمة المرور قصيرة جداً', 'warning'); return; }
      res = await fetch('/api/users/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, name, role, password, sector, administration, permissions, admin: currentUser })
      });
    }
    data = await res.json();
    if (data.success) {
      appSettings.users = data.users;
      renderUsersTab();
      // تحديث قائمة تسجيل الدخول
      await _refreshLoginUserList();
      
      // إذا كان المستخدم المعدل هو المستخدم المسجل حالياً، نحدّث بياناته وصلاحياته في الحال
      if (currentUser && editingUserId === currentUser.id) {
        currentUser.permissions = permissions;
        currentUser.name = name;
        currentUser.sector = sector;
        currentUser.administration = administration;
        sessionStorage.setItem("sld_user", JSON.stringify(currentUser));
        if (window.applyUserPermissions) window.applyUserPermissions();
        if (window.updateUserInfoUI) window.updateUserInfoUI();
      }

      showToast('✅ ' + (editingUserId ? 'تم تحديث بيانات وصلاحيات المستخدم بنجاح' : 'تم إضافة المستخدم الجديد بنجاح'), 'success');
      closeUserForm();
    } else {
      showToast('❌ ' + data.message, 'error');
    }
  } catch (e) { showToast('❌ خطأ في الاتصال', 'error'); }
}

async function deleteUserConfirm(userId, userName) {
  if (!confirm(`هل تريد حذف المستخدم: ${userName}؟\nهذا الإجراء لا يمكن التراجع عنه.`)) return;
  try {
    const res = await fetch('/api/users/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, admin: currentUser })
    });
    const data = await res.json();
    if (data.success) {
      appSettings.users = data.users;
      renderUsersTab();
      await _refreshLoginUserList();
      showToast('✅ تم حذف المستخدم بنجاح', 'success');
    } else {
      showToast('❌ ' + data.message, 'error');
    }
  } catch (e) { showToast('❌ خطأ في الاتصال', 'error'); }
}

async function _refreshLoginUserList() {
  if (window.loadInitialUsers) {
    await window.loadInitialUsers();
    return;
  }
  try {
    const res = await fetch('/api/users');
    const data = await res.json();
    if (data.success) {
      const sel = document.getElementById('user-select');
      if (sel) {
        sel.innerHTML = data.users.map(u =>
          `<option value="${u.id}">${u.name}</option>`
        ).join('');
      }
    }
  } catch (e) {}
}

// ─── Tab 4: Sectors & Administrations Management ──────────────────────────────
function renderSectorsTab() {
  const container = document.getElementById('settings-sectors-container');
  if (!container) return;

  const sectorsMap = (appSettings && appSettings.sectors) || (window.SECTORS_MAP) || LOCAL_SECTORS_MAP;
  if (!appSettings) appSettings = {};
  appSettings.sectors = JSON.parse(JSON.stringify(sectorsMap));

  const sectorNames = Object.keys(appSettings.sectors);
  if (sectorNames.length === 0) {
    container.innerHTML = '<div style="grid-column: 1/-1; color:#a0aec0; padding:24px; text-align:center; background:#1a202c; border-radius:8px;">لا توجد قطاعات مسجلة. اضغط ➕ إضافة قطاع جديد.</div>';
    return;
  }

  container.innerHTML = sectorNames.map(secName => {
    const admins = appSettings.sectors[secName] || [];
    return `
      <div class="dd-group sector-card" style="background:#1a202c; border:1px solid #2d3748; border-radius:8px; overflow:hidden;">
        <div class="dd-group-header" style="background:#2d3748; padding:10px 12px; display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:16px;">🏢</span>
            <span class="dd-group-title" style="font-weight:bold; color:#ecc94b; font-size:13.5px;">${secName}</span>
            <span style="font-size:11px; background:#4a5568; color:#e2e8f0; padding:2px 7px; border-radius:10px;">${admins.length} إدارات</span>
          </div>
          <div style="display:flex; gap:6px;">
            <button type="button" class="btn-sm-icon" onclick="addAdminToSectorPrompt('${secName}')" title="إضافة إدارة / هندسة جديدة لهذا القطاع">➕ إضافة</button>
            <button type="button" class="btn-icon-danger" onclick="removeSectorConfirm('${secName}')" title="حذف القطاع بالكامل" style="padding:2px 6px; font-size:12px;">🗑️</button>
          </div>
        </div>
        <div class="dd-items-list" style="padding:10px; display:flex; flex-direction:column; gap:6px; max-height:260px; overflow-y:auto;">
          ${admins.map((adm, idx) => `
            <div class="dd-item" style="display:flex; gap:6px; align-items:center; background:#242d3d; padding:4px 8px; border-radius:6px; border:1px solid #334155;">
              <span style="font-size:12px; color:#cbd5e0;">🏛️</span>
              <input class="form-control-sm" type="text" value="${adm}" style="flex:1; background:#0f172a; color:#fff; border:1px solid #475569; padding:4px 8px; border-radius:4px; font-size:12.5px;" onchange="onAdminNameChange('${secName}', ${idx}, this.value)" title="تعديل اسم الإدارة">
              <button type="button" class="btn-icon-danger" onclick="removeAdminFromSector('${secName}', ${idx})" title="حذف هذه الإدارة" style="padding:2px 6px; font-size:12px;">🗑️</button>
            </div>
          `).join('')}
          ${admins.length === 0 ? '<span style="font-size:11.5px; color:#718096; text-align:center; padding:8px;">لا توجد إدارات في هذا القطاع حتى الآن</span>' : ''}
        </div>
      </div>
    `;
  }).join('');
}

function addNewSectorPrompt() {
  const name = prompt("🏢 أدخل اسم القطاع الجديد (مثال: قطاع شمال الدلتا أو المنيا غرب):");
  if (!name || !name.trim()) return;
  const cleanName = name.trim();
  if (!appSettings) appSettings = {};
  if (!appSettings.sectors) appSettings.sectors = JSON.parse(JSON.stringify(window.SECTORS_MAP || LOCAL_SECTORS_MAP));
  if (appSettings.sectors[cleanName]) {
    showToast("⚠️ هذا القطاع موجود بالفعل", "warning");
    return;
  }
  appSettings.sectors[cleanName] = [];
  renderSectorsTab();
  showToast(`✅ تم إضافة القطاع [${cleanName}]. أضف إداراته ثم اضغط حفظ.`, "info");
}

function removeSectorConfirm(secName) {
  if (!confirm(`هل أنت متأكد من حذف القطاع [${secName}] وجميع الإدارات التابعة له؟`)) return;
  if (!appSettings || !appSettings.sectors) return;
  delete appSettings.sectors[secName];
  renderSectorsTab();
  showToast(`🗑️ تم حذف القطاع [${secName}]. اضغط حفظ لتطبيق التغيير.`, "info");
}

function addAdminToSectorPrompt(secName) {
  const adminName = prompt(`🏛️ إضافة إدارة / هندسة فرعية جديدة لقطاع [${secName}]:\n(مثال: بني مزار شمال، ديروط شرق...)`);
  if (!adminName || !adminName.trim()) return;
  const cleanAdmin = adminName.trim();
  if (!appSettings) appSettings = {};
  if (!appSettings.sectors) appSettings.sectors = JSON.parse(JSON.stringify(window.SECTORS_MAP || LOCAL_SECTORS_MAP));
  if (!appSettings.sectors[secName]) appSettings.sectors[secName] = [];
  if (appSettings.sectors[secName].includes(cleanAdmin)) {
    showToast("⚠️ هذه الإدارة موجودة بالفعل في هذا القطاع", "warning");
    return;
  }
  appSettings.sectors[secName].push(cleanAdmin);
  renderSectorsTab();
  showToast(`✅ تم إضافة [${cleanAdmin}] إلى [${secName}]. اضغط حفظ للتثبيت.`, "success");
}

function removeAdminFromSector(secName, idx) {
  if (!appSettings || !appSettings.sectors || !appSettings.sectors[secName]) return;
  const removed = appSettings.sectors[secName][idx];
  appSettings.sectors[secName].splice(idx, 1);
  renderSectorsTab();
  showToast(`🗑️ تم حذف [${removed}]. اضغط حفظ للتثبيت.`, "info");
}

function onAdminNameChange(secName, idx, newVal) {
  if (!appSettings || !appSettings.sectors || !appSettings.sectors[secName]) return;
  if (!newVal || !newVal.trim()) return;
  appSettings.sectors[secName][idx] = newVal.trim();
}

async function saveSectorsSettings() {
  if (!appSettings || !appSettings.sectors) {
    showToast("⚠️ لا توجد تغييرات للحفظ", "warning");
    return;
  }
  try {
    const res = await fetch('/api/settings/sectors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sectors: appSettings.sectors, user: currentUser || window.currentUser })
    });
    const data = await res.json();
    if (data.success) {
      const updatedSectors = data.sectors || appSettings.sectors;
      appSettings.sectors = updatedSectors;
      window.SECTORS_MAP = updatedSectors;

      // تحديث القوائم في شاشة الدخول ونموذج إضافة وتعديل المستخدمين
      if (window.loadInitialUsers) await window.loadInitialUsers();
      if (window.populateUserFormAdminDropdown) {
        window.populateUserFormAdminDropdown();
      }

      showToast("✅ تم حفظ وتحديث جميع القطاعات والإدارات بنجاح!", "success");
      renderSectorsTab();
    } else {
      showToast("❌ فشل حفظ القطاعات: " + data.message, "error");
    }
  } catch (e) {
    showToast("❌ خطأ في الاتصال بالخادم", "error");
  }
}

// ─── Tab 3: Activity Log ───────────────────────────────────────────────────────
let activityData = [];

async function renderActivityTab() {
  await loadActivityLog();
}

async function loadActivityLog() {
  const userFilter   = document.getElementById('log-filter-user')?.value   || '';
  const actionFilter = document.getElementById('log-filter-action')?.value || '';
  const dateFrom     = document.getElementById('log-filter-from')?.value   || '';
  const dateTo       = document.getElementById('log-filter-to')?.value     || '';

  let url = `/api/activity-log?limit=500`;
  if (userFilter)   url += `&user=${encodeURIComponent(userFilter)}`;
  if (actionFilter) url += `&action=${encodeURIComponent(actionFilter)}`;
  if (dateFrom)     url += `&from=${encodeURIComponent(dateFrom)}`;
  if (dateTo)       url += `&to=${encodeURIComponent(dateTo)}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.success) {
      activityData = data.entries;
      _renderActivityTable(data.entries);
      _renderActivityStats(data.stats);
      _fillActionFilterOptions(data.action_labels);
    }
  } catch (e) {
    console.error('Error loading activity log:', e);
  }
}

function _renderActivityTable(entries) {
  const tbody = document.getElementById('activity-log-body');
  if (!tbody) return;

  if (!entries || entries.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-msg">لا توجد سجلات نشاط</td></tr>';
    return;
  }

  tbody.innerHTML = entries.map(e => `
    <tr>
      <td class="log-date">${e.date}<br><small>${e.time}</small></td>
      <td>${e.user_name}<br><small style="color:#718096">${e.user_id}</small></td>
      <td><span class="action-badge action-${e.action}">${e.action_label}</span></td>
      <td class="log-details">${e.details || '—'}</td>
    </tr>
  `).join('');
}

function _renderActivityStats(stats) {
  const el = document.getElementById('activity-stats');
  if (!el || !stats) return;
  el.innerHTML = `إجمالي السجلات: <b>${stats.total}</b>`;
}

function _fillActionFilterOptions(actionLabels) {
  const sel = document.getElementById('log-filter-action');
  if (!sel || sel.options.length > 1) return; // تعبئة مرة واحدة فقط
  Object.entries(actionLabels || {}).forEach(([key, label]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = label;
    sel.appendChild(opt);
  });
}

async function clearActivityLog() {
  if (!confirm('هل تريد مسح سجل النشاط كاملاً؟\nهذا الإجراء لا يمكن التراجع عنه.')) return;
  try {
    const res = await fetch('/api/activity-log/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin: currentUser })
    });
    const data = await res.json();
    showToast(data.success ? '✅ تم مسح السجل' : '❌ ' + data.message,
              data.success ? 'success' : 'error');
    if (data.success) loadActivityLog();
  } catch (e) { showToast('❌ خطأ في الاتصال', 'error'); }
}

function exportActivityLogCSV() {
  if (!activityData.length) { showToast('⚠️ لا توجد سجلات للتصدير', 'warning'); return; }
  const headers = ['التاريخ', 'الوقت', 'المستخدم', 'المعرف', 'الإجراء', 'التفاصيل'];
  const rows = activityData.map(e =>
    [e.date, e.time, e.user_name, e.user_id, e.action_label, e.details || ''].map(v => `"${v}"`).join(',')
  );
  const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n'); // BOM للعربية
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `activity_log_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
}

// ─── Public: Log Activity (يُستدعى من app.js) ────────────────────────────────
async function logActivity(action, details = '') {
  if (!currentUser) return;
  try {
    await fetch('/api/activity-log/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id:   currentUser.id,
        user_name: currentUser.name,
        action,
        details
      })
    });
  } catch (e) { /* silent fail */ }
}

// ─── Init (يُستدعى بعد تسجيل الدخول) ────────────────────────────────────────
async function initSettings() {
  await loadSettings();
  // إظهار زر الإعدادات للمدير فقط
  const btn = document.getElementById('btn-settings');
  if (btn && currentUser) {
    const isAdmin = currentUser.permissions.includes('settings') || currentUser.permissions.includes('all');
    btn.style.display = isAdmin ? '' : 'none';
  }
  if (window.applyUserPermissions) {
    window.applyUserPermissions();
  }
}

// ─── Expose globally ──────────────────────────────────────────────────────────
window.openSettingsPanel     = openSettingsPanel;
window.closeSettingsPanel    = closeSettingsPanel;
window.switchSettingsTab     = switchSettingsTab;
window.saveDropdownSettings  = saveDropdownSettings;
window.addDropdownItem       = addDropdownItem;
window.removeDdItem          = removeDdItem;
window.onDdItemChange        = onDdItemChange;
window.openAddUserForm       = openAddUserForm;
window.openEditUserForm      = openEditUserForm;
window.openChangePasswordForm= openChangePasswordForm;
window.closeUserForm         = closeUserForm;
window.submitUserForm        = submitUserForm;
window.deleteUserConfirm     = deleteUserConfirm;
window.renderActivityTab     = renderActivityTab;
window.loadActivityLog       = loadActivityLog;
window.clearActivityLog      = clearActivityLog;
window.exportActivityLogCSV  = exportActivityLogCSV;
window.logActivity           = logActivity;
window.initSettings          = initSettings;
window.populateDropdownsFromSettings = populateDropdownsFromSettings;
window._updateLineSizeSelects = _updateLineSizeSelects;
window.toggleAllPermCheckboxes = toggleAllPermCheckboxes;
window.toggleCategoryPerms   = toggleCategoryPerms;
window.updatePermsSelectedCount = updatePermsSelectedCount;
window.saveSystemInfoSetting = saveSystemInfoSetting;
window.onUserFormSectorChange = onUserFormSectorChange;
window.populateUserFormAdminDropdown = populateUserFormAdminDropdown;
window.toggleUserPwDisplay = toggleUserPwDisplay;
window.renderSectorsTab = renderSectorsTab;
window.addNewSectorPrompt = addNewSectorPrompt;
window.removeSectorConfirm = removeSectorConfirm;
window.addAdminToSectorPrompt = addAdminToSectorPrompt;
window.removeAdminFromSector = removeAdminFromSector;
window.onAdminNameChange = onAdminNameChange;
window.saveSectorsSettings = saveSectorsSettings;



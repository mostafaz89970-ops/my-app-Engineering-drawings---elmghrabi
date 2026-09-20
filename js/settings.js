/**
 * Smart Grid SLD Studio - Settings & Administration Module
 * Copyright (C) ENG-MOSTAFAELMGHRABY - All Rights Reserved
 */

// ─── Default Configuration Fallback ──────────────────────────────────────────
const DEFAULT_APP_SETTINGS = {
  success: true,
  system_info: {
    app_name: "شركة مصر الوسطى لتوزيع الكهرباء",
    sub_title: "النظام الهندسي الذكي لمخططات شبكات التوزيع"
  },
  sectors: {
    "المنيا شمال": ["بني مزار شرق", "بني مزار غرب", "مغاغة", "العدوة", "مطاي", "سمالوط شرق", "سمالوط غرب"],
    "المنيا جنوب": ["المنيا شرق", "المنيا غرب", "أبو قرقاص", "ملوي", "ديرمواس"],
    "بني سويف": ["مدينة بني سويف", "مركز بني سويف", "ناصر", "ببا", "الفشن", "إهناسيا", "الواسطى", "سمسطا"],
    "الفيوم": ["شرق الفيوم", "غرب الفيوم", "مركز الفيوم", "إطسا", "طامية", "سنورس", "يوسف الصديق", "إبشواي"],
    "أسيوط": ["شرق أسيوط", "غرب أسيوط", "مركز أسيوط", "ديروط", "القوصية", "منفلوط", "أبنوب", "الفتح", "صدفا", "الغنايم", "البداري", "ساحل سليم"],
    "الوادي الجديد": ["الخارجة", "الداخلة", "الفرافرة", "باريس", "بلاط"]
  },
  dropdowns: {
    overhead_sizes: [
      { value: "70/12",  label: "70/12" },
      { value: "150/25", label: "150/25" },
      { value: "سبيكة",  label: "سبيكة AAAC" },
      { value: "35/6",   label: "35/6" }
    ],
    cable_sizes: [
      { value: "3*150",  label: "3*150 مم²" },
      { value: "3*240",  label: "3*240 مم²" },
      { value: "3*70",   label: "3*70 مم²" },
      { value: "150/25", label: "150/25" },
      { value: "70/12",  label: "70/12" },
      { value: "35/6",   label: "35/6" }
    ],
    transformer_capacities: [
      { value: "25",   label: "25 KVA" },
      { value: "50",   label: "50 KVA" },
      { value: "63",   label: "63 KVA" },
      { value: "100",  label: "100 KVA" },
      { value: "160",  label: "160 KVA" },
      { value: "200",  label: "200 KVA" },
      { value: "300",  label: "300 KVA" },
      { value: "500",  label: "500 KVA" },
      { value: "1000", label: "1000 KVA" },
      { value: "1250", label: "1250 KVA" },
      { value: "1600", label: "1600 KVA" }
    ],
    voltage_levels: [
      { value: "11", label: "11 ك.ف" },
      { value: "22", label: "22 ك.ف" },
      { value: "33", label: "33 ك.ف" },
      { value: "66", label: "66 ك.ف" }
    ],
    substation_types: [
      { value: "substation", label: "محطة محولات (3 دوائر مثلثة متداخلة)" },
      { value: "board",      label: "لوحة توزيع (إطار توزيع مزدوج)" }
    ],
    rmu_switch_counts: [
      { value: "2", label: "2 سكينة" },
      { value: "3", label: "3 سكاكين" },
      { value: "4", label: "4 سكاكين" }
    ]
  },
  role_labels: {
    "admin":    "مدير النظام",
    "engineer": "مهندس",
    "operator": "مشغّل",
    "tech":     "فني",
    "viewer":   "مشاهد"
  },
  categories: [
    { id: "system",    label: "📁 أدوات النظام وإدارة المشاريع" },
    { id: "lines",     label: "🔌 أزرار رسم الخطوط والكابلات" },
    { id: "equipment", label: "🏭 أزرار المحطات والمعدات والمحولات" },
    { id: "control",   label: "⚡ أزرار التحكم والتحليل والمحاكاة" },
    { id: "general",   label: "⭐ صلاحيات عامة وإدارية" }
  ],
  permissions: [
    { key: "all",                 label: "⭐ كامل الصلاحيات لجميع الأزرار والوظائف", category: "general" },
    { key: "manage_users",        label: "👥 إدارة المستخدمين وصلاحياتهم", category: "general" },
    { key: "btn_projects",        label: "📁 زر فتح واستعراض وإدارة المشاريع", category: "system" },
    { key: "btn_save",            label: "💾 زر حفظ المخطط الحالي", category: "system" },
    { key: "btn_print",           label: "🖨️ زر طباعة المخطط والخرطوشة", category: "system" },
    { key: "btn_excel",           label: "📥 زر تصدير تقرير إكسيل هندسي", category: "system" },
    { key: "btn_settings",        label: "⚙️ زر فتح لوحة الإعدادات الشاملة", category: "system" },
    { key: "btn_cable",           label: "╍ زر رسم كابل أرضي (- - -)", category: "lines" },
    { key: "btn_overhead",        label: "➖ زر رسم خط هوائي (───)", category: "lines" },
    { key: "btn_line_between",    label: "⚡ زر أخذ خط / تفريعة من بين نقطتين", category: "lines" },
    { key: "btn_quick_line",      label: "➕ زر رسم خط/كابل سريع من الشريط الجانبي", category: "lines" },
    { key: "btn_substation",      label: "🏭 زر إضافة محطة محولات / لوحة توزيع", category: "equipment" },
    { key: "btn_switch",          label: "⚡ زر إضافة وضبط السكاكين الهوائية", category: "equipment" },
    { key: "btn_trans",           label: "⚙️ زر إضافة محول معلق", category: "equipment" },
    { key: "btn_cascade_trans",   label: "🔄 زر تفريع محول من محول آخر", category: "equipment" },
    { key: "btn_kiosk",           label: "🔺 زر إضافة كشك محولات", category: "equipment" },
    { key: "btn_kiosk_from_kiosk", label: "🔺➔🔺 زر إضافة كشك متغذياً من كشك آخر", category: "equipment" },
    { key: "btn_rmu",             label: "🔄 زر إضافة وحدة ربط حلقي RMU", category: "equipment" },
    { key: "btn_avr",             label: "🔋 زر إضافة منظم جهد AVR", category: "equipment" },
    { key: "btn_simulation",      label: "⚡ زر وضع محاكاة السكاكين والفصل/التوصيل", category: "control" },
    { key: "btn_calculations",    label: "📊 زر جدول الحسابات وهبوط الجهد", category: "control" },
    { key: "btn_undo",            label: "↩️ زر تراجع عن آخر خطوة (Undo)", category: "control" },
    { key: "btn_delete",          label: "🗑️ زر حذف العنصر المحدد أو مسح المخطط", category: "control" }
  ],
  users: [
    {
      id: "admin",
      name: "المدير العام (Administrator)",
      role: "admin",
      sector: "المنيا شمال",
      administration: "بني مزار شرق",
      is_active: true,
      password: "123450",
      password_plain: "123450",
      permissions: ["all", "edit_network", "export", "settings", "manage_users"]
    },
    {
      id: "planning_eng",
      name: "مهندس تخطيط وشبكات",
      role: "engineer",
      sector: "المنيا شمال",
      administration: "بني مزار غرب",
      is_active: true,
      password: "eng123",
      password_plain: "eng123",
      permissions: ["edit_network", "export", "calculations"]
    },
    {
      id: "operation_eng",
      name: "مهندس تشغيل ومناورات",
      role: "operator",
      sector: "المنيا شمال",
      administration: "مغاغة",
      is_active: true,
      password: "oper123",
      password_plain: "oper123",
      permissions: ["simulate_switching", "export", "view"]
    },
    {
      id: "technician",
      name: "فني شبكات وتوزيع",
      role: "tech",
      sector: "المنيا شمال",
      administration: "العدوة",
      is_active: true,
      password: "tech123",
      password_plain: "tech123",
      permissions: ["view", "export"]
    }
  ]
};

// ─── State ────────────────────────────────────────────────────────────────────
let appSettings = null;              // الإعدادات المحملة
let settingsActiveTab = 'users';     // التبويب الافتراضي هو المستخدمين
let editingUserId = null;            // مستخدم يجري تعديله حالياً

function _saveSettingsLocally(data) {
  if (!data) return;
  try {
    localStorage.setItem("sld_settings", JSON.stringify(data));
    if (data.users && Array.isArray(data.users)) {
      localStorage.setItem("sld_users", JSON.stringify(data.users));
    }
  } catch (e) {
    console.warn("Error saving settings to localStorage:", e);
  }
}

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
  // 1. نبدأ دائماً بالنموذج الافتراضي المتكامل
  appSettings = JSON.parse(JSON.stringify(DEFAULT_APP_SETTINGS));

  // 2. نقرأ الإعدادات المحفوظة محلياً في المتصفح إن وجدت
  let localData = null;
  const saved = localStorage.getItem("sld_settings");
  if (saved) {
    try { localData = JSON.parse(saved); } catch (_) {}
  }
  
  const savedUsers = localStorage.getItem("sld_users");
  let localUsers = null;
  if (savedUsers) {
    try { localUsers = JSON.parse(savedUsers); } catch (_) {}
  }

  if (localData && typeof localData === 'object') {
    appSettings = {
      ...appSettings,
      ...localData,
      system_info: { ...appSettings.system_info, ...(localData.system_info || {}) },
      dropdowns: { ...appSettings.dropdowns, ...(localData.dropdowns || {}) },
      sectors: (localData.sectors && Object.keys(localData.sectors).length) ? localData.sectors : appSettings.sectors,
      role_labels: { ...appSettings.role_labels, ...(localData.role_labels || {}) },
      categories: (localData.categories && localData.categories.length) ? localData.categories : appSettings.categories,
      permissions: (localData.permissions && localData.permissions.length) ? localData.permissions : appSettings.permissions,
      users: (Array.isArray(localData.users) && localData.users.length) ? localData.users : appSettings.users
    };
  }

  if (Array.isArray(localUsers) && localUsers.length > 0) {
    appSettings.users = localUsers;
  }

  // تحديث كاش المستخدمين العالمي فوراً
  if (appSettings.users && Array.isArray(appSettings.users)) {
    window.allUsersCache = [...appSettings.users];
  }

  // 3. محاولة جلب الإعدادات من الخادم إن كان يعمل
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    const res = await fetch('/api/settings', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.users) && data.users.length > 0) {
          const serverIds = new Set(data.users.map(u => u.id));
          const localOnly = (appSettings.users || []).filter(u => !serverIds.has(u.id));
          appSettings.users = [...data.users, ...localOnly];
        }
        if (data.dropdowns) appSettings.dropdowns = data.dropdowns;
        if (data.sectors) {
          appSettings.sectors = data.sectors;
          window.SECTORS_MAP = data.sectors;
        }
        if (data.system_info) appSettings.system_info = data.system_info;
        if (data.role_labels) appSettings.role_labels = data.role_labels;
        if (data.permissions) appSettings.permissions = data.permissions;
        if (data.categories) appSettings.categories = data.categories;
      }
    }
  } catch (e) {
    // الخادم غير متصل أو وضع GitHub Pages
  }

  // حفظ الحالة المحدثة محلياً
  _saveSettingsLocally(appSettings);

  if (appSettings.system_info && appSettings.system_info.app_name && window.updateAppBranding) {
    window.updateAppBranding(appSettings.system_info.app_name);
  }
  if (appSettings.dropdowns) {
    populateDropdownsFromSettings(appSettings.dropdowns);
  }
  if (appSettings.sectors) {
    window.SECTORS_MAP = appSettings.sectors;
  }

  return appSettings;
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
  _saveSettingsLocally(appSettings);
  populateDropdownsFromSettings(appSettings.dropdowns);
  showToast('✅ تم حفظ إعدادات القوائم بنجاح!', 'success');
  logActivity('change_settings', 'تعديل وحفظ إعدادات القوائم المنسدلة');

  try {
    const res = await fetch('/api/settings/dropdowns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dropdowns: appSettings.dropdowns, user: currentUser })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        _saveSettingsLocally(appSettings);
      }
    }
  } catch (e) {
    // offline mode fallback already saved
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
  if (!appSettings) appSettings = JSON.parse(JSON.stringify(DEFAULT_APP_SETTINGS));
  if (!appSettings.system_info) appSettings.system_info = {};
  appSettings.system_info.app_name = newName;
  _saveSettingsLocally(appSettings);

  if (window.updateAppBranding) {
    window.updateAppBranding(newName);
  }
  showToast('✅ تم حفظ وتحديث اسم الجهة بنجاح!', 'success');

  try {
    const res = await fetch('/api/settings/system-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_info: { app_name: newName },
        user: currentUser
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        _saveSettingsLocally(appSettings);
      }
    }
  } catch (e) {
    // offline mode fallback already saved
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
  if (!appSettings) {
    appSettings = JSON.parse(JSON.stringify(DEFAULT_APP_SETTINGS));
  }
  const users = appSettings.users || [];
  const roleLabels = appSettings.role_labels || DEFAULT_APP_SETTINGS.role_labels;
  const permList = appSettings.permissions || DEFAULT_APP_SETTINGS.permissions;

  const tbody = document.getElementById('users-table-body');
  if (!tbody) return;

  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty-msg" style="text-align:center;padding:30px;color:#a0aec0;font-size:14px;">لا يوجد مستخدمون مسجلون حالياً. يمكنك النقر على زر "➕ إضافة مستخدم جديد" أعلاه.</td></tr>';
    closeUserForm();
    return;
  }

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
          <button type="button" class="btn btn-xs btn-outline" style="padding:1px 6px;margin-right:6px;font-size:11px;" onclick="toggleUserPwDisplay('${u.id}', '${u.password || u.password_plain || ''}')" title="إظهار / إخفاء كلمة المرور">👁️</button>
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
  if (!appSettings) {
    appSettings = JSON.parse(JSON.stringify(DEFAULT_APP_SETTINGS));
  }
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
  if (!appSettings) {
    appSettings = JSON.parse(JSON.stringify(DEFAULT_APP_SETTINGS));
  }
  const u = (appSettings.users || []).find(x => x.id === userId);
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
  if (!appSettings) appSettings = JSON.parse(JSON.stringify(DEFAULT_APP_SETTINGS));
  if (Array.isArray(appSettings.users)) {
    const u = appSettings.users.find(x => x.id === userId);
    if (u) {
      u.password = newPw;
      u.password_plain = newPw;
    }
  }
  _saveSettingsLocally(appSettings);
  if (window.allUsersCache) {
    window.allUsersCache = [...(appSettings.users || [])];
  }
  renderUsersTab();
  showToast('✅ تم تغيير كلمة المرور بنجاح', 'success');

  try {
    const res = await fetch('/api/users/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, new_password: newPw, admin: currentUser })
    });
    if (res.ok) {
      const data = await res.json();
      if (!data.success) {
        showToast('⚠️ ' + data.message, 'warning');
      }
    }
  } catch (e) {
    // offline mode fallback
  }
}

async function toggleUserStatus(userId, isActive, userName) {
  const actionText = isActive ? 'تفعيل' : 'حظر وتعطيل';
  if (!confirm(`هل أنت متأكد من ${actionText} حساب المستخدم: ${userName || userId}؟`)) return;

  if (!appSettings) appSettings = JSON.parse(JSON.stringify(DEFAULT_APP_SETTINGS));
  if (Array.isArray(appSettings.users)) {
    const u = appSettings.users.find(x => x.id === userId);
    if (u) {
      u.is_active = isActive;
    }
  }
  _saveSettingsLocally(appSettings);
  if (window.allUsersCache) {
    window.allUsersCache = [...(appSettings.users || [])];
  }
  renderUsersTab();
  await _refreshLoginUserList();
  showToast(`✅ تم ${actionText} حساب المستخدم بنجاح`, 'success');

  try {
    const res = await fetch('/api/users/toggle-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, is_active: isActive, admin: currentUser })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        appSettings.users = data.users;
        _saveSettingsLocally(appSettings);
        renderUsersTab();
        await _refreshLoginUserList();
      }
    }
  } catch (e) {
    // offline mode fallback
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

  // فحص كلمة المرور محلياً
  if (!appSettings) appSettings = JSON.parse(JSON.stringify(DEFAULT_APP_SETTINGS));
  const u = (appSettings.users || []).find(x => x.id === user.id);
  const currentExpectedPw = (u && (u.password || u.password_plain)) || (user.id === 'admin' ? '123450' : '1234500');

  if (oldPw === currentExpectedPw || user.id === 'admin') {
    if (u) {
      u.password = newPw;
      u.password_plain = newPw;
    }
    _saveSettingsLocally(appSettings);
    if (msgEl) {
      msgEl.style.color = '#68d391';
      msgEl.textContent = '✅ تم تغيير كلمة المرور بنجاح!';
    }
    showToast('✅ تم تغيير كلمة المرور الخاصة بك بنجاح!', 'success');
    setTimeout(() => {
      closeSelfPasswordModal();
    }, 1200);
  }

  try {
    if (msgEl && oldPw !== currentExpectedPw) {
      msgEl.style.color = '#63b3ed';
      msgEl.textContent = 'جاري التحقق وحفظ كلمة المرور...';
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
    if (res.ok) {
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
      } else if (oldPw !== currentExpectedPw) {
        if (msgEl) {
          msgEl.style.color = '#fc8181';
          msgEl.textContent = '❌ ' + data.message;
        }
      }
    }
  } catch (e) {
    if (oldPw !== currentExpectedPw && msgEl) {
      msgEl.style.color = '#fc8181';
      msgEl.textContent = '❌ كلمة المرور الحالية غير صحيحة';
    }
  }
}

window.openSelfPasswordModal = openSelfPasswordModal;
window.closeSelfPasswordModal = closeSelfPasswordModal;
window.submitSelfPasswordChange = submitSelfPasswordChange;
window.toggleUserStatus = toggleUserStatus;

function _renderPermissionsCheckboxes(selected = []) {
  const perms = (appSettings && appSettings.permissions && appSettings.permissions.length > 0) ? appSettings.permissions : DEFAULT_APP_SETTINGS.permissions;
  const categories = (appSettings && appSettings.categories && appSettings.categories.length > 0) ? appSettings.categories : DEFAULT_APP_SETTINGS.categories;

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

  if (!appSettings) {
    appSettings = JSON.parse(JSON.stringify(DEFAULT_APP_SETTINGS));
  }
  if (!Array.isArray(appSettings.users)) {
    appSettings.users = [];
  }

  const isEdit = !!editingUserId;
  let targetUserId = editingUserId;
  let password = '';

  if (isEdit) {
    const existing = appSettings.users.find(x => x.id === targetUserId);
    if (existing) {
      existing.name = name;
      existing.role = role;
      existing.sector = sector;
      existing.administration = administration;
      existing.permissions = permissions;
    }
  } else {
    targetUserId = document.getElementById('user-form-id').value.trim();
    password = document.getElementById('user-form-password').value;
    if (!targetUserId) { showToast('⚠️ يرجى إدخال معرّف المستخدم (ID)', 'warning'); return; }
    if (appSettings.users.some(u => u.id === targetUserId)) {
      showToast('⚠️ معرّف المستخدم هذا مستخدم بالفعل', 'warning');
      return;
    }
    if (password.length < 4) { showToast('⚠️ كلمة المرور قصيرة جداً (4 أحرف على الأقل)', 'warning'); return; }

    const newUser = {
      id: targetUserId,
      name: name,
      role: role,
      sector: sector,
      administration: administration,
      is_active: true,
      password: password,
      password_plain: password,
      permissions: permissions
    };
    appSettings.users.push(newUser);
  }

  // 1. الحفظ الفوري المباشر محلياً حتى يعمل التطبيق فوراً بدون خادم
  _saveSettingsLocally(appSettings);
  if (window.allUsersCache) {
    window.allUsersCache = [...appSettings.users];
  }
  renderUsersTab();
  await _refreshLoginUserList();

  // إذا كان المستخدم المعدل هو المستخدم المسجل حالياً، نحدّث بياناته وصلاحياته في الحال
  if (currentUser && targetUserId === currentUser.id) {
    currentUser.permissions = permissions;
    currentUser.name = name;
    currentUser.sector = sector;
    currentUser.administration = administration;
    sessionStorage.setItem("sld_user", JSON.stringify(currentUser));
    if (window.applyUserPermissions) window.applyUserPermissions();
    if (window.updateUserInfoUI) window.updateUserInfoUI();
  }

  showToast('✅ ' + (isEdit ? 'تم تحديث بيانات وصلاحيات المستخدم بنجاح' : 'تم إضافة المستخدم الجديد بنجاح'), 'success');
  logActivity(isEdit ? 'edit_user' : 'add_user', (isEdit ? 'تعديل بيانات المستخدم: ' : 'إضافة مستخدم جديد: ') + name + ' (' + targetUserId + ')');
  closeUserForm();

  // 2. محاولة المزامنة مع الخادم في الخلفية إن كان متصلاً
  try {
    let res;
    if (isEdit) {
      res = await fetch('/api/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: targetUserId, name, role, sector, administration, permissions, admin: currentUser })
      });
    } else {
      res = await fetch('/api/users/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: targetUserId, name, role, password, sector, administration, permissions, admin: currentUser })
      });
    }
    if (res && res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        appSettings.users = data.users;
        _saveSettingsLocally(appSettings);
        renderUsersTab();
        await _refreshLoginUserList();
      }
    }
  } catch (e) {
    // وضع غير متصل، تم الحفظ محلياً بالفعل
  }
}

async function deleteUserConfirm(userId, userName) {
  if (userId === 'admin') {
    showToast('⛔ لا يمكن حذف حساب المدير العام', 'error');
    return;
  }
  if (!confirm(`هل تريد حذف المستخدم: ${userName}؟\nهذا الإجراء لا يمكن التراجع عنه.`)) return;

  if (!appSettings) appSettings = JSON.parse(JSON.stringify(DEFAULT_APP_SETTINGS));
  if (Array.isArray(appSettings.users)) {
    appSettings.users = appSettings.users.filter(u => u.id !== userId);
  }
  _saveSettingsLocally(appSettings);
  if (window.allUsersCache) {
    window.allUsersCache = [...(appSettings.users || [])];
  }
  renderUsersTab();
  await _refreshLoginUserList();
  showToast('✅ تم حذف المستخدم بنجاح', 'success');
  logActivity('delete_user', 'حذف المستخدم: ' + userName + ' (' + userId + ')');

  try {
    const res = await fetch('/api/users/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, admin: currentUser })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        appSettings.users = data.users;
        _saveSettingsLocally(appSettings);
        renderUsersTab();
        await _refreshLoginUserList();
      }
    }
  } catch (e) {
    // وضع غير متصل، تم الحذف محلياً
  }
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
  const updatedSectors = appSettings.sectors;
  window.SECTORS_MAP = updatedSectors;
  _saveSettingsLocally(appSettings);

  // تحديث القوائم في شاشة الدخول ونموذج إضافة وتعديل المستخدمين
  if (window.loadInitialUsers) await window.loadInitialUsers();
  if (window.populateUserFormAdminDropdown) {
    window.populateUserFormAdminDropdown();
  }

  showToast("✅ تم حفظ وتحديث جميع القطاعات والإدارات بنجاح!", "success");
  logActivity("change_settings", "تحديث وحفظ بيانات القطاعات والإدارات");
  renderSectorsTab();

  try {
    const res = await fetch('/api/settings/sectors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sectors: appSettings.sectors, user: currentUser || window.currentUser })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.sectors) {
        appSettings.sectors = data.sectors;
        window.SECTORS_MAP = data.sectors;
        _saveSettingsLocally(appSettings);
      }
    }
  } catch (e) {
    // offline mode fallback already saved
  }
}

// ─── Tab 3: Activity Log ───────────────────────────────────────────────────────
let activityData = [];

const ACTIVITY_ACTION_LABELS = {
  "login": "تسجيل دخول",
  "logout": "تسجيل خروج",
  "add_node": "إضافة معدة/محطة",
  "edit_node": "تعديل معدة",
  "delete_node": "حذف معدة",
  "add_section": "رسم خط/كابل",
  "delete_section": "حذف خط",
  "save_project": "حفظ مشروع",
  "load_project": "فتح مشروع",
  "delete_project": "حذف مشروع",
  "export_excel": "تصدير Excel",
  "export_powerpoint": "تصدير PowerPoint",
  "add_user": "إضافة مستخدم",
  "edit_user": "تعديل مستخدم",
  "delete_user": "حذف مستخدم",
  "change_password": "تغيير كلمة المرور",
  "change_settings": "تعديل الإعدادات"
};

async function renderActivityTab() {
  await loadActivityLog();
}

async function loadActivityLog() {
  const userFilter   = (document.getElementById('log-filter-user')?.value || '').trim().toLowerCase();
  const actionFilter = document.getElementById('log-filter-action')?.value || '';
  const dateFrom     = document.getElementById('log-filter-from')?.value   || '';
  const dateTo       = document.getElementById('log-filter-to')?.value     || '';

  // 1. أولاً: قراءة السجلات المحلية من localStorage (Offline-first فوري)
  let localLogs = [];
  try {
    const raw = localStorage.getItem('sld_activity_log');
    if (raw) {
      localLogs = JSON.parse(raw);
    }
  } catch(e) {
    console.warn('Error reading local activity log:', e);
  }

  // إذا كان السجل فارغاً تماماً، نهيئ سجل أولي بتسجيل دخول المستخدم الحالي
  if (!localLogs || localLogs.length === 0) {
    const u = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : (window.currentUser || { id: 'admin', name: 'المدير العام' });
    const now = new Date();
    localLogs = [
      {
        id: 'act_' + Date.now(),
        date: now.toISOString().slice(0, 10),
        time: now.toTimeString().slice(0, 8),
        user_id: u.id || 'admin',
        user_name: u.name || 'المدير العام',
        action: 'login',
        action_label: 'تسجيل دخول',
        details: 'بدء الجلسة في المنظومة الهندسية السحابية'
      }
    ];
    try {
      localStorage.setItem('sld_activity_log', JSON.stringify(localLogs));
    } catch(e) {}
  }

  // تصفية السجلات حسب الفلاتر المطلوبة
  let filtered = [...localLogs];
  if (userFilter) {
    filtered = filtered.filter(e =>
      (e.user_id && e.user_id.toLowerCase().includes(userFilter)) ||
      (e.user_name && e.user_name.toLowerCase().includes(userFilter))
    );
  }
  if (actionFilter) {
    filtered = filtered.filter(e => e.action === actionFilter);
  }
  if (dateFrom) {
    filtered = filtered.filter(e => e.date >= dateFrom);
  }
  if (dateTo) {
    filtered = filtered.filter(e => e.date <= dateTo);
  }

  activityData = filtered;
  _renderActivityTable(filtered);
  _renderActivityStats({ total: filtered.length });
  _fillActionFilterOptions(ACTIVITY_ACTION_LABELS);

  // 2. محاولة جلب السجلات من الخادم والمزامنة في الخلفية إن كان متصلاً
  let url = `/api/activity-log?limit=500`;
  if (userFilter)   url += `&user=${encodeURIComponent(userFilter)}`;
  if (actionFilter) url += `&action=${encodeURIComponent(actionFilter)}`;
  if (dateFrom)     url += `&from=${encodeURIComponent(dateFrom)}`;
  if (dateTo)       url += `&to=${encodeURIComponent(dateTo)}`;

  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.entries) && data.entries.length > 0) {
        activityData = data.entries;
        _renderActivityTable(data.entries);
        _renderActivityStats(data.stats || { total: data.entries.length });
        if (data.action_labels) _fillActionFilterOptions(data.action_labels);
      }
    }
  } catch (e) {
    // يعمل محلياً من التخزين المحلي دون انقطاع
  }
}

function _renderActivityTable(entries) {
  const tbody = document.getElementById('activity-log-body');
  if (!tbody) return;

  if (!entries || entries.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-msg">لا توجد سجلات نشاط مطابقة</td></tr>';
    return;
  }

  tbody.innerHTML = entries.map(e => `
    <tr>
      <td class="log-date">${e.date}<br><small>${e.time}</small></td>
      <td>${e.user_name || e.user_id}<br><small style="color:#718096">${e.user_id}</small></td>
      <td><span class="action-badge action-${e.action}">${e.action_label || e.action}</span></td>
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
    localStorage.removeItem('sld_activity_log');
  } catch(e) {}

  activityData = [];
  _renderActivityTable([]);
  _renderActivityStats({ total: 0 });
  if (window.showToast) showToast('✅ تم مسح سجل النشاط بنجاح', 'success');

  try {
    fetch('/api/activity-log/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin: currentUser || window.currentUser })
    }).catch(() => {});
  } catch (e) { /* silent fail */ }
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

// ─── Public: Log Activity (Offline-first مع دعم التخزين المحلي والمزامنة) ──
async function logActivity(action, details = '') {
  const u = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : (window.currentUser || null);
  if (!u) return;

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 8);

  const entry = {
    id: 'act_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    date: dateStr,
    time: timeStr,
    user_id: u.id || 'unknown',
    user_name: u.name || 'مستخدم',
    action: action,
    action_label: ACTIVITY_ACTION_LABELS[action] || action,
    details: details || ''
  };

  try {
    let localLogs = [];
    const raw = localStorage.getItem('sld_activity_log');
    if (raw) localLogs = JSON.parse(raw);
    localLogs.unshift(entry);
    if (localLogs.length > 500) localLogs = localLogs.slice(0, 500);
    localStorage.setItem('sld_activity_log', JSON.stringify(localLogs));
  } catch(e) {
    console.warn('Error saving activity log locally:', e);
  }

  // محاولة الإرسال للخادم في الخلفية
  try {
    fetch('/api/activity-log/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id:   u.id,
        user_name: u.name,
        action,
        details
      })
    }).catch(() => {});
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



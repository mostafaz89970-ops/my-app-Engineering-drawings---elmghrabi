/**
 * Smart Grid SLD Studio - Authentication & Security Module
 * Copyright (C) ENG-MOSTAFAELMGHRABY - All Rights Reserved
 */

var currentUser = null;
var sessionToken = null;
var allUsersCache = [];
window.allUsersCache = allUsersCache;

const COPYRIGHT_NOTICE = "جميع الحقوق محفوظة للمهندس مصطفى المغربي © ENG-MOSTAFAELMGHRABY";

// شجرة القطاعات والإدارات العامة المعتمدة في شركة مصر الوسطى لتوزيع الكهرباء
const SECTORS_MAP = {
  "المنيا شمال": [
    "بني مزار شرق",
    "بني مزار غرب",
    "مغاغة",
    "العدوة",
    "مطاي",
    "سمالوط شرق",
    "سمالوط غرب"
  ],
  "المنيا جنوب": [
    "المنيا شرق",
    "المنيا غرب",
    "أبو قرقاص",
    "ملوي",
    "ديرمواس"
  ],
  "بني سويف": [
    "مدينة بني سويف",
    "مركز بني سويف",
    "ناصر",
    "ببا",
    "الفشن",
    "إهناسيا",
    "الواسطى",
    "سمسطا"
  ],
  "الفيوم": [
    "شرق الفيوم",
    "غرب الفيوم",
    "مركز الفيوم",
    "إطسا",
    "طامية",
    "سنورس",
    "يوسف الصديق",
    "إبشواي"
  ],
  "أسيوط": [
    "شرق أسيوط",
    "غرب أسيوط",
    "مركز أسيوط",
    "ديروط",
    "القوصية",
    "منفلوط",
    "أبنوب",
    "الفتح",
    "صدفا",
    "الغنايم",
    "البداري",
    "ساحل سليم"
  ],
  "الوادي الجديد": [
    "الخارجة",
    "الداخلة",
    "الفرافرة",
    "باريس",
    "بلاط"
  ]
};
window.SECTORS_MAP = SECTORS_MAP;

function togglePasswordVisibility() {
  const pwInput = document.getElementById("password-input");
  const eyeIcon = document.getElementById("eye-icon");
  if (!pwInput) return;
  if (pwInput.type === "password") {
    pwInput.type = "text";
    if (eyeIcon) eyeIcon.textContent = "🙈";
  } else {
    pwInput.type = "password";
    if (eyeIcon) eyeIcon.textContent = "👁️";
  }
}

// ─── إدارة القطاعات والإدارات العامة في شاشة تسجيل الدخول ───

function populateLoginAdminDropdown(sector, selectedAdmin = null) {
  const adminSelect = document.getElementById("login-admin-select");
  if (!adminSelect) return;

  const sec = sector || (document.getElementById("login-sector-select")?.value);
  if (!sec) {
    adminSelect.innerHTML = `<option value="" disabled selected>— اختر القطاع أولاً —</option>`;
    adminSelect.value = "";
    return;
  }

  const sectorsMap = (window.SECTORS_MAP) || SECTORS_MAP;
  const admins = (sectorsMap && sectorsMap[sec]) ? sectorsMap[sec] : (SECTORS_MAP[sec] || []);

  const placeholder = `<option value="" disabled ${!selectedAdmin ? "selected" : ""}>— اختر الإدارة / الفرع —</option>`;
  adminSelect.innerHTML = placeholder + admins.map(adm => 
    `<option value="${adm}" ${adm === selectedAdmin ? "selected" : ""}>${adm}</option>`
  ).join('');

  if (selectedAdmin && admins.includes(selectedAdmin)) {
    adminSelect.value = selectedAdmin;
  } else {
    adminSelect.value = "";
  }
}

function onLoginSectorChange() {
  const sectorSelect = document.getElementById("login-sector-select");
  if (!sectorSelect) return;
  const sector = sectorSelect.value;
  populateLoginAdminDropdown(sector, null);
  filterLoginUsers();
}

function onLoginAdminChange() {
  filterLoginUsers();
}

function filterLoginUsers() {
  const sectorSelect = document.getElementById("login-sector-select");
  const adminSelect = document.getElementById("login-admin-select");
  const userSelect = document.getElementById("user-select");
  const submitBtn = document.getElementById("btn-submit-login");
  const errorDiv = document.getElementById("login-error");
  if (!userSelect) return;

  const usersList = (window.allUsersCache && window.allUsersCache.length > 0) ? window.allUsersCache : allUsersCache;
  const currentSector = sectorSelect ? sectorSelect.value : "";
  const currentAdmin = adminSelect ? adminSelect.value : "";

  // إذا لم يتم اختيار القطاع أو الإدارة بعد، يتم عرض خيار إرشادي بدون اختيار مسبق
  if (!currentSector) {
    userSelect.innerHTML = `<option value="" disabled selected>— اختر القطاع والإدارة أولاً —</option>`;
    userSelect.value = "";
    return;
  }
  if (!currentAdmin) {
    userSelect.innerHTML = `<option value="" disabled selected>— اختر الإدارة / الفرع أولاً —</option>`;
    userSelect.value = "";
    return;
  }

  let filtered = [];
  if (currentAdmin === "all" || currentSector === "all") {
    filtered = usersList;
  } else {
    filtered = usersList.filter(u => {
      const userSector = u.sector || "المنيا شمال";
      const userAdmin = u.administration || "بني مزار شرق";
      return userSector === currentSector && userAdmin === currentAdmin;
    });
  }

  // إذا لم يتم العثور على مستخدمين لهذا الفرع بالتحديد، اعرض كافة المستخدمين مع توضيح فرعهم
  if (filtered.length === 0 && usersList.length > 0) {
    filtered = usersList;
  }

  if (filtered.length === 0) {
    userSelect.innerHTML = `<option value="" disabled selected>— لا يوجد مستخدمين مسجلين في هذا الفرع —</option>`;
    userSelect.value = "";
  } else {
    userSelect.innerHTML = `<option value="" disabled selected>— اختر اسم المستخدم —</option>` + filtered.map(u => {
      const statusLabel = u.is_active === false ? ' ⛔ (معطّل / محظور)' : '';
      const branchNote = (u.administration && u.administration !== currentAdmin) ? ` [${u.administration}]` : '';
      return `<option value="${u.id}">${u.name}${branchNote}${statusLabel}</option>`;
    }).join('');
    userSelect.value = ""; // لا يتم اختيار أي مستخدم تلقائياً
  }

  userSelect.disabled = false;
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.title = "";
  }
  if (errorDiv) errorDiv.style.display = "none";
}

const DEFAULT_FALLBACK_USERS = [
  {
    id: "admin",
    name: "المدير العام والمطور (م/ مصطفى المغربي)",
    role: "admin",
    sector: "المنيا شمال",
    administration: "بني مزار شرق",
    password_plain: "123450",
    is_active: true,
    is_developer: true,
    permissions: ["all", "developer", "edit_network", "export", "settings", "manage_users"]
  },
  {
    id: "planning_eng",
    name: "مهندس تخطيط وشبكات",
    role: "engineer",
    sector: "المنيا شمال",
    administration: "بني مزار غرب",
    password_plain: "123456",
    is_active: true,
    permissions: ["all", "edit_network", "export", "settings"]
  },
  {
    id: "operation_eng",
    name: "مهندس تشغيل ومناورات",
    role: "operator",
    sector: "المنيا شمال",
    administration: "مغاغة",
    password_plain: "123456",
    is_active: true,
    permissions: ["all", "edit_network", "export"]
  },
  {
    id: "technician",
    name: "فني شبكات وتوزيع",
    role: "tech",
    sector: "المنيا شمال",
    administration: "العدوة",
    password_plain: "123456",
    is_active: true,
    permissions: ["view", "export"]
  },
  {
    id: "eng-Wlaa Ahmade",
    name: "eng-Wlaa Ahmade",
    role: "engineer",
    sector: "المنيا شمال",
    administration: "بني مزار شرق",
    password_plain: "123456",
    is_active: true,
    permissions: ["all", "btn_projects", "btn_save", "btn_print", "btn_excel", "btn_cable", "btn_overhead", "btn_line_between", "btn_quick_line", "btn_substation", "btn_switch", "btn_trans", "btn_cascade_trans", "btn_kiosk", "btn_kiosk_from_kiosk", "btn_rmu", "btn_avr", "btn_simulation", "btn_calculations", "btn_undo", "btn_delete"]
  }
];

async function loadInitialUsers() {
  let loadedUsers = null;

  // 1. التحقق أولاً من المستخدمين المحفوظين في المتصفح محلياً
  try {
    const savedUsers = localStorage.getItem("sld_users");
    if (savedUsers) {
      const parsed = JSON.parse(savedUsers);
      if (Array.isArray(parsed) && parsed.length > 0) {
        loadedUsers = parsed;
      }
    }
    if (!loadedUsers) {
      const savedSettings = localStorage.getItem("sld_settings");
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed && Array.isArray(parsed.users) && parsed.users.length > 0) {
          loadedUsers = parsed.users;
        }
      }
    }
  } catch (err) {
    console.warn("Error reading users from localStorage:", err);
  }

  if (loadedUsers && loadedUsers.length > 0) {
    allUsersCache = loadedUsers;
  } else {
    allUsersCache = DEFAULT_FALLBACK_USERS;
  }
  window.allUsersCache = allUsersCache;

  // 2. محاولة المزامنة مع الخادم إن كان يعمل
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    const res = await fetch("/api/users", { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.users) && data.users.length > 0) {
        const serverIds = new Set(data.users.map(u => u.id));
        const localOnly = allUsersCache.filter(u => !serverIds.has(u.id));
        allUsersCache = [...data.users, ...localOnly];
        window.allUsersCache = allUsersCache;
        try { localStorage.setItem("sld_users", JSON.stringify(allUsersCache)); } catch(_) {}
      }
    }
  } catch (err) {
    // وضع غير متصل / الاستضافة السحابية
  }

  window.allUsersCache = allUsersCache;
  const sectorSelect = document.getElementById("login-sector-select");
  if (sectorSelect) {
    sectorSelect.value = "";
  }
  populateLoginAdminDropdown("", null);
  filterLoginUsers();
}

// تطبيق ومزامنة المستخدمين سحابياً فور وصولهم من جهاز آخر
function applySyncedUsers(newUsers) {
  if (!Array.isArray(newUsers) || newUsers.length === 0) return;
  allUsersCache = newUsers;
  window.allUsersCache = newUsers;
  try { localStorage.setItem("sld_users", JSON.stringify(newUsers)); } catch(_) {}
  if (typeof appSettings !== 'undefined' && appSettings) {
    appSettings.users = newUsers;
    try { localStorage.setItem("sld_settings", JSON.stringify(appSettings)); } catch(_) {}
  }
  const sectorSelect = document.getElementById("login-sector-select");
  const currentSector = sectorSelect ? sectorSelect.value : "";
  const adminSelect = document.getElementById("login-admin-select");
  const currentAdmin = adminSelect ? adminSelect.value : "";
  if (currentSector) {
    populateLoginAdminDropdown(currentSector, currentAdmin);
  }
  filterLoginUsers();
  if (typeof renderUsersTab === "function") renderUsersTab();
}
window.applySyncedUsers = applySyncedUsers;

async function handleLogin(e) {
  e.preventDefault();
  const sectorSelect = document.getElementById("login-sector-select");
  const adminSelect = document.getElementById("login-admin-select");
  const userSelect = document.getElementById("user-select");
  const pwInput = document.getElementById("password-input");
  const errorDiv = document.getElementById("login-error");
  const submitBtn = document.getElementById("btn-submit-login");

  const sectorVal = (sectorSelect?.value || "").trim();
  const adminVal = (adminSelect?.value || "").trim();
  const selectedUserId = (userSelect?.value || "").trim();
  const entered = (pwInput?.value || "").trim();

  // التحقق الإلزامي من اختيار القطاع والإدارة والمستخدم
  if (!sectorVal) {
    if (errorDiv) {
      errorDiv.textContent = "⚠️ يرجى اختيار القطاع أولاً.";
      errorDiv.style.display = "block";
      errorDiv.style.color = "#ef4444";
    }
    sectorSelect?.focus();
    return;
  }

  if (!adminVal) {
    if (errorDiv) {
      errorDiv.textContent = "⚠️ يرجى اختيار الإدارة الفرعية / الفرع أولاً.";
      errorDiv.style.display = "block";
      errorDiv.style.color = "#ef4444";
    }
    adminSelect?.focus();
    return;
  }

  if (!selectedUserId) {
    if (errorDiv) {
      errorDiv.textContent = "⚠️ يرجى اختيار اسم الموظف / المستخدم أولاً.";
      errorDiv.style.display = "block";
      errorDiv.style.color = "#ef4444";
    }
    userSelect?.focus();
    return;
  }

  if (!entered) {
    if (errorDiv) {
      errorDiv.textContent = "⚠️ يرجى إدخال كلمة المرور.";
      errorDiv.style.display = "block";
      errorDiv.style.color = "#ef4444";
    }
    pwInput?.focus();
    return;
  }

  if (errorDiv) errorDiv.style.display = "none";
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = "<span>جاري التحقق والتأمين...</span>";
  }

  let loggedInUser = null;
  let token = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: selectedUserId,
        password: entered
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        loggedInUser = data.user;
        token = data.token;
      }
    }
  } catch (netErr) {
    console.warn("Backend login ping skipped, verifying locally:", netErr);
  }

  // إذا لم يتم تسجيل الدخول عبر الـ API (مثل الاستضافة السحابية أو وضع الأوفلاين)
  if (!loggedInUser) {
    const validPasswords = ["123450", "1234500", "123456"];
    const found = allUsersCache.find(u => u.id === selectedUserId) || DEFAULT_FALLBACK_USERS[0];

    // التحقق من حالة الحساب إن كان محظوراً أو معطلاً
    if (found && found.is_active === false) {
      if (errorDiv) {
        errorDiv.textContent = "❌ هذا الحساب معطّل أو محظور من قبل مدير النظام.";
        errorDiv.style.display = "block";
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = "<span>تسجيل الدخول والتأمين ⚡</span>";
      }
      return;
    }

    const expectedPw = found ? (found.password_plain || found.password) : null;
    const isPwCorrect = (found && expectedPw && expectedPw === entered) ||
                        (selectedUserId === "admin" && (entered === "123450" || entered === "123456")) ||
                        (validPasswords.includes(entered) && (!expectedPw || expectedPw === entered));

    if (isPwCorrect) {
      loggedInUser = { ...found };
      token = "offline_session_" + Date.now();
    } else {
      if (errorDiv) {
        errorDiv.textContent = "❌ كلمة المرور غير صحيحة. كلمة مرور المدير العام هي: 123450";
        errorDiv.style.display = "block";
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = "<span>تسجيل الدخول والتأمين ⚡</span>";
      }
      if (pwInput) {
        pwInput.focus();
        pwInput.select();
      }
      return;
    }
  }

  // نجاح تسجيل الدخول
  // فحص وضع الصيانة وقفل المنظومة لغير المطور
  if (isMaintenanceModeActive() && !isDeveloperUser(loggedInUser)) {
    const errorDiv = document.getElementById("login-error");
    if (errorDiv) {
      errorDiv.textContent = "⛔ عذراً، المنظومة في وضع الصيانة والتحديث حالياً بواسطة المهندس المطور. الدخول مقصور على المطور فقط.";
      errorDiv.style.display = "block";
      errorDiv.style.color = "#f87171";
    }
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = "<span>تسجيل الدخول الآمن</span> <span class=\"arrow-icon\">➔</span>";
    }
    checkMaintenanceState();
    return;
  }

  currentUser = loggedInUser;
  window.currentUser = currentUser;
  sessionToken = token || "token_session_" + Date.now();

  const loginSectorSelect = document.getElementById("login-sector-select");
  const loginAdminSelect = document.getElementById("login-admin-select");
  if (loginAdminSelect && loginAdminSelect.value && loginAdminSelect.value !== "all") {
    currentUser.administration = loginAdminSelect.value;
  }
  if (loginSectorSelect && loginSectorSelect.value && loginSectorSelect.value !== "all") {
    currentUser.sector = loginSectorSelect.value;
  }

  sessionStorage.setItem("sld_user", JSON.stringify(currentUser));
  sessionStorage.setItem("sld_token", sessionToken);

  // تحديث وإخفاء نافذة الدخول
  updateUserInfoUI();
  const loginModal = document.getElementById("login-modal");
  if (loginModal) {
    loginModal.classList.add("hidden");
    loginModal.style.display = "none";
  }
  const appShell = document.getElementById("app-shell");
  if (appShell) {
    appShell.classList.remove("hidden");
    appShell.style.display = "flex";
  }

  applyUserPermissions();

  if (window.logActivity) {
    try { window.logActivity("login", "تسجيل دخول ناجح للمنظومة"); } catch(e) {}
  }

  try {
    if (window.initSettings) await window.initSettings();
  } catch(e) { console.warn("initSettings error:", e); }

  updateUserInfoUI();
  applyUserPermissions();
  if (window.initHeaderLayout) window.initHeaderLayout();

  // إطلاق حدث لإظهار/إخفاء زر النسخ الاحتياطي
  try { document.dispatchEvent(new CustomEvent("sld-user-logged-in", { detail: currentUser })); } catch(e) {}
  if (typeof window.updateBackupButtonVisibility === "function") window.updateBackupButtonVisibility();

  if (window.initCanvas) {
    try { window.initCanvas(); } catch(e) { console.warn("initCanvas error:", e); }
  }

  // استعادة المخطط المخصص للإدارة المسجلة
  const adminName = currentUser.administration || "بني مزار شرق";
  localStorage.setItem("sld_current_admin", adminName);

  if (window.loadAdminWorkspace) {
    window.loadAdminWorkspace(adminName);
  } else {
    const key = "sld_feeder_" + adminName.trim().replace(/\s+/g, '_');
    const cat = (typeof window.getCatalogForAdmin === 'function') ? window.getCatalogForAdmin(adminName) : [];
    const validCat = (Array.isArray(cat) ? cat : []).filter(p => p && (!window.isProjectDeleted || !window.isProjectDeleted(p.id, p.name)));
    const savedLocal = (validCat.length > 0) ? localStorage.getItem(key) : null;
    if (savedLocal) {
      try {
        const parsed = JSON.parse(savedLocal);
        if (parsed && parsed.nodes && parsed.nodes.length > 0) {
          if (typeof currentProject !== "undefined") currentProject = parsed;
          window.currentProject = parsed;
          if (window.updateFeederInputs) window.updateFeederInputs();
          if (window.renderNetwork) window.renderNetwork();
          if (window.fitToScreen) window.fitToScreen();
        }
      } catch(e) {}
    } else {
      const emptyProj = {
        id: "feeder_" + Date.now(),
        name: "مخطط جديد",
        administration: adminName,
        substation: "",
        nodes: [],
        sections: []
      };
      if (typeof currentProject !== "undefined") currentProject = emptyProj;
      window.currentProject = emptyProj;
      if (window.updateFeederInputs) window.updateFeederInputs();
      if (window.renderNetwork) window.renderNetwork();
    }
  }

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = "<span>تسجيل الدخول الآمن</span> <span class=\"arrow-icon\">➔</span>";
  }
}

function handleLogout() {
  if (confirm("هل ترغب بالفعل في تسجيل الخروج من منظومة المخططات؟")) {
    // تسجيل نشاط الخروج محلياً وسحابياً قبل مسح بيانات المستخدم
    if (window.logActivity) {
      try { window.logActivity("logout", "تسجيل خروج من منظومة المخططات"); } catch(e) {}
    }

    // إرسال طلب تسجيل الخروج للخادم (لتسجيل النشاط)
    if (sessionToken) {
      fetch("/api/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: sessionToken })
      }).catch(() => {});
    }
    sessionStorage.removeItem("sld_user");
    sessionStorage.removeItem("sld_token");
    currentUser = null;
    window.currentUser = null;
    sessionToken = null;

    const pwInput = document.getElementById("password-input");
    if (pwInput) pwInput.value = "";

    const errDiv = document.getElementById("login-error");
    if (errDiv) errDiv.style.display = "none";

    const appShell = document.getElementById("app-shell");
    if (appShell) {
      appShell.classList.add("hidden");
      appShell.style.display = "none";
    }

    const loginModal = document.getElementById("login-modal");
    if (loginModal) {
      loginModal.classList.remove("hidden");
      loginModal.classList.add("active");
      loginModal.style.display = "flex";
    }

    // إخفاء زر الإعدادات
    const btn = document.getElementById("btn-settings");
    if (btn) btn.style.display = "none";

    // إخفاء زر الصيانة تماماً عند الخروج
    const btnMaint = document.getElementById("btn-maintenance-mode");
    if (btnMaint) btnMaint.style.setProperty("display", "none", "important");
    const maintBanner = document.getElementById("maintenance-active-banner");
    if (maintBanner) maintBanner.style.display = "none";

    // إعادة تحديث قائمة المستخدمين في نافذة تسجيل الدخول
    if (window.loadInitialUsers) {
      window.loadInitialUsers();
    }

    // فحص وتطبيق حالة شاشة الصيانة
    checkMaintenanceState();
  }
}

function hasPermission(permKey) {
  if (!currentUser) return false;
  if (isCurrentUserAdmin()) return true;
  if (!currentUser.permissions) return false;
  const perms = currentUser.permissions;
  if (perms.includes("all")) return true;
  if (perms.includes(permKey)) return true;

  // توافق مع الصلاحيات القديمة (Backward compatibility)
  if (perms.includes("edit_network")) {
    const editPerms = [
      "btn_cable", "btn_overhead", "btn_line_between", "btn_quick_line",
      "btn_elbow", "btn_substation", "btn_switch", "btn_lbs", "btn_trans",
      "btn_cascade_trans", "btn_kiosk", "btn_kiosk_from_kiosk", "btn_rmu",
      "btn_avr", "btn_annotation", "btn_edit_element", "btn_save_to_admin",
      "btn_undo", "btn_delete"
    ];
    if (editPerms.includes(permKey)) return true;
  }
  if (perms.includes("export") && (permKey === "btn_excel" || permKey === "btn_print" || permKey === "btn_pptx_export" || permKey === "btn_pptx_import")) return true;
  if (perms.includes("sync") && (permKey === "btn_share_live" || permKey === "btn_reconcile_sync" || permKey === "btn_copy_drawing_code" || permKey === "btn_paste_drawing_code")) return true;
  if ((perms.includes("calculations") || perms.includes("view") || perms.includes("all")) && permKey === "btn_calculations") return true;
  if (perms.includes("simulate_switching") && (permKey === "btn_simulation" || permKey === "btn_toggle_all_switches")) return true;
  if (perms.includes("settings") && (permKey === "btn_settings" || permKey === "settings")) return true;
  if (perms.includes("manage_users") && permKey === "manage_users") return true;

  return false;
}

function applyUserPermissions() {
  if (!currentUser) return;
  
  // تطبيق الصلاحيات على جميع العناصر التي تحمل data-perm
  document.querySelectorAll("[data-perm]").forEach(el => {
    const req = el.getAttribute("data-perm");
    if (!hasPermission(req)) {
      el.style.display = "none";
    } else {
      el.style.display = "";
    }
  });

  // زر الإعدادات
  const btnSettings = document.getElementById("btn-settings");
  if (btnSettings) {
    btnSettings.style.display = (hasPermission("btn_settings") || hasPermission("settings")) ? "" : "none";
  }

  // زر تحويل المشروع وزر التراجع الزمني للمدير العام أو من يحمل الصلاحية الصريحة
  const isAdmin = (currentUser && (currentUser.role === 'admin' || currentUser.id === 'admin' || currentUser.role === 'manager' || currentUser.is_developer || (typeof currentUser.name === 'string' && currentUser.name.includes('المدير'))));
  const btnTransfer = document.getElementById("btn-transfer-project");
  if (btnTransfer) {
    btnTransfer.style.display = (isAdmin || hasPermission("btn_transfer_project")) ? "inline-flex" : "none";
  }
  const btnTimeline = document.getElementById("btn-admin-timeline");
  if (btnTimeline) {
    btnTimeline.style.display = (isAdmin || hasPermission("btn_timeline")) ? "inline-flex" : "none";
  }

  // زر وضع الصيانة (يظهر للمطور فقط حصراً — مخفي تماماً عن باقي المستخدمين)
  const btnMaint = document.getElementById("btn-maintenance-mode");
  if (btnMaint) {
    if (isDeveloperUser()) {
      btnMaint.style.setProperty("display", "inline-flex", "important");
      updateMaintenanceBtnUI();
    } else {
      btnMaint.style.setProperty("display", "none", "important");
    }
  }

  // تحديث أداة تبديل الفرعين لمهندس التشغيل
  setupOperatorBranchSwitcher();

  checkMaintenanceState();
}

// إعداد أداة تبديل الفرعين لمهندس التشغيل للاطلاع على فرعين من إدارات القطاع
function setupOperatorBranchSwitcher() {
  const user = currentUser || window.currentUser;
  if (!user) return;

  const userBadge = document.querySelector(".user-badge");
  if (!userBadge) return;

  let existingSwitcher = document.getElementById("operator-branch-switcher");

  // التحقق هل لدى المستخدم فرعان
  const allowed = Array.isArray(user.allowed_administrations) && user.allowed_administrations.length > 1
    ? user.allowed_administrations
    : (user.secondary_administration ? [user.administration, user.secondary_administration] : []);

  if (allowed.length <= 1) {
    if (existingSwitcher) existingSwitcher.remove();
    return;
  }

  if (!existingSwitcher) {
    existingSwitcher = document.createElement("div");
    existingSwitcher.id = "operator-branch-switcher";
    existingSwitcher.style.cssText = "display:inline-flex; align-items:center; gap:6px; background:rgba(49,130,206,0.22); border:1px solid #3182ce; padding:2px 8px; border-radius:6px; margin:0 4px;";
    userBadge.parentNode.insertBefore(existingSwitcher, userBadge);
  }

  const curAdm = user.administration || allowed[0];
  existingSwitcher.innerHTML = `
    <span style="font-size:11px; color:#90cdf4; font-weight:bold; white-space:nowrap;">⚡ فرع التشغيل:</span>
    <select id="operator-active-branch-select" onchange="switchOperatorActiveBranch(this.value)" style="background:#0f172a; color:#f8fafc; border:1px solid #38bdf8; border-radius:4px; padding:2px 6px; font-size:11px; font-weight:bold; cursor:pointer;">
      ${allowed.map(adm => `<option value="${adm}" ${adm === curAdm ? 'selected' : ''}>${adm}</option>`).join('')}
    </select>
  `;
}
window.setupOperatorBranchSwitcher = setupOperatorBranchSwitcher;

// التبديل الفوري لمهندس التشغيل بين فرعيه
function switchOperatorActiveBranch(branchName) {
  if (!branchName) return;
  if (!currentUser) return;

  currentUser.administration = branchName;
  window.currentUser = currentUser;
  try { sessionStorage.setItem("sld_user", JSON.stringify(currentUser)); } catch(_) {}
  try { localStorage.setItem("sld_current_admin", branchName); } catch(_) {}

  // تحديث مساحة عمل الإدارة وعرض مخططها
  if (typeof loadAdminWorkspace === "function") {
    loadAdminWorkspace(branchName);
  }
  updateUserInfoUI();
  if (typeof showToast === "function") {
    showToast(`⚡ تم الانتقال لفرع [${branchName}] — يمكنك الآن متابعة شبكته ومناوراتها!`, "info");
  }
}
window.switchOperatorActiveBranch = switchOperatorActiveBranch;

function isCurrentUserAdmin() {
  if (typeof isDeveloperUser === "function" && isDeveloperUser()) return true;
  if (!currentUser) {
    try {
      const s = sessionStorage.getItem("sld_user");
      if (s) {
        const u = JSON.parse(s);
        return (u && (u.role === 'admin' || u.id === 'admin' || u.role === 'manager' || u.is_developer || (typeof u.name === 'string' && u.name.includes('المدير'))));
      }
    } catch(_) {}
    return true; // إذا لم يُسجل الدخول بعد، يُسمح بالوصول الافتراضي
  }
  return (currentUser.role === 'admin' || currentUser.id === 'admin' || currentUser.role === 'manager' || currentUser.is_developer === true || (typeof currentUser.name === 'string' && currentUser.name.includes('المدير')));
}
window.isCurrentUserAdmin = isCurrentUserAdmin;

function updateDesignerName(name) {
  const tb = document.getElementById("tb-designer-name");
  if (tb) {
    const designerName = name || (currentUser ? currentUser.name : null);
    if (designerName) {
      tb.textContent = designerName;
    }
  }
}

// دالة موحدة لتنسيق مسمى الإدارة الهندسية والشئون الفنية
function formatEngineeringTitle(adminName) {
  if (!adminName) return "شركة مصر الوسطى لتوزيع الكهرباء";
  const clean = String(adminName).trim();
  // إزالة شرق أو غرب من اسم الهندسة الأساسي لعرضه بجواره بين قوسين
  const baseAdmin = clean.replace(/\s+(شرق|غرب)$/, '').trim();
  return `هندسة كهرباء ${baseAdmin} (الشئون الفنية ${clean})`;
}
window.formatEngineeringTitle = formatEngineeringTitle;

function updateUserInfoUI() {
  const user = currentUser || window.currentUser;
  if (!user) return;
  const nameEl = document.getElementById("current-user-name");
  if (nameEl) nameEl.textContent = user.name || "المستخدم";

  updateDesignerName(user.name);

  // الإدارة العامة المسجلة دخول وتنسيق المسمى الرسمي
  const adm = user.administration || "بني مزار شرق";
  const engineeringTitle = formatEngineeringTitle(adm);

  // تحديث عنوان هندسة الكهرباء في الشريط العلوي ديناميكياً
  const titleEl = document.getElementById("main-system-title");
  if (titleEl) {
    titleEl.textContent = engineeringTitle;
  }

  // تحديث عنوان هندسة الكهرباء في القائمة الجانبية ديناميكياً
  const sidebarTitle = document.getElementById("sidebar-brand-title");
  if (sidebarTitle) {
    sidebarTitle.textContent = engineeringTitle;
  }

  // تحديث عنوان التبويب في المتصفح
  document.title = `${engineeringTitle} | ENG-MOSTAFAELMGHRABY`;

  // التأكد من بقاء صفحة الدخول باسم: شركة مصر الوسطى لتوزيع الكهرباء
  const loginTitle = document.getElementById("login-app-title");
  if (loginTitle) {
    loginTitle.textContent = "شركة مصر الوسطى لتوزيع الكهرباء";
  }

  // تحديث خرطوشة المخطط بالقطاع والإدارة
  const tbSecAdmin = document.getElementById("tb-sector-admin");
  if (tbSecAdmin) {
    const sec = user.sector || "المنيا شمال";
    tbSecAdmin.textContent = `قطاع ${sec} — ${adm}`;
  }
}

function togglePasswordVisibility() {
  const pwInput = document.getElementById("password-input");
  const eyeIcon = document.getElementById("eye-icon");
  if (!pwInput) return;
  if (pwInput.type === "password") {
    pwInput.type = "text";
    if (eyeIcon) eyeIcon.textContent = "🙈";
  } else {
    pwInput.type = "password";
    if (eyeIcon) eyeIcon.textContent = "👁️";
  }
}

// فحص الجلسة عند بدء التحميل
window.addEventListener("DOMContentLoaded", async () => {
  // تحميل قائمة المستخدمين والإدارات الأولية لنافذة الدخول
  await loadInitialUsers();

  const savedUser = sessionStorage.getItem("sld_user");
  const savedToken = sessionStorage.getItem("sld_token");
  if (savedUser && savedToken) {
    currentUser = JSON.parse(savedUser);
    window.currentUser = currentUser;
    sessionToken = savedToken;
    updateUserInfoUI();
    document.getElementById("login-modal").classList.add("hidden");
    document.getElementById("app-shell").classList.remove("hidden");
    applyUserPermissions();
    if (window.initSettings) await window.initSettings();
    applyUserPermissions();
    if (window.initCanvas) window.initCanvas();
    if (window.initHeaderLayout) window.initHeaderLayout();
    
    // استعادة المخطط الجاري العمل عليه محلياً للإدارة الحالية
    const adminName = (currentUser && currentUser.administration) ? currentUser.administration : "بني مزار شرق";
    localStorage.setItem("sld_current_admin", adminName);
    if (window.loadAdminWorkspace) {
      window.loadAdminWorkspace(adminName);
    } else {
      const key = "sld_feeder_" + adminName.trim().replace(/\s+/g, '_');
      const cat = (typeof window.getCatalogForAdmin === 'function') ? window.getCatalogForAdmin(adminName) : [];
      const validCat = (Array.isArray(cat) ? cat : []).filter(p => p && (!window.isProjectDeleted || !window.isProjectDeleted(p.id, p.name)));
      const savedLocal = (validCat.length > 0) ? localStorage.getItem(key) : null;
      if (savedLocal) {
        try {
          const parsed = JSON.parse(savedLocal);
          if (parsed && parsed.nodes && parsed.nodes.length > 0) {
            currentProject = parsed;
            window.currentProject = parsed;
            if (window.updateFeederInputs) window.updateFeederInputs();
            if (window.renderNetwork) window.renderNetwork();
            if (window.fitToScreen) window.fitToScreen();
          }
        } catch(e) {}
      } else {
        const emptyProj = {
          id: "feeder_" + Date.now(),
          name: "مخطط جديد",
          administration: adminName,
          substation: "",
          nodes: [],
          sections: []
        };
        currentProject = emptyProj;
        window.currentProject = emptyProj;
        if (window.updateFeederInputs) window.updateFeederInputs();
        if (window.renderNetwork) window.renderNetwork();
      }
    }
  }

  // فحص وضع الصيانة عند بدء تحميل الصفحة
  checkMaintenanceState();
  updateMaintenanceBtnUI();
});

function onLoginUserChange() {
  // الاختيار هرمي: القطاع -> الإدارة -> المستخدم
}

// ════════════════════════════════════════════════════════════════════════════
// وضع الصيانة الحصري للمطور (Developer Maintenance Mode Logic)
// ════════════════════════════════════════════════════════════════════════════

function isDeveloperUser(user = (currentUser || window.currentUser)) {
  if (!user) return false;
  return user.id === "admin" ||
         user.is_developer === true ||
         user.role === "developer" ||
         user.role === "dev" ||
         (Array.isArray(user.permissions) && user.permissions.includes("developer"));
}

function isMaintenanceModeActive() {
  return localStorage.getItem("sld_maintenance_mode") === "true";
}

function updateMaintenanceBtnUI() {
  const btn = document.getElementById("btn-maintenance-mode");
  const icon = document.getElementById("maint-btn-icon");
  const label = document.getElementById("maint-btn-label");
  const banner = document.getElementById("maintenance-active-banner");
  const isMaint = isMaintenanceModeActive();
  const isDev = isDeveloperUser();

  if (btn) {
    if (isDev) {
      btn.style.setProperty("display", "inline-flex", "important");
      if (isMaint) {
        btn.classList.add("maint-active");
        if (icon) icon.textContent = "🚨";
        if (label) label.textContent = "الصيانة: مفعلة 🔴";
        btn.title = "وضع الصيانة مفعّل حالياً! انقر لإلغاء القفل وفتح المنظومة لجميع المستخدمين";
      } else {
        btn.classList.remove("maint-active");
        if (icon) icon.textContent = "🛠️";
        if (label) label.textContent = "وضع الصيانة";
        btn.title = "تفعيل وضع الصيانة وقفل المنظومة على باقي المستخدمين (للمطور فقط)";
      }
    } else {
      btn.style.setProperty("display", "none", "important");
    }
  }

  if (banner) {
    banner.style.display = (isMaint && isDev) ? "flex" : "none";
  }

  const devModalBtn = document.getElementById("dev-modal-maint-btn");
  if (devModalBtn) {
    devModalBtn.innerHTML = isMaint
      ? "<span>🚨 إلغاء وضع الصيانة (المنظومة مقفلة حالياً)</span>"
      : "<span>🛠️ تفعيل وضع الصيانة (قفل المنظومة للمطور فقط)</span>";
    devModalBtn.style.background = isMaint ? "rgba(239, 68, 68, 0.25)" : "rgba(245, 158, 11, 0.25)";
    devModalBtn.style.borderColor = isMaint ? "#ef4444" : "#f59e0b";
    devModalBtn.style.color = isMaint ? "#fca5a5" : "#fcd34d";
  }
}

function checkMaintenanceState() {
  const isMaint = isMaintenanceModeActive();
  const overlay = document.getElementById("maintenance-lock-overlay");
  const banner = document.getElementById("maintenance-active-banner");
  const isDev = isDeveloperUser();

  if (!isMaint) {
    if (overlay) overlay.style.display = "none";
    if (banner) banner.style.display = "none";
    return;
  }

  // وضع الصيانة نشط
  if (isDev) {
    // المطور مسموح له بالدخول والعمل بحرية كاملة ويرى بانر التنبيه
    if (overlay) overlay.style.display = "none";
    if (banner) banner.style.display = "flex";
  } else {
    // باقي المستخدمين أو الزوار: حظر فوري وعرض شاشة الصيانة
    if (overlay) overlay.style.display = "flex";
    if (banner) banner.style.display = "none";
  }
}

function toggleMaintenanceMode() {
  if (!isDeveloperUser()) {
    alert("⛔ عذراً، هذا الإجراء مخصص حصرياً للمهندس المطور (ENG-MOSTAFA ELMGHRABY)!");
    return;
  }

  const currentlyActive = isMaintenanceModeActive();
  const targetState = !currentlyActive;

  const msg = targetState
    ? "هل ترغب بالفعل في تفعيل [وضع الصيانة] للمنظومة بالكامل؟\n\n⚠️ عند التفعيل:\n- سيتم قفل المنظومة فوراً ومنع جميع المستخدمين من الدخول أو العمل.\n- ستظهر لهم شاشة الصيانة والتحديث الدوري.\n- تظل المنظومة متاحة لك فقط كمطور للعمل والتحديث بحرية."
    : "هل ترغب في إنهاء وإلغاء [وضع الصيانة] الآن؟\n\n✅ سيتم فتح المنظومة لجميع المهندسين والمستخدمين للدخول والعمل بشكل طبيعي كالمعتاد.";

  if (!confirm(msg)) return;

  localStorage.setItem("sld_maintenance_mode", targetState ? "true" : "false");

  // بث لحظي عبر GunDB للأجهزة الأخرى المتصلة في نفس اللحظة
  if (window.broadcastMaintenanceState) {
    window.broadcastMaintenanceState(targetState);
  }

  if (window.logActivity) {
    window.logActivity("change_settings", targetState ? "تفعيل وضع الصيانة وقفل المنظومة للمطور" : "إلغاء وضع الصيانة وفتح المنظومة للجميع");
  }

  updateMaintenanceBtnUI();
  checkMaintenanceState();

  if (window.showToast) {
    window.showToast(
      targetState ? "🛠️ تم تفعيل وضع الصيانة! المنظومة مقفلة الآن لغير المطور." : "✅ تم إلغاء الصيانة وفتح المنظومة لجميع المستخدمين بنجاح!",
      targetState ? "warning" : "success"
    );
  }
}

function openDeveloperLoginFromMaintenance() {
  const overlay = document.getElementById("maintenance-lock-overlay");
  if (overlay) overlay.style.display = "none";

  const appShell = document.getElementById("app-shell");
  if (appShell) appShell.style.display = "none";

  const loginModal = document.getElementById("login-modal");
  if (loginModal) {
    loginModal.classList.remove("hidden");
    loginModal.classList.add("active");
    loginModal.style.display = "flex";
  }

  const userSelect = document.getElementById("user-select");
  if (userSelect) {
    userSelect.value = "admin";
  }
  const pwInput = document.getElementById("password-input");
  if (pwInput) {
    pwInput.value = "";
    pwInput.focus();
  }
  const errorDiv = document.getElementById("login-error");
  if (errorDiv) {
    errorDiv.textContent = "🔐 مرحباً بك يا بشمهندس مصطفى، يرجى إدخال كلمة المرور لتجاوز شاشة الصيانة والدخول.";
    errorDiv.style.display = "block";
    errorDiv.style.color = "#38bdf8";
  }
}

function quickViewerLogin() {
  const viewerUser = {
    id: "viewer_" + Math.random().toString(36).substr(2, 6),
    name: "مهندس مراجع (معاينة حية)",
    role: "مراجع هندسي",
    permissions: ["all"],
    sector: "المنيا شمال",
    administration: "بني مزار شرق"
  };
  currentUser = viewerUser;
  window.currentUser = viewerUser;
  sessionToken = "viewer_token_" + Date.now();
  sessionStorage.setItem("sld_user", JSON.stringify(viewerUser));
  sessionStorage.setItem("sld_token", sessionToken);

  const loginModal = document.getElementById("login-modal");
  if (loginModal) {
    loginModal.classList.add("hidden");
    loginModal.style.display = "none";
  }
  const appShell = document.getElementById("app-shell");
  if (appShell) {
    appShell.classList.remove("hidden");
    appShell.style.display = "flex";
  }

  updateUserInfoUI();
  applyUserPermissions();

  if (window.initCanvas) {
    try { window.initCanvas(); } catch(e) {}
  }

  if (window.reconcileAndSyncAllDevices) {
    setTimeout(window.reconcileAndSyncAllDevices, 300);
  }
}

window.hasPermission = hasPermission;
window.applyUserPermissions = applyUserPermissions;
window.updateDesignerName = updateDesignerName;
window.updateUserInfoUI = updateUserInfoUI;
window.togglePasswordVisibility = togglePasswordVisibility;
window.SECTORS_MAP = SECTORS_MAP;
window.onLoginSectorChange = onLoginSectorChange;
window.onLoginAdminChange = onLoginAdminChange;
window.onLoginUserChange = onLoginUserChange;
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
window.loadInitialUsers = loadInitialUsers;
window.isDeveloperUser = isDeveloperUser;
window.isMaintenanceModeActive = isMaintenanceModeActive;
window.updateMaintenanceBtnUI = updateMaintenanceBtnUI;
window.checkMaintenanceState = checkMaintenanceState;
window.toggleMaintenanceMode = toggleMaintenanceMode;
window.openDeveloperLoginFromMaintenance = openDeveloperLoginFromMaintenance;
window.quickViewerLogin = quickViewerLogin;


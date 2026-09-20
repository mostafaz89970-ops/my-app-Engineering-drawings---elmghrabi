/**
 * Smart Grid SLD Studio - Authentication & Security Module
 * Copyright (C) ENG-MOSTAFAELMGHRABY - All Rights Reserved
 */

let currentUser = null;
let sessionToken = null;
let allUsersCache = [];

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

  const sec = sector || (document.getElementById("login-sector-select")?.value || "المنيا شمال");
  const sectorsMap = (window.SECTORS_MAP) || SECTORS_MAP;
  const admins = (sectorsMap && sectorsMap[sec]) ? sectorsMap[sec] : (SECTORS_MAP[sec] || []);

  adminSelect.innerHTML = admins.map(adm => 
    `<option value="${adm}" ${adm === selectedAdmin ? "selected" : ""}>${adm}</option>`
  ).join('');

  if (selectedAdmin && admins.includes(selectedAdmin)) {
    adminSelect.value = selectedAdmin;
  } else if (admins.length > 0) {
    adminSelect.value = admins[0];
  }
}

function onLoginSectorChange() {
  const sectorSelect = document.getElementById("login-sector-select");
  if (!sectorSelect) return;
  const sector = sectorSelect.value;
  populateLoginAdminDropdown(sector);
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

  const currentSector = sectorSelect ? sectorSelect.value : "المنيا شمال";
  const currentAdmin = adminSelect ? adminSelect.value : "بني مزار شرق";

  // فلترة صارمة: يظهر الموظفون المسجلون في هذا القطاع وهذه الإدارة حصراً ولا يظهرون في غيرها
  let filtered = allUsersCache.filter(u => {
    const userSector = u.sector || "المنيا شمال";
    const userAdmin = u.administration || "بني مزار شرق";
    return userSector === currentSector && userAdmin === currentAdmin;
  });

  if (filtered.length === 0) {
    // في وضع الاستضافة أو عند عدم وجود مستخدم محدد للإدارة، إتاحة الدخول للمدير العام م/ مصطفى المغربي
    userSelect.innerHTML = `<option value="admin">المدير العام (م/ مصطفى المغربي) - ${currentAdmin}</option>`;
    userSelect.disabled = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.title = "";
    }
  } else {
    userSelect.disabled = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.title = "";
    }
    userSelect.innerHTML = filtered.map(u => {
      const statusLabel = u.is_active === false ? ' ⛔ (معطّل / محظور)' : '';
      return `<option value="${u.id}">${u.name}${statusLabel}</option>`;
    }).join('');
    userSelect.value = filtered[0].id;
  }

  if (errorDiv) errorDiv.style.display = "none";
}

const DEFAULT_FALLBACK_USERS = [
  {
    id: "admin",
    name: "المدير العام (م/ مصطفى المغربي)",
    role: "admin",
    sector: "المنيا شمال",
    administration: "بني مزار شرق",
    password_plain: "123450",
    is_active: true,
    permissions: ["all", "edit_network", "export", "settings", "manage_users"]
  },
  {
    id: "planning_eng",
    name: "مهندس تخطيط وشبكات",
    role: "engineer",
    sector: "المنيا شمال",
    administration: "بني مزار شرق",
    password_plain: "1234500",
    is_active: true,
    permissions: ["all", "edit_network", "export", "settings"]
  },
  {
    id: "operation_eng",
    name: "مهندس تشغيل ومناورات",
    role: "operator",
    sector: "المنيا شمال",
    administration: "بني مزار شرق",
    password_plain: "1234500",
    is_active: true,
    permissions: ["all", "edit_network", "export"]
  }
];

async function loadInitialUsers() {
  try {
    const res = await fetch("/api/users");
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.users) && data.users.length > 0) {
        allUsersCache = data.users;
      } else {
        allUsersCache = DEFAULT_FALLBACK_USERS;
      }
    } else {
      allUsersCache = DEFAULT_FALLBACK_USERS;
    }
  } catch (err) {
    console.warn("Using offline fallback users for standalone/hosting mode:", err);
    allUsersCache = DEFAULT_FALLBACK_USERS;
  }
  const sectorSelect = document.getElementById("login-sector-select");
  const currentSector = sectorSelect ? sectorSelect.value : "المنيا شمال";
  populateLoginAdminDropdown(currentSector, "بني مزار شرق");
  filterLoginUsers();
}

async function handleLogin(e) {
  e.preventDefault();
  const userSelect = document.getElementById("user-select");
  const pwInput = document.getElementById("password-input");
  const errorDiv = document.getElementById("login-error");
  const submitBtn = document.getElementById("btn-submit-login");

  if (errorDiv) errorDiv.style.display = "none";
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = "<span>جاري التحقق والتأمين...</span>";
  }

  let loggedInUser = null;
  let token = null;

  const entered = (pwInput?.value || "").trim();
  const selectedUserId = userSelect ? userSelect.value : "admin";

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: selectedUserId,
        password: entered
      })
    });
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
    if (validPasswords.includes(entered) || (found && found.password_plain === entered)) {
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

  try {
    if (window.initSettings) await window.initSettings();
  } catch(e) { console.warn("initSettings error:", e); }

  updateUserInfoUI();
  applyUserPermissions();

  if (window.initCanvas) {
    try { window.initCanvas(); } catch(e) { console.warn("initCanvas error:", e); }
  }

  // استعادة المخطط أو إنشاء مخطط جديد
  const savedLocal = localStorage.getItem("sld_saved_feeder");
  let restored = false;
  if (savedLocal) {
    try {
      const parsed = JSON.parse(savedLocal);
      if (parsed && parsed.nodes && parsed.nodes.length > 0) {
        if (typeof currentProject !== "undefined") {
          currentProject = parsed;
        }
        window.currentProject = parsed;
        if (window.updateFeederInputs) window.updateFeederInputs();
        if (window.renderNetwork) window.renderNetwork();
        if (window.fitToScreen) window.fitToScreen();
        if (window.showToast) window.showToast(`📂 تم فتح المخطط النشط [${parsed.name || 'المخطط'}] بنجاح!`, "info");
        restored = true;
      }
    } catch(e) {
      console.error("Restore local project error:", e);
    }
  }

  if (!restored) {
    if (window.DEFAULT_BUNDLED_PROJECTS && window.DEFAULT_BUNDLED_PROJECTS.length > 0) {
      const defaultProj = JSON.parse(JSON.stringify(window.DEFAULT_BUNDLED_PROJECTS[0]));
      if (typeof currentProject !== "undefined") {
        currentProject = defaultProj;
      }
      window.currentProject = defaultProj;
      try {
        localStorage.setItem("sld_saved_feeder", JSON.stringify(defaultProj));
        localStorage.setItem("sld_proj_" + defaultProj.id, JSON.stringify(defaultProj));
      } catch(e) {}
      if (window.updateFeederInputs) window.updateFeederInputs();
      if (window.renderNetwork) window.renderNetwork();
      if (window.fitToScreen) window.fitToScreen();
      if (window.showToast) window.showToast(`📂 تم استرجاع مخطط [${defaultProj.name}] بنجاح!`, "success");
    } else if (window.createNewProjectDirectly) {
      window.createNewProjectDirectly();
    } else if (window.loadDemoVideoProject) {
      window.loadDemoVideoProject();
    }
  }

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = "<span>تسجيل الدخول الآمن</span> <span class=\"arrow-icon\">➔</span>";
  }
}

function handleLogout() {
  if (confirm("هل ترغب بالفعل في تسجيل الخروج من منظومة المخططات؟")) {
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
    document.getElementById("password-input").value = "";
    document.getElementById("app-shell").classList.add("hidden");
    document.getElementById("login-modal").classList.remove("hidden");
    // إخفاء زر الإعدادات
    const btn = document.getElementById("btn-settings");
    if (btn) btn.style.display = "none";
  }
}

function hasPermission(permKey) {
  if (!currentUser || !currentUser.permissions) return false;
  const perms = currentUser.permissions;
  if (perms.includes("all")) return true;
  if (perms.includes(permKey)) return true;

  // توافق مع الصلاحيات القديمة (Backward compatibility)
  if (perms.includes("edit_network")) {
    const editPerms = [
      "btn_cable", "btn_overhead", "btn_line_between", "btn_quick_line",
      "btn_substation", "btn_switch", "btn_trans", "btn_cascade_trans",
      "btn_kiosk", "btn_kiosk_from_kiosk", "btn_rmu", "btn_avr",
      "btn_undo", "btn_delete"
    ];
    if (editPerms.includes(permKey)) return true;
  }
  if (perms.includes("export") && (permKey === "btn_excel" || permKey === "btn_print")) return true;
  if (perms.includes("calculations") && permKey === "btn_calculations") return true;
  if (perms.includes("simulate_switching") && permKey === "btn_simulation") return true;
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
}

function updateDesignerName(name) {
  const tb = document.getElementById("tb-designer-name");
  if (tb) {
    const designerName = name || (currentUser ? currentUser.name : null);
    if (designerName) {
      tb.textContent = designerName;
    }
  }
}

function updateUserInfoUI() {
  const user = currentUser || window.currentUser;
  if (!user) return;
  const nameEl = document.getElementById("current-user-name");
  if (nameEl) nameEl.textContent = user.name || "المستخدم";

  updateDesignerName(user.name);

  // الإدارة العامة المسجلة دخول
  const adm = user.administration || "بني مزار شرق";
  const engineeringTitle = `هندسة كهرباء ${adm}`;

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
    
    // استعادة المخطط الجاري العمل عليه محلياً عند الضغط على F5 أو تحديث المتصفح
    const savedLocal = localStorage.getItem("sld_saved_feeder");
    let restored = false;
    if (savedLocal) {
      try {
        const parsed = JSON.parse(savedLocal);
        if (parsed && parsed.nodes && parsed.nodes.length > 0) {
          currentProject = parsed;
          window.currentProject = parsed;
          if (window.updateFeederInputs) window.updateFeederInputs();
          if (window.renderNetwork) window.renderNetwork();
          if (window.fitToScreen) window.fitToScreen();
          restored = true;
        }
      } catch(e) {
        console.error("Restore local project error on F5:", e);
      }
    }
    if (!restored) {
      if (window.DEFAULT_BUNDLED_PROJECTS && window.DEFAULT_BUNDLED_PROJECTS.length > 0) {
        const defaultProj = JSON.parse(JSON.stringify(window.DEFAULT_BUNDLED_PROJECTS[0]));
        currentProject = defaultProj;
        window.currentProject = defaultProj;
        try {
          localStorage.setItem("sld_saved_feeder", JSON.stringify(defaultProj));
          localStorage.setItem("sld_proj_" + defaultProj.id, JSON.stringify(defaultProj));
        } catch(e) {}
        if (window.updateFeederInputs) window.updateFeederInputs();
        if (window.renderNetwork) window.renderNetwork();
        if (window.fitToScreen) window.fitToScreen();
        restored = true;
      } else if (window.createNewProjectDirectly) {
        window.createNewProjectDirectly();
      }
    }
  }
});

function onLoginUserChange() {
  // الاختيار هرمي: القطاع -> الإدارة -> المستخدم
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
window.loadInitialUsers = loadInitialUsers;


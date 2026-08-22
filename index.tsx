

// تعريف المتغيرات العامة والمكتبات
declare const Chart: any;
declare const jsPDF: any; // For jsPDF export
// FIX: Declare AmiriRegular to resolve 'Cannot find name' error for PDF font generation.
declare const AmiriRegular: any;
declare const XLSX: any; // For Excel import

// FIX: Augment the Window interface to include the jspdf property, resolving a TypeScript error where the globally loaded jspdf library was not recognized on the window object.
interface Window {
    jspdf: any;
    db: {
        getState: () => Promise<string | null>;
        saveState: (stateJSON: string) => Promise<{ success: boolean; error?: string }>;
    };
    getAppVersion: () => Promise<string>;
    checkForUpdates: () => Promise<{ success: boolean; updateInfo?: any; error?: string }>;
    onDownloadProgress: (callback: (progress: any) => void) => void;
    fetchExternalUrl: (url: string, options?: any) => Promise<{ success: boolean; data?: any[]; error?: string }>;
    scrapeUrl: (url: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
}

// تعريف الأنواع والواجهات
// FIX: Define DataItem globally to enforce type safety on state arrays and fix generic type inference errors.
// Added customData to support dynamic fields.
type DataItem = {
    accountRefF?: string;
    accountRefH?: string;
    accountRefY?: string;
    accountRefM?: string;
    id: number,
    locationDescription?: string;
    subscriberName?: string;
    subscriptionCode?: string;
    address?: string;
    assignedArea?: string; // الميدان المخصص للتبويب لفرز الطلبات دون تغيير العنوان الأصلي
    meterChassisNumber?: string;
    meterType?: string;
    activityType?: string;
    panelNumber?: string;
    accountReference?: string;
    customData?: { [key: string]: string | number },
    repairStatus?: string;
    newMeterChassisNumberForReplacement?: string;
    meterCapacity?: string;
    subscriptionType?: string;
    installationDateForReplacement?: string;
    newMeterType?: string;
    installationStatus?: string; // Added to track new vs replacement installs
    councilName?: string; // For Transformer Management
    transformerAddress?: string; // For Transformer Management
    transformerName?: string; // For Transformer Management
    transformerType?: string; // New: Transformer Type (Kiosk, Room, etc.)
    transformerCapacityKVA?: number; // For Transformer Management
    smartMeterChassis?: string; // For Transformer Management
    simCardNumber?: string; // For Transformer Management
    currentTransformerCapacity?: string; // For Transformer Management
    newSubscriberName?: string;
    contractDate?: string;
    meterSupplyCompany?: string;
    sketchImage?: string; // Added for storing sketch dataURL
    liquidationDate?: string;
    liquidationReceiptImage?: string;
    [key: string]: any
};

// تعريف واجهة صريحة لإعدادات التطبيق لضمان التعرف على جميع الخصائص
interface AppSettings {
    companyName: string;
    footerText: string;
    technicians: string[];
    technicalEngineers: string[];
    headEngineers: string[];
    addresses: string[];
    pendingPageAddresses: string[];
    placeDescriptions: string[];
    subscriptionTypes: string[];
    customFields: { name: string, type: 'text' | 'number' | 'date' }[];
    meterTypes: string[];
    meterSupplyCompanies: string[];
    meterCapacities: string[];
    activityTypes: string[];
    repairStatuses: string[];
    removalReasons: string[];
    demolitionTypes: string[];
    cardStatuses: string[];
    judicialControlStatuses: string[];
    reportHeaderText: string;
    memoTypes: string[];
    reportFooterText: string;
    reportSignature: string;
    replacementReportCompanyName: string;
    replacementReportFooterText: string;
    replacementSignatures: string[];
    judicialSignatures: string[];
    collectionSignatures: string[];
    mukayasatSignatures: string[];
    councilNames: string[]; // For Transformer Management
    transformerTypes: string[]; // New: For Transformer Management
    currentTransformerCapacities: string[]; // For Transformer Management
    faultyMeterSignatures: string[];
    errorCodes: { code: string, description: string, action: string, meterType: string }[];
    errorCodeMeterTypes: string[];
    meterPages: { title: string, content: string, manufacturer: string, commonIssues: string, pageStructure?: string, image?: string | null }[];
    generalSignatures: string[];
    companyLogo: string | null;
    companyLogoSize: number;
    dashboardCardsVisibility: { [key: string]: boolean };
    permissions: { [key: string]: { name: string; roles: string[] } };
    dashboardPermissions: { [key: string]: { name: string; roles: string[] } };
    buttonPermissions: { [key: string]: { name: string; roles: string[] } };
    reportPermissions: { [key: string]: { name: string; roles: string[] } };
    roles: { key: string; name: string }[];
}

type Payment = {
    amount: number;
    receiptNumber: string;
    date: string;
    collectedBy: string;
};


type ActivityLogEntry = {
    timestamp: string;
    user: string;
    action: string;
    details: string; // General description
    changeSummary?: string; // Specific changes
};

type ColumnDefinition = {
    key: keyof DataItem | string; // key in the data object, string for custom keys like 'actions'
    header: string; // text for the table header
    render?: (item: DataItem) => string; // custom render function for cell content
};

// إدارة حالة التطبيق
// --- App State Management ---
// FIX: Explicitly type meter arrays with DataItem. This resolves a TypeScript error where generic functions
// would infer the type as 'never[]' for empty arrays, causing a type mismatch when adding new items.
let state = {
    meters: [] as DataItem[],
    subscribers: [] as DataItem[],
    mukayasat: [] as DataItem[],
    mukayasatAccountSystemSaved: [] as DataItem[],
    lostMeterMemos: [] as DataItem[],
    transformers: [] as DataItem[], // New: Transformer Management
    transformerLoads: [] as DataItem[], // New: Transformer Load Management
    pendingRequests: [] as DataItem[], // الحالة الجديدة للطلبات المستوردة
    judicialControl: [] as DataItem[], // قسم الضبطية القضائية
    zinatCollection: [] as DataItem[], // قسم تحصيل زينات
    activityLog: [] as ActivityLogEntry[],
    users: [
        { id: 1, fullName: 'Admin User', username: 'admin', password: '123450', role: 'admin' }
    ],
    settings: { // تم تطبيق الواجهة AppSettings هنا
        companyName: 'ELMAGHRABI',
        footerText: 'منظومة العدادات 2025 - جميع الحقوق محفوظة ELMGHRABI © 2025',
        technicians: ['محمد علي', 'أحمد السيد', 'خالد محمود'],
        technicalEngineers: [] as string[],
        headEngineers: [] as string[],
        addresses: [] as string[],
        pendingPageAddresses: [] as string[],
        placeDescriptions: [
            'شقة',
            'مصلحة حكومية',
            'مسجد',
            'ورشة نجارة',
            'مخبز',
            'كنيسة',
            'مساجد أهلية',
            'ماكينة طحين',
            'ورشة حدادة',
            'محطه محمول متجددة',
            'مخالف منزلى',
            'محل خردوات',
            'بيع هواتف محمولة',
            'ادوات كهربائية',
            'ورشة لحام كهرباء',
            'أجهزة وادوات طبية',
            'مغسلة سيارات',
            'وكالة إعلان',
            'تجاري',
            'مكتب خدمات',
            'أرض زراعية',
            'استصلاح أراضى',
            'رى أراضى',
            'مزرعة',
            'مزرعة دواجن',
            'مزرعة مواشي',
            'محطة صرف صحى',
            'كودي مزرعة مواشي',
            'كودي مزرعة دواجن',
            'منزلي كودى',
            'محال تجارية كودي',
            'باقى المشتركين كودى',
            'أستخدامات الرى كودى',
            'أعلى شريحة تجارى كودى',
            'قوي كودى',
            'مسجد اهلى كودى',
            'مسجد اوقاف كودى',
            'كنيسة كودى',
            'دور عبادة كودى',
            'جمعية اهلية كودى',
            'محطة محمول كودى',
            'عداد خدمات كودي',
            'مصعد تجارى كودي',
            'جمعيه اهليه 50%',
            'استراحات حكوميه'
        ],
        subscriptionTypes: ['منزلي', 'تجاري', 'صناعي'],
        customFields: [] as { name: string, type: 'text' | 'number' | 'date' }[],
        meterTypes: ['ميكانيكي', 'ديجيتال', 'مسبق الدفع'],
        meterSupplyCompanies: ['جلوبال', 'السويدي', 'المعصرة', 'المصرية', 'جيزة باور'],
        meterCapacities: ['100 أمبير', '200 أمبير', '300 أمبير'],
        activityTypes: ['منزلي', 'تجاري', 'صناعي'],
        repairStatuses: ['تم الإصلاح', 'لا يمكن إصلاحه', 'تم تغير العداد'],
        removalReasons: ['عطل', 'تلف', 'أمر إداري', 'إحلال'],
        demolitionTypes: ['هدم كلي', 'هدم جزئي', 'استغناء نهائي'],
        cardStatuses: ['صالح', 'تالف', 'مفقود'],
        judicialControlStatuses: ['قيد التحقيق', 'تم التصالح', 'محولة للنيابة', 'براءة', 'تم تركيب عداد'],
        reportHeaderText: 'تقرير رسمي صادر من {companyName}\nتاريخ التقرير: {date} - {time}',
        memoTypes: ['مذكرة فقد عداد', 'مذكرة إدارية', 'مذكرة داخلية'],
        reportFooterText: 'جميع الحقوق محفوظة © 2025\nالتوقيع: ..........................',
        reportSignature: '',
        replacementReportCompanyName: 'شركة مصر الوسطى لتوزيع الكهرباء',
        replacementReportFooterText: 'بواسطة: {user} | التاريخ: {date} | صفحة 1 من 1',
        replacementSignatures: [
            'مراجع التسويات',
            'مراجع التحصيل',
            'مراجع الايرادات',
            'رئيس الايرادات',
            'تم استلام الاصل (شبكات القرى)'
        ],
        judicialSignatures: [] as string[],
        collectionSignatures: [] as string[],
        mukayasatSignatures: [] as string[],
        councilNames: [' مجلس قروي بني صامت', 'العدوة', 'مطاي', 'سمالوط'], // Default council names
        transformerTypes: ['كشك', 'غرفة', 'عامود', 'سورتية'], // Default transformer types
        currentTransformerCapacities: ['200/5', '400/5', '500/5', '600/5'], // Default CT capacities
        faultyMeterSignatures: [] as string[],
        errorCodes: [] as { code: string, description: string, action: string, meterType: string }[],
        errorCodeMeterTypes: [] as string[],
        meterPages: [] as { title: string, content: string, manufacturer: string, commonIssues: string, pageStructure?: string, image?: string | null }[],
        generalSignatures: [],
        companyLogo: null as string | null,
        companyLogoSize: 100, // Default size percentage
        dashboardCardsVisibility: {
            'all-subscribers-card': true,
            'new-meters-card': true,
            'lifted-meters-card': true,
            'replacement-card': true,
            'scrapped-meters-card': true,
            'users-card': true,
            'repairs-card': true,
            'lost-memos-card': true,
            'judicial-control-card': true,
            'mukayasat-card': true,
            'judicial-collection-card': true,
            'zinat-collection-card': true,
            'zinat-registration-card': true,
            'accounting-card': true,
        },
        permissions: {
            'view_dashboard': { name: 'عرض لوحة التحكم', roles: ['admin', 'supervisor', 'reports', 'معاينات', 'user'] },
            'view_meter_management_section': { name: 'عرض قسم إدارة العدادات', roles: ['admin', 'supervisor', 'user'] },
            'add_meter': { name: 'تسجيل عداد جديد', roles: ['admin', 'supervisor'] },
            'manage_meters': { name: 'إدارة العدادات (إضافة/تعديل)', roles: ['admin', 'supervisor'] },
            'delete_meters': { name: 'حذف سجلات العدادات', roles: ['admin'] },
            'view_meters': { name: 'عرض قوائم العدادات', roles: ['admin', 'supervisor', 'reports', 'معاينات', 'user'] },
            'view_repaired_meters': { name: 'عرض قسم الإصلاحات', roles: ['admin', 'supervisor', 'user'] },
            'view_subscribers_section': { name: 'عرض قسم المشتركين', roles: ['admin', 'supervisor', 'user'] },
            'view_subscriber_statement': { name: 'عرض كشف حساب مشترك', roles: ['admin', 'supervisor', 'user'] },
            'view_subscribers_new': { name: 'عرض المشتركين (جديد)', roles: ['admin', 'supervisor', 'user'] },
            'view_subscribers_faults': { name: 'عرض المشتركين (أعطال)', roles: ['admin', 'supervisor', 'user'] },
            'view_subscribers_replacement': { name: 'عرض المشتركين (إحلال)', roles: ['admin', 'supervisor', 'user'] },
            'view_subscribers_substituted': { name: 'عرض المشتركين (استبدال)', roles: ['admin', 'supervisor', 'user'] },
            'view_subscribers_scrapped': { name: 'عرض المشتركين (استغناء)', roles: ['admin', 'supervisor', 'user'] },
            'view_subscribers_demolition': { name: 'عرض المشتركين (هدم)', roles: ['admin', 'supervisor', 'user'] },
            'view_mukayasat_section': { name: 'عرض قسم المقايسات', roles: ['admin', 'supervisor', 'معاينات'] },
            'manage_mukayasat': { name: 'إدارة المقايسات (إضافة/تعديل/حذف)', roles: ['admin', 'معاينات'] },
            'view_mukayasat_list': { name: 'عرض قائمة المقايسات', roles: ['admin', 'supervisor', 'معاينات'] },
            'manage_users': { name: 'إدارة المستخدمين', roles: ['admin'] },
            'view_judicial_control_section': { name: 'عرض قسم الضبطية القضائية', roles: ['admin', 'supervisor'] },
            'manage_judicial_control': { name: 'إدارة الضبطية القضائية', roles: ['admin'] },
            'manage_settings': { name: 'إدارة الإعدادات', roles: ['admin'] },
            'view_transformer_management_section': { name: 'عرض قسم إدارة المحولات', roles: ['admin', 'supervisor'] }, // New
            'register_transformer': { name: 'تسجيل محول', roles: ['admin', 'supervisor'] }, // New
            'query_transformer': { name: 'استعلام عن محول', roles: ['admin', 'supervisor', 'user'] }, // New
            'view_transformer_list': { name: 'قائمة المحولات', roles: ['admin', 'supervisor', 'user'] }, // New
            'view_accounting_system': { name: 'عرض نظام المحاسبة', roles: ['admin', 'supervisor'] },
            'view_mukayasat_report': { name: 'عرض تقرير المعاينات', roles: ['admin', 'supervisor', 'معاينات'] },
            'view_judicial_control_report': { name: 'عرض تقرير الضبطية القضائية', roles: ['admin', 'supervisor'] },
            'view_reports': { name: 'عرض التقارير', roles: ['admin', 'supervisor', 'reports'] },
            'view_lost_meter_memos_section': { name: 'عرض قسم مذكرات الفقد', roles: ['admin', 'supervisor'] },
            'manage_lost_meter_memos': { name: 'إدارة مذكرات الفقد', roles: ['admin', 'supervisor'] },
            'view_activity_log': { name: 'عرض سجل النشاط', roles: ['admin', 'supervisor'] },
            'view_collection_section': { name: 'عرض قسم التحصيل', roles: ['admin', 'supervisor', 'user'] },
            'manage_collection': { name: 'إدارة التحصيل (الدفع)', roles: ['admin', 'supervisor'] },
            'view_help_section': { name: 'عرض قسم المساعدة', roles: ['admin', 'supervisor', 'user'] },
            'view_excel_import': { name: 'استيراد ملفات اكسل', roles: ['admin', 'supervisor'] },
        },
        dashboardPermissions: {
            'show_all_subscribers_card': { name: 'عرض بطاقة جميع المشتركين', roles: ['admin', 'supervisor', 'user'] },
            'show_new_meters_card': { name: 'عرض بطاقة العدادات الجديدة', roles: ['admin', 'supervisor', 'user'] },
            'show_lifted_meters_card': { name: 'عرض بطاقة العدادات المرفوعة', roles: ['admin', 'supervisor', 'user'] },
            'show_replacement_card': { name: 'عرض بطاقة الإحلال والتجديد', roles: ['admin', 'supervisor', 'user'] },
            'show_scrapped_meters_card': { name: 'عرض بطاقة عدادات الهدم', roles: ['admin', 'supervisor', 'user'] },
            'show_lost_memos_card': { name: 'عرض بطاقة مذكرات الفقد', roles: ['admin', 'supervisor'] },
            'show_repairs_card': { name: 'عرض بطاقة الإصلاحات', roles: ['admin', 'supervisor', 'user'] },
            'show_judicial_control_card': { name: 'عرض بطاقة الضبطية القضائية', roles: ['admin', 'supervisor'] },
            'show_mukayasat_card': { name: 'عرض بطاقة المعاينات الفنية', roles: ['admin', 'supervisor', 'معاينات'] },
            'show_judicial_collection_card': { name: 'عرض بطاقة تحصيل الضبطية', roles: ['admin', 'supervisor', 'user'] },
            'show_zinat_collection_card': { name: 'عرض بطاقة تحصيل زينات', roles: ['admin', 'supervisor', 'user'] },
            'show_zinat_registration_card': { name: 'عرض بطاقة إضافة زينات', roles: ['admin', 'supervisor', 'user'] },
            'show_accounting_card': { name: 'عرض بطاقة نظام المحاسبة', roles: ['admin', 'supervisor'] },
        },
        buttonPermissions: {
            'view_button': { name: 'زر العرض', roles: ['admin', 'supervisor', 'reports', 'معاينات', 'user'] },
            'add_button': { name: 'زر الإضافة', roles: ['admin', 'supervisor'] },
            'edit_button': { name: 'زر التعديل', roles: ['admin', 'supervisor'] },
            'delete_button': { name: 'زر الحذف', roles: ['admin'] },
            'print_button': { name: 'زر الطباعة', roles: ['admin', 'supervisor', 'reports'] },
            'print_list_button': { name: 'زر طباعة القوائم', roles: ['admin', 'supervisor', 'reports'] },
        },
        reportPermissions: {
            'all-meters': { name: 'تقرير جميع العدادات', roles: ['admin', 'supervisor', 'reports'] },
            'meters-by-status': { name: 'تقرير العدادات حسب الحالة', roles: ['admin', 'supervisor', 'reports'] },
            'technician-activity': { name: 'تقرير نشاط الفني', roles: ['admin', 'supervisor', 'reports'] },
            'repairs': { name: 'تقرير الإصلاحات', roles: ['admin', 'supervisor', 'reports'] },
            'memos': { name: 'تقرير المذكرات', roles: ['admin', 'supervisor', 'reports'] },
            'replacement-report': { name: 'تقرير الإحلال', roles: ['admin', 'supervisor', 'reports'] },
            'mukayasat': { name: 'تقرير المعاينات', roles: ['admin', 'supervisor', 'معاينات', 'reports'] },
            'judicial_control': { name: 'تقرير الضبطية القضائية', roles: ['admin', 'supervisor', 'reports'] },
            'judicial_collection_report': { name: 'تقرير تحصيل الضبطية', roles: ['admin', 'supervisor', 'reports'] },
            'zinat_collection_report': { name: 'تقرير تحصيل زينات', roles: ['admin', 'supervisor', 'reports'] },
            'installed_practice_meters': { name: 'تقرير ممارسات تم تركيب عداد لها', roles: ['admin', 'supervisor', 'reports'] },
            'transformers': { name: 'تقرير بيانات المحولات', roles: ['admin', 'supervisor', 'reports'] },
        },
        roles: [
            { key: 'admin', name: 'مدير النظام' },
            { key: 'supervisor', name: 'مشرف' },
            { key: 'reports', name: 'تقارير' },
            { key: 'معاينات', name: 'فني معاينات' },
            { key: 'user', name: 'مستخدم' }
        ]
    },
};

type State = typeof state;
type StateKey = keyof Omit<State, 'users' | 'settings' | 'subscribers'>;

let loggedInUser: { fullName: string; role: string; username?: string } | null = null;
let currentForm: HTMLFormElement | null = null; // This variable is declared but never used. Consider removing it.
let currentFormParent: HTMLElement | null = null;

// For subscriber details page
let currentMeterIdForDetails: number | null = null;
let currentMukayasaIdForDetails: number | null = null;
let currentLostMemoIdForDetails: number | null = null;
let currentJudicialControlIdForDetails: number | null = null;
let previousPageId: string | null = null;

const navigationHistory: string[] = [];

let currentReportHeader = '';
let currentReportByline = '';

// --- Canvas Global Variables ---
let sketchCanvas: HTMLCanvasElement | null = null;
let sketchCtx: CanvasRenderingContext2D | null = null;
let isDrawing = false;
let currentTool = 'pen';
let textRotation = 0; // 0 or -90 degrees (in radians)
let undoStack: ImageData[] = [];

// --- Excel Import State & Mapping ---
let importedExcelData: DataItem[] = [];
let currentExcelPage = 1;
const excelRowsPerPage = 20;
const excelHeaderMap: { [key: string]: keyof DataItem } = {
    'اسم المشترك': 'subscriberName',
    'الاسم': 'subscriberName',
    'كود الاشتراك': 'subscriptionCode',
    'كود': 'subscriptionCode',
    'رقم الاشتراك': 'subscriptionCode',
    'كود المشترك': 'subscriptionCode',
    'العنوان': 'address',
    'رقم الشاسية': 'meterChassisNumber',
    'شاسية': 'meterChassisNumber',
    'شاسية العداد': 'meterChassisNumber',
    'رقم العداد': 'meterChassisNumber',
    'نوع العداد': 'meterType',
    'نوع': 'meterType',
    'Type': 'meterType',
    'الحالة': 'subscriberType',
    'حالة المشترك': 'subscriberType',
    'نوع النشاط': 'activityType',
    'نشاط': 'activityType',
    'النشاط': 'activityType',
    'رقم اللوحة': 'panelNumber',
    'لوحة': 'panelNumber',
    'قدرة العداد': 'meterCapacity',
    'قدرة': 'meterCapacity',
    'القدرة': 'meterCapacity',
    'Capacity': 'meterCapacity',
    'الامبير': 'meterCapacity',
    'الأمبير': 'meterCapacity',
    'سعة': 'meterCapacity',
    'سعة العداد': 'meterCapacity',
    'تاريخ التركيب': 'installationDate',
    'تاريخ': 'installationDate',
    'التاريخ': 'installationDate',
    'ف': 'accountRefF',
    'ح': 'accountRefH',
    'ي': 'accountRefY',
    'م': 'accountRefM',
    'مرجع الحساب': 'accountReference',
    'المرجع': 'accountReference',
    'تاريخ التوصيل': 'installationDate',
    'الفني': 'installedBy',
    'اسم الفني': 'installedBy',
    'القراءة': 'readingAtRemoval',
    'قراءة الرفع': 'readingAtRemoval',
    'سبب الرفع': 'removalReason',
    'تاريخ الرفع': 'removalDate',
    'القائم بالرفع': 'removedBy',
    'القائم بالتركيب': 'installedBy',
    'الفني القائم بالتركيب': 'installedBy',
    'فني التركيب': 'installedBy',
    'نوع الاشتراك': 'subscriptionType',
    'الاشتراك': 'subscriptionType',
    'نوع التعاقد': 'subscriptionType',
    'شركة توريد العداد': 'meterSupplyCompany',
    'شركة العداد': 'meterSupplyCompany',
    'الشركة': 'meterSupplyCompany',
    'الاسم الكودي': 'codeName',
    'الكودي': 'codeName',
    'وصف المكان': 'locationDescription',
    'المكان': 'locationDescription',
    'حالة الكارت': 'cardStatus',
    'شاسية العداد الجديد': 'newMeterChassisNumber',
    'نوع العداد الجديد': 'newMeterType',
    'نوع الهدم': 'demolitionType',
    'تاريخ الهدم': 'demolitionDate',
    'القائم بالاستلام': 'meterReceivedBy',
    'حالة الإصلاح': 'repairStatus',
    'تاريخ الإصلاح': 'repairDate',
    'تاريخ الرجوع للتركيب': 'reinstallationDate',
    'اسم المشترك الجديد': 'newSubscriberName',
    'تاريخ التعاقد': 'contractDate'
};

// --- IndexedDB Storage Implementation ---
const DB_NAME = 'MeterAppDB';
const STORE_NAME = 'AppState';

const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
};

const saveToIndexedDB = async (key: string, value: any) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(value, key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const loadFromIndexedDB = async (key: string): Promise<any> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const saveState = async (): Promise<boolean> => {
    try {
        // Save to IndexedDB (Primary, large storage)
        await saveToIndexedDB('appState', state);
        // Also try to save to localStorage as a fallback/cache if small enough, but don't fail if it errors
        try {
            localStorage.setItem('appState', JSON.stringify(state));
        } catch (e) {
            // Ignore localStorage quota errors as we have IndexedDB
        }
        return true;
    } catch (error: any) {
        console.error("Failed to save state to IndexedDB:", error);
        showToast('حدث خطأ أثناء حفظ البيانات في قاعدة البيانات المحلية.', 'error');
        return false;
    }
};

const logActivity = (action: string, details: string, changeSummary?: string) => {
    if (!loggedInUser) return;
    const newLogEntry: ActivityLogEntry = {
        timestamp: new Date().toLocaleString('ar-EG'),
        user: loggedInUser.fullName,
        action: action,
        details: details,
        changeSummary: changeSummary || '',
    };
    state.activityLog.unshift(newLogEntry); // Add to the beginning of the array
};

function mergeWithDefaults(loadedObj: any, defaultObj: any): any {
    if (typeof loadedObj !== 'object' || loadedObj === null) return defaultObj;
    if (typeof defaultObj !== 'object' || defaultObj === null) return loadedObj;

    const result = { ...loadedObj };

    for (const key in defaultObj) {
        if (Object.prototype.hasOwnProperty.call(defaultObj, key)) {
            if (!result.hasOwnProperty(key)) {
                result[key] = defaultObj[key];
            } else if (
                typeof result[key] === 'object' && result[key] !== null && !Array.isArray(result[key]) &&
                typeof defaultObj[key] === 'object' && defaultObj[key] !== null && !Array.isArray(defaultObj[key])
            ) {
                result[key] = mergeWithDefaults(result[key], defaultObj[key]);
            }
        }
    }
    return result;
}

const loadState = async () => {
    const defaultState = JSON.parse(JSON.stringify(state));

    try {
        let loadedState = await loadFromIndexedDB('appState'); // Try IDB first

        // If nothing in IDB, try localStorage as a fallback (for one-time migration)
        if (!loadedState) {
            const savedStateJSON_LS = localStorage.getItem('appState');
            if (savedStateJSON_LS) {
                console.log("Loading state from localStorage fallback and migrating to IndexedDB.");
                loadedState = JSON.parse(savedStateJSON_LS);
            }
        }

        if (!loadedState) {
            console.log("No saved state found in IndexedDB or localStorage.");
            return; // Start with default state
        }

        if (typeof loadedState !== 'object' || loadedState === null) {
            throw new Error("Saved state is not an object.");
        }

        const mergedState = mergeWithDefaults(loadedState, defaultState);

        if (typeof mergedState.settings !== 'object' || mergedState.settings === null) {
            mergedState.settings = defaultState.settings;
        }

        // Initialize errorCodes if missing
        if (!mergedState.settings.errorCodes || !Array.isArray(mergedState.settings.errorCodes)) {
            mergedState.settings.errorCodes = [
                { code: 'Err 01', description: 'بطارية العداد فارغة', action: 'تغيير البطارية', meterType: 'مسبق الدفع' },
                { code: 'Err 02', description: 'غطاء العداد مفتوح (تلاعب)', action: 'مراجعة الفني / عمل محضر', meterType: 'الكل' },
                { code: 'Err 204', description: 'خطأ في الاتصال بالكارت', action: 'تنظيف الشريحة / استبدال الكارت', meterType: 'مسبق الدفع' },
                { code: 'Err 109', description: 'زيادة أحمال', action: 'فصل الأحمال الزائدة', meterType: 'الكل' }
            ];
        }
        // Initialize specific meter types for error codes
        if (!mergedState.settings.errorCodeMeterTypes || !Array.isArray(mergedState.settings.errorCodeMeterTypes) || mergedState.settings.errorCodeMeterTypes.length === 0) {
            mergedState.settings.errorCodeMeterTypes = [
                'جلوبال احادي', 'جلوبال ثلاثي', 'السويدي احادي', 'السويدي ثلاثي',
                'اسكرا احادي', 'اسكرا ثلاثي', 'المصرية احادي', 'المصرية ثلاثي',
                'جلوبال احادي', 'جلوبال ثلاثي', 'مصرية احادي', 'مصرية ثلاثي',
                'السويدي احادي', 'السويدي ثلاثي', 'اسكرا احادي', 'اسكرا ثلاثي',
                'المعصرة', 'جيزة باور'
            ];
        }
        // Initialize meterPages if missing
        if (!mergedState.settings.meterPages || !Array.isArray(mergedState.settings.meterPages)) {
            mergedState.settings.meterPages = [];
        }

        if (mergedState.settings.signatures) {
            mergedState.settings.replacementSignatures = mergedState.settings.signatures;
            delete mergedState.settings.signatures;
        }

        const keysThatShouldBeArrays: (keyof State)[] = [
            'meters', 'subscribers', 'users', 'activityLog', 'judicialControl', 'lostMeterMemos', 'zinatCollection', 'mukayasat', 'transformers'
        ];
        for (const key of keysThatShouldBeArrays) { // Add 'transformers' to this list
            if (!Array.isArray(mergedState[key])) {
                (mergedState[key] as any) = defaultState[key];
            }
        }

        const settingKeysThatShouldBeArrays: (keyof AppSettings)[] = [
            'technicians', 'technicalEngineers', 'headEngineers', 'addresses', 'pendingPageAddresses',
            'placeDescriptions', 'subscriptionTypes', 'meterTypes', 'meterSupplyCompanies',
            'meterCapacities', 'activityTypes', 'repairStatuses', 'removalReasons', 'demolitionTypes', 'councilNames', 'currentTransformerCapacities',
            'judicialControlStatuses', 'memoTypes', 'replacementSignatures', 'judicialSignatures',
            'collectionSignatures', 'mukayasatSignatures', 'faultyMeterSignatures', 'generalSignatures'
        ];
        for (const key of [...settingKeysThatShouldBeArrays, 'cardStatuses' as const]) {
            if (!Array.isArray(mergedState.settings[key])) {
                (mergedState.settings[key] as any) = defaultState.settings[key];
            }
        }

        // إصلاح مشكلة فراغ قائمة وصف المكان واستعادة الافتراضي إذا كانت فارغة
        if (!mergedState.settings.placeDescriptions || mergedState.settings.placeDescriptions.length === 0) {
            mergedState.settings.placeDescriptions = defaultState.settings.placeDescriptions;
        }

        // هجرة بيانات وصف المكان للسجلات الموجودة (مرة واحدة)
        const placeDescriptions = mergedState.settings.placeDescriptions;
        const metersNeedingDescription = mergedState.meters.filter((meter: DataItem) => !meter.locationDescription);
        if (metersNeedingDescription.length > 0 && placeDescriptions.length > 0) {
            metersNeedingDescription.forEach((meter: DataItem, index: number) => {
                const selectedDescription = placeDescriptions[index % placeDescriptions.length];
                meter.locationDescription = selectedDescription;
            });
            console.log(`✅ تم تعبئة وصف المكان تلقائياً لـ ${metersNeedingDescription.length} سجل عداد`);
            showToast(`تم تحديث وصف المكان لـ ${metersNeedingDescription.length} سجل بنجاح`, 'success');
        }

        if (mergedState.settings && mergedState.settings.dashboardCardsVisibility) {
            mergedState.settings.dashboardCardsVisibility = {
                ...defaultState.settings.dashboardCardsVisibility,
                ...mergedState.settings.dashboardCardsVisibility
            };
        }

        if (Array.isArray(mergedState.users)) {
            mergedState.users = mergedState.users.filter((u: any) => u && typeof u === 'object' && u.username && u.password && u.fullName);
        } else {
            mergedState.users = defaultState.users;
        }

        const adminUser = defaultState.users[0];
        const adminExists = mergedState.users.some((u: any) => u.username === adminUser.username);
        if (!adminExists) {
            mergedState.users.unshift(adminUser);
        }

        state = mergedState;

        // After successfully loading, save back to IndexedDB to complete migration
        // and remove from localStorage to prevent re-migration.
        await saveToIndexedDB('appState', state);
        console.log("State loaded and migrated successfully. Current state.transformers:", state.transformers); // Added log
        localStorage.removeItem('appState');
        console.log("State loaded and migrated successfully.");

    } catch (error) {
        console.error("Failed to load or parse state:", error);
        state = defaultState; // Fallback to default state on any error
        showToast('فشل تحميل البيانات المحفوظة، تم البدء بحالة افتراضية.', 'error');
    }
};

// عرض واجهة المستخدم والتفاعل
// --- UI Rendering and Interaction ---

/**
 * Updates the browser favicon based on status.
 * @param status The status type ('normal', 'success', 'error').
 */
const updateFavicon = (status: 'normal' | 'success' | 'error') => {
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
    }

    const colors = {
        normal: '#3b82f6', // Blue
        success: '#10b981', // Green
        error: '#ef4444'   // Red
    };

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="${colors[status] || colors.normal}" /></svg>`;
    link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

/**
 * Shows a toast notification.
 * @param message The message to display.
 * @param type The type of toast ('success' or 'error').
 */
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const container = document.getElementById('toast-container');
    if (!container) return;

    updateFavicon(type);

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'alert');

    container.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    // Animate out and remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => {
            if (toast.parentElement) {
                toast.remove();
            }
            if (container.childElementCount === 0) {
                updateFavicon('normal');
            }
        });
    }, 3000);
};

/**
 * Updates the main header title with the current page name.
 * @param title The title to display.
 */
const setPageTitle = (title: string) => {
    const mainHeaderTitle = document.getElementById('header-company-name');
    if (mainHeaderTitle) {
        mainHeaderTitle.textContent = title;
    }
    document.title = `منظومة العدادات 2025 - ${title}`;
};

/**
 * Populates a select dropdown with options.
 * @param selectElement The HTMLSelectElement to populate.
 * @param options An array of strings for the options.
 */
const populateSelect = (selectElement: HTMLSelectElement | null, options: string[], includeEmpty: boolean | string = false) => {
    if (!selectElement) return;
    selectElement.innerHTML = '';
    if (includeEmpty) {
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        if (typeof includeEmpty === 'string') {
            emptyOption.textContent = includeEmpty;
        } else {
            emptyOption.textContent = 'الكل';
        }
        selectElement.appendChild(emptyOption);
    }
    options.forEach(optionText => {
        const option = document.createElement('option');
        option.value = optionText;
        option.textContent = optionText;
        selectElement.appendChild(option);
    });
};


/**
 * Populates the username dropdown on the login screen.
 */
const populateUserDropdown = () => {
    const usernameSelect = document.getElementById('username') as HTMLSelectElement;
    if (!usernameSelect) return;

    usernameSelect.innerHTML = ''; // Clear existing options
    state.users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.username;
        option.textContent = user.fullName;
        usernameSelect.appendChild(option);
    });
};

/**
 * Applies the logo size from settings to the UI via a CSS custom property.
 * @param size The logo size percentage (e.g., 100).
 */
const applyLogoSize = (size: number) => {
    const multiplier = size / 100;
    document.documentElement.style.setProperty('--logo-size-multiplier', String(multiplier));
};


/**
 * Updates UI elements with data from the state.
 */
const updateUI = () => {
    if (loggedInUser) {
        // App container elements
        document.getElementById('sidebar-user-name')!.textContent = loggedInUser.fullName;
        document.getElementById('sidebar-user-role')!.textContent = loggedInUser.role === 'admin' ? 'Admin' : 'User';
        const avatarImg = document.querySelector('.user-profile img') as HTMLImageElement;
        if (avatarImg) {
            avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(loggedInUser.fullName)}&background=3b82f6&color=fff`;
        }

        // --- NEW Permission-based access control ---
        const showFor = (permissionKey: keyof typeof state.settings.permissions, element: HTMLElement) => {
            element.style.display = hasPermission(permissionKey) ? '' : 'none';
        };

        document.querySelectorAll<HTMLElement>('[data-permission]').forEach(el => {
            const permission = el.dataset.permission as keyof typeof state.settings.permissions;
            if (permission) {
                showFor(permission, el);
            }
        });

        // --- Button Permission-based access control ---
        const showForButton = (permissionKey: keyof typeof state.settings.buttonPermissions, element: HTMLElement) => {
            // If element is already hidden by specific permission, don't unhide it
            if (element.style.display === 'none') return;
            element.style.display = hasButtonPermission(permissionKey) ? '' : 'none';
        };

        // Apply to specific sidebar elements dynamically
        const sidebarAddMeter = document.getElementById('sidebar-add-meter-btn');
        if (sidebarAddMeter) sidebarAddMeter.setAttribute('data-button-permission', 'add_button');

        // Apply permission to print list buttons
        const printListBtnIds = [
            'print-lost-memos-list-btn',
            'print-judicial-control-list-btn',
            'print-collection-judicial-btn',
            'print-collection-zinat-btn',
            'print-activity-log-btn',
            'print-report-btn'
        ];
        printListBtnIds.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.setAttribute('data-button-permission', 'print_list_button');
        });

        document.querySelectorAll<HTMLElement>('[data-button-permission]').forEach(el => {
            const permission = el.dataset.buttonPermission as keyof typeof state.settings.buttonPermissions;
            if (permission) {
                showForButton(permission, el);
            }
        });

        // Special handling for 'معاينات' role to simplify their sidebar
        if (loggedInUser.role === 'معاينات') {
            document.querySelectorAll('.sidebar-nav .nav-link').forEach(el => {
                const target = (el as HTMLElement).dataset.target || '';
                const isMukayasatLink = target.startsWith('mukayasat') || target === 'dashboard' || target === 'pending-requests-section';
                (el as HTMLElement).style.display = isMukayasatLink ? '' : 'none';
            });
            // Hide nav-category groups that do not contain mukayasat links
            document.querySelectorAll('.nav-category').forEach(cat => {
                const hasMuk = cat.querySelector('.nav-link[data-target="mukayasat-registration"], .nav-link[data-target="mukayasat-list"], .nav-link[data-target="pending-requests-section"]');
                (cat as HTMLElement).style.display = hasMuk ? '' : 'none';
                // Also check the main category permission
                if (hasMuk) {
                    const permission = (cat as HTMLElement).dataset.permission as keyof typeof state.settings.permissions;
                    if (permission) showFor(permission, (cat as HTMLElement));
                }
            });
        } else {
            // Ensure default visibility for others
            // The general permission check already handles this, so we just need to reset display for non-mukayasat users
            document.querySelectorAll('.sidebar-nav .nav-link, .sidebar-nav .nav-category').forEach(el => {
                (el as HTMLElement).style.display = ''; // Reset first
            });
            // Then apply permissions
            document.querySelectorAll<HTMLElement>('[data-permission]').forEach(el => {
                const permission = el.dataset.permission as keyof typeof state.settings.permissions;
                if (permission) {
                    showFor(permission, el);
                }
            });
        }
    }

    // Handle Company Logo - Remove from sidebar and update other containers
    const defaultLogoSVG = `<svg class="logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M2 7L12 12M22 7L12 12M12 22V12M17 4.5L7 9.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
    const logoContainers = document.querySelectorAll('.logo-container:not(.logo-container-sidebar)');

    logoContainers.forEach(container => {
        if (state.settings.companyLogo) {
            container.innerHTML = `<img src="${state.settings.companyLogo}" alt="${state.settings.companyName} Logo" class="company-logo">`;
        } else {
            container.innerHTML = defaultLogoSVG;
        }
    });

    // Clear sidebar logo
    const sidebarLogoContainer = document.querySelector('.logo-container-sidebar');
    if (sidebarLogoContainer) {
        sidebarLogoContainer.innerHTML = '';
    }

    // Both login and app container elements
    const companyName = state.settings.companyName || 'ELMAGHRABI';
    const footerText = 'منظومة العدادات 2025 - جميع الحقوق محفوظة ELMGHRABI © 2025';

    document.title = 'منظومة العدادات 2025';
    document.getElementById('welcome-company-name')!.textContent = companyName;
    document.getElementById('login-company-name')!.textContent = companyName;
    document.getElementById('sidebar-company-name')!.textContent = companyName;
    // document.getElementById('header-company-name')!.textContent = companyName;
    const welcomeFooter = document.getElementById('welcome-footer-text');
    if (welcomeFooter) {
        welcomeFooter.textContent = footerText;
        welcomeFooter.style.paddingBottom = '2cm';
        welcomeFooter.style.display = 'block';
    }
    const loginFooter = document.getElementById('login-footer-text');
    if (loginFooter) {
        loginFooter.textContent = footerText;
        loginFooter.style.paddingBottom = '0';
        loginFooter.style.display = 'none';
    }
    const mainFooterText = document.getElementById('main-footer-text');
    if (mainFooterText) {
        mainFooterText.textContent = footerText;
        mainFooterText.style.paddingBottom = '2cm';
        mainFooterText.style.display = 'block';
    }

    // If the logged-in user is a mukayasat inspector, show specialized dashboard title/logo
    if (loggedInUser && loggedInUser.role === 'معاينات') {
        const mainHeaderTitle = document.querySelector('.main-header h2') as HTMLElement | null;
        if (mainHeaderTitle) mainHeaderTitle.textContent = 'المعاينات الفنية';
        // const mainHeaderTitle = document.querySelector('.main-header h2') as HTMLElement | null;
        // if (mainHeaderTitle) mainHeaderTitle.textContent = 'المعاينات الفنية';
        // Override header company name to emphasize the inspections area
        const headerNameEl = document.getElementById('header-company-name');
        if (headerNameEl) headerNameEl.textContent = 'المعاينات الفنية';
        // const headerNameEl = document.getElementById('header-company-name');
        // if (headerNameEl) headerNameEl.textContent = 'المعاينات الفنية';
    }
};


/**
 * Shows a specific screen and hides others.
 * @param screenId The ID of the screen to show.
 */
const showScreen = (screenId: 'welcome-screen' | 'login-screen' | 'app-container') => {
    const welcomeScreen = document.getElementById('welcome-screen') as HTMLElement | null;
    const loginScreen = document.getElementById('login-screen') as HTMLElement | null;
    const appContainer = document.getElementById('app-container') as HTMLElement | null;

    // First, hide all of them by removing the 'active' class
    if (welcomeScreen) welcomeScreen.classList.remove('active');
    if (loginScreen) loginScreen.classList.remove('active');
    if (appContainer) appContainer.classList.remove('active');

    // Then, show the correct one by adding the 'active' class
    if (screenId === 'welcome-screen') {
        welcomeScreen?.classList.add('active');
    } else if (screenId === 'login-screen') {
        loginScreen?.classList.add('active');
        // Clear password field to prevent auto-fill when showing login screen
        const passwordInput = document.getElementById('password') as HTMLInputElement;
        if (passwordInput) {
            passwordInput.value = '';
        }
    } else if (screenId === 'app-container') {
        appContainer?.classList.add('active');
    }
};

const hasPermission = (permissionKey: keyof typeof state.settings.permissions): boolean => {
    if (!loggedInUser) return false;
    // Super admin has all permissions
    if (loggedInUser.username === 'admin') return true;

    const permission = state.settings.permissions[permissionKey];
    return permission && permission.roles.includes(loggedInUser.role);
};

const hasDashboardPermission = (permissionKey: keyof typeof state.settings.dashboardPermissions): boolean => {
    if (!loggedInUser) return false;
    // Super admin has all permissions
    if (loggedInUser.username === 'admin') return true;

    const permission = state.settings.dashboardPermissions[permissionKey];
    // If permission doesn't exist in settings, default to showing the card for backward compatibility
    return !permission || permission.roles.includes(loggedInUser.role);
};

const hasButtonPermission = (permissionKey: keyof typeof state.settings.buttonPermissions): boolean => {
    if (!loggedInUser) return false;
    // Super admin has all permissions
    if (loggedInUser.username === 'admin') return true;

    const permission = state.settings.buttonPermissions[permissionKey];
    return permission && permission.roles.includes(loggedInUser.role);
};

const hasReportPermission = (permissionKey: keyof typeof state.settings.reportPermissions): boolean => {
    if (!loggedInUser) return false;
    // Super admin has all permissions
    if (loggedInUser.username === 'admin') return true;

    const permission = state.settings.reportPermissions[permissionKey];
    // If permission doesn't exist in settings, default to allowing for backward compatibility
    return !permission || permission.roles.includes(loggedInUser.role);
};

// التحقق من صحة النماذج
// --- Form Validation ---
const clearFormErrors = (form: HTMLFormElement) => {
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    form.querySelectorAll('.error-message-inline').forEach(el => el.remove());
};

const showFieldError = (element: HTMLElement, message: string) => {
    element.classList.add('is-invalid');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message-inline';
    errorDiv.textContent = message;

    const inputGroup = element.closest('.input-group');
    if (inputGroup) {
        // Prevent adding multiple error messages
        if (!inputGroup.querySelector('.error-message-inline')) {
            inputGroup.appendChild(errorDiv);
        }
    } else {
        element.parentElement?.insertBefore(errorDiv, element.nextSibling);
    }
};

const validateForm = (form: HTMLFormElement): boolean => {
    clearFormErrors(form);
    let isValid = true;

    const elements = Array.from(form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea'));

    for (const element of elements) {
        // Skip disabled elements or elements in hidden containers
        if (element.disabled || element.closest('.hidden')) {
            continue;
        }

        // Standard HTML5 validation
        if (!element.checkValidity()) {
            isValid = false;
            showFieldError(element, element.validationMessage);
        }
    }

    // --- Custom validation checks per form ---
    if (form.id === 'user-form') {
        const password = form.querySelector('#user-password') as HTMLInputElement;
        const confirmPassword = form.querySelector('#user-confirmPassword') as HTMLInputElement;
        if (password.value !== '' && password.value !== confirmPassword.value) {
            isValid = false;
            showFieldError(confirmPassword, 'كلمتا المرور غير متطابقتين.');
        }
    }

    if (form.id === 'report-generation-form') {
        const from = form.querySelector('#filter-date-from') as HTMLInputElement;
        const to = form.querySelector('#filter-date-to') as HTMLInputElement;
        if (from && to && from.value && to.value && from.value > to.value) {
            isValid = false;
            showFieldError(to, 'تاريخ "إلى" يجب أن يكون بعد تاريخ "من".');
        }
    }

    if (form.id === 'transformer-load-form') {
        const stageGroups = ['s1', 's2', 's3', 's4', 'streets'];

        stageGroups.forEach((stageKey) => {
            const phaseFields = ['r', 's', 't'].map((phase) => {
                const field = form.querySelector(`#transformer-load-${stageKey}-${phase}`) as HTMLInputElement | null;
                return field;
            }).filter(Boolean) as HTMLInputElement[];

            const filledValues = phaseFields.filter((field) => field.value !== '' && field.value !== null && field.value !== undefined);
            if (filledValues.length > 0 && filledValues.length < phaseFields.length) {
                isValid = false;
                phaseFields.forEach((field) => {
                    if (!field.value) {
                        showFieldError(field, 'يجب إدخال جميع القيم في هذه السرتية قبل الحفظ.');
                    }
                });
            }
        });
    }

    return isValid;
};

/**
 * معالجة تسجيل الدخول
 * Handles the login form submission.
 * @param event The form submission event.
 */
const handleLogin = (event: Event) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;

    if (!validateForm(form)) return;

    const username = (form.elements.namedItem('username') as HTMLSelectElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    const errorElement = document.getElementById('login-error');

    const user = state.users.find(u => u.username === username && u.password === password);

    if (user) {
        loggedInUser = { fullName: user.fullName, role: user.role, username: user.username };
        localStorage.setItem('currentUser', JSON.stringify(loggedInUser));
        errorElement?.classList.add('hidden');
        (document.getElementById('password') as HTMLInputElement).value = '';
        updateUI();
        showScreen('app-container');
        renderDashboard();
        // Navigate to dashboard view by clicking the specific sidebar link
        (document.querySelector('.sidebar-nav .nav-link[data-target="dashboard"]') as HTMLElement)?.click();
    } else {
        loggedInUser = null;
        errorElement?.classList.remove('hidden');
    }
};

/**
 * معالجة تسجيل الخروج
 * Handles the logout process.
 */
const handleLogout = () => {
    loggedInUser = null;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('lastActiveSection');
    showScreen('login-screen');
    populateUserDropdown(); // Repopulate in case users changed
};

/**
 * عرض بطاقات لوحة التحكم بناءً على الحالة
 * Renders the dashboard cards based on the state.
 */
const renderDashboard = () => {
    const grid = document.querySelector('.dashboard-grid');
    if (!grid) return;
    grid.innerHTML = ''; // Clear existing cards

    type DashboardCard = {
        key: string;
        id: string;
        title: string;
        icon: string;
        filter?: string | string[];
        count?: number;
        color?: string;
    };

    let cardData: DashboardCard[] = [
        { key: 'all-subscribers-card', id: 'subscribers-all', title: 'جميع المشتركين', icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>', count: state.meters.length, color: 'bg-primary' },
        { key: 'new-meters-card', id: 'subscribers-new', filter: 'جديد', title: 'عدادات جديدة', icon: '<path d="M12 20V10M18 20V4M6 20v-4"/>' },
        { key: 'lifted-meters-card', id: 'subscribers-faults', filter: 'مرفوع أعطال', title: 'عدادات مرفوعة اعطال', icon: '<path d="M12 20V10M18 20V4M6 20v-4"/>' },
        { key: 'replacement-card', id: 'subscribers-replacement', filter: 'مرفوع إحلال', title: 'إحلال وتجديد', icon: '<path d="M12 20V10M18 20V4M6 20v-4"/>' },
        { key: 'repairs-card', id: 'repaired-meters', title: 'الإصلاحات', icon: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>', count: state.meters.filter(m => m.repairStatus).length, color: 'bg-success' },
        { key: 'lost-memos-card', id: 'lost-memos-search', title: 'مذكرات الفقد', icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>', count: state.lostMeterMemos.length, color: 'bg-secondary' },
        { key: 'scrapped-meters-card', id: 'subscribers-demolition', filter: 'هدم', title: 'عدادات هدم', icon: '<path d="M12 20V10M18 20V4M6 20v-4"/>', color: 'bg-error' },
        { key: 'judicial-control-card', id: 'judicial-control-list', title: 'الضبطية القضائية', icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>', count: state.judicialControl.length, color: 'bg-warning' },
        { key: 'mukayasat-card', id: 'mukayasat-list', title: 'المعاينات الفنية', icon: '<path d="M12 2L2 7v10l10 5 10-5V7L12 2z"/>', count: state.mukayasat.length, color: 'bg-info' },
        {
            key: 'transformers-card', id: 'transformer-list', title: 'إدارة المحولات', icon: '<path d="M12 2L2 7v10l10 5 10-5V7L12 2z"/><polyline points="7 12 12 7 17 12"></polyline><line x1="12" y1="22" x2="12" y2="7"></line>', count: state.transformers.length, color: 'bg-primary'
        },
        {
            key: 'judicial-collection-card',
            id: 'collection-judicial',
            title: 'تحصيل الضبطية',
            icon: '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
            count: state.judicialControl.filter(item => {
                const total = Number(item.reconciliationAmount || 0);
                if (total === 0) return false;
                const paid = (item.payments || []).reduce((sum: number, p: Payment) => sum + p.amount, 0);
                return total - paid > 0;
            }).length,
            color: 'bg-primary'
        },
        {
            key: 'zinat-collection-card',
            id: 'collection-zinat',
            title: 'تحصيل زينات',
            icon: '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
            count: state.zinatCollection.filter(item => {
                const total = Number(item.amount || 0);
                if (total === 0) return false;
                const paid = (item.payments || []).reduce((sum: number, p: Payment) => sum + p.amount, 0);
                return total - paid > 0;
            }).length,
            color: 'bg-secondary'
        },
        {
            key: 'zinat-registration-card',
            id: 'zinat-registration',
            title: 'إضافة طلب زينات',
            icon: '<path d="M12 5v14M5 12h14"/>',
            color: 'bg-info'
        },
        {
            key: 'accounting-card',
            id: 'accounting-system',
            title: 'نظام المحاسبة',
            icon: '<path d="M4 19h16M7 16V8m5 8V5m5 11v-7"/><path d="M7 8h10"/>',
            color: 'bg-primary'
        },
        { key: 'users-card', id: 'user-management', title: 'المستخدمين', icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>', count: state.users.length, color: 'bg-muted' },
    ];

    // If the logged in user is a mukayasat inspector, replace dashboard cards with inspection-specific cards
    if (loggedInUser && loggedInUser.role === 'معاينات') {
        cardData = [
            { key: 'mukaysa-add-card', id: 'mukayasat-registration', title: 'ادخال مقايسة', icon: '<path d="M12 5v14M5 12h14"/>' },
            { key: 'mukayasat-list-card', id: 'mukayasat-list', title: 'المقايسات المحفوظة', icon: '<path d="M3 6h18M3 12h18M3 18h18"/>', count: state.mukayasat.length },
        ] as DashboardCard[];
    }

    const visibleCards = cardData.filter(card => {
        // For regular users, respect dashboard visibility settings
        if (loggedInUser && loggedInUser.role === 'معاينات') {
            // Only show mukayasat related cards for this role
            return ['mukaysa-add-card', 'mukayasat-list-card', 'mukayasat-card'].includes(card.key);
        }

        if (card.key === 'accounting-card') {
            return hasPermission('view_accounting_system') && hasDashboardPermission('show_accounting_card');
        }

        const visibilityPermissionKey = `show_${card.key.replace(/-/g, '_')}` as keyof typeof state.settings.dashboardPermissions;
        if (!hasDashboardPermission(visibilityPermissionKey)) return false;

        // Check user preference from settings
        if (state.settings.dashboardCardsVisibility[card.key as keyof typeof state.settings.dashboardCardsVisibility] === false) return false;

        // Hide users card for non-admins/supervisors
        if (card.key === 'users-card' && loggedInUser && !['admin', 'supervisor'].includes(loggedInUser.role) && loggedInUser.username !== 'admin') return false;
        return true;
    });

    visibleCards.forEach(data => {
        let count = 0;
        if (data.count !== undefined) {
            count = data.count;
        } else if (data.filter) {
            const filters = Array.isArray(data.filter) ? data.filter : [data.filter];
            count = state.meters.filter(m => filters.includes(m.subscriberType)).length;
        }

        const filterString = Array.isArray(data.filter) ? data.filter.join(',') : data.filter;
        const cardHTML = `
            <a href="#" class="card nav-link" data-target="${data.id}" data-filter="${filterString || ''}">
                <div class="card-header">
                    <div class="card-icon ${data.color || ''}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${data.icon}</svg>
                    </div>
                    <h4>${data.title}</h4>
                </div>
                <div class="card-value">
                    <span>${count}</span>
                </div>
            </a>`;
        grid.insertAdjacentHTML('beforeend', cardHTML);
    });

    // Add large logo at the bottom of dashboard
    const dashboardSection = document.getElementById('dashboard');
    if (dashboardSection) {
        let dashboardLogoContainer = dashboardSection.querySelector('.dashboard-logo-container') as HTMLElement | null;
        if (!dashboardLogoContainer) {
            dashboardLogoContainer = document.createElement('div');
            dashboardLogoContainer.className = 'dashboard-logo-container';
            (dashboardLogoContainer as HTMLElement).style.cssText = 'text-align: center; margin-top: 3cm; padding: 20px;';
            dashboardSection.appendChild(dashboardLogoContainer);
        }

        const defaultLogoSVG = `<svg class="logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M2 7L12 12M22 7L12 12M12 22V12M17 4.5L7 9.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
        if (state.settings.companyLogo) {
            dashboardLogoContainer.innerHTML = `<img src="${state.settings.companyLogo}" alt="${state.settings.companyName} Logo" class="dashboard-logo" style="width: 400px; height: auto;">`;
        } else {
            dashboardLogoContainer.innerHTML = `<div class="default-logo-svg" style="width: 400px; height: 400px; margin: 0 auto;">${defaultLogoSVG}</div>`;
        }
    }

    document.querySelectorAll('.dashboard-grid .nav-link').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });
};

// --- إدارة العدادات ---

const actionsColumn: ColumnDefinition = {
    key: 'actions',
    header: 'إجراءات',
    render: (item) => ` 
        ${hasButtonPermission('view_button') ? `<button class="btn btn-view-details" data-id="${item.id}">عرض</button>` : ''}
        ${hasButtonPermission('edit_button') ? `<button class="btn btn-edit-details" data-id="${item.id}">تعديل</button>` : ''}
    `
};

const baseColumns: ColumnDefinition[] = [
    { key: 'subscriberName', header: 'اسم المشترك' },
    { key: 'codeName', header: 'الاسم الكودي' },
    { key: 'subscriptionCode', header: 'كود الاشتراك' },
    { key: 'address', header: 'العنوان' },
];

const installationColumns: ColumnDefinition[] = [
    { key: 'installationDate', header: 'تاريخ التركيب' },
    { key: 'installedBy', header: 'القائم بالتركيب' },
];

const removalColumns: ColumnDefinition[] = [
    { key: 'removalReason', header: 'سبب الرفع' },
    { key: 'removalDate', header: 'تاريخ الرفع' },
    { key: 'removedBy', header: 'القائم بالرفع' },
];

const demolitionColumns: ColumnDefinition[] = [
    { key: 'demolitionDate', header: 'تاريخ الهدم/الاستغناء' },
    { key: 'meterReceivedBy', header: 'القائم بالاستلام' },
];

// Add shared and conditional column definitions for clarity
const commonMeterInfoColumns: ColumnDefinition[] = [
    { key: 'panelNumber', header: 'رقم اللوحة' },
    { key: 'accountReference', header: 'مرجع الحساب' },
    { key: 'activityType', header: 'نوع النشاط' },
    { key: 'subscriberType', header: 'نوع المشترك' },
];

const conditionalReadingColumn: ColumnDefinition = {
    key: 'readingAtRemoval',
    header: 'القراءة عند الرفع',
    render: (item: DataItem) => {
        if (['ميكانيكي', 'ديجيتال'].includes(item.meterType)) {
            return String(item.readingAtRemoval || '');
        } else if (item.meterType === 'مسبق الدفع') {
            return item.cardStatus || 'غير محدد';
        }
        return 'لا ينطبق';
    }
};

const conditionalCardStatusColumn: ColumnDefinition = {
    key: 'cardStatus',
    header: 'حالة الكارت',
    render: (item: DataItem) => {
        if (item.meterType === 'مسبق الدفع') {
            return item.cardStatus || 'غير محدد';
        }
        return 'لا ينطبق';
    }
};

const columnConfigs: { [key: string]: ColumnDefinition[] } = {
    'subscribers-all': [
        { key: 'accountRefF', header: 'ف' },
        { key: 'accountRefH', header: 'ح' },
        { key: 'accountRefY', header: 'ي' },
        { key: 'accountRefM', header: 'م' },
        ...baseColumns,
        { key: 'meterChassisNumber', header: 'شاسية العداد' },
        { key: 'meterType', header: 'نوع العداد' },
        { key: 'meterCapacity', header: 'قدرة العداد' },
        { key: 'subscriptionType', header: 'نوع الاشتراك' },
        { key: 'subscriberType', header: 'الحالة' },
        { key: 'activityType', header: 'نوع النشاط' },
        { key: 'locationDescription', header: 'وصف المكان' },
        actionsColumn
    ],
    'subscribers-new': [
        { key: 'accountRefF', header: 'ف' },
        { key: 'accountRefH', header: 'ح' },
        { key: 'accountRefY', header: 'ي' },
        { key: 'accountRefM', header: 'م' },
        ...baseColumns,
        { key: 'meterChassisNumber', header: 'شاسية العداد' },
        { key: 'meterType', header: 'نوع العداد' },
        { key: 'panelNumber', header: 'رقم اللوحة' },
        { key: 'activityType', header: 'نوع النشاط' },
        { key: 'subscriberType', header: 'نوع المشترك' },
        { key: 'installationStatus', header: 'حالة التركيب' },
        conditionalReadingColumn,
        conditionalCardStatusColumn,
        ...installationColumns,
        actionsColumn
    ],
    'subscribers-faults': [
        { key: 'accountRefF', header: 'ف' },
        { key: 'accountRefH', header: 'ح' },
        { key: 'accountRefY', header: 'ي' },
        { key: 'accountRefM', header: 'م' },
        ...baseColumns,
        { key: 'meterChassisNumber', header: 'شاسية العداد' },
        { key: 'meterType', header: 'نوع العداد' },
        { key: 'panelNumber', header: 'رقم اللوحة' },
        { key: 'activityType', header: 'نوع النشاط' },
        { key: 'subscriberType', header: 'نوع المشترك' },
        conditionalReadingColumn,
        conditionalCardStatusColumn,
        ...removalColumns,
        actionsColumn
    ],
    'subscribers-replacement': [
        { key: 'accountRefF', header: 'ف' },
        { key: 'accountRefH', header: 'ح' },
        { key: 'accountRefY', header: 'ي' },
        { key: 'accountRefM', header: 'م' },
        { key: 'subscriberName', header: 'اسم المشترك' },
        { key: 'subscriptionCode', header: 'كود الاشتراك' },
        { key: 'address', header: 'العنوان' },
        { key: 'meterChassisNumber', header: 'شاسية العداد المرفوع' },
        { key: 'meterType', header: 'نوع العداد القديم' }, // Added for clarity
        { key: 'removalReason', header: 'سبب الرفع' }, // Added for clarity
        { key: 'newMeterType', header: 'نوع العداد الجديد' },
        conditionalReadingColumn,
        conditionalCardStatusColumn,
        { key: 'removalDate', header: 'تاريخ الرفع' },
        { key: 'newMeterChassisNumber', header: 'شاسية العداد الجديد' },
        { key: 'installationDate', header: 'تاريخ التركيب' },
        actionsColumn
    ],
    'subscribers-substituted': [
        { key: 'accountRefF', header: 'ف' },
        { key: 'accountRefH', header: 'ح' },
        { key: 'accountRefY', header: 'ي' },
        { key: 'accountRefM', header: 'م' },
        { key: 'subscriberName', header: 'اسم المشترك' },
        { key: 'subscriptionCode', header: 'كود الاشتراك' },
        { key: 'address', header: 'العنوان' },
        { key: 'meterChassisNumber', header: 'شاسية العداد القديم' },
        { key: 'meterType', header: 'نوع العداد' },
        { key: 'panelNumber', header: 'رقم اللوحة' },
        { key: 'activityType', header: 'نوع النشاط' },
        { key: 'subscriberType', header: 'نوع المشترك' },
        conditionalReadingColumn,
        conditionalCardStatusColumn,
        { key: 'newMeterChassisNumber', header: 'شاسية العداد الجديد' },
        ...installationColumns,
        actionsColumn
    ],
    'subscribers-scrapped': [
        { key: 'accountRefF', header: 'ف' },
        { key: 'accountRefH', header: 'ح' },
        { key: 'accountRefY', header: 'ي' },
        { key: 'accountRefM', header: 'م' },
        ...baseColumns,
        { key: 'meterChassisNumber', header: 'شاسية العداد' },
        { key: 'meterType', header: 'نوع العداد' },
        { key: 'panelNumber', header: 'رقم اللوحة' },
        { key: 'activityType', header: 'نوع النشاط' },
        { key: 'subscriberType', header: 'نوع المشترك' },
        conditionalReadingColumn,
        conditionalCardStatusColumn,
        ...demolitionColumns,
        actionsColumn
    ],
    'subscribers-demolition': [
        { key: 'accountRefF', header: 'ف' },
        { key: 'accountRefH', header: 'ح' },
        { key: 'accountRefY', header: 'ي' },
        { key: 'accountRefM', header: 'م' },
        ...baseColumns,
        { key: 'meterChassisNumber', header: 'شاسية العداد' },
        { key: 'meterType', header: 'نوع العداد' },
        { key: 'panelNumber', header: 'رقم اللوحة' },
        { key: 'activityType', header: 'نوع النشاط' },
        { key: 'subscriberType', header: 'نوع المشترك' },
        conditionalReadingColumn,
        conditionalCardStatusColumn,
        ...demolitionColumns,
        {
            key: 'liquidationStatus',
            header: 'حالة التصفية',
            render: (item: DataItem) => item.liquidationDate ? '<span class="status-badge bg-success">تمت التصفية</span>' : '<span class="status-badge bg-warning">غير مصفى</span>'
        },
        {
            key: 'actions',
            header: 'إجراءات',
            render: (item: DataItem) => `
                <div class="actions-inline">
                    ${hasButtonPermission('view_button') ? `<button class="action-btn view btn-view-details" data-id="${item.id}" title="عرض"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></button>` : ''}
                    ${hasButtonPermission('edit_button') ? `<button class="action-btn edit btn-edit-details" data-id="${item.id}" title="تعديل"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>` : ''}
                    <button class="action-btn" onclick="window.openLiquidationForm(${item.id})" title="${item.liquidationDate ? 'تعديل التصفية' : 'تصفية'}" style="${item.liquidationDate ? 'color: var(--success-color); border-color: var(--success-color);' : 'color: var(--primary-color); border-color: var(--primary-color);'}"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M16 13H8"></path><path d="M16 17H8"></path><path d="M10 9H9H8"></path></svg></button>
                </div>
            `
        }
    ],
};

const renderMeterManagementSection = (filter?: string) => {
    const tableBody = document.querySelector('#meters-table tbody');
    const filterInput = document.getElementById('meters-table-filter') as HTMLInputElement;
    if (!tableBody) return;

    if (filterInput) {
        filterInput.value = ''; // Clear search input when rendering
    }

    tableBody.innerHTML = '';
    let metersToRender = state.meters;
    if (filter) {
        const filters = filter.split(',');
        metersToRender = state.meters.filter(m => filters.includes(m.subscriberType));
    }
    metersToRender.forEach(meter => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${meter.subscriberName || ''}</td>
            <td>${meter.subscriptionCode || ''}</td>
            <td>${meter.meterChassisNumber || ''}</td>
            <td><span class="status-badge">${meter.subscriberType || 'غير محدد'}</span></td>
            <td>${meter.meterType || ''}</td>
            <td>${meter.address || ''}</td>
            <td>${meter.locationDescription || ''}</td>
            <td class="actions-cell">
                ${hasButtonPermission('view_button') ? `<button class="btn btn-view-details" data-id="${meter.id}">عرض</button>` : ''}
                ${hasButtonPermission('edit_button') ? `<button class="btn btn-edit-details" data-id="${meter.id}">تعديل</button>` : ''}
            </td>
        `;
        tableBody.appendChild(row);
    });

    document.querySelector('#meters-table thead')!.innerHTML = `
        <tr>
            <th>اسم المشترك</th>
            <th>كود الاشتراك</th>
            <th>شاسية العداد</th>
            <th>الحالة</th>
            <th>نوع العداد</th>
            <th>العنوان</th>
            <th>وصف المكان</th>
            <th>إجراءات</th>
        </tr>
    `;
};

const renderFilteredMeterTable = (tableElementId: string, filters: string[], columns: ColumnDefinition[], dataOverride?: DataItem[]) => {
    const table = document.getElementById(tableElementId);
    if (!table) return;

    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    if (!thead || !tbody) return;

    // Render header
    thead.innerHTML = `<tr>${columns.map(c => `<th>${c.header}</th>`).join('')}</tr>`;

    // Filter data
    const filteredMeters = dataOverride || state.meters.filter(meter =>
        filters.includes(meter.subscriberType)
    );

    // Render body
    tbody.innerHTML = '';
    if (filteredMeters.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${columns.length}" style="text-align: center;">لا توجد بيانات لعرضها.</td></tr>`;
        return;
    }

    filteredMeters.forEach(meter => {
        const row = document.createElement('tr');
        columns.forEach(col => {
            const td = document.createElement('td');
            if (col.render) {
                td.innerHTML = col.render(meter);
            } else {
                const value = meter[col.key as keyof DataItem];
                // Ensure empty cells for null/undefined values
                td.textContent = (value !== undefined && value !== null) ? String(value) : '';
            }

            if (col.key === 'actions') {
                td.classList.add('actions-cell');
            }

            row.appendChild(td);
        });
        tbody.appendChild(row);
    });
};

const filterTableByMultipleCriteria = (tableId: string) => {
    const table = document.getElementById(tableId);
    if (!table) return;

    const filterContainer = document.querySelector(`.multi-filter-container[data-table-id="${tableId}"]`);
    if (!filterContainer) return;

    const filters = Array.from(filterContainer.querySelectorAll<HTMLInputElement>('.table-filter'));
    const filterValues: { [key: number]: string } = {};
    filters.forEach(input => {
        const colIndex = parseInt(input.dataset.colIndex || '-1', 10);
        if (colIndex !== -1) {
            filterValues[colIndex] = input.value.toLowerCase();
        }
    });

    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
        let isVisible = true;
        const cells = row.querySelectorAll('td');

        for (const colIndexStr in filterValues) {
            const colIndex = parseInt(colIndexStr, 10);
            const filterValue = filterValues[colIndex];
            const cell = cells[colIndex];
            if (filterValue && cell && !cell.textContent?.toLowerCase().includes(filterValue)) {
                isVisible = false;
                break;
            }
        }
        row.style.display = isVisible ? '' : 'none';
    });
};

const populateMeterFormForSearch = (data: DataItem) => {
    const form = document.getElementById('meter-form') as HTMLFormElement;
    if (!form) return;

    // Populate fields
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach((input: any) => {
        if (input.id && data[input.id] !== undefined) {
            input.value = data[input.id];
        }
        // Disable all except subscriberType and removal fields
        if (input.id !== 'subscriberType' && input.id !== 'removalReason' && input.id !== 'removalDate' && input.id !== 'removedBy' && input.id !== 'cardStatus') {
            input.disabled = true;
            input.style.backgroundColor = '#e9ecef';
        }
    });

    // 🔧 FIXED: ضمان تعبئة dropdown وصف المكان
    const locationSelect = document.getElementById('locationDescription') as HTMLSelectElement;
    if (locationSelect && data.locationDescription && state.settings.placeDescriptions.includes(data.locationDescription)) {
        locationSelect.value = data.locationDescription;
    }

    // Handle ID
    (document.getElementById('meter-id') as HTMLInputElement).value = String(data.id);

    // Show clear button
    document.getElementById('meter-search-clear-btn')?.classList.remove('hidden');

    // Trigger visibility update to handle button state
    updateMeterFormVisibility();
};

const handleMeterRegistrationSearch = () => {
    const queryInput = document.getElementById('meter-search-query') as HTMLInputElement;
    const query = queryInput.value.trim().toLowerCase();

    if (!query) {
        showToast('يرجى إدخال بيانات للبحث.', 'error');
        return;
    }

    const result = [...state.meters].reverse().find(m =>
        (m.subscriberName && m.subscriberName.toLowerCase().includes(query)) ||
        (m.meterChassisNumber && m.meterChassisNumber.toLowerCase().includes(query)) ||
        (m.subscriptionCode && m.subscriptionCode.toLowerCase().includes(query))
    );

    if (result) {
        populateMeterFormForSearch(result);
        showToast('تم العثور على البيانات.');
    } else {
        showToast('لم يتم العثور على بيانات مطابقة.', 'error');
    }
};

const clearMeterRegistrationSearch = () => {
    const form = document.getElementById('meter-form') as HTMLFormElement;
    if (!form) return;

    form.reset();
    (document.getElementById('meter-id') as HTMLInputElement).value = '';

    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach((input: any) => {
        input.disabled = false;
        input.style.backgroundColor = '';
    });

    document.getElementById('meter-search-clear-btn')?.classList.add('hidden');
    const queryInput = document.getElementById('meter-search-query') as HTMLInputElement;
    if (queryInput) queryInput.value = '';

    updateMeterFormVisibility();
};

// دالة مساعدة لتوحيد النصوص العربية والأرقام للبحث الدقيق
const normalizeString = (str: string | any | undefined | null): string => {
    if (!str) return '';
    return String(str)
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)])
        .toLowerCase()
        .trim();
};

// --- Search Helper Functions ---
const searchIncludes = (dataStr: string | undefined | null, searchStr: string | null | undefined): boolean => {
    if (!searchStr) return true;
    return normalizeString(dataStr).includes(normalizeString(searchStr));
};

const searchAllTerms = (dataStr: string | undefined | null, searchStr: string | null | undefined): boolean => {
    if (!searchStr) return true;
    const normData = normalizeString(dataStr);
    const terms = normalizeString(searchStr).split(' ').filter(t => t.trim() !== '');
    return terms.every(term => normData.includes(term));
};

const searchAnyTerm = (dataStr: string | undefined | null, searchStr: string | null | undefined): boolean => {
    if (!searchStr) return true;
    const normData = normalizeString(dataStr);
    const terms = normalizeString(searchStr).split(' ').filter(t => t.trim() !== '');
    return terms.some(term => normData.includes(term));
};

const handleAllSubscribersSearch = () => {
    // Get raw values directly by ID
    const filterName = (document.getElementById('search-all-name') as HTMLInputElement)?.value;
    const filterCode = (document.getElementById('search-all-code') as HTMLInputElement)?.value;
    const filterChassis = (document.getElementById('search-all-chassis') as HTMLInputElement)?.value;
    const filterPanel = (document.getElementById('search-all-panel') as HTMLInputElement)?.value;
    const filterStatus = (document.getElementById('search-all-status') as HTMLSelectElement)?.value;

    // Read multiselects for Address and Activity
    const addressOptionsContainer = document.getElementById('options-search-all-address');
    const selectedAddresses = Array.from(addressOptionsContainer?.querySelectorAll('input:checked') || []).map((cb: any) => cb.value);

    const activityOptionsContainer = document.getElementById('options-search-all-activity');
    const selectedActivities = Array.from(activityOptionsContainer?.querySelectorAll('input:checked') || []).map((cb: any) => cb.value);

    const filterRefF = (document.getElementById('search-all-refF') as HTMLInputElement)?.value?.trim();
    const filterRefH = (document.getElementById('search-all-refH') as HTMLInputElement)?.value?.trim();
    const filterRefY = (document.getElementById('search-all-refY') as HTMLInputElement)?.value?.trim();
    const filterRefM = (document.getElementById('search-all-refM') as HTMLInputElement)?.value?.trim();

    const allowedStatuses = ['جديد', 'مرفوع أعطال', 'مرفوع إحلال', 'استغناء', 'تغير عقد اشتراك', 'استبدال', 'هدم', 'تم الإصلاح', 'لا يمكن إصلاحه', 'تم استبداله', 'تم تغير العداد', 'بيانات مستوردة من إكسل'];

    const filteredResults = state.meters.filter(m => {
        // First check if it belongs in this view
        if (!allowedStatuses.includes(m.subscriberType)) return false;

        // Apply filters using the new helper functions
        if (!searchAllTerms(m.subscriberName, filterName)) return false;
        if (!searchIncludes(m.subscriptionCode, filterCode)) return false;
        if (!searchIncludes(m.meterChassisNumber, filterChassis)) return false;
        if (!searchIncludes(m.panelNumber, filterPanel)) return false;
        if (filterStatus && m.subscriberType !== filterStatus) return false;

        if (selectedAddresses.length > 0 && !selectedAddresses.includes(m.address || '')) return false;
        if (selectedActivities.length > 0 && !selectedActivities.includes(m.activityType || '')) return false;

        // Use exact match for account reference fields
        if (filterRefF && String(m.accountRefF || '').trim() !== filterRefF) return false;
        if (filterRefH && String(m.accountRefH || '').trim() !== filterRefH) return false;
        if (filterRefY && String(m.accountRefY || '').trim() !== filterRefY) return false;
        if (filterRefM && String(m.accountRefM || '').trim() !== filterRefM) return false;

        return true;
    });

    // Re-construct columns logic (including admin checkboxes)
    let columns = [...columnConfigs['subscribers-all']];
    if (loggedInUser?.role === 'admin' || loggedInUser?.role === 'supervisor') {
        columns.unshift({
            key: 'selection',
            header: '<input type="checkbox" id="select-all-subscribers">',
            render: (item) => `<input type="checkbox" class="select-subscriber-row" value="${item.id}">`
        });
        setTimeout(setupAllSubscribersBulkActions, 0);
    }

    renderFilteredMeterTable('subscribers-all-table', allowedStatuses, columns, filteredResults);
    showToast(`تم العثور على ${filteredResults.length} سجل مطابق.`);
};

const handleResetAllSubscribersSearch = () => {
    const ids = ['search-all-name', 'search-all-code', 'search-all-chassis', 'search-all-panel', 'search-all-status', 'search-all-refF', 'search-all-refH', 'search-all-refY', 'search-all-refM'];
    ids.forEach(id => {
        const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement;
        if (el) el.value = '';
    });

    // Reset Multiselects
    document.querySelectorAll('#options-search-all-address input:checked, #options-search-all-activity input:checked').forEach((cb: any) => {
        cb.checked = false;
    });

    const btnAddress = document.getElementById('btn-search-all-address');
    if (btnAddress) {
        btnAddress.textContent = btnAddress.getAttribute('data-placeholder') || 'بحث بالعنوان...';
    }

    const btnActivity = document.getElementById('btn-search-all-activity');
    if (btnActivity) {
        btnActivity.textContent = btnActivity.getAttribute('data-placeholder') || 'بحث بنوع النشاط...';
    }

    handleAllSubscribersSearch();
};

const ensureMeterSupplyCompanyField = (prefix: string) => {
    let select = document.getElementById(`${prefix}meterSupplyCompany`) as HTMLSelectElement;
    let div: HTMLElement;

    if (select) {
        div = select.closest('.input-group') as HTMLElement;
        const val = select.value;
        select.required = true;
        populateSelect(select, state.settings.meterSupplyCompanies, 'اختر شركة التوريد');
        select.value = val;
        return;
    } else {
        div = document.createElement('div');
        div.className = 'input-group';
        div.innerHTML = `
            <label for="${prefix}meterSupplyCompany">شركة توريد العداد</label>
            <select id="${prefix}meterSupplyCompany"></select>
        `;
        select = div.querySelector('select') as HTMLSelectElement;
        select.required = true;
        populateSelect(select, state.settings.meterSupplyCompanies, 'اختر شركة التوريد');
    }

    const targetInput = document.getElementById(`${prefix}newMeterType`);
    if (targetInput) {
        const targetGroup = targetInput.closest('.input-group');
        if (targetGroup && targetGroup.parentNode) {
            targetGroup.parentNode.insertBefore(div, targetGroup.nextSibling);
            return;
        }
    }

    const container = document.getElementById(`${prefix}installation-fields`);
    if (container) {
        container.appendChild(div);
    }
};

const openMeterForm = () => {
    ensureMeterSupplyCompanyField('');
    const form = document.getElementById('meter-form') as HTMLFormElement;
    form.reset();
    clearFormErrors(form);

    // إضافة خاصية منع التعبئة التلقائية للنموذج
    form.setAttribute('autocomplete', 'off');

    // ضمان تصفير حقل شركة التوريد لإظهار "اختر..." في كل مرة
    const supplySelect = document.getElementById('meterSupplyCompany') as HTMLSelectElement;
    if (supplySelect) {
        supplySelect.value = '';
        supplySelect.setAttribute('autocomplete', 'off');
    }

    (document.getElementById('meter-id') as HTMLInputElement).value = '';

    // Populate dropdowns
    const initSelect = (id: string, options: string[], placeholder: string = 'اختر') => {
        let el = document.getElementById(id) as HTMLElement;
        if (el) {
            if (el.tagName !== 'SELECT') {
                const select = document.createElement('select');
                select.id = id;
                select.className = el.className;
                el.replaceWith(select);
                el = select;
            }
            populateSelect(el as HTMLSelectElement, options, placeholder);
            el.setAttribute('autocomplete', 'off');
            (el as HTMLSelectElement).required = true;
        }
    };

    initSelect('meterType', state.settings.meterTypes, 'اختر نوع العداد');
    initSelect('newMeterType', state.settings.meterTypes, 'اختر نوع العداد الجديد');
    initSelect('activityType', state.settings.activityTypes, 'اختر نوع النشاط');
    initSelect('subscriptionType', state.settings.subscriptionTypes, 'اختر نوع الاشتراك');
    initSelect('meterCapacity', state.settings.meterCapacities, 'اختر قدرة العداد');
    initSelect('removalReason', state.settings.removalReasons, 'اختر سبب الرفع');
    initSelect('removedBy', state.settings.technicians, 'اختر القائم بالرفع');
    initSelect('cardStatus', state.settings.cardStatuses, 'اختر حالة الكارت');
    initSelect('installedBy', state.settings.technicians, 'اختر القائم بالتركيب');
    initSelect('meterReceivedBy', state.settings.technicians, 'اختر القائم بالاستلام');
    initSelect('demolitionType', state.settings.demolitionTypes, 'اختر نوع الهدم');
    initSelect('address', state.settings.addresses, 'اختر العنوان');
    initSelect('locationDescription', state.settings.placeDescriptions, 'اختر وصف المكان');
    initSelect('subscriberType', ['جديد', 'مرفوع أعطال', 'مرفوع إحلال', 'استغناء', 'تغير عقد اشتراك', 'استبدال', 'هدم'], 'اختر حالة المشترك');

    // 🔧 FIXED: تعبئة تلقائية لوصف المكان بناءً على نوع النشاط
    const detailsLocationSelect = document.getElementById('details-locationDescription') as HTMLSelectElement;

    if (detailsLocationSelect) {
        populateSelect(detailsLocationSelect, state.settings.placeDescriptions, 'اختر وصف المكان');
    }

    // Inject Search UI
    const formContainer = document.getElementById('meter-registration');
    if (formContainer && !document.getElementById('meter-search-container')) {
        const searchDiv = document.createElement('div');
        searchDiv.id = 'meter-search-container';
        searchDiv.className = 'search-section';
        searchDiv.style.cssText = 'margin-bottom: 20px; display: flex; gap: 10px; align-items: center; background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #dee2e6;';
        searchDiv.innerHTML = `
            <input type="text" id="meter-search-query" placeholder="بحث بالاسم، رقم الشاسية، أو كود المشترك" class="form-control" style="flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
            <button type="button" id="meter-search-btn" class="btn">بحث</button>
            <button type="button" id="meter-search-clear-btn" class="btn btn-secondary hidden">إلغاء</button>
        `;
        const formTitle = document.getElementById('meter-form-title');
        if (formTitle && formTitle.parentNode) {
            formTitle.parentNode.insertBefore(searchDiv, formTitle.nextSibling);
        }

        document.getElementById('meter-search-btn')?.addEventListener('click', handleMeterRegistrationSearch);
        document.getElementById('meter-search-clear-btn')?.addEventListener('click', clearMeterRegistrationSearch);
    }

    // Reset search UI state on open
    clearMeterRegistrationSearch();

    document.getElementById('meter-form-title')!.textContent = 'إضافة سجل عداد جديد';

    // Trigger change events to show/hide conditional fields correctly on load
    document.getElementById('meterType')?.dispatchEvent(new Event('change'));
    document.getElementById('subscriberType')?.dispatchEvent(new Event('change'));

    // Navigate to the form section
    document.querySelectorAll('.content-section.active').forEach(s => s.classList.remove('active'));
    document.getElementById('meter-registration')?.classList.add('active');
    setPageTitle('تسجيل عداد');
};

const resetMeterForm = () => {
    const form = document.getElementById('meter-form') as HTMLFormElement;
    if (!form) return;

    // Preserve values of fields that might be useful to keep
    const subscriberType = (document.getElementById('subscriberType') as HTMLSelectElement).value;

    form.reset(); // Clear all fields
    clearFormErrors(form);
    (document.getElementById('meter-id') as HTMLInputElement).value = '';

    updateMeterFormVisibility();
};

const renderTransformerQuerySection = () => {
    (document.getElementById('transformer-query-form') as HTMLFormElement)?.reset();
    document.getElementById('transformer-query-result')?.classList.add('hidden');
};

const handleTransformerQuerySearch = (e: Event) => {
    e.preventDefault();
    const name = normalizeString((document.getElementById('query-transformer-name') as HTMLInputElement).value);
    const chassis = normalizeString((document.getElementById('query-transformer-chassis') as HTMLInputElement).value);
    const sim = normalizeString((document.getElementById('query-transformer-sim') as HTMLInputElement).value);

    if (!name && !chassis && !sim) {
        showToast('يرجى إدخال معيار بحث واحد على الأقل.', 'error');
        return;
    }

    const filtered = state.transformers.filter(t =>
        (!name || normalizeString(t.transformerName).includes(name)) &&
        (!chassis || normalizeString(t.smartMeterChassis).includes(chassis)) &&
        (!sim || normalizeString(t.simCardNumber).includes(sim))
    );

    displayTransformerQueryResult(filtered);
};

const displayTransformerQueryResult = (results: DataItem[]) => {
    const container = document.getElementById('transformer-query-result')!;
    container.innerHTML = '';
    container.classList.remove('hidden');

    if (results.length === 0) {
        container.innerHTML = `<div class="no-results-message">لم يتم العثور على محولات مطابقة لمعايير البحث.</div>`;
        return;
    }

    results.forEach(item => {
        const card = document.createElement('div');
        card.className = 'statement-result-card';
        card.style.marginTop = '1rem';
        card.innerHTML = `
            <h4>
                <span>محول: ${item.transformerName}</span>
                <span class="status-badge bg-info">${item.councilName}</span>
            </h4>
            <div class="details-grid">
                <div class="detail-item"><label>العنوان</label><span class="value">${item.transformerAddress || '-'}</span></div>
                <div class="detail-item"><label>قدرة المحول</label><span class="value">${item.transformerCapacityKVA} ك.ف.أ</span></div>
                <div class="detail-item"><label>شاسية العداد</label><span class="value">${item.smartMeterChassis || '-'}</span></div>
                <div class="detail-item"><label>رقم الشريحة</label><span class="value">${item.simCardNumber || '-'}</span></div>
                <div class="detail-item"><label>قدرة محولات التيار</label><span class="value">${item.currentTransformerCapacity}</span></div>
            </div>
            <div class="form-actions" style="margin-top: 1rem; border-top: none; padding-top: 0;">
                <button class="btn btn-edit-details" onclick="window.editTransformer(${item.id})">تعديل البيانات</button>
            </div>
        `;
        container.appendChild(card);
    });
};

const handleMeterFormSubmit = (event: Event) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;

    if (!validateForm(form)) {
        showToast('يرجى تصحيح الحقول المطلوبة.', 'error');
        return;
    }

    const idInput = document.getElementById('meter-id') as HTMLInputElement;
    let existingId = idInput.value ? parseInt(idInput.value, 10) : null;

    const formData: DataItem = {
        id: existingId || Date.now(),
    };

    const formElements = form.elements;
    for (let i = 0; i < formElements.length; i++) {
        const element = formElements[i];
        if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
            if (element.id) {
                formData[element.id] = element.value;
            }
        }
    }

    // Manually construct accountReference from its parts and also save individual parts
    const accountRefF = (form.querySelector(`#${form.id.includes('details') ? 'details-' : ''}accountRefF`) as HTMLInputElement)?.value || '';
    const accountRefH = (form.querySelector(`#${form.id.includes('details') ? 'details-' : ''}accountRefH`) as HTMLInputElement)?.value || '';
    const accountRefY = (form.querySelector(`#${form.id.includes('details') ? 'details-' : ''}accountRefY`) as HTMLInputElement)?.value || '';
    const accountRefM = (form.querySelector(`#${form.id.includes('details') ? 'details-' : ''}accountRefM`) as HTMLInputElement)?.value || '';
    formData.accountReference = `${accountRefF}${accountRefH}${accountRefY}${accountRefM}`;
    // Save individual parts
    Object.assign(formData, { accountRefF, accountRefH, accountRefY, accountRefM });

    // Force new record creation for 'مرفوع أعطال' to preserve original data
    if (formData.subscriberType === 'مرفوع أعطال' && existingId) {
        existingId = null;
        formData.id = Date.now();
    }

    // For new meters, map data from installation fields to main properties.
    if (formData.subscriberType === 'جديد') {
        formData.meterChassisNumber = formData.newMeterChassisNumber;
        formData.meterType = formData.newMeterType;
    }

    // Validation: Check if the chassis number already exists.
    if (formData.meterChassisNumber) {
        const existingMeterByChassis = state.meters.find(m => m.meterChassisNumber === formData.meterChassisNumber && m.id !== formData.id);
        if (existingMeterByChassis) {
            // Allow duplicate chassis for 'مرفوع أعطال' to enable creating a copy
            if (formData.subscriberType !== 'مرفوع أعطال') {
                showToast('خطأ: رقم شاسية العداد مسجل بالفعل.', 'error');
                showFieldError(document.getElementById('meterChassisNumber')!, 'رقم الشاسية هذا مسجل بالفعل');
                return;
            }
        }
    }

    const newChassisNumber = formData.newMeterChassisNumber as string;
    const newMeterType = formData.newMeterType as string;

    // If it's a replacement, also validate the new chassis number.
    if (formData.subscriberType === 'مرفوع إحلال' && newChassisNumber) {
        const existingMeterByNewChassis = state.meters.find(m => m.meterChassisNumber === newChassisNumber);
        if (existingMeterByNewChassis) {
            showToast('خطأ: رقم شاسية العداد الجديد مسجل بالفعل.', 'error');
            showFieldError(document.getElementById('newMeterChassisNumber')!, 'رقم الشاسية هذا مسجل بالفعل');
            return;
        }
    }

    // Set installation status for regular new meters
    if (formData.subscriberType === 'جديد') {
        formData.installationStatus = 'تركيب جديد';
    }

    if (existingId) {
        // Update existing record
        const index = state.meters.findIndex(m => m.id === existingId);
        if (index !== -1) {
            state.meters[index] = { ...state.meters[index], ...formData };
            logActivity('تحديث سجل عداد', `تحديث سجل للمشترك "${formData.subscriberName}" إلى حالة "${formData.subscriberType}".`);
        }
    } else {
        // Add new record
        state.meters.push(formData);
        logActivity('إضافة سجل عداد', `إضافة سجل للمشترك "${formData.subscriberName}" بحالة "${formData.subscriberType}".`);
    }

    // If the meter was a replacement, automatically create a new meter record.
    if (formData.subscriberType === 'مرفوع إحلال' && newChassisNumber && newMeterType) {
        const newMeterData: DataItem = {
            // Copy subscriber-specific information
            id: Date.now() + 1, // Ensure a unique ID
            // @ts-ignore
            subscriberName: formData.subscriberName,
            address: formData.address,
            subscriptionCode: formData.subscriptionCode,
            panelNumber: formData.panelNumber,
            accountReference: formData.accountReference,
            // Also copy individual ref parts for consistency
            accountRefF: formData.accountRefF,
            accountRefH: formData.accountRefH,
            accountRefY: formData.accountRefY,
            accountRefM: formData.accountRefM,
            activityType: formData.activityType,
            subscriptionType: formData.subscriptionType,

            // Assign new meter-specific details
            meterChassisNumber: newChassisNumber,
            meterCapacity: formData.meterCapacity,
            meterType: newMeterType, // Use the new meter type
            subscriberType: 'جديد', // Set status to 'New'
            installationDate: formData.installationDate, // Assign the installation date
            installedBy: formData.installedBy,
            installationStatus: 'إحلال بدل عداد', // Identify as a replacement
            cardStatus: newMeterType === 'مسبق الدفع' ? 'صالح' : undefined,
        };

        // Add the new meter record to the state.
        state.meters.push(newMeterData);
        logActivity('إنشاء سجل إحلال تلقائي', `إنشاء سجل عداد جديد تلقائياً للمشترك "${formData.subscriberName}"`, `شاسية جديد: ${newChassisNumber}`);
        showToast('تم حفظ سجل الإحلال وإنشاء السجل الجديد تلقائياً.');
    } else {
        showToast('تم حفظ السجل بنجاح.');
    }

    saveState();
    renderMeterManagementSection();
    renderDashboard(); // Update dashboard stats
    resetMeterForm(); // Clear the form for the next entry
};

// --- الضبطية القضائية ---
const renderJudicialControlSection = () => {
    // Populate status filter dropdown
    const statusFilterSelect = document.querySelector('#judicial-control-filter-form [name="filter-status"]') as HTMLSelectElement;
    if (statusFilterSelect) {
        populateSelect(statusFilterSelect, state.settings.judicialControlStatuses, true);
        statusFilterSelect.querySelector('option[value=""]')?.setAttribute('selected', 'true');
    }

    // Clear filter inputs
    const filterForm = document.getElementById('judicial-control-filter-form') as HTMLFormElement;
    if (filterForm) {
        filterForm.reset();
    }

    applyAndRenderJudicialControlList();
};

const applyAndRenderJudicialControlList = () => {
    const filterForm = document.getElementById('judicial-control-filter-form') as HTMLFormElement;
    if (!filterForm) return;

    const textFilter = (filterForm.querySelector('[name="filter-text"]') as HTMLInputElement).value.toLowerCase();
    const statusFilter = (filterForm.querySelector('[name="filter-status"]') as HTMLSelectElement).value;
    const dateFromFilter = (filterForm.querySelector('[name="filter-date-from"]') as HTMLInputElement).value;
    const dateToFilter = (filterForm.querySelector('[name="filter-date-to"]') as HTMLInputElement).value;
    const expiredFilter = (filterForm.querySelector('[name="filter-expired-practice"]') as HTMLInputElement)?.checked;

    // منطق إظهار زر "طباعة المنتهي" عند تحديد مربع الممارسات المنتهية
    let printExpiredBtn = document.getElementById('print-expired-practices-btn');
    if (expiredFilter) {
        if (!printExpiredBtn) {
            const printListBtn = document.getElementById('print-judicial-control-list-btn');
            if (printListBtn) {
                printExpiredBtn = document.createElement('button');
                printExpiredBtn.id = 'print-expired-practices-btn';
                printExpiredBtn.className = 'btn';
                printExpiredBtn.style.marginRight = '10px';
                printExpiredBtn.style.backgroundColor = '#d32f2f'; // لون مميز للتحذير
                printExpiredBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 5px;"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg><span>طباعة المنتهي</span>`;
                printExpiredBtn.onclick = () => handlePrintExpiredPractices();
                printListBtn.parentNode?.insertBefore(printExpiredBtn, printListBtn.nextSibling);
            }
        } else { printExpiredBtn.style.display = 'inline-flex'; }
    } else if (printExpiredBtn) { printExpiredBtn.style.display = 'none'; }

    const filteredData = state.judicialControl.filter(item => {
        const textMatch = !textFilter ||
            (item.subscriberName || '').toLowerCase().includes(textFilter) ||
            (item.nationalId || '').toLowerCase().includes(textFilter) ||
            (item.address || '').toLowerCase().includes(textFilter) ||
            (item.reportType || '').toLowerCase().includes(textFilter) ||
            (item.meterChassisNumber || '').toLowerCase().includes(textFilter) ||
            (item.subscriptionCode || '').toLowerCase().includes(textFilter) ||
            (item.panelNumber || '').toLowerCase().includes(textFilter) ||
            (item.payments && item.payments.some((p: any) => (p.receiptNumber || '').toLowerCase().includes(textFilter)));

        const statusMatch = !statusFilter || item.status === statusFilter;

        const dateMatch = (!dateFromFilter || (item.reportDate && item.reportDate >= dateFromFilter)) &&
            (!dateToFilter || (item.reportDate && item.reportDate <= dateToFilter));

        let expiredMatch = true;
        if (expiredFilter) {
            const reportDate = new Date(item.reportDate);
            const today = new Date();
            const diffTime = Math.abs(today.getTime() - reportDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            expiredMatch = item.reportType === 'ممارسة' && diffDays > 60 && item.status !== 'تم تركيب عداد';
        }

        return textMatch && statusMatch && dateMatch && expiredMatch;
    });

    const table = document.getElementById('judicial-control-table');
    if (!table) return;
    const thead = table.querySelector('thead');
    const tableBody = document.querySelector('#judicial-control-table tbody');
    if (!tableBody || !thead) return;

    const isAdmin = loggedInUser?.role === 'admin';

    // Define columns for the new section
    const columns: ColumnDefinition[] = [
        { key: 'seq', header: 'م' },
        { key: 'subscriberName', header: 'اسم المخالف' },
        { key: 'address', header: 'العنوان' },
        {
            key: 'reportType',
            header: 'نوع المخالفة',
            render: (item) => item.reportType || '-'
        },
        { key: 'reportDate', header: 'تاريخ المحضر' },
        { key: 'status', header: 'الحالة' },
        { key: 'meterChassisNumber', header: 'شاسية العداد' },
        { key: 'subscriptionCode', header: 'كود الاشتراك' },
        {
            key: 'receiptNumber',
            header: 'رقم الايصال',
            render: (item) => item.payments?.map((p: any) => p.receiptNumber).join(', ') || '-'
        },
        {
            key: 'actions',
            header: 'إجراءات',
            render: (item) => {
                let buttons = `<div class="actions-inline">
                    ${hasButtonPermission('view_button') ? `<button class="action-btn view btn-view-details" data-id="${item.id}" data-type="judicial-control" title="عرض التفاصيل"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></button>` : ''}
                    ${hasButtonPermission('edit_button') ? `<button class="action-btn edit btn-edit-details" data-id="${item.id}" data-type="judicial-control" title="تعديل البيانات"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>` : ''}
                    ${hasButtonPermission('delete_button') ? `<button class="action-btn delete btn-delete" data-id="${item.id}" data-type="judicial-control" title="حذف المحضر"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>` : ''}
                </div>`;

                const rDate = new Date(item.reportDate);
                const tDate = new Date();
                const dTime = Math.abs(tDate.getTime() - rDate.getTime());
                const dDays = Math.ceil(dTime / (1000 * 60 * 60 * 24));
                if (item.reportType === 'ممارسة' && dDays > 60 && item.status !== 'تم تركيب عداد') {
                    buttons += `<div class="actions-inline" style="margin-top: 5px; border-top: 1px solid #eee; padding-top: 5px;">
                        <button class="action-btn" style="background-color: #eab308; color: white; border-color: #eab308;" onclick="window.renewPractice(${item.id})" title="تجديد الممارسة"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/></svg></button>
                        <button class="action-btn" style="background-color: #10b981; color: white; border-color: #10b981;" onclick="window.registerMeterInstalled(${item.id})" title="تم تركيب عداد"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V10M18 20V4M6 20v-4"/></svg></button>
                     </div>`;
                }
                return buttons;
            }
        }
    ];

    thead.innerHTML = `<tr>${columns.map(c => `<th${c.key === 'actions' ? ' class="actions-cell"' : ''}>${c.header}</th>`).join('')}</tr>`;

    tableBody.innerHTML = '';
    if (filteredData.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="${columns.length}" style="text-align: center;">لا توجد بيانات لعرضها.</td></tr>`;
        return;
    }

    filteredData.forEach((item, index) => {
        const row = document.createElement('tr');

        const reportDate = new Date(item.reportDate);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - reportDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (item.reportType === 'ممارسة' && diffDays > 60 && item.status !== 'تم تركيب عداد') {
            row.classList.add('row-warning');
        }

        const total = Number(item.reconciliationAmount || 0);
        if (total > 0) {
            const paid = (item.payments || []).reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
            if (total - paid <= 0) {
                row.classList.add('row-success');
            } else {
                row.classList.add('row-danger');
            }
        }

        row.innerHTML = columns.map(col => {
            let cellContent: string;
            if (col.render) {
                cellContent = col.render(item);
            } else if (col.key === 'seq') {
                cellContent = String(index + 1);
            } else {
                const value = item[col.key as keyof DataItem];
                cellContent = (value !== undefined && value !== null) ? String(value) : '';
            }
            const cellAttr = col.key === 'actions' ? ' class="actions-cell"' : '';
            return `<td${cellAttr}>${cellContent}</td>`;
        }).join('');
        tableBody.appendChild(row);
    });

    // إضافة صف الإجمالي
    if (filteredData.length > 0) {
        const totalCollected = filteredData.reduce((sum, item) => {
            return sum + (item.payments?.reduce((pSum: number, p: any) => pSum + (Number(p.amount) || 0), 0) || 0);
        }, 0);

        const summaryRow = document.createElement('tr');
        summaryRow.style.fontWeight = 'bold';
        summaryRow.style.backgroundColor = '#f8f9fa';
        summaryRow.innerHTML = `<td colspan="6" style="text-align: left; padding-left: 15px;">إجمالي المبالغ المحصلة</td><td colspan="2" style="color: #198754;">${totalCollected.toLocaleString()} ج.م</td>`;
        tableBody.appendChild(summaryRow);
    }
};

const openJudicialControlForm = (recordId?: number) => {
    const form = document.getElementById('judicial-control-form') as HTMLFormElement;
    if (!form) return;

    const updateJudicialControlFormVisibility = () => {
        const reportTypeSelect = document.getElementById('judicial-control-reportType') as HTMLSelectElement;
        const theftFields = document.getElementById('judicial-theft-fields');
        if (reportTypeSelect && theftFields) {
            const showTheftFields = reportTypeSelect.value === 'سرقة خلف العداد';
            theftFields.classList.toggle('hidden', !showTheftFields);
            // Make fields required only when visible
            theftFields.querySelectorAll('input').forEach(input => {
                input.required = showTheftFields;
            });
        }
    };

    const formTitle = document.getElementById('judicial-control-form-title')!;
    form.innerHTML = ''; // Clear previous content

    // Define form fields
    const fields = [
        { id: 'subscriberName', label: 'اسم المخالف', type: 'text', required: true },
        { id: 'nationalId', label: 'الرقم القومي', type: 'text', required: true, pattern: "\\d{14}", title: "يجب أن يتكون من 14 رقم" },
        { id: 'address', label: 'العنوان', type: 'text', required: true },
        { id: 'reportType', label: 'نوع المحضر', type: 'select', options: ['ممارسة', 'سرقة خلف العداد'], required: true },
    ];

    const theftFields = [
        { id: 'meterChassisNumber', label: 'شاسية العداد', type: 'text' },
        { id: 'subscriptionCode', label: 'كود الاشتراك', type: 'text' },
        { id: 'panelNumber', label: 'رقم اللوحة', type: 'text' },
    ];

    const attachmentFields = [
        { id: 'nationalIdFrontImage', label: 'صورة البطاقة (أمام)', type: 'file', accept: 'image/*' },
        { id: 'nationalIdBackImage', label: 'صورة البطاقة (خلف)', type: 'file', accept: 'image/*' },
        { id: 'caseVideo', label: 'فيديو الحالة', type: 'file', accept: 'video/*' },
    ];

    const otherFields = [
        { id: 'reportDate', label: 'تاريخ المحضر', type: 'date', required: true },
        { id: 'status', label: 'الحالة', type: 'select', options: state.settings.judicialControlStatuses, required: true },
        { id: 'reconciliationAmount', label: 'مبلغ التصالح (ج.م)', type: 'number' },
        { id: 'notes', label: 'ملاحظات', type: 'textarea' }
    ];

    let formHTML = '<input type="hidden" id="judicial-control-id">';

    const createFieldHTML = (field: any) => {
        let fieldContent = '';
        if (field.type === 'select') {
            fieldContent = `<select id="judicial-control-${field.id}" ${field.required ? 'required' : ''}>
                <option value="" disabled selected hidden>اختر ${field.label}...</option>
                ${field.options?.map((opt: string) => `<option value="${opt}">${opt}</option>`).join('')}
            </select>`;
        } else if (field.type === 'textarea') {
            fieldContent = `<textarea id="judicial-control-${field.id}" rows="3"></textarea>`;
        } else if (field.type === 'file') {
            fieldContent = `<input type="file" id="judicial-control-${field.id}" accept="${field.accept || ''}">`;
        } else {
            fieldContent = `<input type="${field.type}" id="judicial-control-${field.id}" ${field.required ? 'required' : ''} ${field.pattern ? `pattern="${field.pattern}"` : ''} ${field.title ? `title="${field.title}"` : ''}>`;
        }
        return `<div class="input-group"><label for="judicial-control-${field.id}">${field.label}</label>${fieldContent}</div>`;
    };

    fields.forEach(field => formHTML += createFieldHTML(field));

    formHTML += `<fieldset id="judicial-theft-fields" class="form-grid-group hidden"><legend>بيانات السرقة</legend>${theftFields.map(createFieldHTML).join('')}</fieldset>`;
    formHTML += `<fieldset class="form-grid-group"><legend>المرفقات</legend>${attachmentFields.map(createFieldHTML).join('')}</fieldset>`;
    otherFields.forEach(field => formHTML += createFieldHTML(field));

    formHTML += `<div class="input-group full-width"><button type="submit" class="btn">حفظ المحضر</button></div>`;
    form.innerHTML = formHTML;

    if (recordId) {
        const record = state.judicialControl.find(r => r.id === recordId);
        if (record) {
            formTitle.textContent = 'تعديل محضر ضبطية قضائية';
            (document.getElementById('judicial-control-id') as HTMLInputElement).value = String(recordId);
            [...fields, ...theftFields, ...otherFields].forEach(field => {
                const input = document.getElementById(`judicial-control-${field.id}`) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
                if (input && record[field.id]) {
                    input.value = record[field.id];
                }
            });
            // Note: File inputs cannot be pre-filled for security reasons.
            // We can show a preview or link to the existing file if stored.
            attachmentFields.forEach(field => {
                if (record[field.id]) {
                    const label = form.querySelector(`label[for="judicial-control-${field.id}"]`);
                    if (label) {
                        label.innerHTML += ` <small style="color: green;">(يوجد ملف مرفق بالفعل)</small>`;
                    }
                }
            });
        }
    } else {
        formTitle.textContent = 'إضافة محضر ضبطية قضائية';
    }

    document.querySelectorAll('.content-section.active').forEach(s => s.classList.remove('active'));
    document.getElementById('judicial-control-registration')?.classList.add('active');
    setPageTitle('إضافة محضر ضبطية قضائية');

    // Add event listener for dynamic fields and call it once to set initial state
    document.getElementById('judicial-control-reportType')?.addEventListener('change', updateJudicialControlFormVisibility);
    updateJudicialControlFormVisibility();
};

const handlePrintExpiredPractices = () => {
    // جلب كافة الممارسات المنتهية (أكثر من 60 يوم ولم يتم تركيب عداد لها)
    const expiredPractices = state.judicialControl.filter(item => {
        const reportDate = new Date(item.reportDate);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - reportDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return item.reportType === 'ممارسة' && diffDays > 60 && item.status !== 'تم تركيب عداد';
    });

    if (expiredPractices.length === 0) {
        showToast('لا توجد ممارسات منتهية حالياً لطباعتها.', 'error');
        return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const companyName = state.settings.replacementReportCompanyName || state.settings.companyName || 'ELMAGHRABI';
    const printDate = new Date().toLocaleString('ar-EG');
    const logoSrc = state.settings.companyLogo;
    const logoHTML = logoSrc ? `<img src="${logoSrc}" alt="Logo" style="max-width: 150px; max-height: 100px; object-fit: contain;">` : '';

    printWindow.document.write(`
        <!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>تقرير الممارسات المنتهية</title>
        <style>
            body { font-family: 'Tajawal', sans-serif; padding: 20px; color: #000; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 8px; text-align: center; font-size: 12px; }
            th { background-color: #f2f2f2; }
            .footer { margin-top: 30px; font-size: 8px; text-align: left; border-top: 1px solid #ccc; padding-top: 5px; line-height: 1.5; }
        </style></head><body>
        <div class="header">
            <div style="text-align: right; line-height: 1.3;">
                <div style="font-size: 11px; font-weight: bold;">شركة مصر الوسطى لتوزيع الكهرباء</div>
                <div style="font-size: 10px;">قطاع توزيع كهرباء شمال المنيا</div>
                <div style="font-size: 10px;">هندسة كهرباء بني مزار</div>
                <h2 style="font-size: 14px; margin-top: 10px; font-weight: bold; text-decoration: underline;">تقرير حصر الممارسات المنتهية (تجاوزت 60 يوم)</h2>
            </div>
            <div class="logo-container">${logoHTML}</div>
        </div>
        <table><thead><tr><th>م</th><th>الاسم</th><th>العنوان</th><th>الرقم القومي</th><th>تاريخ آخر ممارسة</th></tr></thead>
        <tbody>
            ${expiredPractices.map((item, index) => `<tr><td>${index + 1}</td><td>${item.subscriberName}</td><td>${item.address}</td><td>${item.nationalId}</td><td>${item.reportDate}</td></tr>`).join('')}
        </tbody></table>
        <div class="footer">
            <div>تاريخ الطباعة: ${printDate}</div>
            <div>تمت الطباعة بواسطة: ${loggedInUser?.fullName || 'نظام العدادات'}</div>
        </div>
        </body></html>`);
    printWindow.document.close();
    setTimeout(() => { printWindow.focus(); printWindow.print(); printWindow.close(); }, 500);
};

const handleJudicialControlFormSubmit = async (event: Event) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    if (!validateForm(form)) {
        showToast('يرجى ملء جميع الحقول المطلوبة.', 'error');
        return;
    }

    // Helper to read file as data URL
    const readFileAsDataURL = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const getFileInputValue = async (id: string): Promise<string | undefined> => {
        const input = document.getElementById(id) as HTMLInputElement;
        if (input && input.files && input.files.length > 0) {
            return await readFileAsDataURL(input.files[0]);
        }
        return undefined;
    };

    // Read attachments
    const nationalIdFrontImage = await getFileInputValue('judicial-control-nationalIdFrontImage');
    const nationalIdBackImage = await getFileInputValue('judicial-control-nationalIdBackImage');
    const caseVideo = await getFileInputValue('judicial-control-caseVideo');

    const idInput = document.getElementById('judicial-control-id') as HTMLInputElement;
    const id = idInput.value ? parseInt(idInput.value, 10) : Date.now();

    const newRecord: DataItem = {
        id: id,
        subscriberName: (document.getElementById('judicial-control-subscriberName') as HTMLInputElement).value,
        nationalId: (document.getElementById('judicial-control-nationalId') as HTMLInputElement).value,
        address: (document.getElementById('judicial-control-address') as HTMLInputElement).value,
        reportType: (document.getElementById('judicial-control-reportType') as HTMLSelectElement).value,
        meterChassisNumber: (document.getElementById('judicial-control-meterChassisNumber') as HTMLInputElement).value,
        subscriptionCode: (document.getElementById('judicial-control-subscriptionCode') as HTMLInputElement).value,
        panelNumber: (document.getElementById('judicial-control-panelNumber') as HTMLInputElement).value,
        reportDate: (document.getElementById('judicial-control-reportDate') as HTMLInputElement).value,
        status: (document.getElementById('judicial-control-status') as HTMLSelectElement).value,
        reconciliationAmount: (document.getElementById('judicial-control-reconciliationAmount') as HTMLInputElement).value,
        notes: (document.getElementById('judicial-control-notes') as HTMLTextAreaElement).value,
        nationalIdFrontImage: nationalIdFrontImage,
        nationalIdBackImage: nationalIdBackImage,
        caseVideo: caseVideo,
    };

    if (idInput.value) { // Editing
        const index = state.judicialControl.findIndex(r => r.id === id);
        if (index !== -1) {
            // Preserve existing attachments if new ones are not uploaded
            const existingRecord = state.judicialControl[index];
            newRecord.nationalIdFrontImage = newRecord.nationalIdFrontImage ?? existingRecord.nationalIdFrontImage;
            newRecord.nationalIdBackImage = newRecord.nationalIdBackImage ?? existingRecord.nationalIdBackImage;
            newRecord.caseVideo = newRecord.caseVideo ?? existingRecord.caseVideo;
            state.judicialControl[index] = newRecord;
            logActivity('تعديل محضر', `تم تعديل محضر للمخالف: ${newRecord.subscriberName}`);

            if (await saveState()) {
                showToast('تم تحديث المحضر بنجاح.');
                (document.querySelector('.nav-link[data-target="judicial-control-list"]') as HTMLElement)?.click();
            }
        }
    } else { // Adding
        state.judicialControl.push(newRecord);
        logActivity('إضافة محضر', `تم إضافة محضر جديد للمخالف: ${newRecord.subscriberName}`);

        if (await saveState()) {
            showToast('تم حفظ المحضر بنجاح.');
            openJudicialControlForm(); // Reset form for new entry
        } else {
            state.judicialControl.pop(); // Revert if save failed
        }
    }
};

const handleDeleteJudicialControlRecord = (recordId: number) => {
    const recordToDelete = state.judicialControl.find(r => r.id === recordId);
    if (!recordToDelete) return;

    const onConfirm = async () => {
        state.judicialControl = state.judicialControl.filter(r => r.id !== recordId);
        const summary = `اسم المخالف: ${recordToDelete.subscriberName}, نوع المحضر: ${recordToDelete.reportType}`;
        logActivity('حذف محضر ضبطية قضائية', `حذف محضر للمخالف "${recordToDelete.subscriberName}".`, summary);
        await saveState();
        showToast('تم حذف المحضر بنجاح.');
        // Re-render the list to show the change
        renderJudicialControlSection();
    };

    showConfirmationDialog(
        'تأكيد الحذف',
        `هل أنت متأكد من رغبتك في حذف المحضر الخاص بـ "${recordToDelete.subscriberName}"؟ لا يمكن التراجع عن هذا الإجراء.`,
        onConfirm
    );
};

const openJudicialControlDetails = (recordId: number) => {
    const record = state.judicialControl.find(r => r.id === recordId);
    if (!record) {
        showToast('لم يتم العثور على المحضر.', 'error');
        return;
    }

    currentJudicialControlIdForDetails = recordId; // Store the ID for printing

    const detailsContent = document.getElementById('judicial-control-details-content');
    const detailsTitle = document.getElementById('judicial-control-details-title');
    if (!detailsContent || !detailsTitle) return;

    detailsTitle.textContent = `تفاصيل محضر المخالف: ${record.subscriberName}`;

    const createDetailItem = (label: string, value: any) => {
        if (value === undefined || value === null || value === '') return '';
        return `<div class="detail-item"><label>${label}</label><span class="value">${value}</span></div>`;
    };

    const createAttachmentPreview = (label: string, dataUrl: string | undefined) => {
        if (!dataUrl) {
            return `<div class="detail-item"><label>${label}</label><span class="value">لا يوجد ملف مرفق</span></div>`;
        }
        let previewElement = '';
        if (dataUrl.startsWith('data:image/')) {
            previewElement = `<img src="${dataUrl}" alt="${label}" style="max-width: 300px; max-height: 300px; object-fit: contain; cursor: pointer;" onclick="this.requestFullscreen()">`;
        } else if (dataUrl.startsWith('data:video/')) {
            previewElement = `<video src="${dataUrl}" controls style="max-width: 400px;"></video>`;
        }
        return `<div class="detail-item attachment-item"><label>${label}</label><div class="value">${previewElement}</div></div>`;
    };

    detailsContent.innerHTML = `
        <div class="details-grid">
            <fieldset><legend>البيانات الأساسية</legend>
                ${createDetailItem('اسم المخالف', record.subscriberName)}
                ${createDetailItem('الرقم القومي', record.nationalId)}
                ${createDetailItem('العنوان', record.address)}
                ${createDetailItem('تاريخ المحضر', record.reportDate)}
                ${createDetailItem('الحالة', record.status)}
                ${createDetailItem('مبلغ التصالح', record.reconciliationAmount ? `${record.reconciliationAmount} ج.م` : 'غير محدد')}
                ${createDetailItem('المبلغ المدفوع', record.paidAmount ? `${record.paidAmount} ج.م` : '0 ج.م')}
            </fieldset>
            ${(record.renewalHistory && record.renewalHistory.length > 0) ? `
            <fieldset class="full-width" style="grid-column: 1 / -1;"><legend>سجل التجديدات</legend>
                <div class="responsive-table" style="max-height: 200px; overflow: auto;">
                    <table style="width: 100%;">
                        <thead><tr><th>تاريخ التجديد</th><th>التاريخ السابق</th><th>المبلغ المضاف</th><th>الإجمالي بعد التجديد</th><th>المستخدم</th></tr></thead>
                        <tbody>
                            ${record.renewalHistory.map((h: any) => `
                                <tr>
                                    <td>${h.renewalDate}</td>
                                    <td>${h.previousDate}</td>
                                    <td>${h.addedAmount.toLocaleString()} ج.م</td>
                                    <td>${h.totalAfter.toLocaleString()} ج.م</td>
                                    <td>${h.user}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </fieldset>` : ''}
            ${(record.payments && record.payments.length > 0) ? `
            <fieldset class="full-width" style="grid-column: 1 / -1;"><legend>سجل الدفعات</legend>
                <div class="responsive-table" style="max-height: 200px; overflow: auto;">
                    <table style="width: 100%;">
                        <thead><tr><th>المبلغ</th><th>رقم الإيصال</th><th>التاريخ</th><th>المحصل</th></tr></thead>
                        <tbody>
                            ${record.payments.map((p: Payment) => `
                                <tr>
                                    <td>${p.amount.toLocaleString()} ج.م</td>
                                    <td>${p.receiptNumber}</td>
                                    <td>${p.date}</td>
                                    <td>${p.collectedBy}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </fieldset>` : ''}
            <fieldset><legend>بيانات المخالفة</legend>
                ${createDetailItem('نوع المحضر', record.reportType)}
                ${record.reportType === 'سرقة خلف العداد' ? `
                    ${createDetailItem('شاسية العداد', record.meterChassisNumber)}
                    ${createDetailItem('كود الاشتراك', record.subscriptionCode)}
                    ${createDetailItem('رقم اللوحة', record.panelNumber)}
                ` : ''}
                ${createDetailItem('ملاحظات', `<pre>${record.notes || ''}</pre>`)}
            </fieldset>
            <fieldset class="full-width"><legend>المرفقات</legend>
                <div class="attachments-preview-grid">
                    ${createAttachmentPreview('صورة البطاقة (أمام)', record.nationalIdFrontImage)}
                    ${createAttachmentPreview('صورة البطاقة (خلف)', record.nationalIdBackImage)}
                    ${createAttachmentPreview('فيديو الحالة', record.caseVideo)}
                </div>
            </fieldset>
        </div>
    `;

    // Navigate to the details section
    const activeSection = document.querySelector('.content-section.active');
    if (activeSection) {
        previousPageId = activeSection.id;
    }
    document.querySelectorAll('.content-section.active').forEach(s => s.classList.remove('active'));
    document.getElementById('judicial-control-details')?.classList.add('active');
};

const handlePrintJudicialControlDetails = () => {
    if (currentJudicialControlIdForDetails === null) return;
    const record = state.judicialControl.find(r => r.id === currentJudicialControlIdForDetails);
    if (!record) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showToast('فشل فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة.', 'error');
        return;
    }

    const detailsContentHTML = document.getElementById('judicial-control-details-content')?.innerHTML || '';
    const companyName = state.settings.companyName || 'ELMAGHRABI';
    const printDate = new Date().toLocaleString('ar-EG');

    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>طباعة محضر ضبطية قضائية - ${record.subscriberName}</title>
            <link rel="stylesheet" href="index.css">
            <style>
                @page { size: A4; margin: 20mm; }
                body { 
                    background-color: #fff !important; 
                    font-family: 'Tajawal', sans-serif; 
                    -webkit-print-color-adjust: exact; 
                    print-color-adjust: exact;
                }
                .details-view { padding: 0; }
                .details-grid { display: block !important; }
                fieldset { border: 1px solid #ccc; margin-bottom: 15px; page-break-inside: avoid; }
                legend { font-weight: bold; }
                .detail-item { display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px dotted #eee; }
                .detail-item label { font-weight: 500; }
                .attachment-item img, .attachment-item video { max-width: 100%; height: auto; border: 1px solid #ddd; }
                .attachments-preview-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
                .print-header { text-align: center; border-bottom: 2px solid #333; margin-bottom: 20px; padding-bottom: 10px; }
                .print-footer { text-align: center; font-size: 10px; color: #777; position: fixed; bottom: 10mm; width: 100%; }
            </style>
        </head>
        <body>
            <div class="print-header"><h1>${companyName}</h1><p>محضر ضبطية قضائية</p></div>
            ${detailsContentHTML}
            <div class="print-footer"><p>تاريخ الطباعة: ${printDate}</p></div>
        </body>
        </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    }, 500);
};

// --- قسم التحصيل ---
const renderJudicialCollectionSection = () => {
    const tableBody = document.querySelector('#collection-judicial-table tbody');
    if (!tableBody) return;

    const isAdmin = hasPermission('manage_collection');

    document.querySelector('#collection-judicial-table thead')!.innerHTML = `
        <tr>
            <th>اسم المخالف</th>
            <th>نوع المحضر</th>
            <th>تاريخ المحضر</th>
            <th>الحالة</th>
            <th>مبلغ التصالح</th>
            <th>المبلغ المدفوع</th>
            <th>رقم الإيصال</th>
            <th>المتبقي</th>
            <th class="actions-cell">إجراءات</th>
        </tr>
    `;

    const filterForm = document.getElementById('judicial-collection-filter-form') as HTMLFormElement;
    const paymentStatusFilter = filterForm ? (filterForm.querySelector('[name="filter-payment-status"]') as HTMLSelectElement).value : '';

    tableBody.innerHTML = '';
    // Filter items that are 'Under Investigation' or 'Reconciled'
    const collectionItems = state.judicialControl.filter(item => {
        const isRelevantStatus = item.status === 'قيد التحقيق' || item.status === 'تم التصالح';
        if (!isRelevantStatus) return false;

        if (paymentStatusFilter) {
            const total = Number(item.reconciliationAmount || 0);
            const paid = (item.payments || []).reduce((sum: number, p: Payment) => sum + p.amount, 0);
            const remaining = total - paid;
            const isFullyPaid = total > 0 && remaining <= 0;

            if (paymentStatusFilter === 'paid' && !isFullyPaid) return false;
            if (paymentStatusFilter === 'late' && isFullyPaid) return false;
        }
        return true;
    });

    if (collectionItems.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center;">لا توجد مطالبات مالية أو محاضر قيد التحقيق.</td>/tr>`;
        return;
    }

    let totalReconciliation = 0;
    let totalCollected = 0;
    let totalRemaining = 0;
    collectionItems.forEach(item => {
        const total = Number(item.reconciliationAmount || 0);
        const paid = (item.payments || []).reduce((sum: number, p: Payment) => sum + p.amount, 0);
        const remaining = total - paid;
        const isFullyPaid = total > 0 && remaining <= 0;
        const receiptNumbers = item.payments?.map((p: any) => p.receiptNumber).join(', ') || '-';

        totalReconciliation += total;
        totalCollected += paid;
        totalRemaining += remaining;

        let statusBadge = `<span class="status-badge">${item.status}</span>`;
        if (item.status === 'قيد التحقيق') {
            statusBadge = `<span class="status-badge bg-warning">انتظار الدفع / إجراء</span>`;
        } else if (item.status === 'تم التصالح') {
            statusBadge = `<span class="status-badge bg-info">تم التصالح</span>`;
        } else if (item.status === 'محولة للنيابة') {
            statusBadge = `<span class="status-badge bg-error">محولة للنيابة</span>`;
        } else if (isFullyPaid) {
            statusBadge = `<span class="status-badge bg-success">خالص</span>`;
        }

        const viewButtonHTML = hasButtonPermission('view_button')
            ? `<button class="action-btn view" onclick="window.viewJudicialCollectionRecord(${item.id})" title="عرض المحضر"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></button>`
            : '';
        const editButtonHTML = hasButtonPermission('edit_button')
            ? `<button class="action-btn edit" onclick="window.editJudicialCollectionRecord(${item.id})" title="تعديل المحضر"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0-2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>`
            : '';
        const deleteButtonHTML = hasButtonPermission('delete_button')
            ? `<button class="action-btn delete" onclick="window.handleDeleteJudicialCollectionRecord(${item.id})" title="حذف المحضر"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>`
            : '';
        let statusActionsHTML = '';
        if (item.status === 'قيد التحقيق' && isAdmin) {
            statusActionsHTML = `
                <button class="btn btn-edit-details" style="font-size: 0.8rem; padding: 2px 5px;" onclick="window.updateJudicialStatus(${item.id}, 'تم التصالح')">تفعيل / تصالح</button>
                <button class="btn btn-delete" style="font-size: 0.8rem; padding: 2px 5px;" onclick="window.updateJudicialStatus(${item.id}, 'محولة للنيابة')">نيابة</button>
            `;
        } else if (item.status === 'تم التصالح' && !isFullyPaid && isAdmin) {
            statusActionsHTML = `<button class="btn btn-edit-details" onclick="window.openPaymentModal(${item.id})">تحصيل</button>`;
        }
        const actionsHTML = `<div class="actions-inline">${viewButtonHTML}${editButtonHTML}${deleteButtonHTML}${statusActionsHTML}</div>`;

        const row = document.createElement('tr');
        if (isFullyPaid) row.classList.add('row-success');
        else if (total > 0 && remaining > 0) row.classList.add('row-danger');

        row.innerHTML = `
            <td>${item.subscriberName || '-'}</td>
            <td>${item.reportType || '-'}</td>
            <td>${item.reportDate || '-'}</td>
            <td>${statusBadge}</td>
            <td>${total.toLocaleString()} ج.م</td>
            <td>${paid.toLocaleString()} ج.م</td>
            <td>${receiptNumbers}</td>
            <td>${remaining.toLocaleString()} ج.م</td>
            <td class="actions-cell">${actionsHTML}</td>
        `;
        tableBody.appendChild(row);
    });

    const summaryRow = document.createElement('tr');
    summaryRow.style.fontWeight = 'bold';
    summaryRow.style.backgroundColor = '#f8f9fa';
    summaryRow.innerHTML = `
        <td colspan="4" style="text-align: left; padding-left: 20px;">الإجمالي</td>
        <td>${totalReconciliation.toLocaleString()} ج.م</td>
        <td>${totalCollected.toLocaleString()} ج.م</td>
        <td>-</td>
        <td style="color: ${totalRemaining > 0 ? 'red' : 'green'};">${totalRemaining.toLocaleString()} ج.م</td>
        <td></td>
    `;
    tableBody.appendChild(summaryRow);

    // Expose function to window for the onclick handler in HTML string
    (window as any).handleDeleteJudicialCollectionRecord = (id: number) => {
        handleDeleteJudicialControlRecord(id);
    };

    (window as any).viewJudicialCollectionRecord = (id: number) => {
        openJudicialControlDetails(id);
    };

    (window as any).editJudicialCollectionRecord = (id: number) => {
        openJudicialControlForm(id);
    };

    (window as any).updateJudicialStatus = async (id: number, newStatus: string) => {
        const item = state.judicialControl.find(i => i.id === id);
        if (!item) return;

        if (newStatus === 'تم التصالح') {
            const amountStr = prompt(`تحديد مبلغ التصالح للمخالف: ${item.subscriberName}\nأدخل المبلغ (ج.م):`, item.reconciliationAmount ? String(item.reconciliationAmount) : '');
            if (amountStr === null) return;
            const amount = Number(amountStr);
            if (isNaN(amount) || amount <= 0) {
                showToast('مبلغ غير صحيح', 'error');
                return;
            }
            item.reconciliationAmount = amount;
        }

        const oldStatus = item.status;
        item.status = newStatus;
        logActivity('تحديث حالة ضبطية', `تغيير حالة المحضر للمخالف ${item.subscriberName} من "${oldStatus}" إلى "${newStatus}"`);
        if (await saveState()) {
            renderJudicialCollectionSection();
            showToast('تم تحديث الحالة بنجاح.');
        } else {
            item.status = oldStatus; // Revert
        }
    };

    // Expose function to window for the onclick handler in HTML string
    (window as any).openPaymentModal = async (id: number): Promise<void> => {
        const item = state.judicialControl.find(i => i.id === id);
        if (!item) return;

        const totalPaid = (item.payments || []).reduce((sum, p) => sum + p.amount, 0);
        const remainingAmount = Number(item.reconciliationAmount) - totalPaid;

        const amountStr = prompt(`تسجيل دفعة للمخالف: ${item.subscriberName}\nالمبلغ المتبقي: ${remainingAmount.toLocaleString()} ج.م\n\nأدخل المبلغ المدفوع:`);

        if (amountStr !== null && amountStr.trim() !== '') {
            const payVal = Number(amountStr);
            if (isNaN(payVal) || payVal <= 0) {
                showToast('يرجى إدخال مبلغ صحيح.', 'error');
                return;
            }

            const receiptNumber = prompt(`أدخل رقم الإيصال للمبلغ ${payVal.toLocaleString()} ج.م:`);
            if (!receiptNumber || receiptNumber.trim() === '') {
                showToast('رقم الإيصال مطلوب. تم إلغاء العملية.', 'error');
                return;
            }

            if (!item.payments) item.payments = [];
            item.payments.push({
                amount: payVal,
                receiptNumber: receiptNumber,
                date: new Date().toLocaleDateString('en-GB'),
                collectedBy: loggedInUser?.fullName ?? 'غير معروف',
            });

            logActivity('تحصيل مبلغ', `تم تحصيل مبلغ ${payVal} ج.م (إيصال: ${receiptNumber}) من المخالف ${item.subscriberName}`);
            if (await saveState()) {
                renderJudicialCollectionSection();
                showToast('تم تسجيل الدفع بنجاح.');
            } else {
                item.payments.pop(); // Revert if save failed
            }
        }
    };

    // Expose function to window for renewing practice
    (window as any).renewPractice = async (id: number) => {
        const item = state.judicialControl.find(i => i.id === id);
        if (!item) return;

        const totalPaid = (item.payments || []).reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
        const currentTotal = Number(item.reconciliationAmount || 0);
        const remaining = currentTotal - totalPaid;

        const msg = `تجديد الممارسة للمخالف: ${item.subscriberName}\n` +
            `تاريخ المحضر: ${item.reportDate}\n` +
            `المبلغ المطلوب حالياً: ${currentTotal.toLocaleString()} ج.م\n` +
            `المدفوع: ${totalPaid.toLocaleString()} ج.م\n` +
            `المتبقي: ${remaining.toLocaleString()} ج.م\n\n` +
            `أدخل مبلغ التجديد للفترة الجديدة (سيتم إضافته للمبلغ المطلوب):`;

        const amountStr = prompt(msg, '0');
        if (amountStr === null) return; // Cancelled

        const newAmount = Number(amountStr);
        if (isNaN(newAmount) || newAmount < 0) {
            showToast('المبلغ غير صحيح', 'error');
            return;
        }

        const oldDate = item.reportDate;
        const today = new Date().toISOString().split('T')[0];

        // Store history
        if (!item.renewalHistory) item.renewalHistory = [];
        item.renewalHistory.push({
            renewalDate: today,
            previousDate: oldDate,
            addedAmount: newAmount,
            totalBefore: currentTotal,
            totalAfter: currentTotal + newAmount,
            user: loggedInUser?.fullName || 'غير معروف'
        });

        item.reportDate = today;
        item.reconciliationAmount = currentTotal + newAmount;

        logActivity('تجديد ممارسة', `تجديد ممارسة للمخالف ${item.subscriberName}. مبلغ التجديد: ${newAmount}`, `التاريخ القديم: ${oldDate}`);
        await saveState();
        renderJudicialControlSection();
        showToast('تم تجديد الممارسة وإضافة المبلغ بنجاح.');
    };

    // Expose function to window for registering meter installation
    (window as any).registerMeterInstalled = async (id: number) => {
        const item = state.judicialControl.find(i => i.id === id);
        if (!item) return;

        const totalPaid = (item.payments || []).reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
        const currentTotal = Number(item.reconciliationAmount || 0);
        const remaining = currentTotal - totalPaid;
        let waivedAmount = 0;

        if (remaining > 0) {
            if (confirm(`يوجد مبلغ مستحق (${remaining.toLocaleString()} ج.م) على هذه الممارسة.\nهل تريد إعفاء المشترك من سداد هذا المبلغ نظراً لتركيب العداد؟`)) {
                waivedAmount = remaining;
            }
        }

        const chassis = prompt('أدخل رقم شاسية العداد:');
        if (chassis === null) return;
        if (!chassis.trim()) {
            showToast('رقم الشاسية مطلوب.', 'error');
            return;
        }

        const code = prompt('أدخل كود الاشتراك:');
        if (code === null) return;
        if (!code.trim()) {
            showToast('كود الاشتراك مطلوب.', 'error');
            return;
        }

        item.meterChassisNumber = chassis.trim();
        item.subscriptionCode = code.trim();
        item.status = 'تم تركيب عداد';

        if (waivedAmount > 0) {
            item.reconciliationAmount = totalPaid; // Adjust required amount to match paid amount (waive remainder)
        }

        const logSummary = waivedAmount > 0 ? `تم إعفاء مبلغ ${waivedAmount} ج.م` : undefined;
        logActivity('تركيب عداد (ضبطية)', `تسجيل تركيب عداد للمخالف ${item.subscriberName}. شاسية: ${chassis}, كود: ${code}`, logSummary);
        await saveState();
        renderJudicialControlSection();
        showToast('تم تسجيل تركيب العداد بنجاح.');
    };

    // Expose function to window for printing receipts
    (window as any).printCollectionReceipt = (id: number, type: 'judicial' | 'zinat') => {
        let item: DataItem | undefined;
        let title = '';

        if (type === 'judicial') {
            item = state.judicialControl.find(i => i.id === id);
            title = 'إيصال تحصيل ضبطية قضائية';
        } else {
            item = state.zinatCollection.find(i => i.id === id);
            title = 'إيصال تحصيل زينات';
        }

        if (!item) return;

        const companyName = state.settings.replacementReportCompanyName || state.settings.companyName || 'ELMAGHRABI';
        const printDate = new Date().toLocaleString('ar-EG');
        const total = Number(type === 'judicial' ? item.reconciliationAmount : item.amount) || 0;
        const paid = (item.payments || []).reduce((sum: number, p: Payment) => sum + p.amount, 0);
        const remaining = total - paid;
        const collectorName = loggedInUser?.fullName || 'غير محدد';

        const logoSrc = state.settings.companyLogo;
        const logoHTML = logoSrc ? `<img src="${logoSrc}" alt="Logo">` : '';

        let paymentHistoryHTML = '';
        if (item.payments && item.payments.length > 0) {
            paymentHistoryHTML = `
            <h4 style="text-align:right; margin-top:20px; margin-bottom:5px;">تفاصيل الدفعات:</h4>
            <table style="width:100%; border-collapse:collapse; font-size:11px; text-align:right;">
                <thead><tr style="background-color:#f2f2f2;"><th style="border:1px solid #ccc;padding:4px;">المبلغ</th><th style="border:1px solid #ccc;padding:4px;">رقم الإيصال</th><th style="border:1px solid #ccc;padding:4px;">التاريخ</th><th style="border:1px solid #ccc;padding:4px;">المحصل</th></tr></thead>
                <tbody>
                    ${item.payments.map((p: Payment) => `<tr><td style="border:1px solid #ccc;padding:4px;">${p.amount.toLocaleString()} ج.م</td><td style="border:1px solid #ccc;padding:4px;">${p.receiptNumber}</td><td style="border:1px solid #ccc;padding:4px;">${p.date}</td><td style="border:1px solid #ccc;padding:4px;">${p.collectedBy}</td></tr>`).join('')}
                </tbody>
            </table>
        `;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
        <!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>${title}</title>
        <style>
            body { font-family: 'Tajawal', sans-serif; padding: 20px; border: 2px solid #333; max-width: 600px; margin: 0 auto; }
            .header-container { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .company-info { text-align: right; flex: 1; }
            .company-info h2 { margin: 0; font-size: 18px; white-space: pre-wrap; line-height: 1.4; }
            .company-info h3 { margin: 5px 0 0; font-size: 16px; text-decoration: underline; }
            .logo-container { text-align: left; margin-right: 15px; }
            .logo-container img { max-width: 100px; max-height: 100px; object-fit: contain; }
            .meta { font-size: 12px; color: #666; margin-bottom: 20px; text-align: center; }
            .row { display: flex; justify-content: space-between; margin: 10px 0; border-bottom: 1px dotted #ccc; padding-bottom: 5px; }
            .label { font-weight: bold; }
            .total { font-size: 18px; font-weight: bold; margin-top: 20px; border-top: 2px solid #333; padding-top: 10px; text-align: center; }
            .footer-info { margin-top: 30px; font-size: 12px; text-align: right; border-top: 1px solid #eee; padding-top: 10px; }
            .footer-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
        </style></head><body>
        
        <div class="header-container">
            <div class="company-info">
                <h2>${companyName}</h2>
                <h3>${title}</h3>
            </div>
            <div class="logo-container">
                ${logoHTML}
            </div>
        </div>

        <div class="meta">تاريخ الطباعة: ${printDate}</div>
        
        <div class="row"><span class="label">الاسم:</span><span>${item.subscriberName || item.requesterName}</span></div>
        <div class="row"><span class="label">العنوان:</span><span>${item.address}</span></div>
        ${item.mobile ? `<div class="row"><span class="label">رقم الموبايل:</span><span>${item.mobile}</span></div>` : ''}
        <div class="row"><span class="label">المبلغ المطلوب:</span><span>${total.toLocaleString()} ج.م</span></div>
        <div class="row"><span class="label">المبلغ المدفوع:</span><span>${paid.toLocaleString()} ج.م</span></div>
        <div class="row total"><span class="label">المتبقي:</span><span>${remaining.toLocaleString()} ج.م</span></div>
        ${paymentHistoryHTML}
        
        <div class="footer-info">
            <div class="footer-row"><span class="label">المحصل / القائم بالطباعة:</span><span>${collectorName}</span></div>
            <div class="footer-row"><span class="label">التوقيع:</span><span>..................................</span></div>
        </div>
        </body></html>`);
        printWindow.document.close();
        setTimeout(() => { printWindow.focus(); printWindow.print(); printWindow.close(); }, 500);
    };

    // Expose function to window for printing expired practices
    (window as any).printExpiredPractices = () => {
        const filterForm = document.getElementById('judicial-control-filter-form') as HTMLFormElement;
        if (!filterForm) return;

        // Re-apply filters to get the current filtered data
        const textFilter = (filterForm.querySelector('[name="filter-text"]') as HTMLInputElement).value.toLowerCase();
        const statusFilter = (filterForm.querySelector('[name="filter-status"]') as HTMLSelectElement).value;
        const dateFromFilter = (filterForm.querySelector('[name="filter-date-from"]') as HTMLInputElement).value;
        const dateToFilter = (filterForm.querySelector('[name="filter-date-to"]') as HTMLInputElement).value;

        const expiredPractices = state.judicialControl.filter(item => {
            const rDate = new Date(item.reportDate);
            const tDate = new Date();
            const dTime = Math.abs(tDate.getTime() - rDate.getTime());
            const dDays = Math.ceil(dTime / (1000 * 60 * 60 * 24));
            const isExpiredPractice = item.reportType === 'ممارسة' && dDays > 60 && item.status !== 'تم تركيب عداد';

            if (!isExpiredPractice) return false; // Only interested in expired practices

            const textMatch = !textFilter ||
                (item.subscriberName || '').toLowerCase().includes(textFilter) ||
                (item.nationalId || '').toLowerCase().includes(textFilter) ||
                (item.address || '').toLowerCase().includes(textFilter) ||
                (item.meterChassisNumber || '').toLowerCase().includes(textFilter) ||
                (item.subscriptionCode || '').toLowerCase().includes(textFilter);

            const statusMatch = !statusFilter || item.status === statusFilter;

            const dateMatch = (!dateFromFilter || (item.reportDate && item.reportDate >= dateFromFilter)) &&
                (!dateToFilter || (item.reportDate && item.reportDate <= dateToFilter));

            return textMatch && statusMatch && dateMatch;
        });

        if (expiredPractices.length === 0) {
            showToast('لا توجد ممارسات منتهية مطابقة لمعايير البحث لطباعتها.', 'error');
            return;
        }

        // التحقق من وجود فئة التقرير العريض لضبط هوامش الصفحة برمجياً قبل الطباعة
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            showToast('فشل فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة.', 'error');
            return;
        }

        const companyName = state.settings.replacementReportCompanyName || state.settings.companyName || 'ELMAGHRABI';
        const printDate = new Date().toLocaleString('ar-EG');
        const logoSrc = state.settings.companyLogo;
        const logoHTML = logoSrc ? `<img src="${logoSrc}" alt="Logo" class="company-logo">` : '';

        let tableRowsHTML = expiredPractices.map((item, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${item.subscriberName || ''}</td>
            <td>${item.address || ''}</td>
            <td>${item.nationalId || ''}</td>
            <td>${item.reportDate || ''}</td>
        </tr>
    `).join('');

        printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>تقرير الممارسات المنتهية</title>
            <link rel="stylesheet" href="index.css">
            <style>
                @page { size: A4 landscape; margin: 10mm; }
                body { background-color: #fff; font-family: 'Tajawal', sans-serif; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #000; padding: 5px; text-align: center; font-size: 10pt; }
                th { background-color: #f0f0f0; }
                .print-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                .header-text { text-align: right; flex-grow: 1; }
                .header-text h1 { font-size: 16pt; margin: 0; line-height: 1.2; }
                .header-text h2 { font-size: 12pt; margin: 5px 0 0; font-weight: bold; }
                .header-text p { font-size: 10pt; margin: 5px 0 0; }
                .company-logo { max-width: 100px; max-height: 100px; object-fit: contain; }
                .logo-container { width: 120px; display: flex; justify-content: flex-end; }
            </style>
        </head>
        <body>
            <div class="print-header">
                <div class="header-text">
                    <h1>${companyName}</h1>
                    <h2>تقرير الممارسات المنتهية</h2>
                    <p>تاريخ الطباعة: ${printDate}</p>
                </div>
                <div class="logo-container">${logoHTML}</div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>م</th>
                        <th>اسم المخالف</th>
                        <th>العنوان</th>
                        <th>الرقم القومي</th>
                        <th>تاريخ آخر ممارسة</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRowsHTML}
                </tbody>
            </table>
        </body>
        </html>
    `);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }, 500);
    };

};

// --- قسم تحصيل زينات ---
    const renderZinatCollectionSection = () => {
        const tableBody = document.querySelector('#collection-zinat-table tbody');
        const tableHead = document.querySelector('#collection-zinat-table thead');
        if (!tableBody || !tableHead) return;

        // تحديث رؤوس الجدول ديناميكياً لضمان تطابقها مع البيانات
        tableHead.innerHTML = `
        <tr>
            <th>اسم المواطن / المشترك</th>
            <th>العنوان</th>
            <th>رقم الموبايل</th>
            <th>الفني المسؤول</th>
            <th>تاريخ الطلب</th>
            <th>المبلغ المطلوب</th>
            <th>المبلغ المدفوع</th>
            <th>المتبقي</th>
            <th>حالة السداد</th>
            <th class="actions-cell">إجراءات</th>
        </tr>
    `;

        const filterForm = document.getElementById('zinat-collection-filter-form') as HTMLFormElement;
        const nameFilter = filterForm ? (filterForm.querySelector('[name="filter-name"]') as HTMLInputElement).value.toLowerCase() : '';
        const mobileFilter = filterForm ? (filterForm.querySelector('[name="filter-mobile"]') as HTMLInputElement).value.toLowerCase() : '';
        const dateFilter = filterForm ? (filterForm.querySelector('[name="filter-date"]') as HTMLInputElement).value : '';

        // Address Multi-select Logic
        const addressMultiselect = document.querySelector('#filter-zinat-address-multiselect .multiselect-options');
        const addressBtn = document.querySelector('#filter-zinat-address-multiselect .multiselect-btn');
        let selectedAddresses: string[] = [];

        if (addressMultiselect) {
            const currentSelection = Array.from(addressMultiselect.querySelectorAll('input:checked')).map((i: any) => i.value);
            const uniqueAddresses = [...new Set(state.zinatCollection.map(i => i.address).filter(a => a))].sort();

            addressMultiselect.innerHTML = uniqueAddresses.map(addr => `
            <label><input type="checkbox" class="address-checkbox" value="${addr}" ${currentSelection.includes(addr) ? 'checked' : ''}><span>${addr}</span></label>
        `).join('');

            selectedAddresses = Array.from(addressMultiselect.querySelectorAll('input:checked')).map((i: any) => i.value);
            if (addressBtn) addressBtn.textContent = selectedAddresses.length > 0 ? selectedAddresses.join(', ') : (addressBtn.getAttribute('data-placeholder') || 'اختر العناوين...');
        }

        const isAdmin = hasPermission('manage_collection');

        const filteredData = state.zinatCollection.filter(item => {
            const matchName = !nameFilter || (item.requesterName || '').toLowerCase().includes(nameFilter);
            const matchMobile = !mobileFilter || (item.mobile || '').toLowerCase().includes(mobileFilter);
            const matchDate = !dateFilter || item.requestDate === dateFilter;
            const matchAddress = selectedAddresses.length === 0 || selectedAddresses.includes(item.address);
            return matchName && matchMobile && matchDate && matchAddress;
        });

        tableBody.innerHTML = '';
        if (filteredData.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="10" style="text-align: center;">لا توجد طلبات زينات مطابقة.</td></tr>`;
            return;
        }

        let totalRequired = 0;
        let totalPaid = 0;
        let totalRemaining = 0;

        filteredData.forEach(item => {
            const total = Number(item.amount || 0);
            const paid = (item.payments || []).reduce((sum: number, p: Payment) => sum + p.amount, 0);
            const remaining = total - paid;
            const isFullyPaid = total > 0 && remaining <= 0;

            totalRequired += total;
            totalPaid += paid;
            totalRemaining += remaining;

            const statusBadge = isFullyPaid
                ? '<span class="status-badge bg-success">خالص</span>'
                : '<span class="status-badge bg-error">متأخر</span>';

            const row = document.createElement('tr');
            if (isFullyPaid) {
                row.classList.add('row-success');
            } else if (total > 0 && remaining > 0) {
                row.classList.add('row-danger');
            }
            row.innerHTML = `
            <td>${item.requesterName || ''}</td>
            <td>${item.address || ''}</td>
            <td>${item.mobile || ''}</td>
            <td>${item.technician || ''}</td>
            <td>${item.requestDate || ''}</td>
            <td>${total.toLocaleString()} ج.م</td>
            <td>${paid.toLocaleString()} ج.م</td>
            <td style="color: ${remaining > 0 ? 'red' : 'green'}; font-weight: bold;">${remaining.toLocaleString()} ج.م</td>
            <td>${statusBadge}</td>
            <td class="actions-cell">
                ${!isFullyPaid ? (isAdmin ? `<button class="btn btn-edit-details" onclick="window.openZinatPaymentModal(${item.id})">تحصيل</button>` : '') : '<span class="status-badge bg-success">تم السداد</span>'}
                ${hasButtonPermission('print_button') ? `<button class="btn btn-print-receipt" style="margin-right: 5px; padding: 2px 5px;" onclick="window.printCollectionReceipt(${item.id}, 'zinat')" title="طباعة إيصال"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg></button>` : ''}
                ${isAdmin && hasButtonPermission('delete_button') ? `<button class="btn btn-delete" onclick="window.deleteZinatRecord(${item.id})">حذف</button>` : ''}
            </td>
        `;
            tableBody.appendChild(row);
        });

        const summaryRow = document.createElement('tr');
        summaryRow.style.fontWeight = 'bold';
        summaryRow.style.backgroundColor = '#f8f9fa';
        summaryRow.innerHTML = `
        <td colspan="5" style="text-align: left; padding-left: 20px;">الإجمالي</td>
        <td>${totalRequired.toLocaleString()} ج.م</td>
        <td>${totalPaid.toLocaleString()} ج.م</td>
        <td>-</td>
        <td style="color: ${totalRemaining > 0 ? 'red' : 'green'};">${totalRemaining.toLocaleString()} ج.م</td>
        <td colspan="2"></td>
    `;
        tableBody.appendChild(summaryRow);

        // Render Summary by Address
        const summaryContainer = document.querySelector('#zinat-summary-by-address .summary-content');
        const summaryParent = document.getElementById('zinat-summary-by-address');
        if (summaryContainer && summaryParent) {
            const summaryByAddress = filteredData.reduce((acc, item) => {
                const addr = item.address || 'غير محدد';
                if (!acc[addr]) acc[addr] = { total: 0, remaining: 0 };
                const total = Number(item.amount || 0);
                const paid = (item.payments || []).reduce((sum: number, p: Payment) => sum + p.amount, 0);
                acc[addr].total += total;
                acc[addr].remaining += (total - paid);
                return acc;
            }, {} as { [key: string]: { total: number, remaining: number } });

            summaryContainer.innerHTML = Object.entries(summaryByAddress).map(([addr, counts]) => `<div class="summary-card" style="background: white; padding: 10px; border: 1px solid #ddd; border-radius: 4px; min-width: 150px; flex: 1;"><div style="font-weight: bold; margin-bottom: 5px; border-bottom: 1px solid #eee;">${addr}</div><div style="font-size: 0.9em;">المطلوب: ${counts.total.toLocaleString()}</div><div style="font-size: 0.9em; color: ${counts.remaining > 0 ? 'red' : 'green'}">المتبقي: ${counts.remaining.toLocaleString()}</div></div>`).join('');
            summaryParent.style.display = filteredData.length > 0 ? 'block' : 'none';
        }
    };

    const openZinatForm = () => {
        const form = document.getElementById('zinat-form') as HTMLFormElement;
        if (!form) return;
        form.reset();
        clearFormErrors(form);
        (document.getElementById('zinat-id') as HTMLInputElement).value = '';

        populateSelect(document.getElementById('zinat-address') as HTMLSelectElement, state.settings.addresses, 'اختر العنوان...');
        populateSelect(document.getElementById('zinat-technician') as HTMLSelectElement, state.settings.technicians, 'اختر الفني...');

        document.querySelectorAll('.content-section.active').forEach(s => s.classList.remove('active'));
        document.getElementById('zinat-registration')?.classList.add('active');
        setPageTitle('إضافة طلب زينات');
    };

    const handleZinatFormSubmit = async (event: Event) => {
        event.preventDefault();
        const form = event.target as HTMLFormElement;
        if (!validateForm(form)) return;

        const idInput = document.getElementById('zinat-id') as HTMLInputElement;
        const id = idInput.value ? parseInt(idInput.value, 10) : Date.now();

        const newItem: DataItem = {
            id: id,
            requesterName: (document.getElementById('zinat-requesterName') as HTMLInputElement).value,
            address: (document.getElementById('zinat-address') as HTMLSelectElement).value,
            mobile: (document.getElementById('zinat-mobile') as HTMLInputElement).value,
            technician: (document.getElementById('zinat-technician') as HTMLSelectElement).value,
            requestDate: (document.getElementById('zinat-requestDate') as HTMLInputElement).value,
            amount: (document.getElementById('zinat-amount') as HTMLInputElement).value,
            notes: (document.getElementById('zinat-notes') as HTMLTextAreaElement).value,
            payments: []
        };

        state.zinatCollection.push(newItem);
        logActivity('إضافة طلب زينات', `إضافة طلب زينات للمواطن / المشترك: ${newItem.requesterName}`);
        if (await saveState()) {
            showToast('تم حفظ الطلب بنجاح.');
            (document.querySelector('.nav-link[data-target="collection-zinat"]') as HTMLElement)?.click();
        } else {
            state.zinatCollection.pop();
        }
    };

    (window as any).deleteZinatRecord = (id: number) => {
        if (confirm('هل أنت متأكد من حذف هذا السجل؟')) {
            state.zinatCollection = state.zinatCollection.filter(i => i.id !== id);
            saveState();
            renderZinatCollectionSection();
            showToast('تم الحذف بنجاح.');
        }
    };

    (window as any).openZinatPaymentModal = async (id: number): Promise<void> => {
        const item = state.zinatCollection.find(i => i.id === id);
        if (!item) return;

        const totalPaid = (item.payments || []).reduce((sum, p) => sum + p.amount, 0);
        const remainingAmount = Number(item.amount) - totalPaid;

        const amountStr = prompt(`تسجيل دفعة زينات للمواطن / المشترك: ${item.requesterName}\nالمبلغ المتبقي: ${remainingAmount.toLocaleString()} ج.م\n\nأدخل المبلغ المدفوع:`);

        if (amountStr !== null && amountStr.trim() !== '') {
            const payVal = Number(amountStr);
            if (isNaN(payVal) || payVal <= 0) {
                showToast('يرجى إدخال مبلغ صحيح.', 'error');
                return;
            }

            const receiptNumber = prompt(`أدخل رقم الإيصال للمبلغ ${payVal.toLocaleString()} ج.م:`);
            if (!receiptNumber || receiptNumber.trim() === '') {
                showToast('رقم الإيصال مطلوب. تم إلغاء العملية.', 'error');
                return;
            }

            if (!item.payments) item.payments = [];
            item.payments.push({
                amount: payVal,
                receiptNumber: receiptNumber,
                date: new Date().toLocaleDateString('en-GB'),
                collectedBy: loggedInUser?.fullName ?? 'غير معروف',
            });

            logActivity('تحصيل زينات', `تم تحصيل مبلغ ${payVal} ج.م (إيصال: ${receiptNumber}) من ${item.requesterName}`);
            if (await saveState()) {
                renderZinatCollectionSection();
                showToast('تم تسجيل الدفع بنجاح.');
            } else {
                item.payments.pop(); // Revert if save failed
            }
        }
    };

    // --- Canvas Logic ---
    const initSketchCanvas = () => {
        sketchCanvas = document.getElementById('mukaysa-sketch-canvas') as HTMLCanvasElement;
        if (!sketchCanvas) return;
        sketchCtx = sketchCanvas.getContext('2d');
        if (!sketchCtx) return;

        // Set default styles
        sketchCtx.lineWidth = 2;
        sketchCtx.lineCap = 'round';
        sketchCtx.strokeStyle = '#000000';
        sketchCtx.font = '16px Tajawal, Arial';
        sketchCtx.fillStyle = '#000000';

        // Clear canvas to white background (important for saving as image)
        sketchCtx.fillStyle = '#ffffff';
        sketchCtx.fillRect(0, 0, sketchCanvas.width, sketchCanvas.height);
        sketchCtx.fillStyle = '#000000'; // Reset for drawing

        let startX = 0;
        let startY = 0;
        let snapshot: ImageData | null = null;

        const startDrawing = (e: MouseEvent) => {
            if (!sketchCtx || !sketchCanvas) return;
            const rect = sketchCanvas.getBoundingClientRect();
            // تصحيح إحداثيات الماوس لتتناسب مع دقة الكانفاس (Scaling) لضمان دقة الرسم
            const scaleX = sketchCanvas.width / rect.width;
            const scaleY = sketchCanvas.height / rect.height;

            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;

            // Save state for Undo before drawing
            if (undoStack.length > 15) undoStack.shift(); // Limit stack size
            undoStack.push(sketchCtx.getImageData(0, 0, sketchCanvas.width, sketchCanvas.height));

            if (currentTool === 'text') {
                const text = (document.getElementById('sketch-text-input') as HTMLInputElement).value;
                if (text) {
                    sketchCtx.save();
                    sketchCtx.translate(x, y);
                    sketchCtx.rotate(textRotation);
                    sketchCtx.fillText(text, 0, 0);
                    sketchCtx.restore();
                }
                return;
            }

            if (currentTool === 'point') {
                sketchCtx.beginPath();
                sketchCtx.arc(x, y, 4, 0, 2 * Math.PI);
                sketchCtx.fill();
                return;
            }

            isDrawing = true;
            startX = x;
            startY = y;
            // Save canvas state to restore it during drag (for straight line preview)
            snapshot = sketchCtx.getImageData(0, 0, sketchCanvas!.width, sketchCanvas!.height);
            sketchCtx.beginPath();
        };

        const stopDrawing = () => {
            isDrawing = false;
            if (sketchCtx) sketchCtx.beginPath();
        };

        const draw = (e: MouseEvent) => {
            if (!isDrawing || currentTool !== 'pen' || !sketchCtx || !sketchCanvas || !snapshot) return;
            const rect = sketchCanvas.getBoundingClientRect();

            const scaleX = sketchCanvas.width / rect.width;
            const scaleY = sketchCanvas.height / rect.height;

            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;

            // Restore the snapshot to clear the previous preview line
            sketchCtx.putImageData(snapshot, 0, 0);

            // Draw straight line from start to current position
            sketchCtx.beginPath();
            sketchCtx.moveTo(startX, startY);
            sketchCtx.lineTo(x, y);
            sketchCtx.stroke();
        };

        // Remove old listeners to prevent duplication
        const newCanvas = sketchCanvas.cloneNode(true) as HTMLCanvasElement;
        sketchCanvas.parentNode?.replaceChild(newCanvas, sketchCanvas);
        sketchCanvas = newCanvas;
        sketchCtx = sketchCanvas.getContext('2d');
        // Re-apply defaults after clone
        if (sketchCtx) {
            sketchCtx.lineWidth = 2;
            sketchCtx.lineCap = 'round';
            sketchCtx.strokeStyle = '#000000';
            sketchCtx.font = '16px Tajawal, Arial';
            sketchCtx.fillStyle = '#ffffff';
            sketchCtx.fillRect(0, 0, sketchCanvas.width, sketchCanvas.height);
            sketchCtx.fillStyle = '#000000';
        }

        sketchCanvas.addEventListener('mousedown', startDrawing);
        sketchCanvas.addEventListener('mousemove', draw);
        sketchCanvas.addEventListener('mouseup', stopDrawing);
        sketchCanvas.addEventListener('mouseout', stopDrawing);
    };

    // --- مقاييس (مقايسات) ---
    const openMukayasatForm = () => {
        console.log("تم تحميل نموذج المقايسة - التحديث الجديد يعمل");
        const form = document.getElementById('mukayasat-form') as HTMLFormElement | null;
        if (!form) return;
        form.reset();
        clearFormErrors(form);
        (document.getElementById('mukaysa-id') as HTMLInputElement).value = '';
        undoStack = []; // Reset undo stack
        textRotation = 0; // Reset rotation

        // Populate dropdowns
        populateSelect(document.getElementById('mukaysa-technician') as HTMLSelectElement, state.settings.technicians, 'اختر الفني...');
        populateSelect(document.getElementById('mukaysa-engineer') as HTMLSelectElement, state.settings.technicalEngineers, 'اختر المهندس...');
        populateSelect(document.getElementById('mukaysa-headEngineer') as HTMLSelectElement, state.settings.headEngineers, 'اختر رئيس الهندسة...');

        // Show the registration section
        document.querySelectorAll('.content-section.active').forEach(s => s.classList.remove('active'));
        document.getElementById('mukayasat-registration')?.classList.add('active');
        setPageTitle('ادخال مقايسة');

        // Initialize Canvas
        setTimeout(() => {
            initSketchCanvas();
            // Setup toolbar listeners

            // Rotate Text Button
            document.getElementById('btn-rotate-text')?.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent tool selection logic
                textRotation = textRotation === 0 ? -Math.PI / 2 : 0;
                const btn = document.getElementById('btn-rotate-text');
                if (btn) btn.style.color = textRotation !== 0 ? 'var(--primary-color)' : '';
            });

            // Undo Button
            document.getElementById('btn-undo')?.addEventListener('click', () => {
                if (undoStack.length > 0 && sketchCtx) {
                    const lastState = undoStack.pop();
                    if (lastState) sketchCtx.putImageData(lastState, 0, 0);
                }
            });

            document.querySelectorAll('.btn-tool').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const target = e.currentTarget as HTMLElement;
                    if (target.id === 'btn-clear-sketch') {
                        if (sketchCtx && sketchCanvas) {
                            sketchCtx.fillStyle = '#ffffff';
                            sketchCtx.fillRect(0, 0, sketchCanvas.width, sketchCanvas.height);
                            sketchCtx.fillStyle = '#000000';
                        }
                    } else if (target.id !== 'btn-rotate-text' && target.id !== 'btn-undo') {
                        document.querySelectorAll('.btn-tool').forEach(b => b.classList.remove('active'));
                        target.classList.add('active');
                        currentTool = target.dataset.tool || 'pen';
                    }
                });
            });
        }, 100);
    };

    // --- Liquidation Logic ---
    const setupLiquidationSection = () => {
        const dashboardSection = document.getElementById('dashboard');
        const contentContainer = dashboardSection?.parentElement;
        if (contentContainer && !document.getElementById('liquidation-section')) {
            const section = document.createElement('section');
            section.id = 'liquidation-section';
            section.className = 'content-section';
            section.innerHTML = `
            <div class="main-header">
                <h2>تصفية العداد</h2>
                <div class="header-actions">
                    <button class="btn-back-page" onclick="window.handleGoBack()">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                        عودة
                    </button>
                </div>
            </div>
            <div class="content-body">
                <div class="card">
                    <div class="card-header">
                        <h3>بيانات التصفية</h3>
                    </div>
                    <div class="card-body">
                        <form id="liquidation-form">
                            <input type="hidden" id="liquidation-meter-id">
                            <div class="form-grid">
                                <div class="input-group">
                                    <label>اسم المشترك</label>
                                    <div id="liquidation-subscriberName" class="form-static-text"></div>
                                </div>
                                <div class="input-group">
                                    <label>كود الاشتراك</label>
                                    <div id="liquidation-subscriptionCode" class="form-static-text"></div>
                                </div>
                                <div class="input-group">
                                    <label>شاسية العداد</label>
                                    <div id="liquidation-meterChassisNumber" class="form-static-text"></div>
                                </div>
                                <div class="input-group">
                                    <label for="liquidation-date">تاريخ التصفية</label>
                                    <input type="date" id="liquidation-date" required>
                                </div>
                                <div class="input-group full-width">
                                    <label for="liquidation-receipt">صورة إيصال التصفية</label>
                                    <input type="file" id="liquidation-receipt" accept="image/*">
                                    <div id="liquidation-receipt-preview" style="margin-top: 10px; max-width: 300px;"></div>
                                </div>
                            </div>
                            <div class="form-actions">
                                <button type="submit" class="btn">حفظ التصفية</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
            contentContainer.appendChild(section);

            document.getElementById('liquidation-form')?.addEventListener('submit', handleLiquidationSave);
        }
    };

    (window as any).openLiquidationForm = (id: number) => {
        const meter = state.meters.find(m => m.id === id);
        if (!meter) return;

        // Inject HTML if missing
        setupLiquidationSection();

        (document.getElementById('liquidation-meter-id') as HTMLInputElement).value = String(meter.id);
        document.getElementById('liquidation-subscriberName')!.textContent = meter.subscriberName || '-';
        document.getElementById('liquidation-subscriptionCode')!.textContent = meter.subscriptionCode || '-';
        document.getElementById('liquidation-meterChassisNumber')!.textContent = meter.meterChassisNumber || '-';

        (document.getElementById('liquidation-date') as HTMLInputElement).value = meter.liquidationDate || '';
        (document.getElementById('liquidation-receipt') as HTMLInputElement).value = '';

        const preview = document.getElementById('liquidation-receipt-preview');
        if (preview) {
            preview.innerHTML = meter.liquidationReceiptImage
                ? `<img src="${meter.liquidationReceiptImage}" style="max-width: 100%; border: 1px solid #ccc; border-radius: 4px;">`
                : '';
        }

        document.querySelectorAll('.content-section.active').forEach(s => s.classList.remove('active'));
        document.getElementById('liquidation-section')?.classList.add('active');
        setPageTitle('تصفية العداد');
    };

    const handleLiquidationSave = async (e: Event) => {
        e.preventDefault();
        const id = parseInt((document.getElementById('liquidation-meter-id') as HTMLInputElement).value, 10);
        const date = (document.getElementById('liquidation-date') as HTMLInputElement).value;
        const fileInput = document.getElementById('liquidation-receipt') as HTMLInputElement;

        const meterIndex = state.meters.findIndex(m => m.id === id);
        if (meterIndex === -1) return;

        let imageData = state.meters[meterIndex].liquidationReceiptImage;

        if (fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            imageData = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.readAsDataURL(file);
            });
        }

        state.meters[meterIndex].liquidationDate = date;
        state.meters[meterIndex].liquidationReceiptImage = imageData;

        logActivity('تصفية عداد', `تم تسجيل تصفية للمشترك ${state.meters[meterIndex].subscriberName}`, `تاريخ: ${date}`);
        await saveState();
        showToast('تم حفظ بيانات التصفية بنجاح.');

        // Refresh and go back
        const demLink = document.querySelector('.sidebar-nav .nav-link[data-target="subscribers-demolition"]') as HTMLElement;
        if (demLink) demLink.click();
    };

    // --- End Liquidation Logic ---

    const openMukayasatFormForEdit = (mukayasaId: number) => {
        const item = state.mukayasat.find(m => m.id === mukayasaId);
        if (!item) {
            showToast('لم يتم العثور على المقايسة.', 'error');
            return;
        }
        openMukayasatForm(); // Open and reset the form first
        document.getElementById('mukayasat-form-title')!.textContent = `تعديل المقايسة رقم: ${item.requestNumber}`;
        // Populate form
        Object.keys(item).forEach(key => {
            const input = document.getElementById(`mukaysa-${key}`) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
            if (input && item[key] !== undefined) {
                input.value = String(item[key]);
            }
        });

        // Load sketch if exists
        if (item.sketchImage) {
            setTimeout(() => {
                const img = new Image();
                img.onload = () => sketchCtx?.drawImage(img, 0, 0);
                img.src = item.sketchImage!;
            }, 200);
        }
    };

    const handleMukayasatFormSubmit = async (event: Event) => {
        event.preventDefault();
        const form = event.target as HTMLFormElement;
        if (!form) return;

        const name = (document.getElementById('mukaysa-requesterName') as HTMLInputElement).value.trim();
        const requestNumber = (document.getElementById('mukaysa-requestNumber') as HTMLInputElement).value.trim();
        if (!name || !requestNumber) {
            showToast('يرجى إدخال اسم مقدم الطلب ورقم الطلب.', 'error');
            return;
        }

        const transformerLoad = parseFloat((document.getElementById('mukaysa-transformer-load') as HTMLInputElement).value);
        if (!isNaN(transformerLoad) && transformerLoad > 100) {
            showToast('نسبة تحميل المحول لا يمكن أن تتجاوز 100%.', 'error');
            return;
        }

        const mukaysaId = (document.getElementById('mukaysa-id') as HTMLInputElement).value;

        // Read attachments (if any) as data URLs
        const attachmentsInput = document.getElementById('mukaysa-attachments') as HTMLInputElement | null;
        const attachmentsFiles = attachmentsInput?.files ? Array.from(attachmentsInput.files) : [];
        const attachmentsData: string[] = [];
        if (attachmentsFiles.length > 0) {
            try {
                const readers = attachmentsFiles.map(file => new Promise<string>((res, rej) => {
                    const reader = new FileReader();
                    reader.onload = () => res(String(reader.result));
                    reader.onerror = () => rej(new Error('فشل قراءة الملف'));
                    reader.readAsDataURL(file);
                }));
                const results = await Promise.all(readers);
                attachmentsData.push(...results);
            } catch (err) {
                showToast('حدث خطأ عند قراءة المرفقات.', 'error');
                console.error(err);
                return;
            }
        }

        const sketchData = sketchCanvas ? sketchCanvas.toDataURL('image/png') : undefined;

        const entry: DataItem = {
            id: mukaysaId ? parseInt(mukaysaId, 10) : Date.now(),
            requesterName: name,
            nationalId: (document.getElementById('mukaysa-nationalId') as HTMLInputElement).value.trim(),
            requestNumber: requestNumber,
            address: (document.getElementById('mukaysa-address') as HTMLInputElement).value.trim(),
            mobile: (document.getElementById('mukaysa-mobile') as HTMLInputElement).value.trim(),
            establishmentType: (document.getElementById('mukaysa-establishmentType') as HTMLSelectElement).value,
            unitsDescription: (document.getElementById('mukaysa-unitsDescription') as HTMLTextAreaElement).value.trim(),
            distanceFromFeed: (document.getElementById('mukaysa-distance-feed') as HTMLInputElement).value.trim(),
            dimensionsDescription: (document.getElementById('mukaysa-dimensions') as HTMLTextAreaElement).value.trim(),
            // New: single/three-phase meter counts
            singlePhaseMeters: parseInt((document.getElementById('mukaysa-single-phase-count') as HTMLInputElement).value || '0', 10),
            threePhaseMeters: parseInt((document.getElementById('mukaysa-three-phase-count') as HTMLInputElement).value || '0', 10),
            connectionType: (document.getElementById('mukaysa-connectionType') as HTMLSelectElement).value.trim(),
            boundaryEast: (document.getElementById('mukaysa-boundary-east') as HTMLInputElement).value.trim(),
            boundaryWest: (document.getElementById('mukaysa-boundary-west') as HTMLInputElement).value.trim(),
            boundaryNorth: (document.getElementById('mukaysa-boundary-north') as HTMLInputElement).value.trim(),
            boundarySouth: (document.getElementById('mukaysa-boundary-south') as HTMLInputElement).value.trim(),
            transformerName: (document.getElementById('mukaysa-transformerName') as HTMLInputElement).value.trim(),
            distanceFromTransformer: (document.getElementById('mukaysa-distance-transformer') as HTMLInputElement).value.trim(),
            transformerLoadPercent: (document.getElementById('mukaysa-transformer-load') as HTMLInputElement).value.trim(),
            distanceFromPole: (document.getElementById('mukaysa-distance-pole') as HTMLInputElement).value.trim(),
            sortiaLoad: (document.getElementById('mukaysa-sortiaLoad') as HTMLInputElement)?.value?.trim() || '',
            transformerCapacity: (document.getElementById('mukaysa-transformerCapacity') as HTMLInputElement)?.value?.trim() || '',
            mainConnectionType: (document.getElementById('mukaysa-mainConnectionType') as HTMLSelectElement).value.trim(),
            attachments: attachmentsData,
            technicianName: (document.getElementById('mukaysa-technician') as HTMLSelectElement).value.trim(),
            technicalEngineer: (document.getElementById('mukaysa-engineer') as HTMLSelectElement).value.trim(),
            headOfEngineering: (document.getElementById('mukaysa-headEngineer') as HTMLSelectElement).value.trim(),
            status: 'قيد المعالجة',
            sketchImage: sketchData
        };

        if (mukaysaId) {
            // Update existing entry
            const index = state.mukayasat.findIndex(m => m.id === entry.id);
            if (index !== -1) {
                state.mukayasat[index] = { ...state.mukayasat[index], ...entry };
                logActivity('تعديل مقايسة', `تم تعديل المقايسة رقم ${entry.requestNumber}`);
                showToast('تم تحديث المقايسة بنجاح.');
            }
        } else {
            // Add new entry
            state.mukayasat.push(entry);
            logActivity('إضافة مقايسة', `تمت إضافة مقايسة رقم ${entry.requestNumber} باسم ${entry.requesterName}`);
            showToast('تم حفظ المقايسة بنجاح.');
        }

        saveState();
        (document.querySelector('.sidebar-nav .nav-link[data-target="mukayasat-list"]') as HTMLElement | null)?.click();
    };

    // دالة لتحديث حالة المقايسة وإدارة تسلسل الإجراءات
    (window as any).updateMukayasaStatus = async (id: number) => {
        const index = state.mukayasat.findIndex(m => m.id === id);
        if (index === -1) return;
        const item = state.mukayasat[index];

        if (item.status === 'قيد المعالجة') {
            if (confirm('هل أنت متأكد من تأكيد بيانات المعاينة؟ ستصبح المقايسة قابلة للسداد.')) {
                item.status = 'المقايسة قابلة السداد';
                logActivity('تحديث حالة مقايسة', `تم تغيير حالة المقايسة رقم ${item.requestNumber} إلى قابلة للسداد`);
                await saveState();
                renderMukayasatList();
                showToast('تم تأكيد البيانات، المقايسة الآن قابلة للسداد.');
            }
        } else if (item.status === 'المقايسة قابلة السداد') {
            if (confirm('هل تم سداد القيمة والصرف من المخزن؟')) {
                item.status = 'تم الصرف من المخزن';
                logActivity('تحديث حالة مقايسة', `تم تغيير حالة المقايسة رقم ${item.requestNumber} إلى تم الصرف من المخزن`);
                await saveState();
                renderMukayasatList();
                showToast('تم تحديث الحالة إلى تم الصرف من المخزن.');
            }
        } else if (item.status === 'تم الصرف من المخزن') {
            const chassis = prompt('أدخل رقم شاسية العداد:');
            if (chassis === null) return; // Cancelled
            if (!chassis.trim()) { showToast('رقم الشاسية مطلوب', 'error'); return; }

            const code = prompt('أدخل كود المشترك:');
            if (code === null) return;
            if (!code.trim()) { showToast('كود المشترك مطلوب', 'error'); return; }

            const panel = prompt('أدخل رقم اللوحة:');
            if (panel === null) return;

            item.meterChassisNumber = chassis;
            item.subscriptionCode = code;
            item.panelNumber = panel;
            item.status = 'مكتمل'; // الحالة النهائية

            logActivity('إتمام مقايسة', `تم إتمام المقايسة رقم ${item.requestNumber} وتركيب العداد (شاسية: ${chassis})`);
            await saveState();
            renderMukayasatList();
            showToast('تم إكمال المقايسة وحفظ بيانات العداد بنجاح.');
        }
    };

    const handleClearMukayasaForm = () => {
        if (confirm('هل أنت متأكد من مسح جميع البيانات في النموذج؟')) {
            const form = document.getElementById('mukayasat-form') as HTMLFormElement;
            if (form) {
                form.reset();
                clearFormErrors(form);
                (document.getElementById('mukaysa-id') as HTMLInputElement).value = '';

                if (sketchCtx && sketchCanvas) {
                    sketchCtx.fillStyle = '#ffffff';
                    sketchCtx.fillRect(0, 0, sketchCanvas.width, sketchCanvas.height);
                    sketchCtx.fillStyle = '#000000';
                }
            }
        }
    };

    const renderMukayasatList = () => {
        const tableBody = document.querySelector('#mukayasat-table tbody') as HTMLElement | null;
        const tableHead = document.querySelector('#mukayasat-table thead') as HTMLElement | null;
        if (!tableBody || !tableHead) return;

        tableHead.innerHTML = `
        <tr>
            <th>اسم الطالب</th>
            <th>رقم الطلب</th>
            <th>الرقم القومي</th>
            <th>العنوان</th>
            <th>الموبايل</th>
            <th>نوع المنشأة</th>
            <th>حالة الطلب</th>
            <th>إجراءات</th>
        </tr>
    `;

        if (!tableBody) return;
        tableBody.innerHTML = '';

        if (!state.mukayasat || state.mukayasat.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;">لا توجد مقاييس محفوظة.</td></tr>`;
            return;
        }

        state.mukayasat.forEach(item => {
            // منطق زر الإجراء المتعدد
            let multiActionBtn = '';
            if (item.status === 'قيد المعالجة') {
                multiActionBtn = `<button class="btn" style="background-color: #17a2b8; color: white; font-size: 0.8rem; padding: 4px 8px; margin-bottom: 5px; display: block; width: 100%;" onclick="window.updateMukayasaStatus(${item.id})">تأكيد بيانات المعاينة</button>`;
            } else if (item.status === 'المقايسة قابلة السداد') {
                multiActionBtn = `<button class="btn" style="background-color: #ffc107; color: #000; font-size: 0.8rem; padding: 4px 8px; margin-bottom: 5px; display: block; width: 100%;" onclick="window.updateMukayasaStatus(${item.id})">صرف من المخزن</button>`;
            } else if (item.status === 'تم الصرف من المخزن') {
                multiActionBtn = `<button class="btn" style="background-color: #28a745; color: white; font-size: 0.8rem; padding: 4px 8px; margin-bottom: 5px; display: block; width: 100%;" onclick="window.updateMukayasaStatus(${item.id})">إدخال بيانات العداد</button>`;
            }

            const row = document.createElement('tr');
            row.innerHTML = `
            <td>${item.requesterName || ''}</td>
            <td>${item.requestNumber || ''}</td>
            <td>${item.nationalId || ''}</td>
            <td>${item.address || ''}</td>
            <td>${item.mobile || ''}</td>
            <td>${item.establishmentType || ''}</td>
            <td>${item.status || ''}</td>
            <td class="actions-cell">
                ${multiActionBtn}
                ${hasButtonPermission('view_button') ? `<button class="btn btn-view-details" data-id="${item.id}">عرض</button>` : ''}
                ${hasButtonPermission('edit_button') ? `<button class="btn btn-edit-mukayasa" data-id="${item.id}">تعديل</button>` : ''}
                ${hasButtonPermission('delete_button') ? `<button class="btn btn-delete-mukayasa btn-delete" data-id="${item.id}">حذف</button>` : ''}
            </td>
        `;
            tableBody.appendChild(row);
        });
    };

    const handleDeleteMukayasa = (mukayasaId: number) => {
        const itemToDelete = state.mukayasat.find(m => m.id === mukayasaId);
        if (!itemToDelete) return;

        const onConfirm = async () => {
            state.mukayasat = state.mukayasat.filter(m => m.id !== mukayasaId);
            const summary = `رقم الطلب: ${itemToDelete.requestNumber}, اسم الطالب: ${itemToDelete.requesterName}`;
            logActivity('حذف مقايسة', `حذف سجل المقايسة "${itemToDelete.requesterName}".`, summary);
            await saveState();
            showToast('تم حذف المقايسة بنجاح.');
            // Re-render the list to show the change
            renderMukayasatList();
        };

        showConfirmationDialog(
            'تأكيد الحذف',
            `هل أنت متأكد من رغبتك في حذف المقايسة الخاصة بـ "${itemToDelete.requesterName}" (رقم الطلب: ${itemToDelete.requestNumber})؟ لا يمكن التراجع عن هذا الإجراء.`,
            onConfirm
        );
    };

    const openMukayasaDetails = (mukayasaId: number) => {
        const item = state.mukayasat.find(m => m.id === mukayasaId);
        if (!item) {
            showToast('لم يتم العثور على المقايسة.', 'error');
            return;
        }

        currentMukayasaIdForDetails = mukayasaId;
        const activeSection = document.querySelector('.content-section.active');
        previousPageId = activeSection ? activeSection.id : 'mukayasat-list';

        const detailsContent = document.getElementById('mukayasa-details-content')!;
        document.getElementById('mukayasa-details-title')!.textContent = `تفاصيل المقايسة رقم: ${item.requestNumber}`;

        const printInstallBtn = document.getElementById('print-installation-details-btn');
        if (printInstallBtn) {
            // Show button if installation data exists
            const hasInstallData = item.meterChassisNumber || item.subscriptionCode || item.status === 'مكتمل';
            printInstallBtn.style.display = hasInstallData ? 'inline-flex' : 'none';
        }

        const createDetailItem = (label: string, value: any) => {
            if (value === undefined || value === null || value === '') return '';
            return `<div class="detail-item"><label>${label}</label><span class="value">${value}</span></div>`;
        };

        detailsContent.innerHTML = `
        <div class="details-grid">
            <fieldset><legend>البيانات الأساسية</legend>
                ${createDetailItem('اسم مقدم الطلب', item.requesterName)}
                ${createDetailItem('رقم الطلب', item.requestNumber)}
                ${createDetailItem('الرقم القومي', item.nationalId)}
                ${createDetailItem('العنوان', item.address)}
                ${createDetailItem('رقم الموبايل', item.mobile)}
            </fieldset>
            <fieldset><legend>بيانات المنشأة</legend>
                ${createDetailItem('نوع المنشأة', item.establishmentType)}
                ${createDetailItem('وصف الوحدات والنشاط', `<pre>${item.unitsDescription || ''}</pre>`)}
                ${createDetailItem('وصف الأبعاد والمساحات', `<pre>${item.dimensionsDescription}</pre>`)}
            </fieldset>
            ${(item.meterChassisNumber || item.subscriptionCode) ? `
            <fieldset><legend>بيانات العداد المركب</legend>
                ${createDetailItem('رقم شاسية العداد', item.meterChassisNumber)}
                ${createDetailItem('كود المشترك', item.subscriptionCode)}
                ${createDetailItem('رقم اللوحة', item.panelNumber)}
            </fieldset>` : ''}
            <fieldset><legend>البيانات الفنية</legend>
                ${createDetailItem('عدد العدادات الأحادية', item.singlePhaseMeters)}
                ${createDetailItem('عدد العدادات الثلاثية', item.threePhaseMeters)}
                ${createDetailItem('نوع الوصلة', item.connectionType)}
                ${createDetailItem('البعد عن مصدر التغذية (م)', item.distanceFromFeed)}
                ${createDetailItem('اسم المحول', item.transformerName)}
                ${createDetailItem('قدرة المحول', item.transformerCapacity)}
                ${createDetailItem('البعد عن المحول (م)', item.distanceFromTransformer)}
                ${createDetailItem('نسبة تحميل المحول (%)', item.transformerLoadPercent)}
                ${createDetailItem('البعد عن أقرب عامود (م)', item.distanceFromPole)}
                ${createDetailItem('حمل السورتية (أمبير)', item.sortiaLoad)}
            </fieldset>
            <fieldset><legend>حدود العقار</legend>
                ${createDetailItem('الحد الشرقي', item.boundaryEast)}
                ${createDetailItem('الحد الغربي', item.boundaryWest)}
                ${createDetailItem('الحد القبلي', item.boundaryNorth)}
                ${createDetailItem('الحد البحري', item.boundarySouth)}
            </fieldset>
            <fieldset><legend>القائمون بالمعاينة</legend>
                ${createDetailItem('الفني', item.technicianName)}
                ${createDetailItem('مهندس الشئون الفنية', item.technicalEngineer)}
                ${createDetailItem('رئيس الهندسة', item.headOfEngineering)}
            </fieldset>
            <fieldset class="full-width"><legend>المرفقات</legend>
                <div class="attachments-preview">
                    ${(item.attachments && item.attachments.length > 0) ? item.attachments.map((att: string) => `<img src="${att}" alt="مرفق">`).join('') : '<span>لا توجد مرفقات.</span>'}
                </div>
            </fieldset>
        </div>
    `;

        // Navigate
        document.querySelectorAll('.content-section.active').forEach(s => s.classList.remove('active'));
        document.getElementById('mukayasa-details')?.classList.add('active');
        setPageTitle('تفاصيل المقايسة');
    };

    const openLostMemoDetails = (memoId: number) => {
        const memo = state.lostMeterMemos.find(m => m.id === memoId);
        if (!memo) {
            showToast('لم يتم العثور على المذكرة.', 'error');
            return;
        }

        currentLostMemoIdForDetails = memoId;
        const activeSection = document.querySelector('.content-section.active');
        previousPageId = activeSection ? activeSection.id : 'lost-meter-memos';

        const detailsContent = document.getElementById('lost-memo-details-content')!;
        document.getElementById('lost-memo-details-title')!.textContent = `تفاصيل: ${memo.memoType || 'مذكرة فقد عداد'}`;

        // Replace placeholders in the memo body
        const memoBody = (memo.memoBody || '')
            .replace('{subscriberName}', memo.subscriberName || 'غير محدد')
            .replace('{subscriptionCode}', memo.subscriptionCode || 'غير محدد')
            .replace('{meterChassisNumber}', memo.meterChassisNumber || 'غير محدد');

        detailsContent.innerHTML = `
        <div class="memo-display">
            <div class="memo-body">
                <pre>${memoBody}</pre>
            </div>
            <div class="memo-footer">
                <p><strong>التوقيع</strong></p>
                <p>${memo.memoAuthor || ''}</p>
                <p><strong>بتاريخ:</strong> ${memo.memoDate || ''}</p>
            </div>
        </div>
    `;

        // Navigate to the details section
        document.querySelectorAll('.content-section.active').forEach(s => s.classList.remove('active'));
        document.getElementById('lost-memo-details')?.classList.add('active');
        setPageTitle('تفاصيل المذكرة');
    };

    const handlePrintLostMemo = () => {
        if (currentLostMemoIdForDetails === null) return;
        const memo = state.lostMeterMemos.find(m => m.id === currentLostMemoIdForDetails);
        if (!memo) return;

        const printContent = document.getElementById('lost-memo-details-content')?.innerHTML || '';

        let signatures = state.settings.generalSignatures;
        if (memo.memoType === 'إحلال') signatures = state.settings.replacementSignatures;
        else if (memo.memoType === 'أعطال') signatures = state.settings.faultyMeterSignatures;
        else if (memo.memoType === 'مذكرة فقد عداد') signatures = state.settings.generalSignatures; // Default

        printOfficialDocument(`طباعة: ${memo.memoType}`, memo.memoType || 'مذكرة بشأن عداد مفقود', printContent, signatures);
    };

    const printOfficialDocument = (printWindowTitle: string, documentTitle: string, contentHTML: string, signaturesList?: string[]) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            showToast('فشل فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة.', 'error');
            return;
        }

        const companyName = (state.settings.replacementReportCompanyName || state.settings.companyName).replace(/\n/g, '<br>');
        const logoSrc = state.settings.companyLogo;
        const logoHTML = logoSrc ? `<img src="${logoSrc}" alt="Logo" class="company-logo">` : '';
        const printDate = new Date().toLocaleString('ar-EG');
        const signatures = signaturesList || state.settings.replacementSignatures || [];
        const signaturesHTML = signatures.length > 0
            ? `<div class="signatures-section">${signatures.map(sig => `<div class="signature-item"><span>${sig}</span><span>...................</span></div>`).join('')}</div>`
            : '';

        printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>${printWindowTitle}</title>
            <link rel="stylesheet" href="index.css">
            <style>
                @page { size: A4; margin: 25mm; }
                body { background-color: #fff !important; font-family: 'Tajawal', sans-serif; font-size: 14pt; line-height: 1.8; }
                .print-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; margin-bottom: 40px; padding-bottom: 15px; }
                .header-text { text-align: right; flex-grow: 1; }
                .header-text h1 { margin: 0; font-size: 18pt; }
                .header-text h2 { margin: 5px 0 0; font-size: 14pt; font-weight: normal; }
                .company-logo { max-width: 100px; max-height: 100px; object-fit: contain; }
                .signatures-section { display: flex; flex-direction: column; align-items: flex-end; margin-top: 3cm; page-break-inside: avoid; }
                .signature-item { margin-top: 20px; font-weight: bold; }
                .print-footer { text-align: left; font-size: 10pt; color: #777; position: fixed; bottom: 15mm; width: 100%; }
                pre { white-space: pre-wrap; font-family: inherit; font-size: inherit; }
            </style>
        </head>
        <body>
            <div class="print-header">
                <div class="header-text"><h1>${companyName}</h1><h2>${documentTitle}</h2></div>
                <div class="logo-container">${logoHTML}</div>
            </div>
            ${contentHTML}
            ${signaturesHTML}
            <div class="print-footer"><p>تاريخ الطباعة: ${printDate}</p></div>
        </body>
        </html>
    `);
        printWindow.document.close();
        setTimeout(() => { printWindow.focus(); printWindow.print(); printWindow.close(); }, 500);
    };

    const handlePasswordChange = async () => {
        if (!loggedInUser) return;

        const form = document.getElementById('password-change-form') as HTMLFormElement;
        const currentPasswordInput = document.getElementById('current-password') as HTMLInputElement;
        const newPasswordInput = document.getElementById('new-password') as HTMLInputElement;
        const confirmNewPasswordInput = document.getElementById('confirm-new-password') as HTMLInputElement;

        clearFormErrors(form);

        const currentPassword = currentPasswordInput.value;
        const newPassword = newPasswordInput.value;
        const confirmNewPassword = confirmNewPasswordInput.value;

        // Basic validation
        if (!currentPassword || !newPassword || !confirmNewPassword) {
            showToast('يرجى ملء جميع الحقول.', 'error');
            return;
        }

        if (newPassword !== confirmNewPassword) {
            showToast('كلمتا المرور الجديدتان غير متطابقتين.', 'error');
            showFieldError(confirmNewPasswordInput, 'كلمتا المرور الجديدتان غير متطابقتين.');
            return;
        }

        const userIndex = state.users.findIndex(u => u.username === loggedInUser!.username);
        if (userIndex === -1) {
            showToast('لم يتم العثور على المستخدم.', 'error');
            return;
        }

        const user = state.users[userIndex];

        // Verify current password
        if (user.password !== currentPassword) {
            showToast('كلمة المرور الحالية غير صحيحة.', 'error');
            showFieldError(currentPasswordInput, 'كلمة المرور الحالية غير صحيحة.');
            return;
        }

        // Update password
        user.password = newPassword;
        logActivity('تغيير كلمة المرور', `قام المستخدم ${user.fullName} بتغيير كلمة المرور الخاصة به.`);

        await saveState();
        showToast('تم تغيير كلمة المرور بنجاح.');
        (document.getElementById('password-change-dialog') as HTMLElement).hidden = true;
    };

    const handlePrintTable = (tableId: string, title: string) => {
        const table = document.getElementById(tableId);
        if (!table) {
            showToast('لم يتم العثور على الجدول.', 'error');
            return;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            showToast('فشل فتح نافذة الطباعة.', 'error');
            return;
        }

        const companyName = (state.settings.replacementReportCompanyName || state.settings.companyName || 'ELMAGHRABI').replace(/\n/g, '<br>');
        const printDate = new Date().toLocaleString('ar-EG');
        const logoSrc = state.settings.companyLogo;
        const logoHTML = logoSrc ? `<img src="${logoSrc}" alt="Logo" class="company-logo">` : '';
        const tableHTML = table.outerHTML;

        printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>${title}</title>
            <link rel="stylesheet" href="index.css">
            <style>
                @page { size: A4 landscape; margin: 6mm; }
                body { background-color: #fff; font-family: 'Tajawal', sans-serif; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #000; padding: 3px 2px; text-align: center; font-size: 8pt; }
                th { background-color: #f0f0f0; }
                #transformer-load-records-table {
                    width: 100%;
                    table-layout: fixed;
                    font-size: 7.5pt;
                    word-break: break-word;
                }
                #transformer-load-records-table th,
                #transformer-load-records-table td {
                    padding: 2px;
                    white-space: normal;
                    vertical-align: middle;
                }
                /* إخفاء عمود التحديد وعمود الإجراءات عند الطباعة */
                #transformers-table th:first-child, #transformers-table td:first-child, .actions-cell, #transformer-load-records-table .actions-cell { display: none !important; }
                .print-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                .header-text { text-align: right; flex-grow: 1; }
                .header-text h1 { font-size: 16pt; margin: 0; line-height: 1.2; }
                .header-text h2 { font-size: 12pt; margin: 5px 0 0; font-weight: bold; }
                .header-text p { font-size: 10pt; margin: 5px 0 0; }
                .company-logo { max-width: 100px; max-height: 100px; object-fit: contain; }
                .logo-container { width: 120px; display: flex; justify-content: flex-end; }
            </style>
        </head>
        <body>
            <div class="print-header">
                <div class="header-text">
                    <h1>${companyName}</h1>
                    <h2>${title}</h2>
                    <p>تاريخ الطباعة: ${printDate}</p>
                </div>
                <div class="logo-container">${logoHTML}</div>
            </div>
            ${tableHTML}
        </body>
        </html>
    `);
        printWindow.document.close();
        setTimeout(() => { printWindow.focus(); printWindow.print(); printWindow.close(); }, 500);
    };

    const renderLostMemosSection = () => {
        const tableBody = document.querySelector('#lost-memos-table tbody');
        if (!tableBody) return;

        document.querySelector('#lost-memos-table thead')!.innerHTML = `
        <tr>
            <th>م</th>
            <th>اسم المشترك</th>
            <th>كود الاشتراك</th>
            <th>شاسية العداد المفقود</th>
            <th>نوع المذكرة</th>
            <th>تاريخ المذكرة</th>
            <th>محرر المذكرة</th>
            <th class="actions-cell">إجراءات</th>
        </tr>
    `;

        tableBody.innerHTML = '';
        if (state.lostMeterMemos.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center;">لا توجد مذكرات فقد مسجلة.</td></tr>`;
            return;
        }

        state.lostMeterMemos.forEach((memo, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
            <td>${index + 1}</td>
            <td>${memo.subscriberName || ''}</td>
            <td>${memo.subscriptionCode || ''}</td>
            <td>${memo.meterChassisNumber || ''}</td>
            <td><span class="status-badge bg-secondary">${memo.memoType || 'غير محدد'}</span></td>
            <td>${memo.memoDate || ''}</td>
            <td>${memo.memoAuthor || ''}</td>
            <td class="actions-cell">
                <div class="actions-inline">
                    ${hasButtonPermission('print_button') ? `<button class="action-btn print btn-print-record" data-id="${memo.id}" data-type="lost-memo" title="طباعة المذكرة"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg></button>` : ''}
                    ${hasButtonPermission('view_button') ? `<button class="action-btn view btn-view-details" data-id="${memo.id}" data-type="lost-memo" title="عرض التفاصيل"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></button>` : ''}
                    ${hasButtonPermission('edit_button') ? `<button class="action-btn edit btn-edit-details" data-id="${memo.id}" data-type="lost-memo" title="تعديل"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>` : ''}
                    ${hasButtonPermission('delete_button') ? `<button class="action-btn delete btn-delete" data-id="${memo.id}" data-type="lost-memo" title="حذف"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2"></path></svg></button>` : ''}
                </div>
            </td>
        `;
            tableBody.appendChild(row);
        });
    };

    const openLostMemoForm = (memoId?: number) => {
        const form = document.getElementById('lost-memo-form') as HTMLFormElement;
        if (!form) return;
        form.reset();
        clearFormErrors(form);

        const formTitle = document.querySelector('#lost-memos-write h3')!;
        const memoIdInput = document.getElementById('lost-memo-id') as HTMLInputElement;
        const memoBodyTextarea = document.getElementById('lost-memo-body') as HTMLTextAreaElement;
        const memoTypeSelect = document.getElementById('lost-memo-memoType') as HTMLSelectElement;

        populateSelect(memoTypeSelect, state.settings.memoTypes, 'اختر نوع المذكرة...');

        const defaultMemoBody = `السيد المهندس/ مدير إدارة هندسة كهرباء ........
تحية طيبة وبعد،،،

بالإشارة إلى العداد الموضح بياناته أدناه:
الاسم: {subscriberName}
كود الاشتراك: {subscriptionCode}
رقم الشاسية: {meterChassisNumber}

أفيد سيادتكم بأنه قد تم فقد العداد المذكور، لذا نرجو من سيادتكم التكرم باتخاذ اللازم.

وتفضلوا بقبول وافر الاحترام،،،
`;

        if (memoId) {
            const memo = state.lostMeterMemos.find(m => m.id === memoId);
            if (memo) {
                formTitle.textContent = 'تعديل مذكرة فقد';
                memoIdInput.value = String(memo.id);
                (document.getElementById('lost-memo-subscriberName') as HTMLInputElement).value = memo.subscriberName;
                (document.getElementById('lost-memo-subscriptionCode') as HTMLInputElement).value = memo.subscriptionCode;
                (document.getElementById('lost-memo-meterChassisNumber') as HTMLInputElement).value = memo.meterChassisNumber;
                (document.getElementById('lost-memo-memoDate') as HTMLInputElement).value = memo.memoDate;
                memoTypeSelect.value = memo.memoType || state.settings.memoTypes[0];
                memoBodyTextarea.value = memo.memoBody;
            }
        } else {
            formTitle.textContent = 'إضافة مذكرة فقد جديدة';
            memoIdInput.value = '';
            memoBodyTextarea.value = defaultMemoBody;
        }

        document.querySelectorAll('.content-section.active').forEach(s => s.classList.remove('active'));
        document.getElementById('lost-memos-write')?.classList.add('active');
        setPageTitle('كتابة مذكرة فقد');
    };

    const handleLostMemoFormSubmit = async (event: Event) => {
        event.preventDefault();
        const form = event.target as HTMLFormElement;
        if (!validateForm(form)) return;

        const id = (document.getElementById('lost-memo-id') as HTMLInputElement).value;
        const memoData: DataItem = {
            id: id ? parseInt(id, 10) : Date.now(),
            subscriberName: (document.getElementById('lost-memo-subscriberName') as HTMLInputElement).value,
            subscriptionCode: (document.getElementById('lost-memo-subscriptionCode') as HTMLInputElement).value,
            meterChassisNumber: (document.getElementById('lost-memo-meterChassisNumber') as HTMLInputElement).value,
            memoType: (document.getElementById('lost-memo-memoType') as HTMLSelectElement).value,
            memoDate: (document.getElementById('lost-memo-memoDate') as HTMLInputElement).value,
            memoBody: (document.getElementById('lost-memo-body') as HTMLTextAreaElement).value,
            memoAuthor: loggedInUser?.fullName,
        };

        if (id) {
            const index = state.lostMeterMemos.findIndex(m => m.id === memoData.id);
            if (index !== -1) {
                state.lostMeterMemos[index] = memoData;
                logActivity('تعديل مذكرة فقد', `تعديل مذكرة للمشترك: ${memoData.subscriberName}`);
                if (await saveState()) {
                    showToast('تم تحديث المذكرة بنجاح.');
                }
            }
        } else {
            state.lostMeterMemos.push(memoData);
            logActivity('إضافة مذكرة فقد', `إضافة مذكرة للمشترك: ${memoData.subscriberName}`);
            if (await saveState()) {
                showToast('تم حفظ المذكرة بنجاح.');
            } else {
                state.lostMeterMemos.pop();
            }
        }
        (document.querySelector('.nav-link[data-target="lost-memos-search"]') as HTMLElement)?.click();
    };

    const handlePrintMukayasaDetails = () => {
        if (currentMukayasaIdForDetails === null) return;
        const item = state.mukayasat.find(m => m.id === currentMukayasaIdForDetails);
        if (!item) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            showToast('فشل فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة.', 'error');
            return;
        }

        const detailsContent = document.getElementById('mukayasa-details-content')?.innerHTML || '';
        const companyName = state.settings.companyName || 'ELMAGHRABI';
        const logoSrc = state.settings.companyLogo || '';
        const printDate = new Date().toLocaleString('ar-EG');
        const inspectionDate = new Date().toLocaleDateString('ar-EG');

        printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>تقرير معاينة - ${item.requestNumber}</title>
            <link rel="stylesheet" href="index.css">
            <style>
                @page { size: A4; margin: 10mm; }
                body { background-color: #fff !important; font-family: 'Tajawal', sans-serif; color: #000; border: 3px double #000; padding: 10px; min-height: 275mm; box-sizing: border-box; position: relative; }
                
                /* Custom Header Styles */
                .header-container { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; width: 100%; }
                .header-right-section { text-align: right; font-weight: bold; font-size: 12pt; line-height: 1.5; }
                
                .header-left-container { display: flex; align-items: center; gap: 15px; }
                .header-logo img { max-height: 80px; max-width: 100px; object-fit: contain; }
                
                .header-left-section { text-align: left; font-weight: bold; line-height: 1.4; }
                .header-left-title-ar { font-size: 14pt; }
                .header-left-title-en { font-size: 10pt; }
                .header-left-divider { border-bottom: 1px solid #000; margin: 5px 0; }
                .header-left-services { display: flex; justify-content: space-between; font-size: 10pt; }
                
                .report-title { text-align: center; font-weight: bold; font-size: 18pt; margin-bottom: 30px; text-decoration: underline; }
                
                .info-section { font-size: 12pt; font-weight: bold; line-height: 1.8; margin-bottom: 20px; width: 100%; }
                .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
                
                /* Sketch Section Styles */
                .sketch-container { display: flex; justify-content: center; gap: 20px; margin-bottom: 20px; width: 100%; }
                .sketch-box-right { width: 10cm; }
                .sketch-box-left { width: 6.5cm; }
                .sketch-title-text { font-weight: bold; font-size: 11pt; border-bottom: 1px solid #000; margin-bottom: 5px; padding-bottom: 2px; }
                .sketch-panel { border: 1px solid #000; height: 3.5cm; padding: 5px; font-size: 10pt; overflow: hidden; }

                /* Technical Section Styles */
                .technical-section { margin-top: 5px; font-size: 11pt; width: 100%; }
                .tech-row { display: flex; justify-content: space-between; margin-bottom: 2px; align-items: baseline; }
                .tech-item-right { width: 10cm; display: flex; align-items: baseline; }
                .tech-item-left { width: 6.5cm; display: flex; align-items: baseline; }
                .tech-label { white-space: nowrap; margin-left: 5px; font-weight: bold; }
                .tech-value { border-bottom: none; flex-grow: 1; text-align: right; min-height: 20px; padding-bottom: 2px; }
                .spacer { width: 20px; }
                .units-section { margin-top: 15px; display: flex; flex-direction: column; align-items: center; }
                .units-title { font-weight: bold; font-size: 12pt; border-bottom: 1px solid #000; padding-bottom: 2px; margin-bottom: 5px; }
                .units-panel { width: 100%; height: 3.5cm; border: 1px solid #000; padding: 5px; text-align: right; font-size: 10pt; }
                .meters-count-row { display: flex; justify-content: space-between; width: 100%; margin: 5px auto 0 auto; font-weight: bold; font-size: 11pt; }
                .signatures-row { margin-top: 10px; display: flex; justify-content: space-between; width: 100%; margin-left: auto; margin-right: auto; text-align: center; }
                .signature-col { flex: 1; }
                .signature-title { font-weight: bold; margin-bottom: 15px; text-decoration: underline; }
                .signature-name { margin-bottom: 20px; font-weight: bold; }
                .signature-line { border-bottom: none; width: 70%; margin: 0 auto; }

                /* Existing Details Styles adjustments */
                .details-view { padding: 0; }
                .details-grid { display: block !important; }
                fieldset { border: 1px solid #ccc; margin-bottom: 15px; page-break-inside: avoid; }
                legend { font-weight: bold; font-size: 12pt; }
                .detail-item { display: flex; justify-content: space-between; padding: 5px; border-bottom: 1px dotted #eee; }
                .detail-item label { font-weight: 500; }
                .attachments-preview img { max-width: 150px; margin: 5px; border: 1px solid #ddd; }
                
                /* Hide the first fieldset (Basic Info) as it is duplicated in the header */
                .details-grid fieldset:first-of-type { display: none; }

                .print-footer { text-align: center; font-size: 10px; color: #777; position: absolute; bottom: 5px; width: calc(100% - 20px); border-top: 1px solid #ccc; padding-top: 5px; background: #fff; }
            </style>
        </head>
        <body>
            <div class="header-container">
                <div class="header-right-section">
                    <div>وزارة الكهرباء والطاقة المتجددة</div>
                    <div>الشركة القابضة لكهرباء مصر</div>
                    <div>شركة مصر الوسطى لتوزيع الكهرباء</div>
                </div>
                <div class="header-left-container">
                    <div class="header-logo">
                        ${logoSrc ? `<img src="${logoSrc}" alt="شعار">` : ''}
                    </div>
                    <div class="header-left-section">
                        <div class="header-left-title-ar">مصر الوسطى لتوزيع الكهرباء</div>
                        <div class="header-left-title-en">Middle Egypt Electricity Distribution Company</div>
                        <div class="header-left-divider"></div>
                        <div class="header-left-services">
                            <span>Electricity Services</span>
                            <span style="margin-left: 10px;">خدمات الكهرباء</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="report-title">
                تقرير معاينة
            </div>

            <div class="info-section">
                <div class="info-row">
                    <div style="width: 60%;">هندسة كهرباء : بني مزار شرق</div>
                    <div style="width: 40%;">تاريخ المعاينة : ${inspectionDate}</div>
                </div>
                
                <div class="info-row">
                    <div style="width: 35%;">رقم الطلب : ${item.requestNumber}</div>
                    <div style="width: 65%; white-space: nowrap;">نوع الخدمة المقدم بها الطلب : تركيب عداد كودي</div>
                </div>

                <div class="info-row">
                    <div style="width: 60%;">اسم المالك / مقدم الطلب : ${item.requesterName}</div>
                    <div style="width: 40%;">رقم الموبايل : ${item.mobile}</div>
                </div>

                <div class="info-row">
                    <div style="width: 100%;">العنوان : ${item.address}</div>
                </div>
            </div>

            <div class="sketch-container">
                <div class="sketch-box-right">
                    <div class="sketch-title-text">وصف مفصل للعقار والمساحات يوضح عدد الادوار والمساحات</div>
                    <div class="sketch-panel">
                        ${item.dimensionsDescription || ''}
                    </div>
                </div>
                <div class="sketch-box-left">
                    <div class="sketch-title-text">كروكي العقار ونقطة التغذية</div>
                    <div class="sketch-panel">
                        ${item.sketchImage ? `<img src="${item.sketchImage}" style="width:100%; height:100%; object-fit:contain;">` : ''}
                    </div>
                </div>
            </div>

            <div class="technical-section">
                <div class="tech-row">
                    <div class="tech-item-right">
                        <span class="tech-label">الحد الغربي :</span>
                        <span class="tech-value">${item.boundaryWest || ''}</span>
                    </div>
                    <div class="spacer"></div>
                    <div class="tech-item-left">
                        <span class="tech-label">الحد البحري :</span>
                        <span class="tech-value">${item.boundarySouth || ''}</span>
                    </div>
                </div>
                <div class="tech-row">
                    <div class="tech-item-right">
                        <span class="tech-label">الحد الشرقي :</span>
                        <span class="tech-value">${item.boundaryEast || ''}</span>
                    </div>
                    <div class="spacer"></div>
                    <div class="tech-item-left">
                        <span class="tech-label">الحد القبلي :</span>
                        <span class="tech-value">${item.boundaryNorth || ''}</span>
                    </div>
                </div>
                <div class="tech-row">
                    <div class="tech-item-right">
                        <span class="tech-label">البعد عن اقرب عامود قائم بالشبكة :</span>
                        <span class="tech-value">${item.distanceFromPole || ''}</span>
                    </div>
                    <div class="spacer"></div>
                    <div class="tech-item-left">
                        <span class="tech-label">حمل السورتية :</span>
                        <span class="tech-value">${item.sortiaLoad || ''}</span>
                    </div>
                </div>
                <div class="tech-row">
                    <div class="tech-item-right">
                        <span class="tech-label">اسم المحول :</span>
                        <span class="tech-value">${item.transformerName || ''}</span>
                    </div>
                    <div class="spacer"></div>
                    <div class="tech-item-left">
                        <span class="tech-label">البعد عن المحول :</span>
                        <span class="tech-value">${item.distanceFromTransformer || ''}</span>
                    </div>
                </div>
                <div class="tech-row">
                    <div class="tech-item-right">
                        <span class="tech-label">قدرة المحول :</span>
                        <span class="tech-value">${item.transformerCapacity || ''}</span>
                    </div>
                    <div class="spacer"></div>
                    <div class="tech-item-left">
                        <span class="tech-label">نسبة تحميل المحول :</span>
                        <span class="tech-value">${item.transformerLoadPercent || ''} %</span>
                    </div>
                </div>
                <div class="tech-row">
                    <div class="tech-item-right">
                        <span class="tech-label">نوع التوصيله (رئيسية / فرعية ) :</span>
                        <span class="tech-value">${item.connectionType || ''}</span>
                    </div>
                    <div class="spacer"></div>
                    <div class="tech-item-left">
                        <span class="tech-label">نوع الوصلة الرئيسية (ارضية / هوائية ) :</span>
                        <span class="tech-value">${item.mainConnectionType || ''}</span>
                    </div>
                </div>
            </div>

            <div class="units-section">
                <div class="units-title">الوحدات المطلوب تركيب العدادات بها ( توصيف الوحدات والنشاط )</div>
                <div class="units-panel">
                    ${item.unitsDescription || ''}
                </div>
            </div>

            <div class="meters-count-row">
                <div>عدد العدادات الاحادية : ${item.singlePhaseMeters || 0}</div>
                <div>عدد العدادات الثلاثية : ${item.threePhaseMeters || 0}</div>
            </div>

            <div class="signatures-row">
                <div class="signature-col">
                    <div class="signature-title">الفني القائم بالمعاينة</div>
                    <div class="signature-name">${item.technicianName || ''}</div>
                    <div class="signature-line"></div>
                </div>
                <div class="signature-col">
                    <div class="signature-title">مهندس الشئون الفنية</div>
                    <div class="signature-name">${item.technicalEngineer || ''}</div>
                    <div class="signature-line"></div>
                </div>
                <div class="signature-col">
                    <div class="signature-title">رئيس الهندسة</div>
                    <div class="signature-name">${item.headOfEngineering || ''}</div>
                    <div class="signature-line"></div>
                </div>
            </div>

            <div class="print-footer"><p>تاريخ الطباعة: ${printDate}</p></div>
        </body>
        </html>
    `);

        printWindow.document.close();
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    const handlePrintInstallationDetails = () => {
        if (currentMukayasaIdForDetails === null) return;
        const item = state.mukayasat.find(m => m.id === currentMukayasaIdForDetails);
        if (!item) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            showToast('فشل فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة.', 'error');
            return;
        }

        const companyName = state.settings.companyName || 'ELMAGHRABI';
        const logoSrc = state.settings.companyLogo || '';
        const printDate = new Date().toLocaleString('ar-EG');

        printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>تفاصيل التركيب - ${item.requestNumber}</title>
            <link rel="stylesheet" href="index.css">
            <style>
                @page { size: A5 portrait; margin: 10mm; }
                body { background-color: #fff !important; font-family: 'Tajawal', sans-serif; color: #000; padding: 10px; box-sizing: border-box; border: 2px solid #000; min-height: 90vh; position: relative; }
                .header-container { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
                .report-title { font-size: 16pt; font-weight: bold; margin-bottom: 20px; text-align: center; text-decoration: underline; }
                .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12pt; }
                .label { font-weight: bold; }
                .value { border-bottom: 1px dotted #000; padding: 0 10px; flex-grow: 1; text-align: center; }
                .print-footer { text-align: center; font-size: 10px; color: #777; position: absolute; bottom: 5px; width: 100%; }
            </style>
        </head>
        <body>
            <div class="header-container">
                <h2>${companyName}</h2>
                ${logoSrc ? `<img src="${logoSrc}" alt="شعار" style="max-height: 60px;">` : ''}
            </div>

            <div class="report-title">إذن تركيب / تفاصيل عداد</div>

            <div style="padding: 10px;">
                <div class="info-row"><span class="label">اسم المشترك:</span><span class="value">${item.requesterName}</span></div>
                <div class="info-row"><span class="label">العنوان:</span><span class="value">${item.address}</span></div>
                <div class="info-row"><span class="label">رقم الطلب:</span><span class="value">${item.requestNumber}</span></div>
                
                <hr style="margin: 20px 0; border-top: 1px dashed #000;">

                <div class="info-row"><span class="label">رقم شاسية العداد:</span><span class="value" style="font-weight: bold; font-size: 14pt;">${item.meterChassisNumber || '-'}</span></div>
                <div class="info-row"><span class="label">كود المشترك:</span><span class="value" style="font-weight: bold; font-size: 14pt;">${item.subscriptionCode || '-'}</span></div>
                <div class="info-row"><span class="label">رقم اللوحة:</span><span class="value">${item.panelNumber || '-'}</span></div>
            </div>

            <div class="print-footer"><p>تاريخ الطباعة: ${printDate}</p></div>
        </body>
        </html>
    `);
        printWindow.document.close();
        setTimeout(() => { printWindow.focus(); printWindow.print(); printWindow.close(); }, 500);
    };

    const handleMukayasatSearch = (event: Event) => {
        event.preventDefault();
        const form = event.target as HTMLFormElement;
        if (!form) return;

        const name = (form.querySelector('[name="filter-name"]') as HTMLInputElement).value.trim().toLowerCase();
        const requestNumber = (form.querySelector('[name="filter-requestNumber"]') as HTMLInputElement).value.trim().toLowerCase();
        const address = (form.querySelector('[name="filter-address"]') as HTMLInputElement).value.trim().toLowerCase();
        const status = (form.querySelector('[name="filter-status"]') as HTMLSelectElement).value;
        const nationalId = (form.querySelector('[name="filter-nationalId"]') as HTMLInputElement).value.trim().toLowerCase();
        const mobile = (form.querySelector('[name="filter-mobile"]') as HTMLInputElement).value.trim().toLowerCase();

        const tableBody = document.querySelector('#mukayasat-table tbody') as HTMLElement | null;
        if (!tableBody) return;
        tableBody.innerHTML = '';

        const results = state.mukayasat.filter(i => {
            const matchName = !name || (i.requesterName || '').toLowerCase().includes(name);
            const matchReq = !requestNumber || (i.requestNumber || '').toLowerCase().includes(requestNumber);
            const matchAddr = !address || (i.address || '').toLowerCase().includes(address);
            const matchStatus = !status || i.status === status;
            const matchNational = !nationalId || (i.nationalId || '').toLowerCase().includes(nationalId);
            const matchMobile = !mobile || (i.mobile || '').toLowerCase().includes(mobile);
            return matchName && matchReq && matchAddr && matchStatus && matchNational && matchMobile;
        });

        if (results.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;">لا توجد نتائج مطابقة.</td></tr>`;
            return;
        }

        results.forEach(item => {
            // منطق زر الإجراء المتعدد (نفس المنطق في renderMukayasatList)
            let multiActionBtn = '';
            if (item.status === 'قيد المعالجة') {
                multiActionBtn = `<button class="btn" style="background-color: #17a2b8; color: white; font-size: 0.8rem; padding: 4px 8px; margin-bottom: 5px; display: block; width: 100%;" onclick="window.updateMukayasaStatus(${item.id})">تأكيد بيانات المعاينة</button>`;
            } else if (item.status === 'المقايسة قابلة السداد') {
                multiActionBtn = `<button class="btn" style="background-color: #ffc107; color: #000; font-size: 0.8rem; padding: 4px 8px; margin-bottom: 5px; display: block; width: 100%;" onclick="window.updateMukayasaStatus(${item.id})">صرف من المخزن</button>`;
            } else if (item.status === 'تم الصرف من المخزن') {
                multiActionBtn = `<button class="btn" style="background-color: #28a745; color: white; font-size: 0.8rem; padding: 4px 8px; margin-bottom: 5px; display: block; width: 100%;" onclick="window.updateMukayasaStatus(${item.id})">إدخال بيانات العداد</button>`;
            }

            const row = document.createElement('tr');
            row.innerHTML = `
            <td>${item.requesterName || ''}</td>
            <td>${item.requestNumber || ''}</td>
            <td>${item.nationalId || ''}</td>
            <td>${item.address || ''}</td>
            <td>${item.mobile || ''}</td>
            <td>${item.establishmentType || ''}</td>
            <td>${item.status || ''}</td>
            <td class="actions-cell">
                ${multiActionBtn}
                ${hasButtonPermission('view_button') ? `<button class="btn btn-view-details" data-id="${item.id}">عرض</button>` : ''}
                ${hasButtonPermission('edit_button') ? `<button class="btn btn-edit-mukayasa" data-id="${item.id}">تعديل</button>` : ''}
                ${hasButtonPermission('delete_button') ? `<button class="btn btn-delete-mukayasa btn-delete" data-id="${item.id}">حذف</button>` : ''}
            </td>
        `;
            tableBody.appendChild(row);
        });
    };

    // --- Transformer Management Functions ---
    const renderTransformerRegistrationForm = (transformerId?: number) => {
        const form = document.getElementById('transformer-form') as HTMLFormElement;
        if (!form) return;
        form.reset();
        clearFormErrors(form);

        // Re-enable fields if they were disabled by "view" mode
        form.querySelectorAll('input, select').forEach(el => (el as any).disabled = false);
        const saveBtn = form.querySelector('button[type="submit"]') as HTMLElement;
        if (saveBtn) saveBtn.style.display = 'block';

        const formTitle = document.getElementById('transformer-form-title')!;
        const transformerIdInput = document.getElementById('transformer-id') as HTMLInputElement;

        // Populate dropdowns
        populateSelect(document.getElementById('councilName') as HTMLSelectElement, state.settings.councilNames, 'اختر المجلس...');
        populateSelect(document.getElementById('transformerType') as HTMLSelectElement, state.settings.transformerTypes, 'اختر النوع...');
        populateSelect(document.getElementById('transformerAddress') as HTMLSelectElement, state.settings.addresses, 'اختر العنوان...');
        populateSelect(document.getElementById('currentTransformerCapacity') as HTMLSelectElement, state.settings.currentTransformerCapacities, 'اختر القدرة...');

        if (transformerId) {
            const transformer = state.transformers.find(t => t.id === transformerId);
            if (transformer) {
                formTitle.textContent = 'تعديل بيانات المحول';
                transformerIdInput.value = String(transformer.id);
                (document.getElementById('councilName') as HTMLSelectElement).value = transformer.councilName || '';
                (document.getElementById('transformerName') as HTMLInputElement).value = transformer.transformerName || '';
                (document.getElementById('transformerAddress') as HTMLSelectElement).value = transformer.transformerAddress || '';
                (document.getElementById('transformerType') as HTMLSelectElement).value = transformer.transformerType || '';
                (document.getElementById('transformerCapacityKVA') as HTMLInputElement).value = String(transformer.transformerCapacityKVA || '');
                (document.getElementById('smartMeterChassis') as HTMLInputElement).value = transformer.smartMeterChassis || '';
                (document.getElementById('simCardNumber') as HTMLInputElement).value = transformer.simCardNumber || '';
                (document.getElementById('currentTransformerCapacity') as HTMLSelectElement).value = transformer.currentTransformerCapacity || '';
            }
        } else {
            formTitle.textContent = 'تسجيل محول جديد';
            transformerIdInput.value = '';
        }

        document.querySelectorAll('.content-section.active').forEach(s => s.classList.remove('active'));
        document.getElementById('transformer-registration')?.classList.add('active');
        setPageTitle('تسجيل محول');
    };

    const handleTransformerRegistrationSubmit = async (event: Event) => {
        event.preventDefault();
        const form = event.target as HTMLFormElement;
        if (!validateForm(form)) {
            showToast('يرجى ملء جميع الحقول المطلوبة.', 'error');
            return;
        }

        const idInput = document.getElementById('transformer-id') as HTMLInputElement;
        const id = idInput.value ? parseInt(idInput.value, 10) : Date.now();

        const newTransformer: DataItem = {
            id: id,
            councilName: (document.getElementById('councilName') as HTMLSelectElement).value,
            transformerName: (document.getElementById('transformerName') as HTMLInputElement).value,
            transformerAddress: (document.getElementById('transformerAddress') as HTMLSelectElement).value,
            transformerType: (document.getElementById('transformerType') as HTMLSelectElement).value,
            transformerCapacityKVA: parseInt((document.getElementById('transformerCapacityKVA') as HTMLInputElement).value, 10),
            smartMeterChassis: (document.getElementById('smartMeterChassis') as HTMLInputElement).value,
            simCardNumber: (document.getElementById('simCardNumber') as HTMLInputElement).value,
            currentTransformerCapacity: (document.getElementById('currentTransformerCapacity') as HTMLSelectElement).value,
        };

        if (idInput.value) { // Editing
            const index = state.transformers.findIndex(t => t.id === id);
            if (index !== -1) state.transformers[index] = newTransformer;
            logActivity('تعديل محول', `تم تعديل بيانات المحول: ${newTransformer.transformerName}`);
        } else { // Adding
            state.transformers.push(newTransformer);
            logActivity('إضافة محول', `تم إضافة محول جديد: ${newTransformer.transformerName}`);
            console.log('State.transformers after push (before save):', state.transformers); // Added log
        }
        if (await saveState()) {
            showToast('تم حفظ بيانات المحول بنجاح.');
            form.reset(); // تفريغ الحقول
            clearFormErrors(form); // مسح رسائل الأخطاء إن وجدت
            (document.getElementById('transformer-id') as HTMLInputElement).value = ''; // التأكد من مسح ID المحول
            renderTransformerListSection(); // تحديث قائمة المحولات في الخلفية
        }
    };

    const renderTransformerListSection = () => {
        const table = document.getElementById('transformers-table');
        const tbody = table?.querySelector('tbody');
        if (!tbody) return;
        console.log('Rendering transformer list. Current state.transformers:', state.transformers); // Added log

        const nameFilter = (document.getElementById('filter-transformer-name') as HTMLInputElement)?.value.toLowerCase() || '';
        const chassisFilter = (document.getElementById('filter-transformer-chassis') as HTMLInputElement)?.value.toLowerCase() || '';

        const filtered = state.transformers.filter(t =>
            (!nameFilter || (t.transformerName || '').toLowerCase().includes(nameFilter)) &&
            (!chassisFilter || (t.smartMeterChassis || '').toLowerCase().includes(chassisFilter))
        );

        tbody.innerHTML = '';
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">لا توجد بيانات محولات مطابقة.</td></tr>';
            return;
        }

        filtered.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
            <td><input type="checkbox" class="transformer-row-checkbox" value="${item.id}"></td>
            <td>${item.councilName || '-'}</td>
            <td>${item.transformerName || '-'}</td>
            <td>${item.transformerAddress || '-'}</td>
            <td>${item.transformerType || '-'}</td>
            <td>${item.transformerCapacityKVA || '-'}</td>
            <td>${item.smartMeterChassis || '-'}</td>
            <td>${item.simCardNumber || '-'}</td>
            <td>${item.currentTransformerCapacity || '-'}</td>
            <td class="actions-cell">
                <div class="actions-inline">
                    <button class="action-btn view" onclick="window.viewTransformer(${item.id})" title="عرض"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></button>
                    <button class="action-btn edit" onclick="window.editTransformer(${item.id})" title="تعديل"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                    <button class="action-btn delete" onclick="window.deleteTransformer(${item.id})" title="حذف"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
                </div>
            </td>
        `;
            tbody.appendChild(row);
        });
    };

    const calculateTransformerLoadAutoValues = () => {
        const phaseKeys = ['r', 's', 't'] as const;
        const stageIds = ['s1', 's2', 's3', 's4', 'streets'] as const;
        const totals: Record<typeof phaseKeys[number], number> = { r: 0, s: 0, t: 0 };

        stageIds.forEach((stageId) => {
            phaseKeys.forEach((phase) => {
                const field = document.getElementById(`transformer-load-${stageId}-${phase}`) as HTMLInputElement | null;
                const value = Number(field?.value || 0);
                if (!Number.isNaN(value)) {
                    totals[phase] += value;
                }
            });
        });

        phaseKeys.forEach((phase) => {
            const keyField = document.getElementById(`transformer-load-key-${phase}`) as HTMLInputElement | null;
            if (keyField) {
                keyField.value = String(totals[phase]);
            }
        });

        const capacity = Number((document.getElementById('transformer-load-capacity') as HTMLInputElement | null)?.value || 0);
        const highestPhase = Math.max(totals.r, totals.s, totals.t, 0);
        const maxLoadLimit = capacity * 1.5;
        const percentage = maxLoadLimit > 0 ? Math.min(100, (highestPhase / maxLoadLimit) * 100) : 0;
        const percentField = document.getElementById('transformer-load-percent') as HTMLInputElement | null;
        if (percentField) {
            percentField.value = percentage > 0 ? percentage.toFixed(2) : '0';
        }
    };

    const populateTransformerLoadNameOptions = () => {
        const select = document.getElementById('transformer-load-name') as HTMLSelectElement | null;
        if (!select) return;

        const currentValue = select.value;
        const registeredTransformers = state.transformers.filter(transformer => transformer.transformerName && transformer.transformerName.trim());

        select.innerHTML = '<option value="">اختر اسم المحول...</option>' + registeredTransformers.map(transformer => {
            const name = transformer.transformerName || '';
            return `<option value="${name}">${name}</option>`;
        }).join('');

        if (registeredTransformers.length > 0 && currentValue && registeredTransformers.some(transformer => (transformer.transformerName || '') === currentValue)) {
            select.value = currentValue;
        } else if (registeredTransformers.length === 1) {
            select.value = registeredTransformers[0].transformerName || '';
        }

        const capacityField = document.getElementById('transformer-load-capacity') as HTMLInputElement | null;
        const addressField = document.getElementById('transformer-load-address') as HTMLInputElement | null;
        const councilField = document.getElementById('transformer-load-council') as HTMLInputElement | null;
        const selectedTransformer = state.transformers.find(transformer => (transformer.transformerName || '') === select.value);

        if (capacityField) {
            capacityField.value = selectedTransformer && selectedTransformer.transformerCapacityKVA !== undefined && selectedTransformer.transformerCapacityKVA !== null
                ? String(selectedTransformer.transformerCapacityKVA)
                : '';
        }

        if (addressField) {
            addressField.value = selectedTransformer?.transformerAddress || '';
        }

        if (councilField) {
            councilField.value = selectedTransformer?.councilName || '';
        }
    };

    const handleTransformerLoadNameChange = () => {
        const select = document.getElementById('transformer-load-name') as HTMLSelectElement | null;
        const capacityField = document.getElementById('transformer-load-capacity') as HTMLInputElement | null;
        const addressField = document.getElementById('transformer-load-address') as HTMLInputElement | null;
        const councilField = document.getElementById('transformer-load-council') as HTMLInputElement | null;

        if (!select) return;

        const selectedTransformer = state.transformers.find(transformer => (transformer.transformerName || '') === select.value);
        if (capacityField) {
            capacityField.value = selectedTransformer && selectedTransformer.transformerCapacityKVA !== undefined && selectedTransformer.transformerCapacityKVA !== null
                ? String(selectedTransformer.transformerCapacityKVA)
                : '';
        }

        if (addressField) {
            addressField.value = selectedTransformer?.transformerAddress || '';
        }

        if (councilField) {
            councilField.value = selectedTransformer?.councilName || '';
        }

        calculateTransformerLoadAutoValues();
    };

    const renderTransformerLoadRecordsSection = () => {
        const table = document.getElementById('transformer-load-records-table') as HTMLTableElement | null;
        const tbody = table?.querySelector('tbody');
        if (!tbody) return;

        const nameFilter = document.getElementById('transformer-load-records-name-filter') as HTMLSelectElement | null;
        const councilFilter = document.getElementById('transformer-load-records-council-filter') as HTMLSelectElement | null;
        const addressFilter = document.getElementById('transformer-load-records-address-filter') as HTMLInputElement | null;
        const percentFilter = document.getElementById('transformer-load-records-percent-filter') as HTMLSelectElement | null;
        const capacityFilter = document.getElementById('transformer-load-records-capacity-filter') as HTMLSelectElement | null;
        const dateFrom = document.getElementById('transformer-load-records-date-from') as HTMLInputElement | null;
        const dateTo = document.getElementById('transformer-load-records-date-to') as HTMLInputElement | null;

        const selectedName = nameFilter?.value || '';
        const selectedCouncil = councilFilter?.value || '';

        if (nameFilter) {
            const transformerNames = Array.from(new Set(state.transformers.map(t => t.transformerName).filter(Boolean))) as string[];
            nameFilter.innerHTML = '<option value="">كل المحولات</option>' + transformerNames.map(name => `<option value="${name}">${name}</option>`).join('');
            if (selectedName && transformerNames.includes(selectedName)) {
                nameFilter.value = selectedName;
            } else {
                nameFilter.value = '';
            }
        }

        if (councilFilter) {
            const councils = Array.from(new Set(state.transformers.map(t => t.councilName).filter(Boolean))) as string[];
            councilFilter.innerHTML = '<option value="">كل المجالس</option>' + councils.map(name => `<option value="${name}">${name}</option>`).join('');
            if (selectedCouncil && councils.includes(selectedCouncil)) {
                councilFilter.value = selectedCouncil;
            } else {
                councilFilter.value = '';
            }
        }

        if (capacityFilter) {
            const capacities = Array.from(new Set(state.transformers.map(t => t.transformerCapacityKVA !== undefined && t.transformerCapacityKVA !== null ? String(t.transformerCapacityKVA) : '').filter(Boolean))) as string[];
            capacityFilter.innerHTML = '<option value="">كل القدرات</option>' + capacities.map(capacity => `<option value="${capacity}">${capacity}</option>`).join('');
        }

        const filtered = state.transformerLoads.filter(item => {
            const transformer = state.transformers.find(t => t.transformerName === item.transformerLoadName) || null;
            const itemCouncil = transformer?.councilName || '';
            const itemAddress = item.transformerLoadAddress || '';
            const itemDate = item.transformerLoadDate || '';
            const itemPercent = Number(item.transformerLoadPercent || 0);

            const nameMatch = !nameFilter || !nameFilter.value || item.transformerLoadName === nameFilter.value;
            const councilMatch = !councilFilter || !councilFilter.value || itemCouncil === councilFilter.value;
            const addressMatch = !addressFilter || !addressFilter.value || (itemAddress.toLowerCase().includes(addressFilter.value.trim().toLowerCase()));
            const selectedPercent = percentFilter ? percentFilter.value : '';
            const percentMatch = !selectedPercent || (
                (selectedPercent === '20' && itemPercent >= 20 && itemPercent < 30) ||
                (selectedPercent === '30' && itemPercent >= 30 && itemPercent < 40) ||
                (selectedPercent === '40' && itemPercent >= 40 && itemPercent < 50) ||
                (selectedPercent === '50' && itemPercent >= 50 && itemPercent < 60) ||
                (selectedPercent === '60' && itemPercent >= 60 && itemPercent < 70) ||
                (selectedPercent === '70' && itemPercent >= 70 && itemPercent < 80) ||
                (selectedPercent === '80' && itemPercent >= 80 && itemPercent < 90) ||
                (selectedPercent === '90' && itemPercent >= 90 && itemPercent < 100) ||
                (selectedPercent === '100' && itemPercent === 100) ||
                (selectedPercent === '100plus' && itemPercent > 100)
            );
            const capacityMatch = !capacityFilter || !capacityFilter.value || String(item.transformerLoadCapacity || '') === capacityFilter.value;
            const dateFromMatch = !dateFrom || !dateFrom.value || itemDate >= dateFrom.value;
            const dateToMatch = !dateTo || !dateTo.value || itemDate <= dateTo.value;

            return nameMatch && councilMatch && addressMatch && percentMatch && capacityMatch && dateFromMatch && dateToMatch;
        });

        tbody.innerHTML = '';
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="23" style="text-align:center;">لا توجد سجلات مطابقة.</td></tr>';
            return;
        }

        filtered.forEach(item => {
            const transformer = state.transformers.find(t => t.transformerName === item.transformerLoadName) || null;
            const stages = item.transformerLoadStages && typeof item.transformerLoadStages === 'object'
                ? item.transformerLoadStages as Record<string, any>
                : {};
            const stageLabels = ['المفتاح العمومي', 'سرتية 1', 'سرتية 2', 'سرتية 3', 'سرتية 4', 'سرتية شوارع'];
            const stageCells = stageLabels.map((stageLabel) => {
                const values = stages[stageLabel] || {};
                const r = values?.R ?? '-';
                const s = values?.S ?? '-';
                const t = values?.T ?? '-';
                return `
                <td>${t}</td>
                <td>${s}</td>
                <td>${r}</td>
            `;
            }).join('');

            const row = document.createElement('tr');
            row.innerHTML = `
            <td>${item.transformerLoadName || '-'}</td>
            <td>${item.transformerLoadCapacity || '-'}</td>
            <td>${item.transformerLoadAddress || '-'}</td>
            <td>${item.transformerLoadDate || '-'}</td>
            ${stageCells}
            <td>${item.transformerLoadPercent ?? '-'}</td>
            <td class="actions-cell">
                <div class="actions-inline">
                    <button class="action-btn view" onclick="window.viewTransformerLoadRecord(${item.id})" title="عرض"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></button>
                    <button class="action-btn edit" onclick="window.editTransformerLoadRecord(${item.id})" title="تعديل"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                    <button class="action-btn delete" onclick="window.deleteTransformerLoad(${item.id})" title="حذف"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
                </div>
            </td>
        `;
            tbody.appendChild(row);
        });

        document.querySelectorAll('.content-section.active').forEach(s => s.classList.remove('active'));
        document.getElementById('transformer-load-records')?.classList.add('active');
        setPageTitle('سجلات أحمال المحولات');
    };

    const handleTransformerLoadRecordsFilter = (event?: Event) => {
        event?.preventDefault();
        renderTransformerLoadRecordsSection();
    };

    const handlePrintTransformerLoadRecords = () => {
        const table = document.getElementById('transformer-load-records-table');
        if (!table) return;
        handlePrintTable('transformer-load-records-table', 'سجلات أحمال المحولات');
    };

    const initializeTransformerLoadRecordFilters = () => {
        const form = document.getElementById('transformer-load-records-filter-form');
        form?.addEventListener('submit', handleTransformerLoadRecordsFilter);
        form?.addEventListener('reset', () => {
            setTimeout(() => renderTransformerLoadRecordsSection(), 0);
        });
        document.getElementById('transformer-load-records-name-filter')?.addEventListener('change', () => renderTransformerLoadRecordsSection());
        document.getElementById('transformer-load-records-council-filter')?.addEventListener('change', () => renderTransformerLoadRecordsSection());
        document.getElementById('transformer-load-records-address-filter')?.addEventListener('input', () => renderTransformerLoadRecordsSection());
        document.getElementById('transformer-load-records-percent-filter')?.addEventListener('change', () => renderTransformerLoadRecordsSection());
        document.getElementById('transformer-load-records-capacity-filter')?.addEventListener('change', () => renderTransformerLoadRecordsSection());
        document.getElementById('transformer-load-records-date-from')?.addEventListener('change', () => renderTransformerLoadRecordsSection());
        document.getElementById('transformer-load-records-date-to')?.addEventListener('change', () => renderTransformerLoadRecordsSection());
        document.getElementById('print-transformer-load-records-btn')?.addEventListener('click', handlePrintTransformerLoadRecords);
    };

    const renderTransformerLoadSection = () => {
        const form = document.getElementById('transformer-load-form') as HTMLFormElement | null;
        if (form) {
            form.reset();
            clearFormErrors(form);
            const idInput = document.getElementById('transformer-load-id') as HTMLInputElement | null;
            if (idInput) idInput.value = '';
        }

        populateTransformerLoadNameOptions();

        ['transformer-load-key-r', 'transformer-load-key-s', 'transformer-load-key-t'].forEach((id) => {
            const field = document.getElementById(id) as HTMLInputElement | null;
            if (field) field.readOnly = true;
        });

        const table = document.getElementById('transformer-loads-table') as HTMLTableElement | null;
        const tbody = table?.querySelector('tbody');
        if (!tbody) return;

        const records = [...state.transformerLoads].reverse();
        tbody.innerHTML = '';

        if (records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="22" style="text-align:center;">لا توجد سجلات أحمال المحولات.</td></tr>';
        } else {
            const stageLabels = ['المفتاح العمومي', 'سرتية 1', 'سرتية 2', 'سرتية 3', 'سرتية 4', 'سرتية شوارع'];

            records.forEach(item => {
                const stages = item.transformerLoadStages && typeof item.transformerLoadStages === 'object'
                    ? item.transformerLoadStages as Record<string, any>
                    : {};

                const row = document.createElement('tr');
                const stageCells = stageLabels.map((stageLabel) => {
                    const values = stages[stageLabel] || {};
                    const r = values?.R ?? '-';
                    const s = values?.S ?? '-';
                    const t = values?.T ?? '-';
                    return `
                    <td>${t}</td>
                    <td>${s}</td>
                    <td>${r}</td>
                `;
                }).join('');

                row.innerHTML = `
                <td>${item.transformerLoadName || '-'}</td>
                <td>${item.transformerLoadCapacity || '-'}</td>
                <td>${item.transformerLoadAddress || '-'}</td>
                ${stageCells}
                <td>${item.transformerLoadPercent ?? '-'}</td>
                <td class="actions-cell">
                    <div class="actions-inline">
                        <button class="action-btn delete" onclick="window.deleteTransformerLoad(${item.id})" title="حذف"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
                    </div>
                </td>
            `;
                tbody.appendChild(row);
            });
        }

        document.querySelectorAll('.content-section.active').forEach(s => s.classList.remove('active'));
        document.getElementById('transformer-loads')?.classList.add('active');
        setPageTitle('أحمال المحولات');
    };

    const handleTransformerLoadSubmit = async (event: Event) => {
        event.preventDefault();
        const form = event.target as HTMLFormElement;
        calculateTransformerLoadAutoValues();

        if (!validateForm(form)) {
            showToast('يرجى تعبئة جميع الحقول المطلوبة.', 'error');
            return;
        }

        const idInput = document.getElementById('transformer-load-id') as HTMLInputElement;
        const id = idInput.value ? Number(idInput.value) : Date.now();

        const stageLabels = ['المفتاح العمومي', 'سرتية 1', 'سرتية 2', 'سرتية 3', 'سرتية 4', 'سرتية شوارع'];
        const stageKeys = ['key', 's1', 's2', 's3', 's4', 'streets'];
        const transformerLoadStages: Record<string, { R: number | string; S: number | string; T: number | string }> = {};

        stageLabels.forEach((label, index) => {
            const rValue = (document.getElementById(`transformer-load-${stageKeys[index]}-r`) as HTMLInputElement)?.value || '';
            const sValue = (document.getElementById(`transformer-load-${stageKeys[index]}-s`) as HTMLInputElement)?.value || '';
            const tValue = (document.getElementById(`transformer-load-${stageKeys[index]}-t`) as HTMLInputElement)?.value || '';

            transformerLoadStages[label] = {
                R: stageKeys[index] === 'key' ? (document.getElementById('transformer-load-key-r') as HTMLInputElement)?.value || '' : rValue,
                S: stageKeys[index] === 'key' ? (document.getElementById('transformer-load-key-s') as HTMLInputElement)?.value || '' : sValue,
                T: stageKeys[index] === 'key' ? (document.getElementById('transformer-load-key-t') as HTMLInputElement)?.value || '' : tValue,
            };
        });

        const record: DataItem = {
            id,
            transformerLoadName: (document.getElementById('transformer-load-name') as HTMLInputElement).value,
            transformerLoadCouncil: (document.getElementById('transformer-load-council') as HTMLInputElement).value,
            transformerLoadCapacity: (document.getElementById('transformer-load-capacity') as HTMLInputElement).value,
            transformerLoadAddress: (document.getElementById('transformer-load-address') as HTMLInputElement).value,
            transformerLoadDate: (document.getElementById('transformer-load-date') as HTMLInputElement).value || new Date().toISOString().slice(0, 10),
            transformerLoadStages,
            transformerLoadPercent: parseFloat((document.getElementById('transformer-load-percent') as HTMLInputElement).value || '0'),
        };

        const existingIndex = state.transformerLoads.findIndex(item => item.id === id);
        if (existingIndex >= 0) {
            state.transformerLoads[existingIndex] = record;
        } else {
            state.transformerLoads.push(record);
        }

        if (await saveState()) {
            showToast('تم حفظ بيانات أحمال المحول بنجاح.');
            form.reset();
            clearFormErrors(form);
            idInput.value = '';
            renderTransformerLoadSection();
        }
    };

    const fillTransformerLoadFormFromRecord = (item: DataItem | undefined, isViewMode = false) => {
        if (!item) return;

        const form = document.getElementById('transformer-load-form') as HTMLFormElement | null;
        if (!form) return;

        const idInput = document.getElementById('transformer-load-id') as HTMLInputElement | null;
        if (idInput) idInput.value = String(item.id);

        const nameSelect = document.getElementById('transformer-load-name') as HTMLSelectElement | null;
        const capacityInput = document.getElementById('transformer-load-capacity') as HTMLInputElement | null;
        const addressInput = document.getElementById('transformer-load-address') as HTMLInputElement | null;
        const dateInput = document.getElementById('transformer-load-date') as HTMLInputElement | null;
        const percentInput = document.getElementById('transformer-load-percent') as HTMLInputElement | null;

        if (nameSelect) {
            const targetValue = item.transformerLoadName || '';
            if (!Array.from(nameSelect.options).some(option => option.value === targetValue)) {
                const option = new Option(targetValue, targetValue);
                nameSelect.add(option);
            }
            nameSelect.value = targetValue;
        }

        if (capacityInput) capacityInput.value = item.transformerLoadCapacity || '';
        if (addressInput) addressInput.value = item.transformerLoadAddress || '';
        if (dateInput) dateInput.value = item.transformerLoadDate || new Date().toISOString().slice(0, 10);
        if (percentInput) percentInput.value = item.transformerLoadPercent !== undefined && item.transformerLoadPercent !== null ? String(item.transformerLoadPercent) : '';

        const stageLabels = ['المفتاح العمومي', 'سرتية 1', 'سرتية 2', 'سرتية 3', 'سرتية 4', 'سرتية شوارع'];
        const stageKeys = ['key', 's1', 's2', 's3', 's4', 'streets'];
        const stages = (item.transformerLoadStages && typeof item.transformerLoadStages === 'object') ? item.transformerLoadStages as Record<string, any> : {};

        stageLabels.forEach((label, index) => {
            const values = stages[label] || {};
            const rField = document.getElementById(`transformer-load-${stageKeys[index]}-r`) as HTMLInputElement | null;
            const sField = document.getElementById(`transformer-load-${stageKeys[index]}-s`) as HTMLInputElement | null;
            const tField = document.getElementById(`transformer-load-${stageKeys[index]}-t`) as HTMLInputElement | null;
            const keyRField = document.getElementById('transformer-load-key-r') as HTMLInputElement | null;
            const keySField = document.getElementById('transformer-load-key-s') as HTMLInputElement | null;
            const keyTField = document.getElementById('transformer-load-key-t') as HTMLInputElement | null;

            if (stageKeys[index] === 'key') {
                if (keyRField) keyRField.value = values?.R ?? '';
                if (keySField) keySField.value = values?.S ?? '';
                if (keyTField) keyTField.value = values?.T ?? '';
            } else {
                if (rField) rField.value = values?.R ?? '';
                if (sField) sField.value = values?.S ?? '';
                if (tField) tField.value = values?.T ?? '';
            }
        });

        if (isViewMode) {
            form.querySelectorAll('input, select').forEach((el) => { (el as HTMLInputElement | HTMLSelectElement).disabled = true; });
        } else {
            form.querySelectorAll('input, select').forEach((el) => { (el as HTMLInputElement | HTMLSelectElement).disabled = false; });
        }

        calculateTransformerLoadAutoValues();
        document.querySelectorAll('.content-section.active').forEach(s => s.classList.remove('active'));
        document.getElementById('transformer-loads')?.classList.add('active');
        setPageTitle('أحمال المحولات');
    };

    (window as any).viewTransformerLoadRecord = (id: number) => {
        const item = state.transformerLoads.find(load => load.id === id);
        fillTransformerLoadFormFromRecord(item, true);
        showToast('تم عرض بيانات سجل أحمال المحول.');
    };

    (window as any).editTransformerLoadRecord = (id: number) => {
        const item = state.transformerLoads.find(load => load.id === id);
        fillTransformerLoadFormFromRecord(item, false);
        showToast('تم تجهيز سجل أحمال المحول للتعديل.');
    };

    (window as any).deleteTransformerLoad = async (id: number) => {
        const item = state.transformerLoads.find(load => load.id === id);
        if (!item) return;

        showConfirmationDialog('تأكيد الحذف', `هل أنت متأكد من حذف سجل أحمال المحول "${item.transformerLoadName || 'غير محدد'}"؟`, async () => {
            state.transformerLoads = state.transformerLoads.filter(load => load.id !== id);
            await saveState();
            showToast('تم حذف سجل أحمال المحول بنجاح.');
            renderTransformerLoadSection();
        });
    };

    // Expose Transformer actions to window for inline handlers
    (window as any).viewTransformer = (id: number) => {
        renderTransformerRegistrationForm(id);
        const form = document.getElementById('transformer-form') as HTMLFormElement;
        form.querySelectorAll('input, select').forEach(el => (el as any).disabled = true);
        const saveBtn = form.querySelector('button[type="submit"]') as HTMLElement;
        if (saveBtn) saveBtn.style.display = 'none';
        setPageTitle('عرض بيانات محول');
    };

    (window as any).editTransformer = (id: number) => {
        renderTransformerRegistrationForm(id);
    };

    (window as any).deleteTransformer = (id: number) => {
        const item = state.transformers.find(t => t.id === id);
        if (!item) return;
        showConfirmationDialog('تأكيد الحذف', `هل أنت متأكد من حذف بيانات المحول "${item.transformerName}"؟`, async () => {
            state.transformers = state.transformers.filter(t => t.id !== id);
            await saveState();
            showToast('تم حذف المحول بنجاح.');
            renderTransformerListSection();
        });
    };

    const handleDeleteSelectedTransformers = async () => {
        const selected = Array.from(document.querySelectorAll('.transformer-row-checkbox:checked')) as HTMLInputElement[];
        if (selected.length === 0) {
            showToast('يرجى تحديد محول واحد على الأقل.', 'error');
            return;
        }
        const ids = selected.map(cb => parseInt(cb.value, 10));
        showConfirmationDialog('تأكيد الحذف المتعدد', `هل أنت متأكد من حذف عدد (${ids.length}) محول؟ لا يمكن التراجع عن هذا الإجراء.`, async () => {
            state.transformers = state.transformers.filter(t => !ids.includes(t.id));
            logActivity('حذف متعدد محولات', `تم حذف ${ids.length} محول من القائمة.`);
            await saveState();
            showToast('تم حذف المحولات المحددة بنجاح.');
            renderTransformerListSection();
            (document.getElementById('select-all-transformers') as HTMLInputElement).checked = false;
        });
    };

    const handleImportTransformersExcel = async (event: Event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;
        try {
            await ensureSheetJSLoaded();
            const reader = new FileReader();
            reader.onload = async (e) => {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const jsonData: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

                const transformerExcelHeaderMap: { [key: string]: keyof DataItem } = {
                    'اسم المجلس': 'councilName',
                    'المجلس': 'councilName',
                    'اسم المحول': 'transformerName',
                    'الكشك': 'transformerName',
                    'اسم المحول / الكشك': 'transformerName',
                    'العنوان': 'transformerAddress',
                    'قدرة المحول': 'transformerCapacityKVA',
                    'القدرة': 'transformerCapacityKVA',
                    'شاسية العداد': 'smartMeterChassis',
                    'شاسية العداد اسمارت': 'smartMeterChassis',
                    'رقم الشريحة': 'simCardNumber',
                    'قدرة محولات التيار': 'currentTransformerCapacity',
                    'التيار': 'currentTransformerCapacity'
                };

                const timestamp = Date.now();
                const mappedData = jsonData.map((row, index) => {
                    const item: DataItem = { id: timestamp + index };
                    Object.keys(row).forEach(key => {
                        const mappedKey = transformerExcelHeaderMap[key.trim()];
                        if (mappedKey) {
                            let val = row[key];
                            if (mappedKey === 'transformerCapacityKVA') val = parseInt(val, 10) || 0;
                            (item as any)[mappedKey] = val;
                        }
                    });
                    return item;
                }).filter(item => item.transformerName);

                if (mappedData.length === 0) {
                    showToast('لم يتم العثور على بيانات محولات صالحة في الملف.', 'error');
                    return;
                }

                let addedCount = 0;
                let updatedCount = 0;

                mappedData.forEach(newItem => {
                    const existingIndex = state.transformers.findIndex(t =>
                        normalizeString(t.transformerName) === normalizeString(newItem.transformerName)
                    );
                    if (existingIndex !== -1) {
                        state.transformers[existingIndex] = { ...state.transformers[existingIndex], ...newItem };
                        updatedCount++;
                    } else {
                        state.transformers.push(newItem);
                        addedCount++;
                    }
                });

                logActivity('استيراد محولات', `تم استيراد ${mappedData.length} محول (إضافة: ${addedCount}، تحديث: ${updatedCount})`);
                await saveState();
                showToast(`تم الاستيراد بنجاح: ${addedCount} جديد، ${updatedCount} تم تحديثه.`);
                renderTransformerListSection();
            };
            reader.readAsArrayBuffer(file);
        } catch (err) {
            showToast('فشل في استيراد ملف الإكسل. تأكد من الصيغة.', 'error');
        }
    };

    const handleGoBack = () => {
        // Always navigate to the dashboard
        // Collapse all open sidebar categories (<details>) when returning to dashboard
        document.querySelectorAll('.nav-category details[open]').forEach(d => (d as HTMLDetailsElement).open = false);

        // Remove active state from sidebar links (so dashboard will become active)
        document.querySelectorAll('.sidebar-nav .nav-link.active').forEach(l => l.classList.remove('active'));

        const dashboardLink = document.querySelector('.sidebar-nav .nav-link[data-target="dashboard"]') as HTMLElement | null;
        dashboardLink?.click();
    };

    const updateMeterFormVisibility = (formPrefix: string = '') => {
        const meterTypeSelect = document.getElementById(`${formPrefix}meterType`) as HTMLSelectElement;
        const subscriberTypeSelect = document.getElementById(`${formPrefix}subscriberType`) as HTMLSelectElement;
        const removalReasonSelect = document.getElementById(`${formPrefix}removalReason`) as HTMLSelectElement;
        const readingAtRemovalGroup = document.getElementById(`${formPrefix}reading-field-container`);

        if (!subscriberTypeSelect) return;

        const subscriberType = subscriberTypeSelect.value;
        const meterType = meterTypeSelect ? meterTypeSelect.value : '';
        const isNewSubscriber = subscriberType === 'جديد';

        // --- Hide/show fields based on 'جديد' status ---
        const meterChassisInput = document.getElementById(`${formPrefix}meterChassisNumber`) as HTMLInputElement;
        const meterChassisGroup = meterChassisInput?.closest('.input-group');
        const meterTypeGroup = meterTypeSelect?.closest('.input-group');

        meterChassisGroup?.classList.toggle('hidden', isNewSubscriber);
        meterTypeGroup?.classList.toggle('hidden', isNewSubscriber);
        readingAtRemovalGroup?.classList.toggle('hidden', isNewSubscriber);


        // --- Adjust labels in installation section for clarity ---
        const newChassisLabel = document.querySelector(`label[for="${formPrefix}newMeterChassisNumber"]`);
        const newTypeLabel = document.querySelector(`label[for="${formPrefix}newMeterType"]`);
        if (newChassisLabel) {
            newChassisLabel.textContent = isNewSubscriber ? 'شاسية العداد' : 'شاسية العداد الجديد';
        }
        if (newTypeLabel) {
            newTypeLabel.textContent = isNewSubscriber ? 'نوع العداد' : 'نوع العداد الجديد';
        }

        // --- Subscriber Type dependent fields ---
        const showRemoval = ['مرفوع أعطال', 'مرفوع إحلال', 'استبدال'].includes(subscriberType);
        const showInstallation = ['جديد', 'مرفوع إحلال', 'استبدال'].includes(subscriberType);
        const showDemolition = ['هدم', 'استغناء'].includes(subscriberType);
        const showChangeSubscription = subscriberType === 'تغير عقد اشتراك';

        // Show repair info fields if status is 'تم الإصلاح'
        const showRepairedInfo = subscriberType === 'تم الإصلاح';
        document.getElementById(`${formPrefix}repaired-info-fields`)?.classList.toggle('hidden', !showRepairedInfo);

        document.getElementById(`${formPrefix}removal-fields`)?.classList.toggle('hidden', !showRemoval);
        document.getElementById(`${formPrefix}installation-fields`)?.classList.toggle('hidden', !showInstallation);

        // Inject change subscription fields if not exist
        let changeSubFields = document.getElementById(`${formPrefix}change-subscription-fields`);
        if (!changeSubFields) {
            const parent = document.getElementById(`${formPrefix}demolition-fields`)?.parentNode;
            const refNode = document.getElementById(`${formPrefix}demolition-fields`);
            if (parent && refNode) {
                changeSubFields = document.createElement('fieldset');
                changeSubFields.id = `${formPrefix}change-subscription-fields`;
                changeSubFields.className = 'form-grid-group hidden';
                changeSubFields.innerHTML = `
                <legend>بيانات تغيير التعاقد</legend>
                <div class="input-group">
                    <label for="${formPrefix}newSubscriberName">اسم المشترك الجديد</label>
                    <input type="text" id="${formPrefix}newSubscriberName">
                </div>
                <div class="input-group">
                    <label for="${formPrefix}contractDate">تاريخ التعاقد</label>
                    <input type="date" id="${formPrefix}contractDate">
                </div>
             `;
                parent.insertBefore(changeSubFields, refNode.nextSibling);
            }
        }

        if (changeSubFields) {
            changeSubFields.classList.toggle('hidden', !showChangeSubscription);
            const inputs = changeSubFields.querySelectorAll('input');
            inputs.forEach(input => input.required = showChangeSubscription);
        }

        const demolitionFields = document.getElementById(`${formPrefix}demolition-fields`);
        if (demolitionFields) {
            demolitionFields.classList.toggle('hidden', !showDemolition);
            const legend = demolitionFields.querySelector('legend');
            if (legend) {
                legend.textContent = subscriberType === 'استغناء' ? 'بيانات الاستغناء' : 'بيانات الهدم';
            }

            const demolitionTypeLabel = document.querySelector(`label[for="${formPrefix}demolitionType"]`);
            if (demolitionTypeLabel) {
                demolitionTypeLabel.textContent = subscriberType === 'استغناء' ? 'نوع الاستغناء' : 'نوع الهدم';
            }
        }

        // --- Search Mode Logic for Save Button ---
        const searchClearBtn = document.getElementById('meter-search-clear-btn');
        const saveBtn = document.querySelector(`#${formPrefix}meter-form button[type="submit"]`) as HTMLElement;

        if (formPrefix === '' && searchClearBtn && !searchClearBtn.classList.contains('hidden') && saveBtn) {
            if (subscriberType === 'مرفوع أعطال') {
                saveBtn.style.display = 'block';
                saveBtn.textContent = 'حفظ في العدادات المرفوعة أعطال';
                saveBtn.classList.remove('btn-primary');
                saveBtn.classList.add('btn-danger');
            } else {
                saveBtn.style.display = 'none';
            }
        } else if (formPrefix === '' && saveBtn) {
            // Reset to default if not in search mode
            saveBtn.style.display = 'block';
            saveBtn.textContent = 'حفظ البيانات';
            saveBtn.classList.add('btn-primary');
            saveBtn.classList.remove('btn-danger');
        }

        // --- Dynamically manage 'required' attributes for validation ---
        const newMeterChassisInput = document.getElementById(`${formPrefix}newMeterChassisNumber`) as HTMLInputElement;
        if (meterChassisInput) meterChassisInput.required = !isNewSubscriber;
        if (newMeterChassisInput) newMeterChassisInput.required = isNewSubscriber || showInstallation;

        // --- Meter Type dependent fields ---
        const showReadingField = !isNewSubscriber && ['ميكانيكي', 'ديجيتال'].includes(meterType);
        document.getElementById(`${formPrefix}reading-field-container`)?.classList.toggle('hidden', !showReadingField);
        document.getElementById(`${formPrefix}card-status-field-container`)?.classList.toggle('hidden', meterType !== 'مسبق الدفع');


        // Automatically set removal reason for 'مرفوع إحلال'
        if (subscriberType === 'مرفوع إحلال') {
            if (removalReasonSelect) {
                if (state.settings.removalReasons.includes('إحلال')) {
                    removalReasonSelect.value = 'إحلال';
                }
                removalReasonSelect.disabled = true;
            }
        } else {
            if (removalReasonSelect) {
                removalReasonSelect.disabled = false;
                if (removalReasonSelect.value === 'إحلال') {
                    removalReasonSelect.value = state.settings.removalReasons[0] || '';
                }
            }
        }

        // --- Meter Supply Company Field Logic ---
        const supplyCompanySelect = document.getElementById(`${formPrefix}meterSupplyCompany`) as HTMLSelectElement;
        if (supplyCompanySelect) {
            const wrapper = supplyCompanySelect.closest('.input-group') as HTMLElement;
            const removalContainer = document.getElementById(`${formPrefix}removal-fields`);
            const demolitionContainer = document.getElementById(`${formPrefix}demolition-fields`);
            const installationContainer = document.getElementById(`${formPrefix}installation-fields`);

            if (['مرفوع أعطال'].includes(subscriberType)) {
                if (removalContainer) {
                    const targetInput = document.getElementById(`${formPrefix}removedBy`);
                    const targetGroup = targetInput?.closest('.input-group');
                    if (targetGroup && targetGroup.parentNode === removalContainer) {
                        removalContainer.insertBefore(wrapper, targetGroup);
                    } else {
                        removalContainer.appendChild(wrapper);
                    }
                    wrapper.classList.toggle('hidden', meterType !== 'مسبق الدفع');
                }
            } else if (['هدم', 'استغناء'].includes(subscriberType)) {
                if (demolitionContainer) {
                    const targetInput = document.getElementById(`${formPrefix}meterReceivedBy`);
                    const targetGroup = targetInput?.closest('.input-group');
                    if (targetGroup && targetGroup.parentNode === demolitionContainer) {
                        demolitionContainer.insertBefore(wrapper, targetGroup);
                    } else {
                        demolitionContainer.appendChild(wrapper);
                    }
                    wrapper.classList.toggle('hidden', meterType !== 'مسبق الدفع');
                }
            } else if (subscriberType === 'استبدال') {
                if (installationContainer) {
                    installationContainer.appendChild(wrapper);
                    wrapper.classList.toggle('hidden', meterType !== 'مسبق الدفع');
                }
            } else if (['جديد', 'مرفوع إحلال'].includes(subscriberType)) {
                if (installationContainer) {
                    if (wrapper.parentElement !== installationContainer) {
                        const targetInput = document.getElementById(`${formPrefix}newMeterType`);
                        const targetGroup = targetInput?.closest('.input-group');
                        if (targetGroup && targetGroup.parentNode === installationContainer) {
                            installationContainer.insertBefore(wrapper, targetGroup.nextSibling);
                        } else {
                            installationContainer.appendChild(wrapper);
                        }
                    }
                    wrapper.classList.remove('hidden');
                }
            } else {
                wrapper.classList.add('hidden');
            }
        }
    };

    // --- Confirmation Dialog ---
    let confirmCallback: (() => void) | null = null;

    const showConfirmationDialog = (title: string, message: string, onConfirm: () => void) => {
        const dialog = document.getElementById('confirmation-dialog') as HTMLElement;
        const titleEl = document.getElementById('dialog-title') as HTMLElement;
        const messageEl = document.getElementById('dialog-message') as HTMLElement;

        if (!dialog || !titleEl || !messageEl) return;

        titleEl.textContent = title;
        messageEl.textContent = message;
        confirmCallback = onConfirm;

        dialog.hidden = false;
    };

    const hideConfirmationDialog = () => {
        const dialog = document.getElementById('confirmation-dialog') as HTMLElement;
        if (dialog) {
            dialog.hidden = true;
        }
        confirmCallback = null;
    };

    const handleDialogConfirm = () => {
        if (confirmCallback) {
            confirmCallback();
        }
        hideConfirmationDialog();
    };

    const setupDialogListeners = () => {
        const dialog = document.getElementById('confirmation-dialog') as HTMLElement;
        const confirmBtn = document.getElementById('dialog-confirm-btn');
        const cancelBtn = document.getElementById('dialog-cancel-btn');

        dialog?.addEventListener('click', (event) => {
            // Close if clicking on the overlay itself
            if (event.target === dialog) {
                hideConfirmationDialog();
            }
        });

        confirmBtn?.addEventListener('click', handleDialogConfirm);
        cancelBtn?.addEventListener('click', hideConfirmationDialog);
    };

    // --- صفحة تفاصيل المشترك ---

    const handlePrintSubscriberDetails = () => {
        if (currentMeterIdForDetails === null) return;
        const meter = state.meters.find(m => m.id === currentMeterIdForDetails);
        if (!meter) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            showToast('فشل فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة.', 'error');
            return;
        }

        const companyName = (state.settings.replacementReportCompanyName || state.settings.companyName || 'ELMAGHRABI').replace(/\n/g, '<br>');
        const printDate = new Date().toLocaleString('ar-EG');
        const logoSrc = state.settings.companyLogo;
        const logoHTML = logoSrc ? `<img src="${logoSrc}" alt="Logo" class="company-logo">` : '';
        const printedByText = `تمت الطباعة بواسطة: ${loggedInUser?.fullName || 'مستخدم'} | ${printDate}`;

        const createRow = (label: string, value: any) => {
            if (!value) return '';
            return `
            <div class="detail-item">
                <label>${label}</label>
                <span class="value">${value}</span>
            </div>
        `;
        };

        const basicItems = [
            createRow('اسم المشترك', meter.subscriberName),
            createRow('كود الاشتراك', meter.subscriptionCode),
            createRow('العنوان', meter.address),
            createRow('وصف المكان', meter.locationDescription),
            createRow('رقم اللوحة', meter.panelNumber),
            createRow('مرجع الحساب', `ف: ${meter.accountRefF || ''} | ح: ${meter.accountRefH || ''} | ي: ${meter.accountRefY || ''} | م: ${meter.accountRefM || ''}`),
            createRow('نوع النشاط', meter.activityType),
            createRow('نوع الاشتراك', meter.subscriptionType),
            createRow('الحالة', meter.subscriberType)
        ].join('');

        const isNewRecord = meter.subscriberType === 'جديد';
        const hasNewMeterData = (meter.newMeterChassisNumber || meter.newMeterChassisNumberForReplacement) && !isNewRecord;

        const meterItems = [
            createRow(hasNewMeterData ? 'شاسية العداد القديم' : 'شاسية العداد', meter.meterChassisNumber),
            createRow(hasNewMeterData ? 'نوع العداد القديم' : 'نوع العداد', meter.meterType),
            createRow('قدرة العداد', meter.meterCapacity),
            (meter.meterType === 'مسبق الدفع' ? createRow('حالة الكارت', meter.cardStatus) : '')
        ].join('');

        const installItems = (meter.installationDate || meter.installedBy || hasNewMeterData) ? [
            createRow('شاسية العداد الجديد', meter.newMeterChassisNumber || meter.newMeterChassisNumberForReplacement),
            createRow('نوع العداد الجديد', meter.newMeterType),
            createRow('تاريخ التركيب', meter.installationDate),
            createRow('القائم بالتركيب', meter.installedBy),
            createRow('شركة توريد العداد', meter.meterSupplyCompany),
            createRow('حالة التركيب', meter.installationStatus)
        ].join('') : '';

        const removalItems = ((meter.removalDate || meter.removalReason) && !['هدم', 'استغناء'].includes(meter.subscriberType)) ? [
            createRow('تاريخ الرفع', meter.removalDate),
            createRow('سبب الرفع', meter.removalReason),
            createRow('القائم بالرفع', meter.removedBy),
            createRow('القراءة عند الرفع', meter.readingAtRemoval)
        ].join('') : '';

        let repairItems = '';
        if (meter.repairStatus) {
            let durationRow = '';
            const start = meter.removalDate;
            const end = meter.reinstallationDate || meter.installationDateForReplacement;
            if (start && end) {
                const d1 = new Date(start);
                const d2 = new Date(end);
                if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
                    const diffTime = Math.abs(d2.getTime() - d1.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    durationRow = createRow('مدة الإصلاح', `${diffDays} يوم`);
                }
            }
            repairItems = [
                createRow('حالة الإصلاح', meter.repairStatus),
                createRow('تاريخ الرفع', meter.removalDate),
                createRow('تاريخ التركيب', meter.reinstallationDate || meter.installationDateForReplacement),
                durationRow
            ].join('');
        }

        const demolitionItems = (['هدم', 'استغناء'].includes(meter.subscriberType) && (meter.demolitionDate || meter.demolitionType)) ? [
            createRow(meter.subscriberType === 'استغناء' ? 'تاريخ الاستغناء' : 'تاريخ الهدم', meter.demolitionDate),
            createRow(meter.subscriberType === 'استغناء' ? 'نوع الاستغناء' : 'نوع الهدم', meter.demolitionType),
            createRow('القائم بالاستلام', meter.meterReceivedBy)
        ].join('') : '';

        const contractItems = (meter.newSubscriberName || meter.contractDate) ? [
            createRow('اسم المشترك الجديد', meter.newSubscriberName),
            createRow('تاريخ التعاقد', meter.contractDate)
        ].join('') : '';

        const content = `
        <div class="statement-result-card">
            <div class="details-grid">
                ${basicItems ? `<fieldset><legend>البيانات الأساسية</legend>${basicItems}</fieldset>` : ''}
                ${meterItems ? `<fieldset><legend>بيانات العداد</legend>${meterItems}</fieldset>` : ''}
                ${installItems ? `<fieldset><legend>بيانات التركيب</legend>${installItems}</fieldset>` : ''}
                ${removalItems ? `<fieldset><legend>بيانات الرفع</legend>${removalItems}</fieldset>` : ''}
                ${repairItems ? `<fieldset><legend>بيانات الإصلاح</legend>${repairItems}</fieldset>` : ''}
                ${demolitionItems ? `<fieldset><legend>${meter.subscriberType === 'استغناء' ? 'بيانات الاستغناء' : 'بيانات الهدم'}</legend>${demolitionItems}</fieldset>` : ''}
                ${contractItems ? `<fieldset><legend>بيانات تغيير التعاقد</legend>${contractItems}</fieldset>` : ''}
            </div>
        </div>
      `;

        printWindow.document.write(`
        <!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>طباعة تفاصيل المشترك</title>
        <style>
            @page { size: A4; margin: 10mm; } 
            body { background-color: #fff !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; font-family: 'Tajawal', sans-serif; font-size: 9pt; } 
            .print-header { border-bottom: 2px solid #333; margin-bottom: 10px; padding-bottom: 5px; } 
            .header-content { display: flex; justify-content: space-between; align-items: center; }
            .header-right { text-align: right; font-size: 14px; font-weight: bold; }
            .header-center { text-align: center; flex-grow: 1; }
            .header-left { text-align: left; }
            .company-logo { max-width: 70px; max-height: 70px; object-fit: contain; }
            .print-footer { text-align: center; font-size: 9px; color: #777; position: fixed; bottom: 5mm; width: 100%; }
            
            /* Consistent Styles from Account Statement */
            .statement-result-card {
                border: 1px solid #ccc;
                border-radius: 8px;
                padding: 8px;
                margin-bottom: 10px;
                background-color: #fff !important;
                page-break-inside: avoid;
            }
            .details-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 8px;
            }
            fieldset {
                border: 1px solid #ddd;
                padding: 5px;
                border-radius: 4px;
                margin: 0;
            }
            legend {
                font-weight: bold;
                padding: 0 5px;
                font-size: 10pt;
            }
            .detail-item {
                display: flex;
                justify-content: space-between;
                padding: 2px 0;
                border-bottom: 1px dotted #eee;
            }
            .detail-item:last-child {
                border-bottom: none;
            }
            .detail-item label {
                font-weight: 500;
                color: #333;
            }
            .detail-item .value {
                color: #555;
            }
        </style></head><body>
        <div class="print-header">
            <div class="header-content">
                <div class="header-right">${companyName}</div>
                <div class="header-center">
                    <h2 style="margin: 0; font-size: 18px;">تفاصيل المشترك</h2>
                    <div style="font-size: 10px; margin-top: 5px;">${printedByText}</div>
                </div>
                <div class="header-left">${logoHTML}</div>
            </div>
        </div>
        ${content}<div class="print-footer"><p>تاريخ الطباعة: ${printDate}</p></div></body></html>
    `);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    const openSubscriberDetailsPage = (meterId: number, mode: 'view' | 'edit') => {
        const meter = state.meters.find(m => m.id === meterId);
        if (!meter) {
            console.error("Meter not found");
            return;
        }

        currentMeterIdForDetails = meterId;
        const activeSection = document.querySelector('.content-section.active');
        previousPageId = activeSection ? activeSection.id : 'meter-management';

        const form = document.getElementById('subscriber-details-form') as HTMLFormElement;
        clearFormErrors(form);
        const title = document.getElementById('subscriber-details-title')!;
        const saveButton = document.getElementById('save-details-btn')!;
        const deleteButton = document.getElementById('delete-subscriber-btn')!;
        const backButton = document.querySelector('#subscriber-details .btn-back-page')!;

        ensureMeterSupplyCompanyField('details-');
        // Inject Print Button if not exists
        if (!document.getElementById('print-subscriber-details-btn') && hasButtonPermission('print_button')) {
            const printBtn = document.createElement('button');
            printBtn.id = 'print-subscriber-details-btn';
            printBtn.className = 'btn';
            printBtn.style.marginLeft = '10px';
            printBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg> طباعة`;
            printBtn.onclick = handlePrintSubscriberDetails;
            saveButton.parentNode?.insertBefore(printBtn, saveButton);
        }

        title.textContent = mode === 'view' ? 'عرض تفاصيل المشترك' : 'تعديل بيانات المشترك';
        saveButton.style.display = mode === 'edit' && hasButtonPermission('edit_button') ? 'inline-flex' : 'none';
        deleteButton.style.display = mode === 'edit' && hasButtonPermission('delete_button') ? 'inline-flex' : 'none';

        // Populate dropdowns
        populateSelect(document.getElementById('details-meterType') as HTMLSelectElement, state.settings.meterTypes, 'اختر نوع العداد...');
        populateSelect(document.getElementById('details-newMeterType') as HTMLSelectElement, state.settings.meterTypes, 'اختر نوع العداد الجديد...');
        populateSelect(document.getElementById('details-activityType') as HTMLSelectElement, state.settings.activityTypes, 'اختر نوع النشاط...');
        populateSelect(document.getElementById('details-subscriptionType') as HTMLSelectElement, state.settings.subscriptionTypes, 'اختر نوع الاشتراك...');
        populateSelect(document.getElementById('details-meterCapacity') as HTMLSelectElement, state.settings.meterCapacities, 'اختر قدرة العداد...');
        populateSelect(document.getElementById('details-removalReason') as HTMLSelectElement, state.settings.removalReasons, 'اختر سبب الرفع...');
        populateSelect(document.getElementById('details-removedBy') as HTMLSelectElement, state.settings.technicians, 'اختر القائم بالرفع...');
        populateSelect(document.getElementById('details-installedBy') as HTMLSelectElement, state.settings.technicians, 'اختر القائم بالتركيب...');
        populateSelect(document.getElementById('details-meterReceivedBy') as HTMLSelectElement, state.settings.technicians, 'اختر القائم بالاستلام...');
        populateSelect(document.getElementById('details-demolitionType') as HTMLSelectElement, state.settings.demolitionTypes, 'اختر نوع الهدم...');
        populateSelect(document.getElementById('details-cardStatus') as HTMLSelectElement, state.settings.cardStatuses, 'اختر حالة الكارت...');
        populateSelect(document.getElementById('details-subscriberType') as HTMLSelectElement, ['جديد', 'مرفوع أعطال', 'مرفوع إحلال', 'استغناء', 'تغير عقد اشتراك', 'استبدال', 'هدم', 'تم الإصلاح', 'لا يمكن إصلاحه', 'تم استبداله', 'بيانات مستوردة'], 'اختر حالة المشترك...');
        populateSelect(document.getElementById('details-locationDescription') as HTMLSelectElement, state.settings.placeDescriptions, 'اختر وصف المكان...');
        // Populate form fields from meter object
        Object.keys(meter).forEach(key => {
            const input = document.getElementById(`details-${key}`) as HTMLInputElement | HTMLSelectElement;
            if (input) {
                const val = meter[key as keyof DataItem];
                // التأكد من وجود القيمة في القائمة المنسدلة حتى لا يظهر الحقل فارغاً في حال كانت القيمة مستوردة وغير مسجلة في الإعدادات
                if (input instanceof HTMLSelectElement && val && val !== 'غير محدد') {
                    const exists = Array.from(input.options).some(opt => opt.value === val);
                    if (!exists) {
                        const newOpt = document.createElement('option');
                        newOpt.value = String(val);
                        newOpt.textContent = String(val);
                        input.appendChild(newOpt);
                    }
                }
                input.value = (val !== undefined && val !== null) ? String(val) : '';
            }
        });

        // Special handling for 'new' subscribers to show chassis number in the correct field
        if (meter.subscriberType === 'جديد') {
            (document.getElementById('details-newMeterChassisNumber') as HTMLInputElement).value = meter.meterChassisNumber;
        }

        // Set enabled/disabled state
        const formElements = form.elements;
        for (let i = 0; i < formElements.length; i++) {
            const element = formElements[i] as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLFieldSetElement;
            element.disabled = (mode === 'view' || !(loggedInUser?.username === 'admin' || loggedInUser?.role === 'admin' || loggedInUser?.role === 'supervisor'));
        }

        // Trigger change events to show/hide conditional fields correctly
        updateMeterFormVisibility('details-');

        // Navigate to the details section
        document.querySelectorAll('.content-section.active').forEach(s => s.classList.remove('active'));
        document.getElementById('subscriber-details')?.classList.add('active');
        setPageTitle('تفاصيل المحضر');
    };

    const handleSaveDetails = () => {
        if (currentMeterIdForDetails === null) return;

        const form = document.getElementById('subscriber-details-form') as HTMLFormElement;
        if (!validateForm(form)) {
            showToast('يرجى تصحيح الحقول المطلوبة.', 'error');
            return;
        }

        const meterIndex = state.meters.findIndex(m => m.id === currentMeterIdForDetails);
        if (meterIndex === -1) return;

        const updatedData: { [key: string]: any } = {};

        const formElements = form.elements;
        for (let i = 0; i < formElements.length; i++) {
            const element = formElements[i];
            if ((element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) && element.id) {
                const key = element.id.replace('details-', '');
                updatedData[key] = element.value;
            }
        }

        // If subscriber type is changed to 'New', map data from installation fields.
        if (updatedData.subscriberType === 'جديد') {
            updatedData.meterChassisNumber = updatedData.newMeterChassisNumber;
            updatedData.meterType = updatedData.newMeterType;
        }

        const originalMeter = { ...state.meters[meterIndex] }; // Make a copy before updating

        // Manually construct accountReference from its parts and also save individual parts
        updatedData.accountReference = `${updatedData.accountRefF || ''}${updatedData.accountRefH || ''}${updatedData.accountRefY || ''}${updatedData.accountRefM || ''}`;
        Object.assign(updatedData, { accountRefF: updatedData.accountRefF, accountRefH: updatedData.accountRefH, accountRefY: updatedData.accountRefY, accountRefM: updatedData.accountRefM });

        state.meters[meterIndex] = { ...originalMeter, ...updatedData };

        // Enhanced activity logging for edits
        const changes: string[] = [];
        const fieldLabels: { [key: string]: string } = {
            subscriberName: 'اسم المشترك', address: 'العنوان', subscriptionCode: 'كود الاشتراك',
            subscriberType: 'الحالة', meterChassisNumber: 'شاسية العداد', panelNumber: 'رقم اللوحة',
            locationDescription: 'وصف المكان',
            accountReference: 'مرجع الحساب', meterCapacity: 'قدرة العداد', meterType: 'نوع العداد',
            activityType: 'نوع النشاط', subscriptionType: 'نوع الاشتراك', readingAtRemoval: 'القراءة عند الرفع',
            cardStatus: 'حالة الكارت', removalReason: 'سبب الرفع', removalDate: 'تاريخ الرفع',
            removedBy: 'القائم بالرفع', newMeterChassisNumber: 'شاسية العداد الجديد', newMeterType: 'نوع العداد الجديد',
            installationDate: 'تاريخ التركيب', installedBy: 'القائم بالتركيب', meterSupplyCompany: 'شركة توريد العداد', demolitionType: 'نوع الهدم',
            demolitionDate: 'تاريخ الهدم', meterReceivedBy: 'القائم بالاستلام', repairStatus: 'حالة الإصلاح',
            repairDate: 'تاريخ الإصلاح', reinstallationDate: 'تاريخ الرجوع للتركيب',
            accountRefF: 'مرجع ف', accountRefH: 'مرجع ح', accountRefY: 'مرجع ي', accountRefM: 'مرجع م',
        };

        Object.keys(updatedData).forEach(key => {
            if (originalMeter[key] !== updatedData[key] && key !== 'id') {
                const label = fieldLabels[key] || key;
                changes.push(`${label}: من "${originalMeter[key] || 'فارغ'}" إلى "${updatedData[key] || 'فارغ'}"`);
            }
        });

        const logDetails = `تعديل بيانات المشترك "${updatedData.subscriberName}" (شاسية: ${originalMeter.meterChassisNumber}).`;
        const changeSummary = changes.length > 0 ? changes.join(' | ') : 'لم يتم تغيير أي بيانات.';
        logActivity('تعديل بيانات مشترك', logDetails, changeSummary);

        saveState();
        showToast('تم حفظ البيانات بنجاح.');
        renderDashboard();
        handleBackToList();
    };

    const renderPermissionsSection = () => {
        const container = document.getElementById('permissions-container');
        if (!container) return;

        // Setup structure with titles, this also clears previous content
        container.innerHTML = `
        <h3>الصلاحيات العامة</h3>
        <div id="general-permissions-sub-container"></div>
        <h3 style="margin-top: 2rem;">صلاحيات لوحة التحكم</h3>
        <div id="dashboard-permissions-container"></div>
        <h3 style="margin-top: 2rem;">صلاحيات الأزرار</h3>
        <div id="button-permissions-container"></div>
        <h3 style="margin-top: 2rem;">صلاحيات التقارير</h3>
        <div id="report-permissions-container"></div>
    `;

        const generalPermissionsContainer = document.getElementById('general-permissions-sub-container');
        if (!generalPermissionsContainer) return;

        const roles = state.settings.roles;

        // --- Render General Permissions ---
        const permissions = state.settings.permissions;

        const table = document.createElement('table');
        table.className = 'permissions-table';

        // Header Row
        const thead = document.createElement('thead');
        let headerRow = '<tr><th>الصلاحية</th>';
        roles.forEach(role => {
            headerRow += `<th>${role.name}</th>`;
        });
        headerRow += '</tr>';
        thead.innerHTML = headerRow;
        table.appendChild(thead);

        // Body Rows
        const tbody = document.createElement('tbody');
        Object.keys(permissions).forEach(permissionKey => {
            const permission = permissions[permissionKey as keyof typeof permissions];
            let bodyRow = `<tr><td>${permission.name}</td>`;
            roles.forEach(role => {
                const isChecked = permission.roles.includes(role.key);
                const isDisabled = role.key === 'admin'; // Admin role is always checked and disabled
                bodyRow += `
                <td>
                    <label class="switch">
                        <input type="checkbox" 
                               data-role="${role.key}" 
                               data-permission="${permissionKey}" 
                               ${isChecked ? 'checked' : ''}
                               ${isDisabled ? 'disabled' : ''}>
                        <span class="slider round"></span>
                    </label>
                </td>
            `;
            });
            bodyRow += '</tr>';
            tbody.innerHTML += bodyRow;
        });
        table.appendChild(tbody);

        generalPermissionsContainer.appendChild(table);

        // --- Render other permission sections ---
        renderDashboardPermissionsSection();
        renderButtonPermissionsSection();
        renderReportPermissionsSection();
    };

    const handleDeleteSubscriber = () => {
        if (currentMeterIdForDetails === null) return;

        const meterToDelete = state.meters.find(m => m.id === currentMeterIdForDetails);
        if (!meterToDelete) return;

        const onConfirm = () => {
            state.meters = state.meters.filter(m => m.id !== currentMeterIdForDetails);
            const summary = `اسم: ${meterToDelete.subscriberName}, شاسية: ${meterToDelete.meterChassisNumber}, كود: ${meterToDelete.subscriptionCode}`;
            logActivity('حذف مشترك', `حذف سجل المشترك "${meterToDelete.subscriberName}".`, summary);
            saveState();
            showToast('تم حذف المشترك بنجاح.');
            currentMeterIdForDetails = null;
            renderDashboard();
            // Go back to main management page as the list might be resorted or changed
            previousPageId = 'meter-management';
            handleBackToList();
        };

        showConfirmationDialog(
            'تأكيد الحذف',
            `هل أنت متأكد من رغبتك في حذف سجل المشترك "${meterToDelete.subscriberName}" نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`,
            onConfirm
        );
    };

    const handleBackToList = () => {
        const targetId = navigationHistory.pop() || 'meter-management';
        const backLink = document.querySelector(`.sidebar-nav .nav-link[data-target="${targetId}"]`) as HTMLElement;
        currentMukayasaIdForDetails = null;
        if (backLink) {
            backLink.click();
        } else {
            // Fallback to dashboard
            (document.querySelector('.sidebar-nav .nav-link[data-target="dashboard"]') as HTMLElement).click();
        }
        previousPageId = null;
        currentMeterIdForDetails = null;
    };

    const renderAboutAppSection = async () => {
        const versionEl = document.getElementById('app-version-display');
        if (versionEl) {
            try {
                const version = await window.getAppVersion();
                versionEl.textContent = `v${version}`;
            } catch (error) {
                console.error("Failed to get app version:", error);
                versionEl.textContent = 'غير متوفر';
            }

            // Add Check for Updates Button dynamically if it doesn't exist
            const container = versionEl.parentElement;
            if (container && !document.getElementById('check-updates-btn')) {
                const btnContainer = document.createElement('div');
                btnContainer.style.marginTop = '1rem';

                const checkBtn = document.createElement('button');
                checkBtn.id = 'check-updates-btn';
                checkBtn.className = 'btn';
                checkBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 0.5rem;"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/></svg>
                التحقق من التحديثات
            `;

                checkBtn.onclick = async () => {
                    checkBtn.disabled = true;
                    checkBtn.textContent = 'جاري التحقق...';
                    showToast('جاري البحث عن تحديثات...', 'success'); // Using success for blue/green color usually, or add 'info' type

                    try {
                        const result = await window.checkForUpdates();
                        if (!result.success) {
                            showToast(`فشل التحقق: ${result.error}`, 'error');
                        }
                        // Note: If update is found, autoUpdater events in main.js will handle the dialogs/download.
                    } catch (err) {
                        showToast('حدث خطأ أثناء التحقق.', 'error');
                    } finally {
                        checkBtn.disabled = false;
                        checkBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 0.5rem;"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/></svg> التحقق من التحديثات`;
                    }
                };

                btnContainer.appendChild(checkBtn);
                container.appendChild(btnContainer);

                // Add Progress Bar Container (Hidden by default)
                const progressContainer = document.createElement('div');
                progressContainer.id = 'update-progress-container';
                progressContainer.className = 'progress-bar-container';
                progressContainer.innerHTML = `
                <div class="progress-text" id="update-progress-text">جاري التنزيل...</div>
                <div class="progress-bar-track">
                    <div id="update-progress-bar" class="progress-bar-fill"></div>
                </div>
            `;
                container.appendChild(progressContainer);
            }
        }
    };

    // --- كشف حساب المشترك ---

    const renderSubscriberStatementSection = () => {
        const form = document.getElementById('subscriber-statement-form') as HTMLFormElement;
        form?.reset();
        document.getElementById('subscriber-statement-results')?.classList.add('hidden');
    };

    const handleSubscriberStatementSearch = (event: Event) => {
        event.preventDefault();
        const name = (document.getElementById('statement-search-subscriberName') as HTMLInputElement).value.trim().toLowerCase();
        const code = (document.getElementById('statement-search-subscriptionCode') as HTMLInputElement).value.trim().toLowerCase();
        const chassis = (document.getElementById('statement-search-meterChassisNumber') as HTMLInputElement).value.trim().toLowerCase();
        const refF = (document.getElementById('statement-search-accountRefF') as HTMLInputElement).value.trim();
        const refH = (document.getElementById('statement-search-accountRefH') as HTMLInputElement).value.trim();
        const refY = (document.getElementById('statement-search-accountRefY') as HTMLInputElement).value.trim();
        const refM = (document.getElementById('statement-search-accountRefM') as HTMLInputElement).value.trim();

        if (!name && !code && !chassis && !refF && !refH && !refY && !refM) {
            showToast('يرجى إدخال معيار بحث واحد على الأقل.', 'error');
            return;
        }

        const searchFilter = (m: DataItem) => {
            const nameMatch = !name || m.subscriberName?.toLowerCase().includes(name);
            const codeMatch = !code || m.subscriptionCode?.toLowerCase().includes(code);
            const chassisMatch = !chassis || m.meterChassisNumber?.toLowerCase().includes(chassis) || m.newMeterChassisNumber?.toLowerCase().includes(chassis) || m.newMeterChassisNumberForReplacement?.toLowerCase().includes(chassis);
            const refFMatch = !refF || m.accountRefF === refF;
            const refHMatch = !refH || m.accountRefH === refH;
            const refYMatch = !refY || m.accountRefY === refY;
            const refMMatch = !refM || m.accountRefM === refM;

            return nameMatch && codeMatch && chassisMatch && refFMatch && refHMatch && refYMatch && refMMatch;
        };

        const meterResults = state.meters.filter(searchFilter);
        const subscriberResults = state.subscribers.filter(searchFilter);

        // Combine results and remove duplicates by ID
        const combinedResults = [...meterResults, ...subscriberResults];
        const uniqueResults = Array.from(new Map(combinedResults.map(item => [item.id, item])).values());

        renderSubscriberStatementResults(uniqueResults);
    };

    const renderSubscriberStatementResults = (results: DataItem[]) => {
        const resultsContainer = document.getElementById('print-area-statement')!;
        resultsContainer.classList.remove('hidden');
        resultsContainer.innerHTML = ''; // Clear previous results

        if (results.length === 0) {
            resultsContainer.innerHTML = `<div class="no-results-message">لم يتم العثور على مشتركين مطابقين لمعايير البحث.</div>`;
            return;
        }

        const headerContainer = document.createElement('div');
        headerContainer.className = 'statement-results-header-container no-print'; // Add no-print class

        const header = document.createElement('h3');
        header.className = 'statement-results-header';
        header.textContent = `نتائج البحث (${results.length} سجل تم العثور عليه)`;
        headerContainer.appendChild(header);

        // Add Print Button
        if (hasButtonPermission('print_list_button')) {
            const printButton = document.createElement('button');
            printButton.className = 'btn';
            printButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg> <span>طباعة الكشف</span>`;
            printButton.addEventListener('click', handlePrintSubscriberStatement);
            headerContainer.appendChild(printButton);
        }
        resultsContainer.appendChild(headerContainer);

        // Group results by subscriber to show a coherent history
        const groupedBySubscriber = results.reduce((acc, meter) => {
            const key = meter.subscriptionCode || meter.subscriberName || `id-${meter.id}`;
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(meter);
            return acc;
        }, {} as { [key: string]: DataItem[] });

        Object.values(groupedBySubscriber).forEach(meterGroup => {
            const createDetailItem = (label: string, value: any, key: string) => {
                if (value === undefined || value === null || value === '') return '';
                return `
                <div class="detail-item">
                    <label>${label}</label>
                    <span class="value" data-key="${key}">${value}</span>
                </div>
            `;
            };

            // Sort meters by date to show a timeline
            meterGroup.sort((a, b) => new Date(a.installationDate || a.removalDate || 0).getTime() - new Date(b.installationDate || b.removalDate || 0).getTime());

            meterGroup.forEach(meter => {
                // Prepare content for fieldsets to check if they are empty
                const basicItems = [
                    createDetailItem('اسم المشترك', meter.subscriberName, 'subscriberName'),
                    createDetailItem('كود الاشتراك', meter.subscriptionCode, 'subscriptionCode'),
                    createDetailItem('العنوان', meter.address, 'address'),
                    createDetailItem('نوع النشاط', meter.activityType, 'activityType'),
                    createDetailItem('وصف المكان', meter.locationDescription, 'locationDescription'),
                    meter.codeName ? createDetailItem('الاسم الكودي', meter.codeName, 'codeName') : ''
                ].join('');

                const hasAccountRef = meter.accountRefF || meter.accountRefH || meter.accountRefY || meter.accountRefM;
                const accountRefHtml = hasAccountRef ? `
                        <div class="detail-item">
                            <label>مرجع الحساب</label>
                            <div class="value" style="display: flex; gap: 15px; align-items: center;">
                                <span data-key="accountRefF"><b>ف:</b> ${meter.accountRefF || '-'}</span>
                                <span data-key="accountRefH"><b>ح:</b> ${meter.accountRefH || '-'}</span>
                                <span data-key="accountRefY"><b>ي:</b> ${meter.accountRefY || '-'}</span>
                                <span data-key="accountRefM"><b>م:</b> ${meter.accountRefM || '-'}</span>
                            </div>
                        </div>` : '';

                const meterItems = [
                    createDetailItem('شاسية العداد', meter.meterChassisNumber, 'meterChassisNumber'),
                    createDetailItem('نوع العداد', meter.meterType, 'meterType'),
                    createDetailItem('قدرة العداد', meter.meterCapacity, 'meterCapacity'),
                    createDetailItem('رقم اللوحة', meter.panelNumber, 'panelNumber')
                ].join('');

                const isFaulty = meter.subscriberType === 'مرفوع أعطال';
                const isDemolition = ['هدم', 'استغناء'].includes(meter.subscriberType);
                const isReplacement = meter.subscriberType === 'مرفوع إحلال';

                let installOrContractFieldset = '';

                if (isReplacement) {
                    const contractItems = [
                        createDetailItem('نوع النشاط', meter.activityType, 'activityType'),
                        createDetailItem('وصف المكان', meter.locationDescription, 'locationDescription')
                    ].join('');
                    if (contractItems) installOrContractFieldset = `<fieldset><legend>بيانات التعاقد</legend>${contractItems}</fieldset>`;
                } else if (!isFaulty && !isDemolition) {
                    const installItems = [
                        createDetailItem('تاريخ التركيب', meter.installationDate, 'installationDate'),
                        createDetailItem('القائم بالتركيب', meter.installedBy, 'installedBy'),
                        createDetailItem('حالة التركيب', meter.installationStatus, 'installationStatus')
                    ].join('');
                    if (installItems) installOrContractFieldset = `<fieldset><legend>بيانات التركيب</legend>${installItems}</fieldset>`;
                }

                const isNew = meter.subscriberType === 'جديد';
                const isMechanical = meter.meterType === 'ميكانيكي';

                const removalItems = (isNew || isDemolition) ? '' : [
                    createDetailItem('تاريخ الرفع', meter.removalDate, 'removalDate'),
                    createDetailItem('القائم بالرفع', meter.removedBy, 'removedBy'),
                    createDetailItem('سبب الرفع', meter.removalReason, 'removalReason'),
                    (isMechanical ? createDetailItem('القراءة عند الرفع', meter.readingAtRemoval, 'readingAtRemoval') : '')
                ].join('');

                const demolitionItems = isDemolition ? [
                    createDetailItem(meter.subscriberType === 'استغناء' ? 'تاريخ الاستغناء' : 'تاريخ الهدم', meter.demolitionDate, 'demolitionDate'),
                    createDetailItem(meter.subscriberType === 'استغناء' ? 'نوع الاستغناء' : 'نوع الهدم', meter.demolitionType, 'demolitionType'),
                    createDetailItem('القائم بالاستلام', meter.meterReceivedBy, 'meterReceivedBy'),
                    (isMechanical ? createDetailItem('القراءة عند الرفع', meter.readingAtRemoval, 'readingAtRemoval') : '')
                ].join('') : '';

                const repairItems = [
                    createDetailItem('حالة الإصلاح', meter.repairStatus, 'repairStatus'),
                    createDetailItem('شاسية عداد بديل (إصلاح)', meter.newMeterChassisNumberForReplacement, 'newMeterChassisNumberForReplacement'),
                    createDetailItem('تاريخ تركيب البديل', meter.installationDateForReplacement, 'installationDateForReplacement'),
                    createDetailItem('تاريخ الرجوع للتركيب', meter.reinstallationDate, 'reinstallationDate')
                ].join('');

                const card = document.createElement('div');
                card.className = 'statement-result-card';
                card.innerHTML = `
                <h4>
                    <span>سجل عداد: ${meter.meterChassisNumber || 'N/A'}</span>
                    <span class="status-badge">${meter.subscriberType || 'غير محدد'}</span>
                </h4>
                <div class="details-grid">
                    ${(basicItems || hasAccountRef) ? `<fieldset><legend>البيانات الأساسية</legend>${basicItems}${accountRefHtml}</fieldset>` : ''}
                    ${meterItems ? `<fieldset><legend>بيانات العداد</legend>${meterItems}</fieldset>` : ''}
                    ${installOrContractFieldset}
                    ${removalItems ? `<fieldset><legend>بيانات الرفع</legend>${removalItems}</fieldset>` : ''}
                    ${demolitionItems ? `<fieldset><legend>${meter.subscriberType === 'استغناء' ? 'بيانات الاستغناء' : 'بيانات الهدم'}</legend>${demolitionItems}</fieldset>` : ''}
                    ${repairItems ? `<fieldset><legend>بيانات الإصلاح/الاستبدال</legend>${repairItems}</fieldset>` : ''}
                </div>
            `;
                resultsContainer.appendChild(card);
            });
        });
    };

    const handlePrintSubscriberStatement = () => {
        const resultsContainer = document.getElementById('print-area-statement');
        if (!resultsContainer) {
            showToast('لم يتم العثور على منطقة الطباعة.', 'error');
            return;
        }

        const cards = Array.from(resultsContainer.querySelectorAll('.statement-result-card'));
        if (cards.length === 0) {
            showToast('لا توجد نتائج لطباعتها.', 'error');
            return;
        }

        // --- Extract Subscriber Data for Header ---
        const subscriberData = {
            name: cards[0].querySelector('[data-key="subscriberName"]')?.textContent || 'غير محدد',
            code: cards[0].querySelector('[data-key="subscriptionCode"]')?.textContent || '-',
            address: cards[0].querySelector('[data-key="address"]')?.textContent || '-',
            refF: cards[0].querySelector('[data-key="accountRefF"]')?.textContent?.replace('ف:', '').trim() || '-',
            refH: cards[0].querySelector('[data-key="accountRefH"]')?.textContent?.replace('ح:', '').trim() || '-',
            refY: cards[0].querySelector('[data-key="accountRefY"]')?.textContent?.replace('ي:', '').trim() || '-',
            refM: cards[0].querySelector('[data-key="accountRefM"]')?.textContent?.replace('م:', '').trim() || '-',
        };

        // --- Generate HTML for the cards ---
        const cardsHTML = cards.map(card => card.outerHTML).join('');

        // --- Generate Print HTML ---
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            showToast('فشل فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة.', 'error');
            return;
        }

        const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'));
        const stylesHTML = stylesheets.map(sheet => sheet.outerHTML).join('\n');
        const companyName = (state.settings.replacementReportCompanyName || state.settings.companyName || 'ELMAGHRABI').replace(/\n/g, '<br>');
        const printDate = new Date().toLocaleString('ar-EG');
        const printedBy = loggedInUser?.fullName || 'غير محدد';
        const logoSrc = state.settings.companyLogo;
        const logoHTML = logoSrc ? `<img src="${logoSrc}" alt="Logo" class="company-logo">` : '';

        printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>كشف حساب مشترك - ${subscriberData.name}</title>
            ${stylesHTML}
            <style>
                @page { size: A4 landscape; margin: 5mm; }
                body { 
                    background-color: #fff !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
                    font-family: 'Tajawal', sans-serif;
                    font-size: 9pt;
                }
                .no-print, .btn, .form-container, .statement-results-header-container { display: none !important; }
                .print-header, .subscriber-info { width: 100%; margin-bottom: 5px; }
                .print-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 5px; margin-bottom: 10px; }
                .header-right { text-align: right; width: 30%; }
                .header-right h1 { font-size: 14pt; margin: 0; line-height: 1.2; }
                .header-center { text-align: center; flex-grow: 1; }
                .header-center h2 { font-size: 18pt; margin: 0; font-weight: bold; text-decoration: underline; }
                .company-logo { max-width: 150px; max-height: 150px; object-fit: contain; }
                .logo-container { width: 160px; display: flex; justify-content: flex-end; }
                .subscriber-info { border: 1px solid #999; border-radius: 5px; padding: 5px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; page-break-after: auto; font-size: 9pt; }
                .subscriber-info div { display: flex; }
                .subscriber-info label { font-weight: bold; margin-left: 5px; min-width: 70px; }
                
                /* Styles for the cards */
                .statement-result-card {
                    border: 1px solid #ccc;
                    border-radius: 8px;
                    padding: 8px;
                    margin-bottom: 10px;
                    background-color: #fff !important;
                    page-break-inside: avoid;
                }
                .statement-result-card h4 {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-top: 0;
                    border-bottom: 1px solid #eee;
                    padding-bottom: 5px;
                    font-size: 11pt;
                    margin-bottom: 5px;
                }
                .details-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 8px;
                }
                fieldset {
                    border: 1px solid #ddd;
                    padding: 5px;
                    border-radius: 4px;
                    margin: 0;
                }
                legend {
                    font-weight: bold;
                    padding: 0 5px;
                    font-size: 10pt;
                }
                .detail-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 2px 0;
                    border-bottom: 1px dotted #eee;
                }
                .detail-item:last-child {
                    border-bottom: none;
                }
                .detail-item label {
                    font-weight: 500;
                    color: #333;
                }
                .detail-item .value {
                    color: #555;
                }
                .status-badge {
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 0.8em;
                    background-color: #e9ecef !important;
                    color: #495057 !important;
                    border: 1px solid #dee2e6 !important;
                }
            </style>
        </head>
        <body>
            <div class="print-header">
                <div class="header-right">
                    <h1>${companyName}</h1>
                </div>
                <div class="header-center">
                    <h2>كشف حساب مشترك</h2>
                </div>
                <div class="logo-container">${logoHTML}</div>
             </div>
             <div class="subscriber-info">
                <div><label>اسم المشترك:</label><span>${subscriberData.name}</span></div>
                <div><label>كود الاشتراك:</label><span>${subscriberData.code}</span></div>
                <div><label>العنوان:</label><span>${subscriberData.address}</span></div>
                <div><label>مرجع الحساب:</label><span>ف: ${subscriberData.refF} | ح: ${subscriberData.refH} | ي: ${subscriberData.refY} | م: ${subscriberData.refM}</span></div>
             </div>
             
             ${cardsHTML}

             <div style="position: fixed; bottom: 5mm; left: 10mm; right: 10mm; display: flex; justify-content: space-between; font-size: 8pt; color: #555;">
                <span>تاريخ الطباعة: ${printDate}</span>
                <span>قام بالطباعة: ${printedBy}</span>
            </div>
        </body>
        </html>
    `);

        printWindow.document.close();
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    // --- العدادات التي تم إصلاحها ---
    const renderRepairedMetersSection = () => {
        const searchForm = document.getElementById('repair-search-form') as HTMLFormElement;
        searchForm.reset();
        document.getElementById('repair-search-results')?.classList.add('hidden');
        const repairForm = document.getElementById('repair-form') as HTMLFormElement;
        repairForm.reset();
        clearFormErrors(repairForm);
        document.getElementById('repair-form-container')?.classList.add('hidden');


        const tableBody = document.querySelector('#repaired-meters-table tbody');
        if (!tableBody) return;

        tableBody.innerHTML = '';
        const repairedMeters = state.meters.filter(m => m.repairStatus);

        document.querySelector('#repaired-meters-table thead')!.innerHTML = `
        <tr>
            <th>ف</th>
            <th>ح</th>
            <th>ي</th>
            <th>م</th>
            <th>اسم المشترك</th>
            <th>العنوان</th>
            <th>كود الاشتراك</th>
            <th>شاسية العداد</th>
            <th>نوع العداد</th>
            <th>قدرة العداد</th>
            <th>رقم اللوحة</th>
            <th>سبب الرفع</th>
            <th>الحالة</th>
            <th>تاريخ الرفع</th>
            <th>تاريخ الإصلاح</th>
            <th>تاريخ الرجوع للتركيب</th>
            <th>إجراءات</th>
        </tr>
    `;

        if (repairedMeters.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="16" style="text-align: center;">لا توجد بيانات لعرضها.</td></tr>`;
            return;
        }

        repairedMeters.forEach(meter => {
            const row = document.createElement('tr');

            // Determine which dates to display based on the repair status
            let repairDateDisplay = meter.repairDate || 'لا يوجد';
            let reinstallationDateDisplay = meter.reinstallationDate || 'لا يوجد';

            if (meter.repairStatus === 'تم تغير العداد') {
                repairDateDisplay = meter.installationDateForReplacement || 'لا يوجد';
                reinstallationDateDisplay = meter.installationDateForReplacement || 'لا يوجد';
            }

            row.innerHTML = `
            <td style="white-space: nowrap;">${meter.accountRefF || ''}</td>
            <td style="white-space: nowrap;">${meter.accountRefH || ''}</td>
            <td style="white-space: nowrap;">${meter.accountRefY || ''}</td>
            <td style="white-space: nowrap;">${meter.accountRefM || ''}</td>
            <td style="white-space: nowrap;">${meter.subscriberName || ''}</td>
            <td style="white-space: nowrap;">${meter.address || ''}</td>
            <td style="white-space: nowrap;">${meter.subscriptionCode || ''}</td>
            <td style="white-space: nowrap;">${meter.meterChassisNumber || ''}</td>
            <td style="white-space: nowrap;">${meter.meterType || ''}</td>
            <td style="white-space: nowrap;">${meter.meterCapacity || ''}</td>
            <td style="white-space: nowrap;">${meter.panelNumber || ''}</td>
            <td style="white-space: nowrap;">${meter.removalReason || ''}</td>
            <td style="white-space: nowrap;">${meter.subscriberType || ''}</td>
            <td style="white-space: nowrap;">${meter.removalDate || ''}</td>
            <td style="white-space: nowrap;">${repairDateDisplay}</td>
            <td style="white-space: nowrap;">${reinstallationDateDisplay}</td>
            <td class="actions-cell">
                <div class="actions-inline">
                    ${hasButtonPermission('view_button') ? `<button class="action-btn view btn-view-details" data-id="${meter.id}" title="عرض التفاصيل"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></button>` : ''}
                    ${hasButtonPermission('edit_button') ? `<button class="action-btn edit btn-edit-details" data-id="${meter.id}" title="تعديل"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>` : ''}
                    ${hasButtonPermission('delete_button') ? `<button class="action-btn delete btn-delete" data-id="${meter.id}" title="حذف"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2"></path></svg></button>` : ''}
                </div>
            </td>
        `;
            tableBody.appendChild(row);
        });
    };

    const handleFaultyMeterSearch = (event: Event) => {
        event.preventDefault();
        const name = (document.getElementById('search-subscriberName') as HTMLInputElement).value.trim();
        const code = (document.getElementById('search-subscriptionCode') as HTMLInputElement).value.trim();
        const chassis = (document.getElementById('search-meterChassisNumber') as HTMLInputElement).value.trim();

        const results = state.meters.filter(m =>
            m.subscriberType === 'مرفوع أعطال' &&
            (!name || m.subscriberName.includes(name)) &&
            (!code || m.subscriptionCode.includes(code)) &&
            (!chassis || m.meterChassisNumber.includes(chassis))
        );
        renderFaultyMeterSearchResults(results);
    };

    const renderFaultyMeterSearchResults = (results: DataItem[]) => {
        const resultsContainer = document.getElementById('repair-search-results')!;
        const tableBody = resultsContainer.querySelector('tbody')!;

        tableBody.innerHTML = '';
        if (results.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">لم يتم العثور على عدادات مطابقة.</td></tr>';
        } else {
            results.forEach(meter => {
                const row = document.createElement('tr');
                row.innerHTML = `
                <td>${meter.subscriberName}</td>
                <td>${meter.subscriptionCode}</td>
                <td>${meter.address}</td>
                <td>${meter.meterChassisNumber}</td>
                 <td class="actions-cell"><button class="btn btn-repair" data-id="${meter.id}">تسجيل إصلاح</button></td>
            `;
                tableBody.appendChild(row);
            });
        }

        resultsContainer.classList.remove('hidden');
        document.querySelectorAll('#repair-search-results .btn-repair').forEach(button => {
            button.addEventListener('click', (e) => {
                const meterId = parseInt((e.currentTarget as HTMLElement).dataset.id!, 10);
                openRepairForm(meterId);
            });
        });
    };

    const openRepairForm = (meterId: number) => {
        const meter = state.meters.find(m => m.id === meterId);
        if (!meter) return;

        const form = document.getElementById('repair-form') as HTMLFormElement;
        clearFormErrors(form);

        document.getElementById('repair-search-results')?.classList.add('hidden');
        document.getElementById('repair-form-container')?.classList.remove('hidden');

        // Ensure repair-meterSupplyCompany field exists
        let supplyCompanySelect = document.getElementById('repair-meterSupplyCompany') as HTMLSelectElement;
        if (!supplyCompanySelect) {
            const replacementContainer = document.getElementById('replacement-fields-container');
            if (replacementContainer) {
                const div = document.createElement('div');
                div.className = 'input-group';
                div.innerHTML = `
                <label for="repair-meterSupplyCompany">شركة توريد العداد</label>
                <select id="repair-meterSupplyCompany"></select>
            `;
                replacementContainer.appendChild(div);
                supplyCompanySelect = div.querySelector('select') as HTMLSelectElement;
            }
        }

        (document.getElementById('repair-meter-id') as HTMLInputElement).value = String(meter.id);
        document.getElementById('repair-subscriberName')!.textContent = meter.subscriberName;
        document.getElementById('repair-meterChassisNumber')!.textContent = meter.meterChassisNumber;

        populateSelect(document.getElementById('repairStatus') as HTMLSelectElement, state.settings.repairStatuses, 'اختر حالة الإصلاح...');
        populateSelect(document.getElementById('repair-installedBy') as HTMLSelectElement, state.settings.technicians, 'اختر القائم بالتركيب...');
        populateSelect(supplyCompanySelect, state.settings.meterSupplyCompanies, 'اختر شركة التوريد...');

        // Reset fields
        (document.getElementById('repair-newMeterChassisNumber') as HTMLInputElement).value = '';
        (document.getElementById('repair-installationDate') as HTMLInputElement).value = '';
        const repairDateInput = document.getElementById('repair-repairDate') as HTMLInputElement;
        const reinstallationDateInput = document.getElementById('repair-reinstallationDate') as HTMLInputElement;
        const newChassisInput = document.getElementById('repair-newMeterChassisNumber') as HTMLInputElement;
        const installationDateInput = document.getElementById('repair-installationDate') as HTMLInputElement;

        const formTitle = document.querySelector('#repair-form-container h3')!;

        formTitle.textContent = 'تسجيل عملية إصلاح';
        setPageTitle('تسجيل عملية إصلاح');
        updateRepairFormVisibility();
    };

    const updateRepairFormVisibility = () => {
        const status = (document.getElementById('repairStatus') as HTMLSelectElement).value;
        const replacementFieldsContainer = document.getElementById('replacement-fields-container')!;
        const newChassisInput = document.getElementById('repair-newMeterChassisNumber') as HTMLInputElement;
        const installationDateInput = document.getElementById('repair-installationDate') as HTMLInputElement;
        const installedBySelect = document.getElementById('repair-installedBy') as HTMLSelectElement;
        const supplyCompanySelect = document.getElementById('repair-meterSupplyCompany') as HTMLSelectElement;

        const showReplacementFields = status === 'تم تغير العداد';
        replacementFieldsContainer.classList.toggle('hidden', !showReplacementFields);
        newChassisInput.required = showReplacementFields;
        installationDateInput.required = showReplacementFields;
        installedBySelect.required = showReplacementFields;
        if (supplyCompanySelect) {
            supplyCompanySelect.required = showReplacementFields;
            supplyCompanySelect.closest('.input-group')?.classList.remove('hidden');
        }

        const repairedFieldsContainer = document.getElementById('repaired-fields-container')!;
        const repairDateInput = document.getElementById('repair-repairDate') as HTMLInputElement;
        const reinstallationDateInput = document.getElementById('repair-reinstallationDate') as HTMLInputElement;

        const showRepairedFields = status === 'تم الإصلاح';
        repairedFieldsContainer.classList.toggle('hidden', !showRepairedFields);
        repairDateInput.required = showRepairedFields;
        reinstallationDateInput.required = showRepairedFields;
    };

    const handleRepairFormSubmit = (event: Event) => {
        event.preventDefault();
        const form = event.target as HTMLFormElement;
        if (!validateForm(form)) {
            showToast('يرجى تصحيح الحقول المطلوبة.', 'error');
            return;
        }

        const meterId = parseInt((document.getElementById('repair-meter-id') as HTMLInputElement).value, 10);
        const repairStatus = (document.getElementById('repairStatus') as HTMLSelectElement).value;

        const meterIndex = state.meters.findIndex(m => m.id === meterId);
        if (meterIndex === -1) return;

        const originalMeter = state.meters[meterIndex];
        originalMeter.repairStatus = repairStatus;

        if (repairStatus === 'تم تغير العداد') {
            const newChassisNumber = (document.getElementById('repair-newMeterChassisNumber') as HTMLInputElement).value;
            const installationDate = (document.getElementById('repair-installationDate') as HTMLInputElement).value;
            const installedBy = (document.getElementById('repair-installedBy') as HTMLSelectElement).value;
            const supplyCompany = (document.getElementById('repair-meterSupplyCompany') as HTMLSelectElement).value;

            originalMeter.subscriberType = 'تم استبداله';
            originalMeter.newMeterChassisNumberForReplacement = newChassisNumber;
            originalMeter.installationDateForReplacement = installationDate;

            // Create a new meter record
            const newMeter: DataItem = {
                ...originalMeter, // Copy all original data
                id: Date.now(), // New unique ID
                meterChassisNumber: newChassisNumber, // The new chassis
                subscriberType: 'جديد', // Set status to new
                installationStatus: 'استبدال عداد تالف', // Set installation status for clarity
                installationDate: installationDate,
                installedBy: installedBy,
                meterSupplyCompany: supplyCompany,
                // Clear fields related to the old meter's removal and repair
                repairStatus: undefined,
                newMeterChassisNumberForReplacement: undefined,
                installationDateForReplacement: undefined,
                removalDate: undefined,
                removedBy: undefined,
                removalReason: undefined,
                readingAtRemoval: undefined,
            };

            state.meters.push(newMeter);
            logActivity('تغيير عداد (إصلاح)', `تسجيل عداد جديد كبديل للمشترك "${originalMeter.subscriberName}".`, `شاسية جديد: ${newChassisNumber}`);

        } else if (repairStatus === 'تم الإصلاح') {
            originalMeter.subscriberType = 'تم الإصلاح';
            const repairDate = (document.getElementById('repair-repairDate') as HTMLInputElement).value;
            const reinstallationDate = (document.getElementById('repair-reinstallationDate') as HTMLInputElement).value;
            originalMeter.repairDate = repairDate;
            originalMeter.reinstallationDate = reinstallationDate;
            // You might want to add fields for repair date here if needed
        } else if (repairStatus === 'لا يمكن إصلاحه') {
            originalMeter.subscriberType = 'لا يمكن إصلاحه';
        }

        logActivity('تسجيل عملية إصلاح', `تحديث حالة إصلاح العداد "${originalMeter.meterChassisNumber}"`, `الحالة الجديدة: ${repairStatus}`);
        saveState();
        renderRepairedMetersSection();
    };

    // --- سجل نشاط المستخدمين ---
    const handleClearActivityLog = () => {
        if (!loggedInUser || (loggedInUser.role !== 'admin' && loggedInUser.username !== 'admin')) {
            showToast('غير مسموح لك بتنفيذ هذا الإجراء.', 'error');
            return;
        }

        const onConfirm = async () => {
            state.activityLog = [];
            logActivity('تصفير السجل', `تم مسح سجل النشاط بالكامل بواسطة ${loggedInUser?.fullName}`);
            await saveState();
            renderActivityLogSection();
            showToast('تم تصفير سجل النشاط بنجاح.');
        };

        showConfirmationDialog(
            'تأكيد تصفير السجل',
            'هل أنت متأكد من رغبتك في حذف جميع سجلات النشاط؟ لا يمكن التراجع عن هذا الإجراء.',
            onConfirm
        );
    };

    const renderActivityLogSection = () => {
        // Populate filters
        const userFilterSelect = document.getElementById('activity-log-user-filter') as HTMLSelectElement;
        const actionFilterSelect = document.getElementById('activity-log-action-filter') as HTMLSelectElement;
        const form = document.getElementById('activity-log-filter-form') as HTMLFormElement;

        // Populate users
        populateSelect(userFilterSelect, state.users.map(u => u.fullName), true);

        // Populate actions
        const uniqueActions = [...new Set(state.activityLog.map(log => log.action))];
        populateSelect(actionFilterSelect, uniqueActions, true);

        // Inject Clear Button if not exists
        const printBtn = document.getElementById('print-activity-log-btn');
        if (printBtn && !document.getElementById('clear-activity-log-btn')) {
            const clearBtn = document.createElement('button');
            clearBtn.id = 'clear-activity-log-btn';
            clearBtn.className = 'btn btn-delete';
            clearBtn.style.marginRight = '10px';
            clearBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2"></path></svg> تصفير السجل`;

            clearBtn.onclick = handleClearActivityLog;

            // Only show for admin
            if (loggedInUser?.role !== 'admin' && loggedInUser?.username !== 'admin') {
                clearBtn.style.display = 'none';
            }

            printBtn.parentNode?.insertBefore(clearBtn, printBtn);
        }

        // Inject Text Search Filter if not exists
        if (form && !document.getElementById('activity-log-text-filter')) {
            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.id = 'activity-log-text-filter';
            textInput.placeholder = 'بحث في التفاصيل...';
            textInput.style.padding = '8px';
            textInput.style.margin = '0 10px';
            textInput.style.border = '1px solid #ccc';
            textInput.style.borderRadius = '4px';
            form.insertBefore(textInput, form.firstChild);
        }

        // Inject Time Filters if not exists
        const dateFromInput = document.getElementById('activity-log-date-from');
        if (dateFromInput && !document.getElementById('activity-log-time-from')) {
            const timeInput = document.createElement('input');
            timeInput.type = 'time';
            timeInput.id = 'activity-log-time-from';
            timeInput.style.marginLeft = '5px';
            timeInput.style.padding = '8px';
            timeInput.style.border = '1px solid #ccc';
            timeInput.style.borderRadius = '4px';
            dateFromInput.parentNode?.insertBefore(timeInput, dateFromInput.nextSibling);
        }

        const dateToInput = document.getElementById('activity-log-date-to');
        if (dateToInput && !document.getElementById('activity-log-time-to')) {
            const timeInput = document.createElement('input');
            timeInput.type = 'time';
            timeInput.id = 'activity-log-time-to';
            timeInput.style.marginLeft = '5px';
            timeInput.style.padding = '8px';
            timeInput.style.border = '1px solid #ccc';
            timeInput.style.borderRadius = '4px';
            dateToInput.parentNode?.insertBefore(timeInput, dateToInput.nextSibling);
        }

        // Add submit event listener to the form
        form.removeEventListener('submit', handleActivityLogFilterSubmit); // Prevent duplicate listeners
        form.addEventListener('submit', handleActivityLogFilterSubmit);

        // Reset date filters on first render of the section
        (document.getElementById('activity-log-date-from') as HTMLInputElement).value = '';
        (document.getElementById('activity-log-date-to') as HTMLInputElement).value = '';
        const timeFromEl = document.getElementById('activity-log-time-from') as HTMLInputElement;
        if (timeFromEl) timeFromEl.value = '';
        const timeToEl = document.getElementById('activity-log-time-to') as HTMLInputElement;
        if (timeToEl) timeToEl.value = '';

        // Initial render
        applyAndRenderActivityLog();
    };

    const handleActivityLogFilterSubmit = (event: Event) => {
        event.preventDefault();
        applyAndRenderActivityLog();
    };

    const applyAndRenderActivityLog = () => {
        const userFilter = (document.getElementById('activity-log-user-filter') as HTMLSelectElement).value;
        const actionFilter = (document.getElementById('activity-log-action-filter') as HTMLSelectElement).value;
        const dateFromFilter = (document.getElementById('activity-log-date-from') as HTMLInputElement).value;
        const dateToFilter = (document.getElementById('activity-log-date-to') as HTMLInputElement).value;
        const timeFromFilter = (document.getElementById('activity-log-time-from') as HTMLInputElement)?.value;
        const timeToFilter = (document.getElementById('activity-log-time-to') as HTMLInputElement)?.value;
        const textFilterInput = document.getElementById('activity-log-text-filter') as HTMLInputElement;
        const textFilter = textFilterInput ? textFilterInput.value.toLowerCase() : '';

        const normalize = (str: string) => String(str).replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]).replace(/[\u200E\u200F]/g, '');

        const parseLogDate = (timestamp: string): Date | null => {
            const norm = normalize(timestamp);
            const dateMatch = norm.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (!dateMatch) return null;

            const date = new Date(parseInt(dateMatch[3]), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[1]));

            const timeMatch = norm.match(/(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s*(AM|PM|ص|م)?/i);
            if (timeMatch) {
                let hours = parseInt(timeMatch[1]);
                const minutes = parseInt(timeMatch[2]);
                const seconds = timeMatch[3] ? parseInt(timeMatch[3]) : 0;
                const period = timeMatch[4] ? timeMatch[4].toLowerCase() : null;

                if (period) {
                    if ((period === 'pm' || period === 'م') && hours < 12) hours += 12;
                    if ((period === 'am' || period === 'ص') && hours === 12) hours = 0;
                }
                date.setHours(hours, minutes, seconds);
            }
            return date;
        };

        let dateFrom: Date | null = null;
        if (dateFromFilter) {
            const parts = dateFromFilter.split('-');
            dateFrom = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            if (timeFromFilter) {
                const [h, m] = timeFromFilter.split(':').map(Number);
                dateFrom.setHours(h, m, 0, 0);
            } else {
                dateFrom.setHours(0, 0, 0, 0);
            }
        }

        let dateTo: Date | null = null;
        if (dateToFilter) {
            const parts = dateToFilter.split('-');
            dateTo = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            if (timeToFilter) {
                const [h, m] = timeToFilter.split(':').map(Number);
                dateTo.setHours(h, m, 59, 999);
            } else {
                dateTo.setHours(23, 59, 59, 999);
            }
        }

        const tableBody = document.querySelector('#activity-log-table tbody')!;
        if (!tableBody) return;

        document.querySelector('#activity-log-table thead')!.innerHTML = `
        <tr>
            <th>التاريخ والوقت</th>
            <th>المستخدم</th>
            <th>الإجراء</th>
            <th>التفاصيل</th>
            <th>ما تم تعديله/حذفه</th>
        </tr>
    `;

        const filteredLogs = state.activityLog.filter(log => {
            const matchUser = !userFilter || log.user === userFilter;
            const matchAction = !actionFilter || log.action === actionFilter;
            const matchText = !textFilter ||
                (log.details && log.details.toLowerCase().includes(textFilter)) ||
                (log.changeSummary && log.changeSummary.toLowerCase().includes(textFilter)) ||
                (log.user && log.user.toLowerCase().includes(textFilter)) ||
                (log.action && log.action.toLowerCase().includes(textFilter));

            const logDate = parseLogDate(log.timestamp);

            const matchDate = (!dateFrom || (logDate && logDate >= dateFrom)) && (!dateTo || (logDate && logDate <= dateTo));

            return matchUser && matchAction && matchDate && matchText;
        });

        tableBody.innerHTML = '';
        if (filteredLogs.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center;">لا يوجد نشاط مسجل يطابق الفلاتر.</td></tr>`;
            return;
        }

        // Sort by timestamp descending before rendering
        filteredLogs.sort((a, b) => {
            const dateA = parseLogDate(a.timestamp);
            const dateB = parseLogDate(b.timestamp);
            return (dateB ? dateB.getTime() : 0) - (dateA ? dateA.getTime() : 0);
        });

        filteredLogs.forEach(log => {
            const row = document.createElement('tr');

            if (log.action.includes('حذف') || log.action.includes('تصفير')) {
                row.classList.add('row-danger');
            } else if (log.action.includes('إضافة') || log.action.includes('إنشاء') || log.action.includes('تسجيل') || log.action.includes('تحصيل') || log.action.includes('تركيب')) {
                row.classList.add('row-success');
            } else if (log.action.includes('تعديل') || log.action.includes('تحديث') || log.action.includes('تغيير') || log.action.includes('تجديد')) {
                row.classList.add('row-warning');
            }

            row.innerHTML = `
            <td>${log.timestamp}</td>
            <td>${log.user}</td>
            <td><span class="status-badge">${log.action}</span></td>
            <td>${log.details}</td>
            <td>${log.changeSummary || 'N/A'}</td>
        `;
            tableBody.appendChild(row);
        });
    };

    // --- إدارة التقارير ---
    const renderReportsSection = () => {
        const form = document.getElementById('report-generation-form') as HTMLFormElement;
        const resultsContainer = document.getElementById('report-results-container');
        if (resultsContainer) resultsContainer.classList.add('hidden');
        if (form) {
            form.reset();
            clearFormErrors(form);
        }

        // Populate report type select with all available options
        const reportTypeSelect = document.getElementById('report-type') as HTMLSelectElement;
        if (!reportTypeSelect) return;

        reportTypeSelect.innerHTML = ''; // Clear existing options

        // Define all possible reports and their required permissions
        const allReportOptions = [
            { value: 'all-meters', text: 'جميع العدادات' },
            { value: 'meters-by-status', text: 'العدادات حسب الحالة' },
            { value: 'technician-activity', text: 'نشاط الفني' },
            { value: 'repairs', text: 'الإصلاحات' },
            { value: 'memos', text: 'المذكرات' },
            { value: 'replacement-report', text: 'تقرير الإحلال' },
            { value: 'mukayasat', text: 'تقرير المعاينات' },
            { value: 'judicial_control', text: 'تقرير الضبطية القضائية' },
            { value: 'judicial_collection_report', text: 'تقرير تحصيل الضبطية' },
            { value: 'zinat_collection_report', text: 'تقرير تحصيل زينات' },
            { value: 'installed_practice_meters', text: 'ممارسات تم تركيب عداد لها' },
            { value: 'transformers', text: 'تقرير بيانات المحولات' },
        ];

        // Filter the options based on the logged-in user's permissions
        const filteredReportOptions = allReportOptions.filter(opt => hasReportPermission(opt.value as keyof typeof state.settings.reportPermissions));

        filteredReportOptions.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option.value;
            opt.textContent = option.text;
            reportTypeSelect.appendChild(opt);
        });

        updateReportFilters();
    }

    const updateReportFilters = () => {
        const reportType = (document.getElementById('report-type') as HTMLSelectElement).value;
        const filtersContainer = document.getElementById('report-filters')!;
        filtersContainer.innerHTML = '';

        let filtersHTML = '';

        const commonFilters = `
        <div class="input-group">
            <label for="filter-date-from">من تاريخ</label>
            <input type="date" id="filter-date-from">
        </div>
        <div class="input-group">
            <label for="filter-date-to">إلى تاريخ</label>
            <input type="date" id="filter-date-to">
        </div>
        <div class="input-group">
            <label for="filter-meterType">نوع العداد</label>
            <div class="custom-multiselect" id="filter-meterType-multiselect">
                <button type="button" class="multiselect-btn" data-placeholder="اختر نوعاً أو أكثر...">اختر نوعاً أو أكثر...</button>
                <div class="multiselect-options hidden"></div>
            </div>
        </div>
        <div class="input-group">
            <label for="filter-technician">الفني</label>
            <select id="filter-technician"></select>
        </div>
        <div class="input-group compound">
            <label>بحث بمرجع الحساب</label>
            <div class="compound-controls">
                <div class="input-group-sub">
                    <label for="filter-accountRefF">ف</label>
                    <input type="text" id="filter-accountRefF">
                </div>
                <div class="input-group-sub">
                    <label for="filter-accountRefH">ح</label>
                    <input type="text" id="filter-accountRefH">
                </div>
                <div class="input-group-sub">
                    <label for="filter-accountRefY">ي</label>
                    <input type="text" id="filter-accountRefY">
                </div>
                <div class="input-group-sub">
                    <label for="filter-accountRefM">م</label>
                    <input type="text" id="filter-accountRefM">
                </div>
            </div>
        </div>
    `;

        switch (reportType) {
            case 'meters-by-status':
                filtersHTML = `
                <div class="input-group">
                    <label for="filter-subscriberType">حالة المشترك</label>
                    <select id="filter-subscriberType"></select>
                </div>
            ` + commonFilters;
                filtersContainer.innerHTML = filtersHTML;
                populateSelect(document.getElementById('filter-subscriberType') as HTMLSelectElement, ['جديد', 'مرفوع أعطال', 'مرفوع إحلال', 'استغناء', 'استبدال', 'هدم', 'تم الإصلاح', 'لا يمكن إصلاحه', 'تم استبداله'], true);
                // Custom multiselect for meterType
                const meterTypeOptionsContainer = document.querySelector('#filter-meterType-multiselect .multiselect-options');
                if (meterTypeOptionsContainer) {
                    meterTypeOptionsContainer.innerHTML = state.settings.meterTypes.map(type => `
                    <label>
                        <input type="checkbox" class="meter-type-checkbox" value="${type}">
                        <span>${type}</span>
                    </label>
                `).join('');
                }
                populateSelect(document.getElementById('filter-technician') as HTMLSelectElement, state.settings.technicians, true);
                break;
            case 'technician-activity':
                filtersHTML = `
                <div class="input-group">
                    <label for="filter-technician">الفني</label>
                    <select id="filter-technician"></select>
                </div>
                <div class="input-group">
                    <label for="filter-date-from">من تاريخ</label>
                    <input type="date" id="filter-date-from">
                </div>
                 <div class="input-group">
                    <label for="filter-date-to">إلى تاريخ</label>
                    <input type="date" id="filter-date-to">
                </div>
                <div class="input-group">
                    <label for="filter-meterType">نوع العداد</label>
                    <select id="filter-meterType"></select>
                </div>
                <div class="input-group">
                    <label for="filter-accountRefY">مرجع الحساب ي</label>
                    <input type="text" id="filter-accountRefY">
                </div>
                <div class="input-group">
                    <label for="filter-accountRefM">مرجع الحساب م</label>
                    <input type="text" id="filter-accountRefM">
                </div>
            `;
                filtersContainer.innerHTML = filtersHTML;
                populateSelect(document.getElementById('filter-technician') as HTMLSelectElement, state.settings.technicians, true);
                const meterTypeOptionsContainerTech = document.querySelector('#filter-meterType-multiselect .multiselect-options');
                if (meterTypeOptionsContainerTech) {
                    meterTypeOptionsContainerTech.innerHTML = state.settings.meterTypes.map(type => `
                    <label>
                        <input type="checkbox" class="meter-type-checkbox" value="${type}">
                        <span>${type}</span>
                    </label>
                `).join('');
                }
                break;
            case 'repairs':
                filtersHTML = `
                <div class="input-group">
                    <label for="filter-repairStatus">حالة الإصلاح</label>
                    <select id="filter-repairStatus"></select>
                </div>
            ` + commonFilters;
                filtersContainer.innerHTML = filtersHTML;
                populateSelect(document.getElementById('filter-repairStatus') as HTMLSelectElement, state.settings.repairStatuses, true);
                const meterTypeOptionsContainerRepairs = document.querySelector('#filter-meterType-multiselect .multiselect-options');
                if (meterTypeOptionsContainerRepairs) {
                    meterTypeOptionsContainerRepairs.innerHTML = state.settings.meterTypes.map(type => `
                    <label>
                        <input type="checkbox" class="meter-type-checkbox" value="${type}">
                        <span>${type}</span>
                    </label>
                `).join('');
                }
                populateSelect(document.getElementById('filter-technician') as HTMLSelectElement, state.settings.technicians, true);
                break;
            case 'memos':
                filtersHTML = `
                <div class="input-group">
                    <label for="filter-memoType">نوع المذكرة</label>
                    <select id="filter-memoType"></select>
                </div>
            ` + commonFilters;
                filtersContainer.innerHTML = filtersHTML;
                populateSelect(document.getElementById('filter-memoType') as HTMLSelectElement, ['إحلال', 'أعطال', 'استبدال', 'هدم'], true);
                const meterTypeOptionsContainerMemos = document.querySelector('#filter-meterType-multiselect .multiselect-options');
                if (meterTypeOptionsContainerMemos) {
                    meterTypeOptionsContainerMemos.innerHTML = state.settings.meterTypes.map(type => `
                    <label>
                        <input type="checkbox" class="meter-type-checkbox" value="${type}">
                        <span>${type}</span>
                    </label>
                `).join('');
                }
                populateSelect(document.getElementById('filter-technician') as HTMLSelectElement, state.settings.technicians, true);
                break;
            case 'mukayasat':
                filtersHTML = `
                <div class="input-group">
                    <label for="filter-date-from">من تاريخ</label>
                    <input type="date" id="filter-date-from">
                </div>
                 <div class="input-group">
                    <label for="filter-date-to">إلى تاريخ</label>
                    <input type="date" id="filter-date-to">
                </div>
                <div class="input-group">
                    <label for="filter-mukayasa-technician">الفني القائم بالمعاينة</label>
                    <select id="filter-mukayasa-technician"></select>
                </div>
                <div class="input-group">
                    <label for="filter-mukayasa-status">حالة الطلب</label>
                    <select id="filter-mukayasa-status"></select>
                </div>
            `;
                filtersContainer.innerHTML = filtersHTML;
                populateSelect(document.getElementById('filter-mukayasa-technician') as HTMLSelectElement, state.settings.technicians, true);
                populateSelect(document.getElementById('filter-mukayasa-status') as HTMLSelectElement, ['قيد المعالجة', 'مكتمل', 'مرفوض'], true);
                break;
            case 'judicial_control':
                filtersHTML = `
                <div class="input-group">
                    <label for="filter-date-from">من تاريخ المحضر</label>
                    <input type="date" id="filter-date-from">
                </div>
                 <div class="input-group">
                    <label for="filter-date-to">إلى تاريخ</label>
                    <input type="date" id="filter-date-to">
                </div>
                <div class="input-group">
                    <label for="filter-judicial-status">حالة المحضر</label>
                    <select id="filter-judicial-status"></select>
                </div>
                <div class="input-group">
                    <label for="filter-judicial-reportType">نوع المخالفة</label>
                    <select id="filter-judicial-reportType">
                        <option value="">الكل</option>
                        <option value="ممارسة">ممارسة</option>
                        <option value="سرقة خلف العداد">سرقة خلف العداد</option>
                    </select>
                </div>
            `;
                filtersContainer.innerHTML = filtersHTML;
                populateSelect(document.getElementById('filter-judicial-status') as HTMLSelectElement, state.settings.judicialControlStatuses, true);
                break;
            case 'judicial_collection_report':
            case 'zinat_collection_report':
                filtersHTML = `
                <div class="input-group">
                    <label for="filter-collector">القائم بالتحصيل</label>
                    <select id="filter-collector"></select>
                </div>
                <div class="input-group">
                    <label for="filter-date-from">من تاريخ</label>
                    <input type="date" id="filter-date-from">
                </div>
                 <div class="input-group">
                    <label for="filter-date-to">إلى تاريخ</label>
                    <input type="date" id="filter-date-to">
                </div>
            `;
                filtersContainer.innerHTML = filtersHTML;
                populateSelect(document.getElementById('filter-collector') as HTMLSelectElement, state.users.map(u => u.fullName), true);
                break;
            case 'installed_practice_meters':
                filtersHTML = `
                <div class="input-group">
                    <label for="filter-date-from">من تاريخ المحضر</label>
                    <input type="date" id="filter-date-from">
                </div>
                 <div class="input-group">
                    <label for="filter-date-to">إلى تاريخ</label>
                    <input type="date" id="filter-date-to">
                </div>
            `;
                filtersContainer.innerHTML = filtersHTML;
                break;
            case 'transformers':
                filtersHTML = `
                <div class="input-group">
                    <label for="filter-transformer-council">المجلس القروي</label>
                    <select id="filter-transformer-council"></select>
                </div>
                <div class="input-group">
                    <label for="filter-transformer-address">العنوان / القرية</label>
                    <select id="filter-transformer-address"></select>
                </div>
                <div class="input-group">
                    <label for="filter-transformer-type">نوع المحول</label>
                    <select id="filter-transformer-type"></select>
                </div>
            `;
                filtersContainer.innerHTML = filtersHTML;
                populateSelect(document.getElementById('filter-transformer-council') as HTMLSelectElement, state.settings.councilNames, true);
                populateSelect(document.getElementById('filter-transformer-address') as HTMLSelectElement, state.settings.addresses, true);
                populateSelect(document.getElementById('filter-transformer-type') as HTMLSelectElement, state.settings.transformerTypes, true);
                break;
            case 'replacement-report':
            case 'all-meters':
            case 'prepaid-meters':
            default:
                filtersHTML = commonFilters;
                filtersContainer.innerHTML = filtersHTML;
                const meterTypeOptionsContainerDefault = document.querySelector('#filter-meterType-multiselect .multiselect-options');
                if (meterTypeOptionsContainerDefault) {
                    meterTypeOptionsContainerDefault.innerHTML = state.settings.meterTypes.map(type => `
                    <label>
                        <input type="checkbox" class="meter-type-checkbox" value="${type}">
                        <span>${type}</span>
                    </label>
                `).join('');
                }
                populateSelect(document.getElementById('filter-technician') as HTMLSelectElement, state.settings.technicians, true);
                break;
        }
    }

    // --- منطق صفحة الطلبات قيد الانتظار ---
    let activePendingTab: string = 'الكل';
    let currentPendingPage: number = 1;
    const pendingRowsPerPage: number = 10; // تقليل عدد الصفوف لسهولة التصفح
    let pendingSelectedRequests: number[] = []; // تتبع المعرفات المحددة

    // --- دالات مساعدة لصفحة الانتظار ---
    const showAddPendingAreaDialog = () => {
        const dialog = document.getElementById('add-pending-area-dialog');
        if (dialog) dialog.hidden = false;
    };

    const hideAddPendingAreaDialog = () => {
        const dialog = document.getElementById('add-pending-area-dialog');
        if (dialog) dialog.hidden = true;
    };

    const handleAddNewPendingAddressTab = () => {
        showAddPendingAreaDialog();
    };

    const confirmAddPendingArea = async () => {
        const input = document.getElementById('new-pending-area-name') as HTMLInputElement;
        const areaName = input?.value.trim();
        if (!areaName) {
            showToast('يرجى إدخال اسم المنطقة', 'error');
            return;
        }
        if (!state.settings.pendingPageAddresses.includes(areaName)) {
            state.settings.pendingPageAddresses.push(areaName);
            await saveState();
            showToast(`تم إضافة المنطقة "${areaName}" بنجاح`);
            renderPendingRequestsSection();
            input.value = ''; // تصفير الحقل بعد الإضافة بنجاح
            hideAddPendingAreaDialog();
        } else {
            showToast('هذه المنطقة موجودة بالفعل', 'error');
        }
    };

    const handleAssignSelectedPendingRequests = async () => {
        // ضمان التعامل مع المعرفات كأرقام لضمان دقة البحث والمقارنة
        const selectedIds = pendingSelectedRequests.map(id => Number(id));

        if (selectedIds.length === 0) {
            showToast('يرجى تحديد طلب واحد على الأقل من الجدول أولاً', 'error');
            return;
        }

        const targetSelect = document.getElementById('assign-target-address-select') as HTMLSelectElement;
        const targetArea = targetSelect?.value;

        if (!targetArea || targetArea === "") {
            showToast('يرجى اختيار المنطقة التي تريد النقل إليها من القائمة المنسدلة أولاً', 'error');
            // تلوين الحقل لتنبيه المستخدم
            targetSelect.style.borderColor = 'var(--error-color)';
            return;
        }

        const onConfirm = async () => {
            const today = new Date().toISOString().split('T')[0];
            let updatedCount = 0;

            state.pendingRequests = state.pendingRequests.map(req => {
                if (selectedIds.includes(Number(req.id))) {
                    updatedCount++;
                    return { ...req, assignedArea: targetArea, lastModifiedDate: today };
                }
                return req;
            });

            logActivity('توزيع طلبات', `تم نقل ${updatedCount} طلب إلى منطقة ${targetArea}`);
            await saveState();
            showToast(`تم بنجاح نقل عدد (${updatedCount}) طلب إلى منطقة "${targetArea}"`, 'success');

            // تصفير المصفوفة وإعادة بناء الواجهة
            pendingSelectedRequests = [];
            renderPendingRequestsSection();
        };

        showConfirmationDialog('تأكيد عملية النقل الجماعي',
            `هل أنت متأكد من نقل ${selectedIds.length} طلب إلى منطقة "${targetArea}"؟`,
            onConfirm);
    };

    const handleDeleteSelectedPendingRequests = async () => {
        const selectedIds = pendingSelectedRequests.map(id => Number(id));

        if (selectedIds.length === 0) {
            showToast('يرجى تحديد طلب واحد على الأقل للحذف', 'error');
            return;
        }

        const onConfirm = async () => {
            const count = selectedIds.length;
            state.pendingRequests = state.pendingRequests.filter(req => !selectedIds.includes(Number(req.id)));

            logActivity('حذف جماعي (انتظار)', `تم حذف ${count} طلب من قائمة الانتظار`);
            await saveState();
            showToast(`تم حذف ${count} طلب بنجاح`);
            pendingSelectedRequests = [];
            renderPendingRequestsSection();
        };

        showConfirmationDialog('تأكيد الحذف النهائي',
            `هل أنت متأكد من حذف ${selectedIds.length} طلب من قائمة الانتظار نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`,
            onConfirm);
    };

    const handleMovePendingToMukayasat = async () => {
        const selectedIds = pendingSelectedRequests.map(id => Number(id));

        if (selectedIds.length === 0) {
            showToast('يرجى تحديد طلب واحد على الأقل أولاً', 'error');
            return;
        }

        const onConfirm = async () => {
            const requestsToMove = state.pendingRequests.filter(req => selectedIds.includes(Number(req.id)));

            const newMukayasat = requestsToMove.map(req => ({
                ...req,
                status: 'تم عمل المعاينة',
                technicianName: '',
                technicalEngineer: '',
                headOfEngineering: '',
                requestType: req.requestType || 'تركيب عداد كودي'
            }));

            state.mukayasat.push(...newMukayasat);
            state.pendingRequests = state.pendingRequests.filter(req => !selectedIds.includes(Number(req.id)));

            logActivity('تحويل طلبات للمقايسات', `تم تحويل ${requestsToMove.length} طلب من الانتظار إلى المقايسات بحالة "تم عمل المعاينة"`);

            await saveState();
            showToast(`تم تحويل ${requestsToMove.length} طلب إلى المقايسات المحفوظة بنجاح`, 'success');

            pendingSelectedRequests = [];
            renderPendingRequestsSection();
        };

        showConfirmationDialog('تأكيد التحويل',
            `هل أنت متأكد من تحويل ${selectedIds.length} طلب إلى قائمة المقايسات وتغيير حالتهم إلى "تم عمل المعاينة"؟ سيتم حذفهم من هذه القائمة.`,
            onConfirm);
    };

    const renderPendingRequestsSection = () => {
        const container = document.getElementById('pending-table-wrapper');
        const tabsContainer = document.getElementById('pending-tabs-container');
        const assignTargetSelect = document.getElementById('assign-target-address-select') as HTMLSelectElement;
        const statusFilterSelect = document.getElementById('filter-pending-status') as HTMLSelectElement;

        if (!container || !tabsContainer) return;

        // تحديث قائمة المناطق في منسدلة النقل
        populateSelect(assignTargetSelect, state.settings.pendingPageAddresses || [], 'اختر منطقة');

        // Populate status filter options if not already populated
        const statusOptions = ['جديد', 'الطلب قيد المعاينة', 'تأكيد بيانات المعاينة وقيد دفع الرسوم', 'قيد دفع الرسوم', 'قيد الانتظار'];
        if (statusFilterSelect && statusFilterSelect.options.length <= 1) { // Check if only "كل الحالات" exists
            populateSelect(statusFilterSelect, statusOptions, 'كل الحالات');
        }

        const nameF = normalizeString((document.getElementById('filter-pending-name') as HTMLInputElement)?.value);
        const addressF = normalizeString((document.getElementById('filter-pending-address') as HTMLInputElement)?.value);
        const nationalIdF = (document.getElementById('filter-pending-nationalId') as HTMLInputElement)?.value || '';
        const mobileF = (document.getElementById('filter-pending-mobile') as HTMLInputElement)?.value || '';
        const typeF = (document.getElementById('filter-pending-type') as HTMLSelectElement)?.value || '';
        const statusF = statusFilterSelect ? statusFilterSelect.value : '';

        // فلترة البيانات بناءً على شريط البحث
        const filteredData = state.pendingRequests.filter(item =>
            (!nameF || normalizeString(item.requesterName).includes(nameF)) &&
            (!addressF || normalizeString(item.address).includes(normalizeString(addressF))) &&
            (!nationalIdF || String(item.nationalId || '').includes(nationalIdF)) &&
            (!mobileF || String(item.mobile || '').includes(mobileF)) &&
            (!typeF || item.requestType === typeF) &&
            (!statusF || normalizeString(item.status) === normalizeString(statusF)) // تطبيق فلتر الحالة الجديد
        );

        // إذا كانت هذه أول عملية رندر بعد تغيير الفلاتر (وليس تغيير التبويب)، نعيد الصفحة لـ 1
        // تم إضافة مستمع الأحداث لضمان ذلك

        // التحكم في التبويبات: نستخدم المناطق المعرفة في الإعدادات فقط لظهور التبويبات التي يرغب بها المستخدم
        const allAddresses = ['الكل', ...(state.settings.pendingPageAddresses || [])];

        // ضمان أن التبويب النشط مازال موجوداً في حال تم حذفه من الإعدادات
        if (activePendingTab !== 'الكل' && !allAddresses.includes(activePendingTab)) {
            activePendingTab = 'الكل';
        }

        // رسم التبويبات
        tabsContainer.innerHTML = allAddresses.map(addr => {
            let count = 0;
            if (addr === 'الكل') {
                // "الكل" هنا يمثل الطلبات التي لم يتم تخصيصها لأي منطقة موجودة في التبويبات (صندوق الوارد)
                count = state.pendingRequests.filter(i =>
                    (!statusF || normalizeString(i.status) === normalizeString(statusF)) &&
                    (!i.assignedArea || i.assignedArea === 'غير محدد' || !state.settings.pendingPageAddresses.includes(i.assignedArea))).length;
            } else {
                count = state.pendingRequests.filter(i =>
                    (!statusF || normalizeString(i.status) === normalizeString(statusF)) &&
                    i.assignedArea === addr).length;
            }

            return `
            <button class="btn ${activePendingTab === addr ? 'primary' : 'secondary'}" 
                    style="white-space: nowrap; padding: 8px 20px; font-size: 0.9rem; border-radius: 20px;" 
                    onclick="window.setActivePendingTab('${addr}')">
                ${addr} 
                <span style="background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 10px; margin-right: 5px; font-size: 0.75rem;">
                    ${count}
                </span>
            </button>
        `;
        }).join('');

        // تصفية البيانات بناءً على التبويب النشط
        const currentDisplayData = activePendingTab === 'الكل'
            ? filteredData.filter(i => !i.assignedArea || i.assignedArea === 'غير محدد' || !state.settings.pendingPageAddresses.includes(i.assignedArea))
            : filteredData.filter(item => normalizeString(item.assignedArea || 'غير محدد') === normalizeString(activePendingTab));

        // منطق التصفح (Pagination)
        const totalPages = Math.ceil(currentDisplayData.length / pendingRowsPerPage);
        const start = (currentPendingPage - 1) * pendingRowsPerPage;
        const paginatedData = currentDisplayData.slice(start, start + pendingRowsPerPage);

        // رسم الجدول
        container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 40px;"><input type="checkbox" id="pending-select-all"></th>
                    <th>رقم الطلب</th>
                    <th>تاريخ الإنشاء</th>
                    <th>تاريخ آخر تعديل</th>
                    <th>حالة الطلب</th>
                    <th>اسم مقدم الطلب</th>
                    <th>عنوان تركيب العداد</th>
                    <th>رقم الموبايل</th>
                </tr>
            </thead>
            <tbody>
                ${paginatedData.length > 0 ? paginatedData.map(item => `
                    <tr>
                        <td><input type="checkbox" class="pending-row-checkbox" value="${item.id}" ${pendingSelectedRequests.includes(item.id) ? 'checked' : ''}></td>
                        <td>${item.requestNumber || '-'}</td>
                        <td>${item.creationDate || '-'}</td>
                        <td>${item.lastModifiedDate || '-'}</td>
                        <td><span class="status-badge bg-info">${item.status || 'قيد الانتظار'}</span></td>
                        <td>${item.requesterName || '-'}</td>
                        <td>${item.address || '-'}</td>
                        <td>${item.mobile || '-'}</td>
                    </tr>
                `).join('') : `<tr><td colspan="8" style="text-align:center;">لا توجد بيانات في تبويب "${activePendingTab}"</td></tr>`}
            </tbody>
        </table>
        ${totalPages > 1 ? `
            <div class="pagination-controls" style="margin-top: 1rem; display: flex; justify-content: center; gap: 10px; align-items: center;">
                <button class="btn secondary" onclick="window.changePendingPage(${currentPendingPage - 1})" ${currentPendingPage === 1 ? 'disabled' : ''}>السابق</button>
                <span>صفحة ${currentPendingPage} من ${totalPages}</span>
                <button class="btn secondary" onclick="window.changePendingPage(${currentPendingPage + 1})" ${currentPendingPage === totalPages ? 'disabled' : ''}>التالي</button>
            </div>
        ` : ''}
    `;

        // تحديث عداد المختارين
        const updateCount = () => {
            const countEl = document.getElementById('pending-selected-count');
            if (countEl) countEl.textContent = `${pendingSelectedRequests.length} طلب محدد`;
        };
        updateCount();

        // إضافة مستمعات أحداث الـ Checkboxes
        document.getElementById('pending-select-all')?.addEventListener('change', (e) => {
            const isChecked = (e.target as HTMLInputElement).checked;
            if (isChecked) {
                pendingSelectedRequests = currentDisplayData.map(item => item.id);
                showToast(`تم تحديد ${pendingSelectedRequests.length} طلبات.`, 'success');
            } else {
                pendingSelectedRequests = [];
            }
            document.querySelectorAll<HTMLInputElement>('.pending-row-checkbox').forEach(cb => {
                cb.checked = isChecked;
            });
            updateCount();
        });

        document.querySelectorAll<HTMLInputElement>('.pending-row-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const id = parseInt((e.target as HTMLInputElement).value, 10);
                if ((e.target as HTMLInputElement).checked) {
                    if (!pendingSelectedRequests.includes(id)) pendingSelectedRequests.push(id);
                } else {
                    pendingSelectedRequests = pendingSelectedRequests.filter(rid => rid !== id);
                }
                updateCount();
            });
        });
    };

    (window as any).setActivePendingTab = (tab: string) => {
        activePendingTab = tab;
        currentPendingPage = 1;
        pendingSelectedRequests = []; // تصفير التحديد عند تغيير التبويب لضمان الدقة
        renderPendingRequestsSection();
    };

    (window as any).changePendingPage = (page: number) => {
        currentPendingPage = page;
        renderPendingRequestsSection();
    };

    const handleImportPendingExcel = async (event: Event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;

        try {
            await ensureSheetJSLoaded();
            const reader = new FileReader();
            reader.onload = async (e) => {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const jsonData: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

                const mappedData = jsonData.map((row, index) => {
                    // دالة للبحث عن قيمة في السطر باستخدام مسميات أعمدة متعددة وبشكل مرن
                    const findValue = (possibleNames: string[]) => {
                        const rowKeys = Object.keys(row);
                        for (const name of possibleNames) {
                            const match = rowKeys.find(k => normalizeString(k) === normalizeString(name));
                            if (match !== undefined) return row[match];
                        }
                        return null;
                    };

                    const mobileVal = findValue(['رقم الموبايل', 'الموبايل', 'رقم الهاتف', 'الهاتف', 'تليفون', 'Mobile', 'Phone']);

                    return {
                        id: Date.now() + index,
                        requestNumber: findValue(['رقم الطلب', 'رقم طلب', 'Request No', 'Request Number']) || '',
                        creationDate: findValue(['تاريخ الإنشاء', 'تاريخ الطلب', 'تاريخ التقديم', 'Creation Date']) || new Date().toISOString().split('T')[0],
                        lastModifiedDate: findValue(['تاريخ آخر تعديل', 'تاريخ التعديل', 'Last Modified']) || new Date().toISOString().split('T')[0],
                        status: findValue(['حالة الطلب', 'الحالة', 'Status']) || 'قيد الانتظار',
                        requesterName: findValue(['اسم مقدم الطلب', 'الاسم', 'الاسم الكامل', 'اسم العميل', 'Name']) || '',
                        address: findValue(['عنوان تركيب العداد', 'العنوان', 'عنوان الموقع', 'Address']) || '',
                        assignedArea: 'غير محدد',
                        mobile: mobileVal !== null ? String(mobileVal).trim() : '',
                        nationalId: findValue(['الرقم القومي', 'رقم البطاقة', 'National ID', 'ID']) || '',
                        requestType: 'تركيب عداد كودي'
                    };
                });

                state.pendingRequests = mappedData;
                await saveState();
                showToast(`تم استيراد ${mappedData.length} طلب بنجاح.`);
                renderPendingRequestsSection();
            };
            reader.readAsArrayBuffer(file);
        } catch (err) {
            showToast('فشل في قراءة ملف الإكسل', 'error');
        }
    };

    const handlePrintPendingRequests = () => {
        const container = document.getElementById('pending-table-wrapper');
        if (!container) return;

        // Re-calculate displayData to ensure we print the correct filtered/tabbed view
        const nameF = (document.getElementById('filter-pending-name') as HTMLInputElement).value.toLowerCase();
        const addressF = (document.getElementById('filter-pending-address') as HTMLInputElement).value.toLowerCase();
        const nationalIdF = (document.getElementById('filter-pending-nationalId') as HTMLInputElement).value;
        const mobileF = (document.getElementById('filter-pending-mobile') as HTMLInputElement).value;
        const typeF = (document.getElementById('filter-pending-type') as HTMLSelectElement).value;
        const statusF = (document.getElementById('filter-pending-status') as HTMLSelectElement).value;

        const filteredData = state.pendingRequests.filter(item =>
            (!nameF || item.requesterName?.toLowerCase().includes(nameF)) &&
            (!addressF || normalizeString(item.address).includes(normalizeString(addressF))) &&
            (!nationalIdF || item.nationalId?.includes(nationalIdF)) &&
            (!mobileF || item.mobile?.includes(mobileF)) &&
            (!typeF || item.requestType === typeF) &&
            (!statusF || item.status === statusF)
        );

        const displayData = activePendingTab === 'الكل'
            ? filteredData
            : filteredData.filter(item => normalizeString(item.assignedArea || 'غير محدد') === normalizeString(activePendingTab));

        if (displayData.length === 0) {
            showToast('لا توجد بيانات لطباعتها.', 'error');
            return;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            showToast('فشل فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة.', 'error');
            return;
        }

        const companyName = state.settings.companyName || 'ELMAGHRABI';
        const printDate = new Date().toLocaleString('ar-EG');
        const logoSrc = state.settings.companyLogo;
        const logoHTML = logoSrc ? `<img src="${logoSrc}" alt="Logo" class="company-logo">` : '';

        const tableRowsHTML = displayData.map(item => `
        <tr>
            <td>${item.requestNumber || '-'}</td>
            <td>${item.creationDate || '-'}</td>
            <td>${item.lastModifiedDate || '-'}</td>
            <td>${item.status || 'قيد الانتظار'}</td>
            <td>${item.requesterName || '-'}</td>
            <td>${item.address || '-'}</td>
            <td>${item.mobile || '-'}</td>
        </tr>
    `).join('');

        printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>الطلبات قيد الانتظار</title>
            <link rel="stylesheet" href="index.css">
            <style>
                @page { size: A4 landscape; margin: 10mm; }
                body { background-color: #fff; font-family: 'Tajawal', sans-serif; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #000; padding: 5px; text-align: center; font-size: 10pt; }
                th { background-color: #f0f0f0; }
                .print-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                .header-text { text-align: right; flex-grow: 1; }
                .header-text h1 { font-size: 16pt; margin: 0; line-height: 1.2; }
                .header-text h2 { font-size: 12pt; margin: 5px 0 0; font-weight: bold; }
                .header-text p { font-size: 10pt; margin: 5px 0 0; }
                .company-logo { max-width: 100px; max-height: 100px; object-fit: contain; }
                .logo-container { width: 120px; display: flex; justify-content: flex-end; }
            </style>
        </head>
        <body>
            <div class="print-header">
                <div class="header-text">
                    <h1>${companyName}</h1>
                    <h2>الطلبات قيد الانتظار</h2>
                    <p>تاريخ الطباعة: ${printDate}</p>
                </div>
                <div class="logo-container">${logoHTML}</div>
            </div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>رقم الطلب</th>
                        <th>تاريخ الإنشاء</th>
                        <th>تاريخ آخر تعديل</th>
                        <th>حالة الطلب</th>
                        <th>اسم مقدم الطلب</th>
                        <th>عنوان تركيب العداد</th>
                        <th>رقم الموبايل</th>
                    </tr>
                </thead>
                <tbody>${tableRowsHTML}</tbody>
            </table>
        </body>
        </html>
    `);
        printWindow.document.close();
        setTimeout(() => { printWindow.focus(); printWindow.print(); printWindow.close(); }, 500);
    };

    const handleExportPendingRequestsToExcel = async () => {
        try {
            await ensureSheetJSLoaded();
            if (typeof XLSX === 'undefined') {
                throw new Error("مكتبة معالجة Excel (SheetJS) غير محملة.");
            }

            // Re-calculate displayData to ensure we export the correct filtered/tabbed view
            const nameF = (document.getElementById('filter-pending-name') as HTMLInputElement).value.toLowerCase();
            const addressF = (document.getElementById('filter-pending-address') as HTMLInputElement).value.toLowerCase();
            const nationalIdF = (document.getElementById('filter-pending-nationalId') as HTMLInputElement).value;
            const mobileF = (document.getElementById('filter-pending-mobile') as HTMLInputElement).value;
            const typeF = (document.getElementById('filter-pending-type') as HTMLSelectElement).value;
            const statusF = (document.getElementById('filter-pending-status') as HTMLSelectElement).value;

            const filteredData = state.pendingRequests.filter(item =>
                (!nameF || item.requesterName?.toLowerCase().includes(nameF)) &&
                (!addressF || normalizeString(item.address).includes(normalizeString(addressF))) &&
                (!nationalIdF || item.nationalId?.includes(nationalIdF)) &&
                (!mobileF || item.mobile?.includes(mobileF)) &&
                (!typeF || item.requestType === typeF) &&
                (!statusF || item.status === statusF)
            );

            const displayData = activePendingTab === 'الكل'
                ? filteredData
                : filteredData.filter(item => normalizeString(item.assignedArea || 'غير محدد') === normalizeString(activePendingTab));

            if (displayData.length === 0) {
                showToast('لا توجد بيانات لتصديرها.', 'error');
                return;
            }

            const headers = [
                'رقم الطلب', 'تاريخ الإنشاء', 'تاريخ آخر تعديل', 'حالة الطلب',
                'اسم مقدم الطلب', 'عنوان تركيب العداد', 'رقم الموبايل', 'الرقم القومي', 'نوع الطلب'
            ];

            const excelData = displayData.map(item => [
                item.requestNumber || '-',
                item.creationDate || '-',
                item.lastModifiedDate || '-',
                item.status || 'قيد الانتظار',
                item.requesterName || '-',
                item.address || '-',
                item.mobile || '-',
                item.nationalId || '-',
                item.requestType || '-'
            ]);

            const ws = XLSX.utils.aoa_to_sheet([headers, ...excelData]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'الطلبات قيد الانتظار');

            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
            XLSX.writeFile(wb, `الطلبات_قيد_الانتظار_${timestamp}.xlsx`);
            showToast('تم تصدير البيانات إلى Excel بنجاح.');

        } catch (error: any) {
            console.error("Error exporting to Excel:", error);
            showToast(error.message || 'حدث خطأ أثناء تصدير البيانات إلى Excel.', 'error');
        }
    };

    // Helper functions for date parsing
    const normalizeDigits = (str: string) => String(str).replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]);
    const parseDateToISO = (dateStr: string) => {
        if (!dateStr) return '';
        const normalized = normalizeDigits(dateStr);
        if (normalized.includes('/')) {
            const parts = normalized.split('/');
            if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        return normalized;
    };

    const handleGenerateReport = (event: Event) => {
        event.preventDefault();
        const form = event.target as HTMLFormElement;
        if (!validateForm(form)) {
            showToast('يرجى تصحيح خيارات التصفية.', 'error');
            return;
        }

        const reportType = (document.getElementById('report-type') as HTMLSelectElement).value;

        // Get common filter values
        const dateFrom = (document.getElementById('filter-date-from') as HTMLInputElement | null)?.value || '';
        const dateTo = (document.getElementById('filter-date-to') as HTMLInputElement | null)?.value || '';
        const meterTypeFilters = Array.from(document.querySelectorAll<HTMLInputElement>('.meter-type-checkbox:checked'))
            .map(cb => cb.value);
        const collectorFilter = (document.getElementById('filter-collector') as HTMLSelectElement | null)?.value || '';

        const technicianFilterEl = document.getElementById('filter-technician') as HTMLSelectElement | null;
        const technicianFilter = technicianFilterEl ? technicianFilterEl.value : '';

        const accountRefFEl = document.getElementById('filter-accountRefF') as HTMLInputElement | null;
        const accountRefF = accountRefFEl ? accountRefFEl.value.trim() : '';
        const accountRefHEl = document.getElementById('filter-accountRefH') as HTMLInputElement | null;
        const accountRefH = accountRefHEl ? accountRefHEl.value.trim() : '';
        const accountRefYEl = document.getElementById('filter-accountRefY') as HTMLInputElement | null;
        const accountRefY = accountRefYEl ? accountRefYEl.value.trim() : '';
        const accountRefMEl = document.getElementById('filter-accountRefM') as HTMLInputElement | null;
        const accountRefM = accountRefMEl ? accountRefMEl.value.trim() : '';

        // Variables for report-specific filters
        let specificStatusFilter: string | null = null;
        let specificRepairStatusFilter: string | null = null;
        let specificMemoTypes: string[] = [];
        let mukayasaStatusFilter: string | null = null;
        let judicialStatusFilter: string | null = null;
        let judicialReportTypeFilter: string | null = null;

        let columns: { key: string, header: string }[] = [];
        let title = '';
        let data: DataItem[] = [];
        let reportSummary: { [key: string]: number } = {};

        switch (reportType) {
            case 'all-meters':
                title = 'تقرير شامل لجميع العدادات';
                columns = [
                    { key: 'subscriberName', header: 'اسم المشترك' },
                    { key: 'address', header: 'العنوان' },
                    { key: 'subscriptionCode', header: 'كود الاشتراك' },
                    { key: 'meterChassisNumber', header: 'شاسية العداد' },
                    { key: 'subscriberType', header: 'الحالة' },
                    { key: 'meterType', header: 'نوع العداد' },
                    { key: 'accountReference', header: 'مرجع الحساب' },
                    { key: 'readingAtRemoval', header: 'القراءة عند الرفع' },
                    { key: 'removalDate', header: 'تاريخ الرفع' },
                    { key: 'installationDate', header: 'تاريخ التركيب' },
                ];
                break;

            case 'meters-by-status': {
                const status = (document.getElementById('filter-subscriberType') as HTMLSelectElement).value;
                let statusWithType = status;
                if (status === 'مرفوع أعطال') {
                    const preliminaryData = state.meters.filter(m => m.subscriberType === status && (meterTypeFilters.length === 0 || meterTypeFilters.includes(m.meterType)));
                    const meterTypesSet = new Set(preliminaryData.map(m => m.meterType));
                    const meterTypesArray = Array.from(meterTypesSet);
                    if (meterTypesArray.length === 1) {
                        statusWithType = `${status} (${meterTypesArray[0]})`;
                    } else if (meterTypesArray.length > 1) {
                        statusWithType = `${status} (${meterTypesArray.join(', ')})`;
                    }
                }
                title = `تقرير العدادات حسب الحالة: ${statusWithType || 'الكل'}`;
                specificStatusFilter = status;

                if (status === 'مرفوع أعطال') {
                    columns = [
                        { key: 'seq', header: 'م' },
                        { key: 'accountRefF', header: 'ف' },
                        { key: 'accountRefH', header: 'ح' },
                        { key: 'accountRefY', header: 'ي' },
                        { key: 'accountRefM', header: 'م' },
                        { key: 'subscriberName', header: 'اسم المشترك' },
                        { key: 'address', header: 'العنوان' },
                        { key: 'subscriptionCode', header: 'كود الاشتراك' },
                        { key: 'meterChassisNumber', header: 'شاسية العداد' },
                        { key: 'meterType', header: 'نوع العداد' },
                        { key: 'meterCapacity', header: 'قدرة العداد' },
                        { key: 'activityType', header: 'نوع النشاط' },
                        { key: 'removalReason', header: 'سبب الرفع' },
                        { key: 'readingAtRemoval', header: 'القراءة عند الرفع' },
                        { key: 'removalDate', header: 'تاريخ الرفع' },
                    ];
                } else if (status === 'مرفوع إحلال') {
                    columns = [
                        { key: 'seq', header: 'م' },
                        { key: 'accountRefF', header: 'ف' },
                        { key: 'accountRefH', header: 'ح' },
                        { key: 'accountRefY', header: 'ي' },
                        { key: 'accountRefM', header: 'م' },
                        { key: 'subscriberName', header: 'اسم المشترك' },
                        { key: 'address', header: 'العنوان' },
                        { key: 'subscriptionCode', header: 'كود الاشتراك' },
                        { key: 'meterChassisNumber', header: 'شاسية العداد' },
                        { key: 'meterType', header: 'نوع العداد' },
                        { key: 'activityType', header: 'نوع النشاط' },
                        { key: 'panelNumber', header: 'رقم اللوحة' },
                        { key: 'meterCapacity', header: 'قدرة العداد' },
                        { key: 'readingAtRemoval', header: 'القراءة' },
                        { key: 'newMeterChassisNumber', header: 'شاسية العداد الجديد' },
                        { key: 'removalDate', header: 'تاريخ الاحلال' },
                        { key: 'installationDate', header: 'تاريخ تركيب العداد الجديد' },
                    ];
                } else if (status === 'جديد') {
                    columns = [
                        { key: 'subscriberName', header: 'اسم المشترك' },
                        { key: 'address', header: 'العنوان' },
                        { key: 'subscriptionCode', header: 'كود الاشتراك' },
                        { key: 'meterChassisNumber', header: 'شاسية العداد' },
                        { key: 'meterType', header: 'نوع العداد' },
                        { key: 'meterCapacity', header: 'قدرة العداد' },
                        { key: 'panelNumber', header: 'رقم اللوحة' },
                        { key: 'activityType', header: 'نوع النشاط' },
                        { key: 'accountReference', header: 'مرجع الحساب' },
                        { key: 'installationDate', header: 'تاريخ التركيب' },
                    ];
                } else if (status === 'تم الإصلاح' || status === 'تم استبداله') {
                    columns = [
                        { key: 'subscriberName', header: 'اسم المشترك' },
                        { key: 'address', header: 'العنوان' },
                        { key: 'subscriptionCode', header: 'كود الاشتراك' },
                        { key: 'meterChassisNumber', header: 'شاسية العداد' },
                        { key: 'meterType', header: 'نوع العداد' },
                        { key: 'accountReference', header: 'مرجع الحساب' },
                        { key: 'removalReason', header: 'سبب الرفع' },
                        { key: 'subscriberType', header: 'الحالة' },
                        { key: 'reinstallationDate', header: 'تاريخ الرجوع للتركيب' },
                        { key: 'installationDateForReplacement', header: 'تاريخ تركيب البديل' },
                    ];
                } else if (status === 'استبدال') {
                    columns = [
                        { key: 'subscriberName', header: 'اسم المشترك' },
                        { key: 'address', header: 'العنوان' },
                        { key: 'subscriptionCode', header: 'كود الاشتراك' },
                        { key: 'meterChassisNumber', header: 'شاسية العداد القديم' },
                        { key: 'newMeterChassisNumber', header: 'شاسية العداد الجديد' },
                        { key: 'meterType', header: 'نوع العداد' },
                        { key: 'accountReference', header: 'مرجع الحساب' },
                        { key: 'removalDate', header: 'تاريخ الرفع' },
                        { key: 'installationDate', header: 'تاريخ التركيب' },
                    ];
                } else {
                    columns = [
                        { key: 'subscriberName', header: 'اسم المشترك' },
                        { key: 'address', header: 'العنوان' },
                        { key: 'subscriptionCode', header: 'كود الاشتراك' },
                        { key: 'meterChassisNumber', header: 'شاسية العداد' },
                        { key: 'meterType', header: 'نوع العداد' },
                        { key: 'accountReference', header: 'مرجع الحساب' },
                        { key: 'readingAtRemoval', header: 'القراءة عند الرفع' },
                        { key: 'removalDate', header: 'تاريخ الرفع' },
                        { key: 'installationDate', header: 'تاريخ التركيب' },
                    ];
                }
                break;
            }

            case 'replacement-report':
                title = 'عدادات الإحلال';
                specificStatusFilter = 'مرفوع إحلال';
                columns = [
                    { key: 'seq', header: 'م' },
                    { key: 'accountRefF', header: 'ف' },
                    { key: 'accountRefH', header: 'ح' },
                    { key: 'accountRefY', header: 'ي' },
                    { key: 'accountRefM', header: 'م' },
                    { key: 'subscriberName', header: 'اسم المشترك' },
                    { key: 'address', header: 'العنوان' },
                    { key: 'subscriptionCode', header: 'كود الاشتراك' },
                    { key: 'meterChassisNumber', header: 'شاسية العداد' },
                    { key: 'meterType', header: 'نوع العداد' },
                    { key: 'activityType', header: 'نوع النشاط' },
                    { key: 'panelNumber', header: 'رقم اللوحة' },
                    { key: 'meterCapacity', header: 'قدرة العداد' },
                    { key: 'readingAtRemoval', header: 'القراءة' },
                    { key: 'newMeterChassisNumber', header: 'شاسية العداد الجديد' },
                    { key: 'removalDate', header: 'تاريخ الاحلال' },
                    { key: 'installationDate', header: 'تاريخ تركيب العداد الجديد' },
                ];
                break;

            case 'technician-activity':
                {
                    const tech = (document.getElementById('filter-technician') as HTMLSelectElement).value;
                    title = `تقرير نشاط الفني: ${tech || 'الكل'}`;
                }
                columns = [
                    { key: 'seq', header: 'م' },
                    { key: 'subscriberName', header: 'اسم المشترك' },
                    { key: 'address', header: 'العنوان' },
                    { key: 'meterChassisNumber', header: 'شاسية العداد' },
                    { key: 'subscriberType', header: 'الحالة' },
                    { key: 'action', header: 'نوع الإجراء' },
                    { key: 'actionDate', header: 'تاريخ الإجراء' },
                    { key: 'technician', header: 'الفني' },
                ];
                break;

            case 'repairs':
                const repairStatus = (document.getElementById('filter-repairStatus') as HTMLSelectElement).value;
                title = `تقرير الإصلاحات حسب الحالة: ${repairStatus || 'الكل'}`;
                specificRepairStatusFilter = repairStatus;
                if (repairStatus === 'تم الإصلاح') {
                    columns = [
                        { key: 'seq', header: 'م' },
                        { key: 'accountRefF', header: 'ف' },
                        { key: 'accountRefH', header: 'ح' },
                        { key: 'accountRefY', header: 'ي' },
                        { key: 'accountRefM', header: 'م' },
                        { key: 'subscriberName', header: 'اسم المشترك' },
                        { key: 'subscriptionCode', header: 'كود المشترك' },
                        { key: 'address', header: 'العنوان' },
                        { key: 'meterChassisNumber', header: 'شاسية العداد الأصلي' },
                        { key: 'meterType', header: 'نوع العداد' },
                        { key: 'meterCapacity', header: 'قدرة العداد' },
                        { key: 'panelNumber', header: 'رقم اللوحة' },
                        { key: 'removalReason', header: 'سبب الرفع' },
                        { key: 'removalDate', header: 'تاريخ الرفع' },
                        { key: 'repairStatus', header: 'حالة الإصلاح' },
                        { key: 'reinstallationDate', header: 'تاريخ الرجوع للتركيب' },
                    ];
                } else if (repairStatus === 'تم تغير العداد') {
                    columns = [
                        { key: 'seq', header: 'م' },
                        { key: 'accountRefF', header: 'ف' },
                        { key: 'accountRefH', header: 'ح' },
                        { key: 'accountRefY', header: 'ي' },
                        { key: 'accountRefM', header: 'م' },
                        { key: 'subscriberName', header: 'اسم المشترك' },
                        { key: 'subscriptionCode', header: 'كود المشترك' },
                        { key: 'address', header: 'العنوان' },
                        { key: 'meterChassisNumber', header: 'شاسية العداد الأصلي' },
                        { key: 'removalDate', header: 'تاريخ الرفع' },
                        { key: 'repairStatus', header: 'حالة الإصلاح' },
                        { key: 'newMeterChassisNumberForReplacement', header: 'شاسية العداد الجديد' },
                        { key: 'installationDateForReplacement', header: 'تاريخ التركيب' },
                    ];
                }
                break;
            case 'showMeterReport':
                title = 'تقرير جميع العدادات';
                columns = [
                    { key: 'subscriberName', header: 'اسم المشترك' },
                    { key: 'address', header: 'العنوان' },
                    { key: 'subscriptionCode', header: 'كود الاشتراك' },
                    { key: 'meterChassisNumber', header: 'شاسية العداد' },
                    { key: 'subscriberType', header: 'الحالة' },
                    { key: 'meterType', header: 'نوع العداد' },
                    { key: 'accountReference', header: 'مرجع الحساب' },
                    { key: 'readingAtRemoval', header: 'القراءة عند الرفع' },
                    { key: 'removalDate', header: 'تاريخ الرفع' },
                    { key: 'installationDate', header: 'تاريخ التركيب' },
                ];
                break;
            case 'showSubscriptionReport':
                title = 'تقرير المشتركين';
                columns = [
                    { key: 'subscriberName', header: 'اسم المشترك' },
                    { key: 'address', header: 'العنوان' },
                    { key: 'subscriptionCode', header: 'كود الاشتراك' },
                    { key: 'accountReference', header: 'مرجع الحساب' },
                    { key: 'activityType', header: 'نوع النشاط' },
                    { key: 'subscriptionType', header: 'نوع الاشتراك' },
                ];
                break;
            case 'showPaymentReport':
                title = 'تقرير المدفوعات';
                data = []; // Dummy data, as payments are not implemented
                columns = [
                    { key: 'subscriberName', header: 'اسم المشترك' },
                    { key: 'paymentAmount', header: 'مبلغ الدفع' },
                    { key: 'paymentDate', header: 'تاريخ الدفع' },
                    { key: 'paymentMethod', header: 'طريقة الدفع' },
                ];
                break;
            case 'showInvoiceReport':
                title = 'تقرير الفواتير';
                data = []; // Dummy data, as invoices are not implemented
                columns = [
                    { key: 'subscriberName', header: 'اسم المشترك' },
                    { key: 'invoiceNumber', header: 'رقم الفاتورة' },
                    { key: 'invoiceAmount', header: 'مبلغ الفاتورة' },
                    { key: 'invoiceDate', header: 'تاريخ الفاتورة' },
                ];
                break;
            case 'showConsumptionReport':
                title = 'تقرير الاستهلاك';
                data = []; // Dummy data, as consumption is not implemented
                columns = [
                    { key: 'subscriberName', header: 'اسم المشترك' },
                    { key: 'consumptionAmount', header: 'كمية الاستهلاك' },
                    { key: 'consumptionPeriod', header: 'فترة الاستهلاك' },
                    { key: 'meterReading', header: 'قراءة العداد' },
                ];
                break;
            case 'memos':
                const memoType = (document.getElementById('filter-memoType') as HTMLSelectElement).value;
                title = `تقرير المذكرات: ${memoType || 'الكل'}`;
                if (memoType === 'أعطال' && meterTypeFilters.length > 0) {
                    title += ` (${meterTypeFilters.join(', ')})`;
                }
                if (memoType === 'إحلال' && meterTypeFilters.length > 0) {
                    title += ` (${meterTypeFilters.join(', ')})`;
                }
                let subscriberTypes: string[] = [];
                if (memoType === 'إحلال') subscriberTypes = ['مرفوع إحلال'];
                else if (memoType === 'أعطال') subscriberTypes = ['مرفوع أعطال'];
                else if (memoType === 'استبدال') subscriberTypes = ['استبدال'];
                else if (memoType === 'هدم') subscriberTypes = ['هدم'];
                else subscriberTypes = ['مرفوع إحلال', 'مرفوع أعطال', 'استبدال', 'هدم']; specificMemoTypes = subscriberTypes;
                if (memoType === 'أعطال') {
                    columns = [
                        { key: 'seq', header: 'م' },
                        { key: 'accountRefF', header: 'ف' },
                        { key: 'accountRefH', header: 'ح' },
                        { key: 'accountRefY', header: 'ي' },
                        { key: 'accountRefM', header: 'م' },
                        { key: 'subscriberName', header: 'اسم المشترك' },
                        { key: 'address', header: 'العنوان' },
                        { key: 'subscriptionCode', header: 'كود الاشتراك' },
                        { key: 'meterChassisNumber', header: 'شاسية العداد' },
                        { key: 'subscriberType', header: 'نوع المذكرة' },
                        { key: 'panelNumber', header: 'رقم اللوحة' },
                        { key: 'meterType', header: 'نوع العداد' },
                        { key: 'meterCapacity', header: 'قدرة العداد' },
                        { key: 'removalReason', header: 'سبب الرفع' },
                        { key: 'removalDate', header: 'تاريخ الرفع' },
                    ];
                } else if (memoType === 'إحلال') {
                    columns = [
                        { key: 'accountRefF', header: 'ف' },
                        { key: 'accountRefH', header: 'ح' },
                        { key: 'accountRefY', header: 'ي' },
                        { key: 'accountRefM', header: 'م' },
                        { key: 'subscriberName', header: 'اسم المشترك' },
                        { key: 'address', header: 'العنوان' },
                        { key: 'subscriptionCode', header: 'كود الاشتراك' },
                        { key: 'meterChassisNumber', header: 'شاسية العداد' },
                        { key: 'panelNumber', header: 'رقم اللوحة' },
                        { key: 'activityType', header: 'نوع النشاط' },
                        { key: 'subscriberType', header: 'نوع المذكرة' },
                        { key: 'meterType', header: 'نوع العداد' },
                        { key: 'meterCapacity', header: 'قدرة العداد' },
                        { key: 'newMeterChassisNumber', header: 'شاسية العداد الجديد' },
                        { key: 'removalDate', header: 'تاريخ الإحلال' },
                        { key: 'installationDate', header: 'تاريخ التركيب' },
                    ];
                    // Add sequence column
                    // Move panelNumber after meterChassisNumber
                    const chassisIndex = columns.findIndex(c => c.key === 'meterChassisNumber');
                    if (chassisIndex !== -1) {
                        const panelIdx = columns.findIndex(c => c.key === 'panelNumber');
                        if (panelIdx !== -1) {
                            const panelCol = columns.splice(panelIdx, 1)[0];
                            columns.splice(chassisIndex + 1, 0, panelCol);
                        }
                    }
                    // Add cardStatus column if prepaid meter type is selected
                    if (meterTypeFilters.includes('مسبق الدفع')) {
                        const meterTypeIndex = columns.findIndex(c => c.key === 'meterType');
                        if (meterTypeIndex !== -1) {
                            columns.splice(meterTypeIndex + 1, 0, { key: 'cardStatus', header: 'حالة الكارت' });
                        }
                    }
                    // Add readingAtRemoval column if mechanical or digital meter type is selected
                    if (meterTypeFilters.includes('ميكانيكي') || meterTypeFilters.includes('ديجيتال')) {
                        const newChassisIndex = columns.findIndex(c => c.key === 'newMeterChassisNumber');
                        if (newChassisIndex !== -1) {
                            columns.splice(newChassisIndex + 1, 0, { key: 'readingAtRemoval', header: 'القراءة عند الرفع' });
                        }
                    }
                } else if (memoType === 'هدم') {
                    columns = [
                        { key: 'seq', header: 'م' },
                        { key: 'accountRefF', header: 'ف' },
                        { key: 'accountRefH', header: 'ح' },
                        { key: 'accountRefY', header: 'ي' },
                        { key: 'accountRefM', header: 'م' },
                        { key: 'subscriberName', header: 'اسم المشترك' },
                        { key: 'address', header: 'العنوان' },
                        { key: 'subscriptionCode', header: 'كود الاشتراك' },
                        { key: 'panelNumber', header: 'رقم اللوحة' },
                        { key: 'meterChassisNumber', header: 'شاسية العداد' },
                        { key: 'activityType', header: 'نوع النشاط' },
                        { key: 'subscriberType', header: 'نوع المذكرة' },
                        { key: 'meterType', header: 'نوع العداد' },
                        { key: 'demolitionType', header: 'نوع الهدم' },
                        { key: 'demolitionDate', header: 'تاريخ الهدم' },
                    ];
                } else if (memoType === 'استبدال') {
                    columns = [
                        { key: 'seq', header: 'م' },
                        { key: 'accountRefF', header: 'ف' },
                        { key: 'accountRefH', header: 'ح' },
                        { key: 'accountRefY', header: 'ي' },
                        { key: 'accountRefM', header: 'م' },
                        { key: 'subscriberName', header: 'اسم المشترك' },
                        { key: 'address', header: 'العنوان' },
                        { key: 'subscriptionCode', header: 'كود الاشتراك' },
                        { key: 'meterChassisNumber', header: 'شاسية العداد القديم' },
                        { key: 'newMeterChassisNumber', header: 'شاسية العداد الجديد' },
                        { key: 'meterType', header: 'نوع العداد' },
                        { key: 'removalDate', header: 'تاريخ الرفع' },
                        { key: 'installationDate', header: 'تاريخ التركيب' },
                    ];
                }
                // Common adjustments for all memo types
                if (reportType === 'memos') {


                    // Add cardStatus or readingAtRemoval based on meter type filter
                    const meterTypeIndex = columns.findIndex(c => c.key === 'meterType');
                    if (meterTypeIndex !== -1) {
                        if (meterTypeFilters.includes('مسبق الدفع') && !meterTypeFilters.some(t => ['ميكانيكي', 'ديجيتال'].includes(t))) {
                            // Only prepaid
                            columns.splice(meterTypeIndex + 1, 0, { key: 'cardStatus', header: 'حالة الكارت' });
                        } else if (meterTypeFilters.some(t => ['ميكانيكي', 'ديجيتال'].includes(t)) && !meterTypeFilters.includes('مسبق الدفع')) {
                            // Only mechanical/digital
                            columns.splice(meterTypeIndex + 1, 0, { key: 'readingAtRemoval', header: 'القراءة عند الرفع' });
                        } else {
                            // Mix or no filter, show both
                            columns.splice(meterTypeIndex + 1, 0, { key: 'cardStatus', header: 'حالة الكارت' });
                            columns.splice(meterTypeIndex + 2, 0, { key: 'readingAtRemoval', header: 'القراءة عند الرفع' });
                        }
                    }
                    const chassisIndex = columns.findIndex(c => c.key === 'meterChassisNumber');
                    if (chassisIndex !== -1) {
                        const panelIdx = columns.findIndex(c => c.key === 'panelNumber');
                        if (panelIdx !== -1) {
                            const panelCol = columns.splice(panelIdx, 1)[0];
                            columns.splice(chassisIndex + 1, 0, panelCol);
                        }
                    }
                }
                break;
            case 'mukayasat':
                if (!hasReportPermission('mukayasat')) {
                    showToast('ليس لديك صلاحية لعرض هذا التقرير.', 'error');
                    return;
                }
                title = 'تقرير المعاينات الفنية';
                mukayasaStatusFilter = (document.getElementById('filter-mukayasa-status') as HTMLSelectElement).value;
                columns = [
                    { key: 'seq', header: 'م' },
                    { key: 'requesterName', header: 'اسم مقدم الطلب' },
                    { key: 'requestNumber', header: 'رقم الطلب' },
                    { key: 'address', header: 'العنوان' },
                    { key: 'activityType', header: 'نوع النشاط' },
                    { key: 'technicianName', header: 'الفني' },
                    { key: 'status', header: 'الحالة' },
                ];
                break;
            case 'judicial_control':
                if (!hasReportPermission('judicial_control')) {
                    showToast('ليس لديك صلاحية لعرض هذا التقرير.', 'error');
                    return;
                }
                title = 'تقرير الضبطية القضائية';
                if (dateFrom || dateTo) {
                    title += ` (من: ${dateFrom || 'البداية'} إلى: ${dateTo || 'الآن'})`;
                }
                const statusEl = document.getElementById('filter-judicial-status') as HTMLSelectElement;
                judicialStatusFilter = statusEl ? statusEl.value : '';
                const reportTypeEl = document.getElementById('filter-judicial-reportType') as HTMLSelectElement;
                judicialReportTypeFilter = reportTypeEl ? reportTypeEl.value : '';

                columns = [
                    { key: 'seq', header: 'م' },
                    { key: 'subscriberName', header: 'اسم المخالف' },
                    { key: 'nationalId', header: 'الرقم القومي' },
                    { key: 'address', header: 'العنوان' },
                    { key: 'reportType', header: 'نوع المحضر' },
                    { key: 'reportDate', header: 'تاريخ المحضر' },
                    { key: 'status', header: 'الحالة' },
                    { key: 'reconciliationAmount', header: 'مبلغ التصالح' },
                    { key: 'receiptNumber', header: 'رقم الإيصال' },
                ];
                break;
            case 'judicial_collection_report':
                title = 'تقرير تحصيل الضبطية القضائية';
                if (dateFrom || dateTo) {
                    title += ` (من: ${dateFrom || 'البداية'} إلى: ${dateTo || 'الآن'})`;
                }
                columns = [
                    { key: 'seq', header: 'م' },
                    { key: 'subscriberName', header: 'اسم المخالف' },
                    { key: 'reportType', header: 'نوع المحضر' },
                    { key: 'paymentDate', header: 'تاريخ الدفع' },
                    { key: 'receiptNumber', header: 'رقم الإيصال' },
                    { key: 'amount', header: 'المبلغ' },
                    { key: 'collectedBy', header: 'المحصل' },
                ];
                break;
            case 'zinat_collection_report':
                title = 'تقرير تحصيل زينات';
                if (dateFrom || dateTo) {
                    title += ` (من: ${dateFrom || 'البداية'} إلى: ${dateTo || 'الآن'})`;
                }
                columns = [
                    { key: 'seq', header: 'م' },
                    { key: 'requesterName', header: 'اسم المواطن / المشترك' },
                    { key: 'paymentDate', header: 'تاريخ الدفع' },
                    { key: 'receiptNumber', header: 'رقم الإيصال' },
                    { key: 'amount', header: 'المبلغ' },
                    { key: 'collectedBy', header: 'المحصل' },
                ];
                break;
            case 'installed_practice_meters':
                title = 'تقرير الممارسات التي تم تركيب عداد لها';
                if (dateFrom || dateTo) {
                    title += ` (من: ${dateFrom || 'البداية'} إلى: ${dateTo || 'الآن'})`;
                }
                columns = [
                    { key: 'seq', header: 'م' },
                    { key: 'subscriberName', header: 'اسم المشترك' },
                    { key: 'address', header: 'العنوان' },
                    { key: 'reportDate', header: 'تاريخ المحضر' },
                    { key: 'meterChassisNumber', header: 'شاسية العداد' },
                    { key: 'subscriptionCode', header: 'كود الاشتراك' },
                    { key: 'status', header: 'الحالة' },
                ];
                break;
            case 'transformers':
                if (!hasReportPermission('transformers')) {
                    showToast('ليس لديك صلاحية لعرض هذا التقرير.', 'error');
                    return;
                }
                title = 'تقرير بيانات المحولات والقوى';
                columns = [
                    { key: 'seq', header: 'م' },
                    { key: 'councilName', header: 'المجلس' },
                    { key: 'transformerName', header: 'اسم المحول' },
                    { key: 'transformerAddress', header: 'العنوان' },
                    { key: 'transformerType', header: 'النوع' },
                    { key: 'transformerCapacityKVA', header: 'القدرة (ك.ف.أ)' },
                    { key: 'smartMeterChassis', header: 'شاسية العداد' },
                    { key: 'simCardNumber', header: 'رقم الشريحة' },
                    { key: 'currentTransformerCapacity', header: 'محولات التيار' },
                ];
                break;
        }

        // --- Single-pass Filtering ---
        data = state.meters.filter(m => {
            // Common Filters
            const dates = [m.installationDate, m.removalDate, m.demolitionDate, m.installationDateForReplacement].filter(d => d);
            const inDateRange = (!dateFrom && !dateTo) || dates.some(d => (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo));
            const matchMeterType = meterTypeFilters.length === 0 || meterTypeFilters.includes(m.meterType);
            const techs = [m.installedBy, m.removedBy, m.meterReceivedBy].filter(t => t);
            const matchTech = !technicianFilter || techs.includes(technicianFilter);
            const matchAccountRef = (!accountRefF || m.accountRefF === accountRefF) &&
                (!accountRefH || m.accountRefH === accountRefH) &&
                (!accountRefY || m.accountRefY === accountRefY) &&
                (!accountRefM || m.accountRefM === accountRefM);

            // Report-Specific Filters
            const matchSpecificStatus = !specificStatusFilter || m.subscriberType === specificStatusFilter;
            const matchSpecificRepairStatus = !specificRepairStatusFilter || m.repairStatus === specificRepairStatusFilter;
            const matchMemoType = specificMemoTypes.length === 0 || specificMemoTypes.includes(m.subscriberType);

            return inDateRange && matchMeterType && matchTech && matchAccountRef && matchSpecificStatus && matchSpecificRepairStatus && matchMemoType;
        });

        if (reportType === 'transformers') {
            const councilF = (document.getElementById('filter-transformer-council') as HTMLSelectElement)?.value;
            const addressF = (document.getElementById('filter-transformer-address') as HTMLSelectElement)?.value;
            const typeF = (document.getElementById('filter-transformer-type') as HTMLSelectElement)?.value;
            data = state.transformers.filter(t =>
                (!councilF || t.councilName === councilF) &&
                (!addressF || t.transformerAddress === addressF) &&
                (!typeF || t.transformerType === typeF)
            );
        } else if (reportType === 'mukayasat') {
            data = state.mukayasat.filter(m => {
                const matchStatus = !mukayasaStatusFilter || m.status === mukayasaStatusFilter;
                // Assuming mukayasat doesn't have a date field yet, so skipping date filter for it.
                return matchStatus;
            });
        } else if (reportType === 'judicial_control') {
            const filteredRawData = state.judicialControl.filter(m => {
                const matchStatus = !judicialStatusFilter || m.status === judicialStatusFilter;
                const matchReportType = !judicialReportTypeFilter || m.reportType === judicialReportTypeFilter;
                const inDateRange = (!dateFrom || (m.reportDate && m.reportDate >= dateFrom)) &&
                    (!dateTo || (m.reportDate && m.reportDate <= dateTo));
                return matchStatus && matchReportType && inDateRange;
            });

            // Ensure robust calculation
            const totalReconciliation = filteredRawData.reduce((sum, item) => sum + (Number(item.reconciliationAmount) || 0), 0);

            data = filteredRawData.map((m: any) => ({
                ...m,
                receiptNumber: m.payments?.map((p: any) => p.receiptNumber).join(', ') || '-',
                reconciliationAmount: m.reconciliationAmount ? Number(m.reconciliationAmount).toLocaleString() + ' ج.م' : '-'
            }));
            reportSummary = { totalCount: data.length, totalReconciliation };
        } else if (reportType === 'judicial_collection_report') {
            data = [];
            if (state.judicialControl && Array.isArray(state.judicialControl)) {
                state.judicialControl.forEach(item => {
                    if (item.payments && Array.isArray(item.payments) && item.payments.length > 0) {
                        item.payments.forEach((p: Payment) => {
                            const pDateISO = parseDateToISO(p.date);
                            const dateMatch = (!dateFrom || (pDateISO && pDateISO >= dateFrom)) &&
                                (!dateTo || (pDateISO && pDateISO <= dateTo));
                            const collectorMatch = !collectorFilter || p.collectedBy === collectorFilter;

                            if (dateMatch && collectorMatch) {
                                data.push({
                                    id: item.id,
                                    subscriberName: item.subscriberName,
                                    reportType: item.reportType,
                                    paymentDate: p.date,
                                    receiptNumber: p.receiptNumber,
                                    amount: Number(p.amount).toLocaleString() + ' ج.م',
                                    rawAmount: p.amount,
                                    collectedBy: p.collectedBy
                                });
                            }
                        });
                    }
                });
            }

            // Calculate totals for the summary
            const totalPaid = data.reduce((sum, item) => sum + Number(item.rawAmount || 0), 0);
            reportSummary = {
                totalPaid,
            };
        } else if (reportType === 'zinat_collection_report') {
            data = [];
            if (state.zinatCollection && Array.isArray(state.zinatCollection)) {
                state.zinatCollection.forEach(item => {
                    if (item.payments && Array.isArray(item.payments) && item.payments.length > 0) {
                        item.payments.forEach((p: Payment) => {
                            const pDateISO = parseDateToISO(p.date);
                            const dateMatch = (!dateFrom || (pDateISO && pDateISO >= dateFrom)) &&
                                (!dateTo || (pDateISO && pDateISO <= dateTo));
                            const collectorMatch = !collectorFilter || p.collectedBy === collectorFilter;

                            if (dateMatch && collectorMatch) {
                                data.push({
                                    id: item.id,
                                    requesterName: item.requesterName,
                                    paymentDate: p.date,
                                    receiptNumber: p.receiptNumber,
                                    amount: Number(p.amount).toLocaleString() + ' ج.م',
                                    rawAmount: p.amount,
                                    collectedBy: p.collectedBy
                                });
                            }
                        });
                    }
                });
            }

            // Calculate totals for the summary
            const totalPaid = data.reduce((sum, item) => sum + Number(item.rawAmount || 0), 0);
            reportSummary = {
                totalPaid,
            };
        } else if (reportType === 'installed_practice_meters') {
            data = state.judicialControl.filter(m => {
                const matchStatus = m.status === 'تم تركيب عداد';
                const inDateRange = (!dateFrom || (m.reportDate && m.reportDate >= dateFrom)) &&
                    (!dateTo || (m.reportDate && m.reportDate <= dateTo));
                return matchStatus && inDateRange;
            }).map((m: any) => ({
                ...m
            }));
            reportSummary = { totalCount: data.length };
        }

        // Special data processing for 'technician-activity' report after filtering
        if (reportType === 'technician-activity') {
            const tech = technicianFilter;
            const processedData: any[] = [];
            data.forEach(m => {
                if (!tech || m.installedBy === tech) {
                    processedData.push({ ...m, action: 'تركيب', actionDate: m.installationDate, technician: m.installedBy });
                }
                if (!tech || m.removedBy === tech) {
                    processedData.push({ ...m, action: 'رفع', actionDate: m.removalDate, technician: m.removedBy });
                }
                if (!tech || m.meterReceivedBy === tech) {
                    processedData.push({ ...m, action: 'استلام', actionDate: m.demolitionDate, technician: m.meterReceivedBy });
                }
            });
            data = processedData;
        }

        // Adjust columns for prepaid meters
        if (meterTypeFilters.length === 1 && meterTypeFilters[0] === 'مسبق الدفع') {
            columns = columns.map(c => c.key === 'readingAtRemoval' ? { key: 'cardStatus', header: 'حالة الكارت' } : c);
        }

        renderReportResults(data, columns, title, reportType, reportSummary, specificStatusFilter);
    }

    // تعديل حجم الخط في جميع تقارير الطباعة وجعل النصوص في الأعمدة سطر واحد مع السماح فقط لرؤوس الأعمدة بالالتفاف
    const renderReportResults = (data: any[], columns: { key: string, header: string }[], title: string, reportType: string = 'default', summary: { [key: string]: number } = {}, specificStatusFilter: string | null = null) => {
        const container = document.getElementById('report-results-container')!;
        const titleEl = document.getElementById('report-title')!;
        const bylineEl = document.getElementById('report-byline')!;
        const tableThead = container.querySelector('#report-results-table thead')!;
        const tableTbody = container.querySelector('#report-results-table tbody')!;
        const headerEl = document.getElementById('report-print-header')! as HTMLElement;
        const footerEl = document.getElementById('report-print-footer')!;
        const table = container.querySelector('#report-results-table')!;

        // Add a specific class for memo reports to target them with CSS
        if (reportType === 'memos') {
            table.classList.add('memo-report-table');
        }

        // Add a class for repairs report to apply centering
        if (reportType === 'repairs') {
            table.classList.add('repairs-report-table');
        }

        // Add a specific class for the "replacement" status report to apply smaller fonts for printing
        const reportTypeSelect = document.getElementById('report-type') as HTMLSelectElement;
        const statusSelect = document.getElementById('filter-subscriberType') as HTMLSelectElement;
        if ((reportTypeSelect?.value === 'meters-by-status' && statusSelect?.value === 'مرفوع إحلال') || reportType === 'replacement-report') {
            table.classList.add('replacement-status-report');
        }

        // إضافة فئة خاصة لتقرير أعطال مسبق الدفع لضبط حجم الخط ومنع قص البيانات
        const meterTypeFilters = Array.from(document.querySelectorAll<HTMLInputElement>('.meter-type-checkbox:checked')).map(cb => cb.value);
        if (reportTypeSelect?.value === 'meters-by-status' && statusSelect?.value === 'مرفوع أعطال' && meterTypeFilters.includes('مسبق الدفع')) {
            table.classList.add('faulty-prepaid-report');
        }

        const isFaultyPrepaidReport = reportTypeSelect?.value === 'meters-by-status' && statusSelect?.value === 'مرفوع أعطال' && meterTypeFilters.includes('مسبق الدفع');
        const isReplacementStatusReport = (reportTypeSelect?.value === 'meters-by-status' && statusSelect?.value === 'مرفوع إحلال') || reportType === 'replacement-report';
        const isReportClassApplied = isFaultyPrepaidReport || isReplacementStatusReport;

        // Clear previous content
        headerEl.innerHTML = ''; // No longer used, content moved to thead
        footerEl.innerHTML = ''; // No longer used, content moved to tfoot
        titleEl.textContent = ''; // No longer used
        bylineEl.textContent = ''; // No longer used
        headerEl.style.borderBottom = 'none'; // Remove border for on-screen view
        headerEl.style.marginBottom = '0'; // Remove margin for on-screen view

        // Modify columns to split accountReference into 4 parts if present
        let modifiedColumns = columns.slice();
        const accountRefIndex = modifiedColumns.findIndex(c => c.key === 'accountReference');
        if (accountRefIndex !== -1) {
            modifiedColumns.splice(accountRefIndex, 1,
                { key: 'accountRefF', header: 'ف' },
                { key: 'accountRefH', header: 'ح' },
                { key: 'accountRefY', header: 'ي' },
                { key: 'accountRefM', header: 'م' }
            );
            // Add sequence column if not already present, to match replacement report formatting
            if (!modifiedColumns.some(c => c.key === 'seq')) {
                modifiedColumns.unshift({ key: 'seq', header: 'م' });
            }
            // Move account reference columns to right after sequence column
            const seqIndex = modifiedColumns.findIndex(c => c.key === 'seq');
            const accountRefStart = modifiedColumns.findIndex(c => c.key.startsWith('accountRef'));
            if (seqIndex !== -1 && accountRefStart !== -1 && accountRefStart > seqIndex + 1) {
                const accountRefs = modifiedColumns.splice(accountRefStart, 4);
                modifiedColumns.splice(seqIndex + 1, 0, ...accountRefs);
            }
        }

        const isReplacementMemo = reportType === 'memos' && title.includes('إحلال');
        const isFaultsMemo = reportType === 'memos' && title.includes('أعطال');
        const isDemolitionMemo = reportType === 'memos' && title.includes('هدم');
        const isSubstitutedMemo = reportType === 'memos' && title.includes('استبدال');
        const isSpecialMemo = isReplacementMemo || isFaultsMemo || isDemolitionMemo || isSubstitutedMemo;
        const thStyle = isReportClassApplied ? '' : (isSpecialMemo ? 'padding: 0.5px 1px; border: 1px solid #000; white-space: normal; word-wrap: break-word; font-size: 11px;' : 'padding: 1px 2px; border: 1px dotted #000;');
        const tdStyle = isReportClassApplied ? '' : (isSpecialMemo ? 'font-size: 11px; white-space: nowrap; padding: 0.5px 1px; border: 1px solid #000;' : 'font-size: 12px; white-space: nowrap; padding: 1px 2px; border: 1px dotted #000;');

        // Render Table
        if (reportType === 'replacement-report' || modifiedColumns.some(c => c.key.startsWith('accountRef'))) {
            const seqIndex = modifiedColumns.findIndex(c => c.key === 'seq');
            const accountRefStartIndex = modifiedColumns.findIndex(c => c.key.startsWith('accountRef'));
            const seqTh = seqIndex !== -1 ? `<th rowspan="2" style="${thStyle}">${modifiedColumns[seqIndex].header}</th>` : ''; // م
            const otherThBefore = modifiedColumns.slice(seqIndex + 1, accountRefStartIndex).map(c => {
                const thClass = c.key === 'cardStatus' ? 'col-card-status' : '';
                return `<th rowspan="2" class="${thClass}" style="${thStyle}">${c.header}</th>`;
            }).join(''); // Columns before account ref
            const otherThAfter = modifiedColumns.slice(accountRefStartIndex + 4).map(c => {
                const thClass = c.key === 'cardStatus' ? 'col-card-status' : '';
                return `<th rowspan="2" class="${thClass}" style="${thStyle}">${c.header}</th>`;
            }).join(''); // Columns after account ref
            tableThead.innerHTML = `
            <tr>
                ${seqTh}
                ${otherThBefore}
                <th colspan="4" style="${thStyle}">مرجع الحساب</th>
                ${otherThAfter}
            </tr>
            <tr>
                <th style="${thStyle}">ف</th>
                <th style="${thStyle}">ح</th>
                <th style="${thStyle}">ي</th>
                <th style="${thStyle}">م</th>
            </tr>
        `;
        } else {
            tableThead.innerHTML = `<tr>${modifiedColumns.map(c => {
                const thClass = c.key === 'cardStatus' ? 'col-card-status' : '';
                return `<th class="${thClass}" style="${thStyle}">${c.header}</th>`;
            }).join('')}</tr>`;
        }

        tableTbody.innerHTML = '';
        if (data.length === 0) {
            tableTbody.innerHTML = `<tr><td colspan="${modifiedColumns.length}" style="text-align: center; ${isReplacementMemo ? 'font-size: 11px;' : 'font-size: 12px;'} white-space: nowrap; padding: 1px 2px;">لا توجد بيانات مطابقة لعرضها في التقرير.</td></tr>`;
        } else {
            data.forEach((item, index) => {
                const row = document.createElement('tr');
                let rowHTML = '';
                if (reportType === 'memos') {
                    row.classList.add('memo-data-row');
                }
                modifiedColumns.forEach(col => {
                    const cellClass = col.key === 'cardStatus' ? 'col-card-status' : '';
                    if (col.key === 'seq') {
                        rowHTML += `<td class="${cellClass}" style="${tdStyle}">${index + 1}</td>`;
                    } else {
                        const value = item[col.key as keyof DataItem];
                        const displayValue = (value !== undefined && value !== null) ? value : '';
                        rowHTML += `<td class="${cellClass}" style="${tdStyle}">${displayValue}</td>`;
                    }
                });
                row.innerHTML = rowHTML;
                tableTbody.appendChild(row);
                // Add an empty row after each data row for "memos" report type for visual separation
                if (reportType === 'memos') {
                    const emptyRow = document.createElement('tr');
                    let emptyCells = '';
                    // توسيع ارتفاع السطر في مذكرات الأعطال لتمكين الكتابة اليدوية بداخلة بعد الطباعة
                    const emptyRowHeight = (isFaultsMemo || isSubstitutedMemo) ? '1.5cm' : '10px';
                    for (let i = 0; i < modifiedColumns.length; i++) {
                        emptyCells += `<td style="height: ${emptyRowHeight}; border: 1px solid #000; border-top: none; border-bottom: 1px solid #000;"></td>`;
                    }
                    emptyRow.innerHTML = emptyCells;
                    tableTbody.appendChild(emptyRow);
                }
            });
        }

        container.classList.remove('hidden');

        // --- Build Header and Footer for repeating on each page ---
        const reportDate = new Date().toLocaleDateString('ar-EG');
        const userFullName = loggedInUser?.fullName || 'User';
        let bylineText = state.settings.replacementReportFooterText
            .replace('{user}', userFullName)
            .replace('{date}', new Date().toLocaleDateString('ar-EG'));
        const companyNameForReportHtml = (state.settings.replacementReportCompanyName || state.settings.companyName).replace(/\n/g, '<br>');

        const printedByText = `تمت الطباعة بواسطة: ${loggedInUser?.fullName || 'مستخدم'} | ${new Date().toLocaleString('ar-EG')}`;

        const headerContent = `
        <div class="report-header-center" style="font-size: 14px; line-height: 1.2; padding: 4px 0; width: 100%;">
            <div class="header-top" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                <div class="header-right" style="text-align: right; font-size: 12px; font-weight: bold;">${companyNameForReportHtml}</div>
                <div class="header-center" style="text-align: center; flex: 1;">
                    <h4 class="report-title" style="margin: 0; font-size: 13px; font-weight: bold;">${title}</h4>
                    <div class="printed-by-info" style="font-size: 9px; text-align: left; position: absolute; top: 0; left: 0;">${printedByText}</div>
                </div>
                <div class="header-left">${state.settings.companyLogo ? `<img src="${state.settings.companyLogo}" alt="Company Logo" class="company-logo">` : ''}</div>
            </div>
        </div>
    `;

        const headerRow = `<tr><th colspan="${modifiedColumns.length}" style="border: none; padding: 0;">${headerContent}</th></tr>`;
        tableThead.insertAdjacentHTML('afterbegin', headerRow);

        // Build and append the footer
        let signatures = state.settings.generalSignatures || [];

        if (reportType === 'judicial_control') {
            signatures = state.settings.judicialSignatures;
        } else if (reportType === 'judicial_collection_report' || reportType === 'zinat_collection_report') {
            signatures = state.settings.collectionSignatures;
        } else if (reportType === 'mukayasat') {
            signatures = state.settings.mukayasatSignatures;
        } else if (reportType === 'replacement-report' || (reportType === 'meters-by-status' && specificStatusFilter === 'مرفوع إحلال') || (reportType === 'memos' && title.includes('إحلال'))) {
            signatures = state.settings.replacementSignatures;
        } else if ((reportType === 'meters-by-status' && specificStatusFilter === 'مرفوع أعطال') || (reportType === 'memos' && title.includes('أعطال'))) {
            signatures = state.settings.faultyMeterSignatures;
        }

        if (!signatures || signatures.length === 0) signatures = state.settings.generalSignatures || [];

        let tfootHTML = '';
        if (signatures.length > 0) {
            const signaturesHTML = signatures.map(sig => `<div class="signature">${sig}</div>`).join('');
            tfootHTML += `<tr><td colspan="${modifiedColumns.length}" style="border: none; padding-top: 0.5cm;"><div class="signatures-section">${signaturesHTML}</div></td></tr>`;
        }
        tfootHTML += `<tr><td colspan="${modifiedColumns.length}" class="footer-cell" style="border: none; text-align: left; font-size: 10px; padding: 5px;"></td></tr>`;

        let tfoot = table.querySelector('tfoot');
        if (!tfoot) {
            tfoot = document.createElement('tfoot');
            table.appendChild(tfoot);
        }
        tfoot.innerHTML = tfootHTML;

        // Add summary row for collection reports
        if ((reportType === 'judicial_collection_report' || reportType === 'zinat_collection_report') && summary.totalPaid !== undefined) {
            const totalPaid = summary.totalPaid;

            // The number of columns before the amount columns is 5 for both reports
            const colspan = 5;

            const summaryRowHTML = `
            <tr class="report-summary-row" style="background-color: #f2f2f2; font-weight: bold; border-top: 2px solid #000;">
                <td colspan="${colspan}" style="text-align: left; border: 1px solid #000; padding: 5px;">إجمالي التحصيل</td>
                <td style="border: 1px solid #000; padding: 5px;">${totalPaid.toLocaleString()} ج.م</td>
                <td style="border: 1px solid #000;"></td>
            </tr>
        `;
            tfoot.insertAdjacentHTML('afterbegin', summaryRowHTML);
        } else if ((reportType === 'judicial_control' || reportType === 'installed_practice_meters') && summary.totalCount !== undefined) {
            const totalReconciliationText = summary.totalReconciliation !== undefined
                ? ` | إجمالي مبالغ التصالح: ${summary.totalReconciliation.toLocaleString()} ج.م`
                : '';
            const summaryRowHTML = `
            <tr class="report-summary-row" style="background-color: #e9ecef; font-weight: bold; border-top: 2px solid #000;">
                <td colspan="${modifiedColumns.length}" style="text-align: left; border: 1px solid #000; padding: 5px;">
                    إجمالي عدد المحاضر: ${summary.totalCount}${totalReconciliationText}
                </td>
            </tr>
        `;
            tfoot.insertAdjacentHTML('afterbegin', summaryRowHTML);
        }
    };

    const handlePrintActivityLog = () => {
        const printArea = document.getElementById('activity-log');
        if (!printArea) {
            showToast('لم يتم العثور على منطقة الطباعة.', 'error');
            return;
        }

        const tableToPrint = printArea.querySelector('.responsive-table')?.cloneNode(true) as HTMLElement;
        if (!tableToPrint) {
            showToast('لم يتم العثور على جدول لطباعته.', 'error');
            return;
        }

        // التحقق من وجود فئة التقرير العريض لضبط هوامش الصفحة برمجياً قبل الطباعة
        const isFaultyPrepaid = printArea.querySelector('.faulty-prepaid-report') !== null;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            showToast('فشل فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة.', 'error');
            return;
        }

        const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'));
        const stylesHTML = stylesheets.map(sheet => sheet.outerHTML).join('\n');

        printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>طباعة سجل النشاط</title>
            ${stylesHTML}
            <style>
                @page { size: A4 landscape; margin: 15mm; }
                body { background-color: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .table-container { box-shadow: none; border: none; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ccc; padding: 8px; text-align: right; font-size: 10pt; }
                thead { background-color: #f2f2f2; }
                .status-badge { font-size: 9pt; }
            </style>
        </head>
        <body>
            <h1>سجل نشاط المستخدمين</h1>
            ${tableToPrint.outerHTML}
        </body>
        </html>
    `);

        printWindow.document.close();

        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    const handlePrintReport = () => {
        showConfirmationDialog(
            'تأكيد الطباعة',
            'هل أنت متأكد من رغبتك في طباعة هذا التقرير؟',
            () => {
                const printArea = document.getElementById('print-area');
                if (!printArea) {
                    showToast('لم يتم العثور على منطقة الطباعة.', 'error');
                    return;
                }

                // التحقق من وجود فئة التقرير العريض لضبط هوامش الصفحة برمجياً قبل الطباعة
                const isFaultyPrepaid = printArea.querySelector('.faulty-prepaid-report') !== null;

                const printWindow = window.open('', '_blank');
                if (!printWindow) {
                    showToast('فشل فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة.', 'error');
                    return;
                }

                printWindow.document.write(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>طباعة التقرير</title>
    <style>
        @media print {
            @page {
                size: landscape;
                margin: 5mm ${isFaultyPrepaid ? '5mm' : '10mm'} 15mm ${isFaultyPrepaid ? '5mm' : '10mm'}; /* ضبط الهوامش الجانبية للتقارير العريضة */
            }
            body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                background-color: #fff !important;
                font-family: 'Tajawal', sans-serif;
            }
            .sidebar, .main-header, .main-footer, .report-actions-no-print, .btn-back-page {
                display: none !important;
            }
            table {
                width: 100%;
                border-collapse: collapse;
            }
            tr {
                page-break-inside: avoid;
                page-break-after: auto;
            }
            .memo-data-row {
                page-break-after: avoid !important;
            }
            /* Styles for the on-screen print preview area */
            #print-area .company-logo {
                max-width: 40px !important;
                max-height: 40px !important;
                object-fit: contain;
            }
            thead { display: table-header-group; } /* Repeats header on each page */
            tfoot { display: table-footer-group; } /* Repeats footer on each page */
            th, td {
                border: 1px solid #ccc;
                padding: 4px;
                font-size: 10pt;
                text-align: right;
                white-space: nowrap;
            }
            .memo-report-table th, .memo-report-table td {
                text-align: center !important; /* Center text horizontally for memo reports */
                vertical-align: middle !important; /* Center text vertically for memo reports */
                padding-top: 4px !important; 
                padding-bottom: 4px !important; 
            }
            /* Special smaller font for the wide replacement report to make it fit */
            .replacement-status-report th, .replacement-status-report td {
                font-size: 8pt !important;
                padding: 2px !important;
                white-space: nowrap;
                text-align: center !important;
                vertical-align: middle !important;
            }
            .repairs-report-table th, .repairs-report-table td {
                text-align: center !important;
                vertical-align: middle !important;
            }
            .print-footer {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                text-align: center;
                font-size: 10px;
                padding: 5px;
                border-top: 1px solid #ccc;
                background-color: #fff;
            }
            .signatures-section {
                display: flex;
                justify-content: space-around;
                flex-wrap: wrap;
                margin-top: 1cm;
            }
            .company-logo {
                max-width: 160px !important; /* Larger logo for the final printed paper */
                max-height: 160px !important;
                object-fit: contain;
            }
        }
    </style>
</head>
<body>
    ${printArea.innerHTML}
</body>
</html>
`);

                printWindow.document.close();

                // A short delay is often necessary to ensure the content is rendered before printing.
                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                    printWindow.close();
                }, 250);
            }
        );
    };

    // --- إدارة الإعدادات ---
    type SettingsListKey = 'technicians' | 'technicalEngineers' | 'headEngineers' | 'subscriptionTypes' | 'meterTypes' | 'errorCodeMeterTypes' | 'activityTypes' | 'repairStatuses' | 'meterCapacities' | 'removalReasons' | 'replacementSignatures' | 'generalSignatures' | 'cardStatuses' | 'memoTypes' | 'addresses' | 'judicialSignatures' | 'collectionSignatures' | 'mukayasatSignatures' | 'faultyMeterSignatures' | 'meterSupplyCompanies' | 'placeDescriptions' | 'councilNames' | 'transformerTypes' | 'currentTransformerCapacities';
    const renderManagedList = (listKey: SettingsListKey | 'roles') => {
        const container = document.getElementById(`${listKey}-list-container`);
        if (!container) return;

        const listElement = container.querySelector('ul');
        if (!listElement) return;

        const itemsData: any[] = listKey === 'roles' ? state.settings.roles : state.settings[listKey as SettingsListKey];
        listElement.innerHTML = ''; // Clear previous items

        if (itemsData.length === 0) {
            const placeholder = document.createElement('li');
            placeholder.className = 'empty-list-placeholder';
            placeholder.textContent = 'لا توجد عناصر.';
            listElement.appendChild(placeholder);
            return;
        }

        itemsData.forEach((item, index) => {
            const itemText = typeof item === 'string' ? item : item.name;
            const itemKey = typeof item === 'string' ? item : item.key;
            const listItem = document.createElement('li');

            // إضافة مربع اختيار للحذف المتعدد للعناوين
            if (listKey === 'addresses') {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'address-bulk-checkbox';
                checkbox.value = String(index);
                checkbox.style.marginLeft = '10px';
                listItem.appendChild(checkbox);
            }

            const textSpan = document.createElement('span');
            textSpan.textContent = itemText;

            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-edit-details';
            editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
            editBtn.dataset.list = listKey;
            editBtn.dataset.key = itemKey;

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-delete';
            deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
            deleteBtn.dataset.list = listKey;
            deleteBtn.dataset.key = itemKey; // Use key for roles, index for others
            deleteBtn.dataset.key = listKey === 'roles' ? itemKey : String(index); // Use key for roles, index for others

            // Disable delete for core roles
            if (listKey === 'roles' && ['admin', 'supervisor', 'reports', 'معاينات', 'user'].includes(itemKey)) {
                deleteBtn.disabled = true;
                editBtn.disabled = true;
                deleteBtn.title = 'لا يمكن حذف الأدوار الأساسية';
                editBtn.title = 'لا يمكن تعديل الأدوار الأساسية';
            }

            listItem.appendChild(textSpan);
            if (listKey === 'roles' || listKey === 'addresses') {
                listItem.appendChild(editBtn);
            }
            listItem.appendChild(deleteBtn);
            listElement.appendChild(listItem);
        });
    };

    const handleAddItemToList = (listKey: SettingsListKey | 'roles') => {
        let inputId = '';
        if (listKey === 'roles') {
            inputId = 'new-role-input';
        } else {
            const map: { [key: string]: string } = {
                'technicians': 'new-technician-input',
                'technicalEngineers': 'new-technicalEngineer-input',
                'headEngineers': 'new-headEngineer-input',
                'subscriptionTypes': 'new-subscriptionType-input',
                'meterTypes': 'new-meterType-input',
                'meterCapacities': 'new-meterCapacity-input',
                'activityTypes': 'new-activityType-input',
                'repairStatuses': 'new-repairStatus-input',
                'cardStatuses': 'new-cardStatus-input',
                'removalReasons': 'new-removalReason-input',
                'replacementSignatures': 'new-replacementSignature-input',
                'generalSignatures': 'new-generalSignature-input',
                'memoTypes': 'new-memoType-input',
                'addresses': 'new-addresses-input',
                'councilNames': 'new-councilName-input', // New
                'transformerTypes': 'new-transformerType-input', // New
                'meterSupplyCompanies': 'new-meterSupplyCompanies-input',
                'currentTransformerCapacities': 'new-currentTransformerCapacity-input', // New
                'placeDescriptions': 'new-placeDescription-input'
            };
            inputId = map[listKey] || `new-${listKey}-input`;
        }

        const input = document.getElementById(inputId) as HTMLInputElement;
        if (!input) return;

        const value = input.value.trim();
        if (!value) return;

        if (listKey === 'roles') {
            const key = `role_${Date.now()}`;
            state.settings.roles.push({ key, name: value });
        } else {
            if (!state.settings[listKey]) {
                (state.settings as any)[listKey] = [];
            }
            (state.settings[listKey] as string[]).push(value);
        }
        saveState();
        input.value = '';
        renderManagedList(listKey);
    };

    const handleDeleteItemFromList = (listKey: SettingsListKey | 'roles', keyOrIndex: string) => {
        if (listKey === 'roles') {
            const roleKey = keyOrIndex;
            // Check if any user has this role
            if (state.users.some(u => u.role === roleKey)) {
                showToast('لا يمكن حذف هذا الدور لأنه مُعيّن لمستخدم واحد على الأقل.', 'error');
                return;
            }
            const roleIndex = state.settings.roles.findIndex(r => r.key === roleKey);
            if (roleIndex > -1) {
                const roleName = state.settings.roles[roleIndex].name;
                const onConfirm = () => {
                    state.settings.roles.splice(roleIndex, 1);
                    // Also remove from all permissions
                    Object.values(state.settings.permissions).forEach(p => {
                        const roleIdxInPerm = p.roles.indexOf(roleKey);
                        if (roleIdxInPerm > -1) p.roles.splice(roleIdxInPerm, 1);
                    });
                    saveState();
                    renderManagedList(listKey);
                    showToast('تم حذف الدور بنجاح.');
                };
                showConfirmationDialog('تأكيد الحذف', `هل أنت متأكد من رغبتك في حذف دور "${roleName}"؟`, onConfirm);
            }
        } else {
            const index = parseInt(keyOrIndex, 10);
            const list = state.settings[listKey as SettingsListKey] as string[];
            if (index >= 0 && index < list.length) {
                const item = list[index];
                const itemType = listKey === 'meterSupplyCompanies' ? 'شركة التوريد' : 'العنصر';
                const onConfirm = () => {
                    list.splice(index, 1);
                    saveState();
                    renderManagedList(listKey as SettingsListKey);
                    updateUI();
                    showToast('تم حذف العنصر بنجاح.');
                };
                showConfirmationDialog('تأكيد الحذف', `هل أنت متأكد من حذف ${itemType} "${item}"؟ لا يمكن التراجع عن هذا الإجراء.`, onConfirm);
            }
        }
    };

    const handleEditItemFromList = (listKey: string, key: string) => {
        if (listKey !== 'roles') return;

        const roleIndex = state.settings.roles.findIndex(r => r.key === key);
        if (roleIndex === -1) return;

        const currentRole = state.settings.roles[roleIndex];
        const newName = prompt('أدخل الاسم الجديد للدور:', currentRole.name);

        if (newName === null || newName.trim() === '') {
            showToast('تم إلغاء التعديل.', 'error');
            return;
        }

        const trimmedNewName = newName.trim();

        // Check if the new name already exists (and it's not the current role's name)
        if (state.settings.roles.some(r => r.name === trimmedNewName && r.key !== currentRole.key)) {
            showToast('اسم الدور هذا موجود بالفعل.', 'error');
            return;
        }

        // Update the name
        state.settings.roles[roleIndex].name = trimmedNewName;
        saveState();
        showToast('تم تعديل اسم الدور بنجاح.');

        // Re-render all relevant sections to reflect the name change
        renderSettingsSection();
        renderPermissionsSection();
        renderDashboardPermissionsSection();
        renderUserManagementSection();
    };

    const getAccountingRequests = (): Record<string, any>[] => {
        try {
            const raw = localStorage.getItem('accountingServiceRequests');
            return raw ? JSON.parse(raw) : [];
        } catch (error) {
            return [];
        }
    };

    const saveAccountingRequests = (records: Record<string, any>[]) => {
        localStorage.setItem('accountingServiceRequests', JSON.stringify(records));
    };

    const openAccountingImageViewer = (src: string, title: string = 'عرض الصورة') => {
        const existing = document.getElementById('accounting-image-viewer');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'accounting-image-viewer';
        overlay.className = 'dialog-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.innerHTML = `
        <div class="dialog-box" style="max-width: 900px; width: min(92vw, 900px); padding: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px;">
                <h3 style="margin: 0; font-size: 1.3rem;">${title}</h3>
                <button type="button" class="btn secondary" data-close-accounting-image-viewer="true">إغلاق</button>
            </div>
            <div style="display: flex; justify-content: center; align-items: center; min-height: 320px; background: #f8fafc; border-radius: 12px; padding: 12px;">
                <img src="${src}" alt="${title}" style="max-width: 100%; max-height: 72vh; border-radius: 12px; object-fit: contain; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.2);" />
            </div>
        </div>
    `;

        overlay.addEventListener('click', (event) => {
            if (event.target === overlay || (event.target instanceof HTMLElement && event.target.dataset.closeAccountingImageViewer === 'true')) {
                overlay.remove();
            }
        });

        document.body.appendChild(overlay);
    };

    const renderMeterNumberInputs = (count: number, initialValues: string[] = [], initialLocationTypes: string[] = []) => {
        const container = document.getElementById('accounting-meter-numbers-container');
        if (!container) return;

        const safeCount = Math.max(1, Number(count) || 1);
        container.innerHTML = '';

        for (let index = 0; index < safeCount; index += 1) {
            const inputId = `accounting-meter-number-${index + 1}`;
            const selectId = `accounting-meter-location-${index + 1}`;
            const value = initialValues[index] || '';
            const selectedLocation = initialLocationTypes[index] || '';
            const wrapper = document.createElement('div');
            wrapper.className = 'input-group';
            wrapper.style.gridColumn = '1 / -1';
            wrapper.innerHTML = `
            <div style="display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); align-items: end;">
                <div class="input-group" style="margin: 0;">
                    <label for="${inputId}">رقم العداد ${index + 1}</label>
                    <input id="${inputId}" type="text" value="${value.replace(/"/g, '&quot;')}" placeholder="رقم العداد ${index + 1}">
                </div>
                <div class="input-group" style="margin: 0;">
                    <label for="${selectId}">وصف المكان للعداد ${index + 1}</label>
                    <select id="${selectId}">
                        <option value="">اختر نوع المكان</option>
                        <option value="منزلي" ${selectedLocation === 'منزلي' ? 'selected' : ''}>منزلي</option>
                        <option value="تجاري" ${selectedLocation === 'تجاري' ? 'selected' : ''}>تجاري</option>
                    </select>
                </div>
            </div>
        `;
            container.appendChild(wrapper);
        }
    };

    const renderAccountingSystemSection = () => {
        document.querySelectorAll('.content-section.active').forEach(section => section.classList.remove('active'));
        const section = document.getElementById('accounting-system');
        if (!section) return;
        section.classList.add('active');
        setPageTitle('تغيير نظام المحاسبة');

        const body = section.querySelector('.accounting-system-body');
        if (body) {
            const totalRecords = getAccountingRequests().length;
            body.innerHTML = `
            <div class="info-card">
                <h4>نظام المحاسبة</h4>
                <p>إدارة تسجيلات طلبات الخدمة واستعلامها بكفاءة من خلال صفحات منفصلة.</p>
                <div class="form-grid">
                    <div class="input-group">
                        <label>اسم النظام</label>
                        <input type="text" value="النظام الموحد للعدادات" readonly>
                    </div>
                    <div class="input-group">
                        <label>عدد السجلات المحفوظة</label>
                        <input type="text" value="${totalRecords}" readonly>
                    </div>
                </div>
                <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 18px;">
                    <button type="button" class="btn" data-target="accounting-save-registration">حفظ التسجيل</button>
                    <button type="button" class="btn secondary" data-target="accounting-saved-records">السجلات المحفوظة</button>
                    <button type="button" class="btn secondary" data-target="accounting-query">استعلام متعدد</button>
                </div>
            </div>
        `;
        }
    };

    const renderAccountingRegistrationSection = () => {
        document.querySelectorAll('.content-section.active').forEach(section => section.classList.remove('active'));
        const section = document.getElementById('accounting-save-registration');
        if (!section) return;
        section.classList.add('active');
        setPageTitle('حفظ التسجيل');

        const body = section.querySelector('.accounting-save-registration-body');
        if (!body) return;

        body.innerHTML = `
        <div class="info-card">
            <h4>بيانات طلب الخدمة</h4>
            <form id="accounting-registration-form" class="form-grid" novalidate>
                <input type="hidden" id="accounting-record-id" value="">
                <div class="input-group">
                    <label for="accounting-client-name">اسم العميل</label>
                    <input id="accounting-client-name" type="text" placeholder="ادخل اسم العميل" required>
                </div>
                <div class="input-group">
                    <label for="accounting-address">العنوان</label>
                    <input id="accounting-address" type="text" placeholder="ادخل العنوان" required>
                </div>
                <div class="input-group">
                    <label for="accounting-card-number">رقم البطاقة</label>
                    <input id="accounting-card-number" type="text" placeholder="ادخل رقم البطاقة">
                </div>
                <div class="input-group">
                    <label for="accounting-order-number">رقم الطلب</label>
                    <input id="accounting-order-number" type="text" placeholder="ادخل رقم الطلب">
                </div>
                <div class="input-group">
                    <label for="accounting-inspection-receipt">رقم إيصال المعاينة</label>
                    <input id="accounting-inspection-receipt" type="text" placeholder="ادخل رقم إيصال المعاينة">
                </div>
                <div class="input-group">
                    <label for="accounting-mobile">رقم الموبايل</label>
                    <input id="accounting-mobile" type="tel" placeholder="ادخل رقم الموبايل">
                </div>
                <div class="input-group">
                    <label for="accounting-client-status">صفة العميل</label>
                    <select id="accounting-client-status">
                        <option value="">اختر صفة العميل</option>
                        <option value="مالك">مالك</option>
                        <option value="مستاجر">مستاجر</option>
                    </select>
                </div>
                <div class="input-group">
                    <label for="accounting-owner-name">اسم المالك</label>
                    <input id="accounting-owner-name" type="text" placeholder="ادخل اسم المالك">
                </div>
                <div class="input-group">
                    <label for="accounting-location-type">وصف المكان</label>
                    <select id="accounting-location-type">
                        <option value="">اختر وصف المكان</option>
                        <option value="منزلي">منزلي</option>
                        <option value="تجاري">تجاري</option>
                    </select>
                </div>
                <div class="input-group">
                    <label for="accounting-east-boundary">الحد الشرقي</label>
                    <input id="accounting-east-boundary" type="text" placeholder="الحد الشرقي">
                </div>
                <div class="input-group">
                    <label for="accounting-west-boundary">الحد الغربي</label>
                    <input id="accounting-west-boundary" type="text" placeholder="الحد الغربي">
                </div>
                <div class="input-group">
                    <label for="accounting-north-boundary">الحد البحري</label>
                    <input id="accounting-north-boundary" type="text" placeholder="الحد البحري">
                </div>
                <div class="input-group">
                    <label for="accounting-south-boundary">الحد القبلي</label>
                    <input id="accounting-south-boundary" type="text" placeholder="الحد القبلي">
                </div>
                <div class="input-group">
                    <label for="accounting-model-number">رقم النموذج</label>
                    <input id="accounting-model-number" type="text" placeholder="ادخل رقم النموذج">
                </div>
                <div class="input-group">
                    <label for="accounting-meter-count">عدد العدادات</label>
                    <select id="accounting-meter-count">
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                        <option value="6">6</option>
                        <option value="7">7</option>
                        <option value="8">8</option>
                        <option value="9">9</option>
                        <option value="10">10</option>
                    </select>
                </div>
                <div class="input-group">
                    <label for="accounting-registration-number">رقم القيد بشهادة التركيب</label>
                    <input id="accounting-registration-number" type="text" placeholder="ادخل رقم القيد">
                </div>
                <div class="input-group">
                    <label for="accounting-issue-date">تاريخ صدورها</label>
                    <input id="accounting-issue-date" type="date">
                </div>
                <div class="input-group">
                    <label for="accounting-inspection-completion-date">تاريخ اتمام المعاينة</label>
                    <input id="accounting-inspection-completion-date" type="date">
                </div>
                <div id="accounting-meter-numbers-container" style="grid-column: 1 / -1; display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));"></div>
                <div class="input-group">
                    <label for="accounting-model-image">إرفاق صورة النموذج</label>
                    <input id="accounting-model-image" type="file" accept="image/*">
                    <div id="accounting-model-preview" class="upload-preview" style="margin-top: 8px;"></div>
                </div>
                <div class="input-group">
                    <label for="accounting-certificate-image">إرفاق صورة الشهادة</label>
                    <input id="accounting-certificate-image" type="file" accept="image/*">
                    <div id="accounting-certificate-preview" class="upload-preview" style="margin-top: 8px;"></div>
                </div>
                <div class="input-group">
                    <label for="accounting-inspection-image">إرفاق صورة المعاينة</label>
                    <input id="accounting-inspection-image" type="file" accept="image/*">
                    <div id="accounting-inspection-preview" class="upload-preview" style="margin-top: 8px;"></div>
                </div>
                <div class="input-group" style="grid-column: 1 / -1; display: flex; gap: 10px; align-items: center; justify-content: flex-end; margin-top: 10px;">
                    <button type="submit" class="btn">حفظ</button>
                    <button type="button" id="accounting-cancel-edit" class="btn secondary hidden">إلغاء التعديل</button>
                    <button type="reset" class="btn secondary">مسح</button>
                </div>
            </form>
        </div>
    `;

        const readFileAsDataURL = (file: File): Promise<string> => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        const renderUploadPreview = (preview: HTMLElement | null, value?: string) => {
            if (!preview) return;
            if (value && value.startsWith('data:image/')) {
                preview.innerHTML = `<img src="${value}" alt="معاينة" style="max-width: 220px; max-height: 180px; border-radius: 10px; border: 1px solid var(--border-color); object-fit: cover;" />`;
                return;
            }
            preview.innerHTML = '';
        };

        const registerPreview = (inputId: string, previewId: string) => {
            const input = document.getElementById(inputId) as HTMLInputElement | null;
            const preview = document.getElementById(previewId) as HTMLElement | null;
            if (!input || !preview) return;

            input.addEventListener('change', async () => {
                const file = input.files?.[0];
                if (!file) {
                    preview.innerHTML = '';
                    return;
                }
                if (!file.type.startsWith('image/')) {
                    preview.innerHTML = '<span style="color: #ef4444;">يرجى اختيار صورة فقط.</span>';
                    return;
                }
                const dataUrl = await readFileAsDataURL(file);
                renderUploadPreview(preview, dataUrl);
            });
        };

        const populateForm = (record: Record<string, any>) => {
            const fieldIds = [
                'client-name', 'address', 'card-number', 'order-number', 'inspection-receipt', 'mobile',
                'east-boundary', 'west-boundary', 'north-boundary', 'south-boundary', 'model-number', 'registration-number',
                'issue-date', 'inspection-completion-date', 'owner-name'
            ];

            fieldIds.forEach(field => {
                const input = document.getElementById(`accounting-${field}`) as HTMLInputElement | HTMLTextAreaElement | null;
                if (input) input.value = record[field] || '';
            });

            const clientStatus = document.getElementById('accounting-client-status') as HTMLSelectElement | null;
            if (clientStatus) clientStatus.value = record['client-description'] || '';

            const locationType = document.getElementById('accounting-location-type') as HTMLSelectElement | null;
            if (locationType) locationType.value = record['location-description'] || '';

            const meterCount = document.getElementById('accounting-meter-count') as HTMLSelectElement | null;
            const meterDetails = Array.isArray(record['meter-details'])
                ? record['meter-details']
                : Array.isArray(record['meter-numbers'])
                    ? record['meter-numbers'].map((number: string, index: number) => ({ number, locationType: record['meter-location-types']?.[index] || '' }))
                    : (record['meter-number'] ? [{ number: record['meter-number'], locationType: record['location-description'] || '' }] : [{ number: '', locationType: record['location-description'] || '' }]);
            const meterNumbers = meterDetails.map((item: any) => item.number || '').filter(Boolean);
            const locationTypes = meterDetails.map((item: any) => item.locationType || '');
            if (meterCount) {
                const countValue = Number(record['meter-count']) || meterNumbers.length || 1;
                meterCount.value = String(Math.max(1, countValue));
                renderMeterNumberInputs(Number(meterCount.value), meterNumbers, locationTypes);
            }

            const idInput = document.getElementById('accounting-record-id') as HTMLInputElement | null;
            if (idInput) idInput.value = String(record.id || '');

            const modelPreview = document.getElementById('accounting-model-preview');
            const certificatePreview = document.getElementById('accounting-certificate-preview');
            const inspectionPreview = document.getElementById('accounting-inspection-preview');
            renderUploadPreview(modelPreview, record.modelImage);
            renderUploadPreview(certificatePreview, record.certificateImage);
            renderUploadPreview(inspectionPreview, record.inspectionImage);

            const cancelBtn = document.getElementById('accounting-cancel-edit');
            if (cancelBtn) cancelBtn.classList.remove('hidden');
        };

        const resetForm = () => {
            const form = document.getElementById('accounting-registration-form') as HTMLFormElement | null;
            form?.reset();
            const meterCount = document.getElementById('accounting-meter-count') as HTMLSelectElement | null;
            if (meterCount) meterCount.value = '1';
            renderMeterNumberInputs(1, [], []);
            const idInput = document.getElementById('accounting-record-id') as HTMLInputElement | null;
            if (idInput) idInput.value = '';
            const modelPreview = document.getElementById('accounting-model-preview');
            const certificatePreview = document.getElementById('accounting-certificate-preview');
            const inspectionPreview = document.getElementById('accounting-inspection-preview');
            if (modelPreview) modelPreview.innerHTML = '';
            if (certificatePreview) certificatePreview.innerHTML = '';
            if (inspectionPreview) inspectionPreview.innerHTML = '';
            const cancelBtn = document.getElementById('accounting-cancel-edit');
            if (cancelBtn) cancelBtn.classList.add('hidden');
        };

        const renderSavedAccountingRecords = () => {
            const container = document.getElementById('accounting-saved-records-list');
            if (!container) return;

            const records = getAccountingRequests();
            if (!records.length) {
                container.innerHTML = '<tr><td colspan="6"><div class="no-results-message">لا توجد سجلات محفوظة حتى الآن.</div></td></tr>';
                return;
            }

            container.innerHTML = records.map((record) => `
            <tr>
                <td>${record['client-name'] || '-'}</td>
                <td>${record.address || '-'}</td>
                <td>${record['order-number'] || '-'}</td>
                <td>${record['meter-number'] || '-'}</td>
                <td>${record['registration-number'] || '-'}</td>
                <td>
                    <div style="display: flex; gap: 8px; justify-content: center;">
                        <button type="button" class="btn secondary btn-edit-accounting-record" data-id="${record.id}">تعديل</button>
                        <button type="button" class="btn btn-delete btn-delete-accounting-record" data-id="${record.id}">حذف</button>
                    </div>
                </td>
            </tr>
        `).join('');
        };

        const form = document.getElementById('accounting-registration-form') as HTMLFormElement | null;
        const refreshSavedRecords = () => renderSavedAccountingRecords();

        const meterCountSelect = document.getElementById('accounting-meter-count') as HTMLSelectElement | null;
        meterCountSelect?.addEventListener('change', () => {
            const count = Number(meterCountSelect.value || 1);
            renderMeterNumberInputs(count, [], []);
        });

        renderMeterNumberInputs(1, [], []);
        registerPreview('accounting-model-image', 'accounting-model-preview');
        registerPreview('accounting-certificate-image', 'accounting-certificate-preview');
        registerPreview('accounting-inspection-image', 'accounting-inspection-preview');

        body.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;
            const editButton = target.closest('.btn-edit-accounting-record');
            const deleteButton = target.closest('.btn-delete-accounting-record');
            const cancelButton = target.closest('#accounting-cancel-edit');

            if (cancelButton) {
                resetForm();
                return;
            }

            if (editButton) {
                const id = Number(editButton.getAttribute('data-id'));
                const records = getAccountingRequests();
                const targetRecord = records.find(rec => Number(rec.id) === id);
                if (targetRecord) {
                    populateForm(targetRecord);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
                return;
            }

            if (deleteButton) {
                const id = Number(deleteButton.getAttribute('data-id'));
                const records = getAccountingRequests().filter(rec => Number(rec.id) !== id);
                saveAccountingRequests(records);
                showToast('تم حذف السجل بنجاح.', 'success');
                refreshSavedRecords();
                resetForm();
            }
        });

        form?.addEventListener('submit', async (event) => {
            event.preventDefault();

            const formData: Record<string, any> = {};
            const fields = [
                'client-name', 'address', 'card-number', 'order-number', 'inspection-receipt', 'mobile',
                'east-boundary', 'west-boundary', 'north-boundary', 'south-boundary', 'model-number', 'registration-number',
                'issue-date', 'inspection-completion-date', 'owner-name'
            ];

            fields.forEach(field => {
                const input = document.getElementById(`accounting-${field}`) as HTMLInputElement | HTMLTextAreaElement | null;
                if (input) formData[field] = input.value.trim();
            });

            const clientStatus = document.getElementById('accounting-client-status') as HTMLSelectElement | null;
            const locationType = document.getElementById('accounting-location-type') as HTMLSelectElement | null;
            const meterCountSelectValue = document.getElementById('accounting-meter-count') as HTMLSelectElement | null;

            formData['client-description'] = clientStatus?.value || '';
            formData['location-description'] = locationType?.value || '';
            formData['meter-count'] = Number(meterCountSelectValue?.value || 1);

            const meterDetails: Array<{ number: string; locationType: string }> = [];
            const meterNumbers: string[] = [];
            const totalMeterCount = Number(formData['meter-count']) || 1;
            for (let index = 1; index <= totalMeterCount; index += 1) {
                const input = document.getElementById(`accounting-meter-number-${index}`) as HTMLInputElement | null;
                const select = document.getElementById(`accounting-meter-location-${index}`) as HTMLSelectElement | null;
                const value = input?.value.trim() || '';
                const locationTypeValue = select?.value || '';
                meterDetails.push({ number: value, locationType: locationTypeValue });
                if (value) meterNumbers.push(value);
            }

            formData['meter-details'] = meterDetails;
            formData['meter-numbers'] = meterNumbers;
            formData['meter-location-types'] = meterDetails.map(item => item.locationType);
            formData['meter-number'] = meterNumbers[0] || '';

            if (!formData['client-name'] || !formData['address']) {
                showToast('اسم العميل والعنوان مطلوبان.', 'error');
                return;
            }

            const recordIdValue = (document.getElementById('accounting-record-id') as HTMLInputElement | null)?.value;
            const modelInput = document.getElementById('accounting-model-image') as HTMLInputElement | null;
            const certificateInput = document.getElementById('accounting-certificate-image') as HTMLInputElement | null;
            const inspectionInput = document.getElementById('accounting-inspection-image') as HTMLInputElement | null;

            if (modelInput?.files?.[0]) {
                formData.modelImage = await readFileAsDataURL(modelInput.files[0]);
            }
            if (certificateInput?.files?.[0]) {
                formData.certificateImage = await readFileAsDataURL(certificateInput.files[0]);
            }
            if (inspectionInput?.files?.[0]) {
                formData.inspectionImage = await readFileAsDataURL(inspectionInput.files[0]);
            }

            const records = getAccountingRequests();
            if (recordIdValue) {
                const index = records.findIndex(rec => String(rec.id) === recordIdValue);
                if (index >= 0) {
                    const existing = records[index];
                    formData.modelImage = formData.modelImage || existing.modelImage;
                    formData.certificateImage = formData.certificateImage || existing.certificateImage;
                    formData.inspectionImage = formData.inspectionImage || existing.inspectionImage;
                    records[index] = { ...existing, ...formData, id: Number(recordIdValue) };
                }
            } else {
                records.push({ id: Date.now(), ...formData, savedAt: new Date().toISOString() });
            }

            saveAccountingRequests(records);
            const actionMessage = recordIdValue ? 'تم تعديل التسجيل بنجاح.' : 'تم حفظ التسجيل بنجاح.';
            showToast(actionMessage, 'success');
            resetForm();
            refreshSavedRecords();
        });

        resetForm();
        refreshSavedRecords();
    };

    const renderAccountingSavedRecordsSection = () => {
        document.querySelectorAll('.content-section.active').forEach(section => section.classList.remove('active'));
        const section = document.getElementById('accounting-saved-records');
        if (!section) return;
        section.classList.add('active');
        setPageTitle('السجلات المحفوظة');

        const body = section.querySelector('.accounting-saved-records-body');
        if (!body) return;

        const records = getAccountingRequests();
        const renderTable = (filteredRecords: Record<string, any>[]) => {
            if (!filteredRecords.length) {
                body.innerHTML = `
                <div class="info-card">
                    <h4>السجلات المحفوظة</h4>
                    <div class="accounting-saved-records-search-box">
                        <label for="accounting-saved-records-search">بحث في السجلات</label>
                        <input id="accounting-saved-records-search" type="search" placeholder="ابحث باسم العميل، العنوان، رقم الطلب أو القيد">
                    </div>
                    <div class="no-results-message">لا توجد سجلات مطابقة للبحث.</div>
                </div>
            `;
                const search = document.getElementById('accounting-saved-records-search') as HTMLInputElement | null;
                search?.addEventListener('input', () => {
                    const term = search.value.trim().toLowerCase();
                    const allRecords = getAccountingRequests();
                    const results = allRecords.filter(record => {
                        const text = [
                            record['client-name'], record.address, record['order-number'], record['meter-number'],
                            record['registration-number'], record['card-number'], record.mobile
                        ].join(' ').toLowerCase();
                        return text.includes(term);
                    });
                    renderTable(results);
                });
                return;
            }

            body.innerHTML = `
            <div class="info-card">
                <h4>السجلات المحفوظة</h4>
                <div class="accounting-saved-records-search-box">
                    <label for="accounting-saved-records-search">بحث في السجلات</label>
                    <input id="accounting-saved-records-search" type="search" placeholder="ابحث باسم العميل، العنوان، رقم الطلب أو القيد">
                </div>
                <div class="responsive-table">
                    <table class="data-table" style="width: 100%;">
                        <thead>
                            <tr>
                                <th>اسم العميل</th>
                                <th>العنوان</th>
                                <th>رقم الطلب</th>
                                <th>رقم العداد</th>
                                <th>رقم القيد</th>
                                <th>تاريخ الحفظ</th>
                                <th>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredRecords.map(record => `
                                <tr>
                                    <td>${record['client-name'] || '-'}</td>
                                    <td>${record.address || '-'}</td>
                                    <td>${record['order-number'] || '-'}</td>
                                    <td>${record['meter-number'] || '-'}</td>
                                    <td>${record['registration-number'] || '-'}</td>
                                    <td>${record.savedAt ? new Date(record.savedAt).toLocaleString('ar-EG') : '-'}</td>
                                    <td>
                                        <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
                                            <button type="button" class="btn secondary btn-view-accounting-record" data-id="${record.id}">عرض</button>
                                            <button type="button" class="btn secondary btn-print-accounting-record" data-id="${record.id}">طباعة</button>
                                            <button type="button" class="btn secondary btn-edit-accounting-record" data-id="${record.id}">تعديل</button>
                                            <button type="button" class="btn btn-delete btn-delete-accounting-record" data-id="${record.id}">حذف</button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

            const search = document.getElementById('accounting-saved-records-search') as HTMLInputElement | null;
            search?.addEventListener('input', () => {
                const term = search.value.trim().toLowerCase();
                const allRecords = getAccountingRequests();
                const results = allRecords.filter(record => {
                    const text = [
                        record['client-name'], record.address, record['order-number'], record['meter-number'],
                        record['registration-number'], record['card-number'], record.mobile
                    ].join(' ').toLowerCase();
                    return text.includes(term);
                });
                renderTable(results);
            });

            body.addEventListener('click', (event) => {
                const target = event.target as HTMLElement;
                const imageTrigger = target.closest('.accounting-image-trigger');
                const imageButton = target.closest('.accounting-image-show-button');
                const viewButton = target.closest('.btn-view-accounting-record');
                const printButton = target.closest('.btn-print-accounting-record');
                const editButton = target.closest('.btn-edit-accounting-record');
                const deleteButton = target.closest('.btn-delete-accounting-record');
                if (imageTrigger || imageButton) {
                    const src = (imageTrigger || imageButton)?.getAttribute('data-accounting-image');
                    const alt = (imageTrigger || imageButton)?.getAttribute('data-accounting-title') || (imageTrigger || imageButton)?.getAttribute('alt') || 'عرض الصورة';
                    if (src) {
                        openAccountingImageViewer(src, alt);
                    }
                    return;
                }

                if (printButton) {
                    const id = Number(printButton.getAttribute('data-id'));
                    const record = getAccountingRequests().find(item => Number(item.id) === id);
                    if (!record) return;

                    const printWindow = window.open('', '_blank');
                    if (!printWindow) {
                        showToast('فشل فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة.', 'error');
                        return;
                    }

                    const meterDetails = Array.isArray(record['meter-details']) && record['meter-details'].length
                        ? record['meter-details']
                        : Array.isArray(record['meter-numbers']) && record['meter-numbers'].length
                            ? record['meter-numbers'].map((number: string, index: number) => ({ number, locationType: record['meter-location-types']?.[index] || record['location-description'] || '' }))
                            : (record['meter-number'] ? [{ number: record['meter-number'], locationType: record['location-description'] || '' }] : []);
                    const meterLocationSummary = meterDetails.length
                        ? meterDetails.map((item: any) => `${item.number || 'بدون رقم'}: ${item.locationType || 'غير محدد'}`).join(' • ')
                        : '-';

                    const content = `
                    <div style="font-family: 'Segoe UI', Tahoma, sans-serif; direction: rtl; color: #111827; line-height: 1.8; padding: 24px;">
                        <h2 style="text-align:center; margin-bottom: 20px;">تفاصيل سجل نظام المحاسبة</h2>
                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
                            <div><strong>اسم العميل:</strong> ${record['client-name'] || '-'}</div>
                            <div><strong>العنوان:</strong> ${record.address || '-'}</div>
                            <div><strong>رقم البطاقة:</strong> ${record['card-number'] || '-'}</div>
                            <div><strong>رقم الطلب:</strong> ${record['order-number'] || '-'}</div>
                            <div><strong>الموبايل:</strong> ${record.mobile || '-'}</div>
                            <div><strong>صفة العميل:</strong> ${record['client-description'] || '-'}</div>
                            <div><strong>اسم المالك:</strong> ${record['owner-name'] || '-'}</div>
                            <div><strong>وصف المكان:</strong> ${record['location-description'] || '-'}</div>
                            <div><strong>رقم النموذج:</strong> ${record['model-number'] || '-'}</div>
                            <div><strong>عدد العدادات:</strong> ${record['meter-count'] || meterDetails.length || 1}</div>
                            <div><strong>أرقام العدادات:</strong> ${meterLocationSummary}</div>
                            <div><strong>رقم القيد:</strong> ${record['registration-number'] || '-'}</div>
                            <div><strong>رقم إيصال المعاينة:</strong> ${record['inspection-receipt'] || '-'}</div>
                            <div><strong>تاريخ المعاينة:</strong> ${record['inspection-completion-date'] || '-'}</div>
                            <div><strong>تاريخ الصدور:</strong> ${record['issue-date'] || '-'}</div>
                            <div><strong>تاريخ الحفظ:</strong> ${record.savedAt ? new Date(record.savedAt).toLocaleString('ar-EG') : '-'}</div>
                        </div>
                    </div>
                `;

                    printWindow.document.write(`
                    <!DOCTYPE html>
                    <html lang="ar" dir="rtl">
                        <head>
                            <meta charset="UTF-8" />
                            <title>طباعة سجل محاسبة</title>
                            <style>
                                body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 20px; color: #111827; }
                                h2 { text-align: center; margin-bottom: 20px; }
                                strong { display: inline-block; min-width: 110px; }
                                div { margin-bottom: 8px; }
                                @media print { body { padding: 0; } }
                            </style>
                        </head>
                        <body>${content}</body>
                    </html>
                `);
                    printWindow.document.close();
                    setTimeout(() => {
                        printWindow.focus();
                        printWindow.print();
                        printWindow.close();
                    }, 300);
                    return;
                }

                if (viewButton) {
                    const id = Number(viewButton.getAttribute('data-id'));
                    const record = getAccountingRequests().find(item => Number(item.id) === id);
                    if (!record) return;

                    const meterDetails = Array.isArray(record['meter-details']) && record['meter-details'].length
                        ? record['meter-details']
                        : Array.isArray(record['meter-numbers']) && record['meter-numbers'].length
                            ? record['meter-numbers'].map((number: string, index: number) => ({ number, locationType: record['meter-location-types']?.[index] || record['location-description'] || '' }))
                            : (record['meter-number'] ? [{ number: record['meter-number'], locationType: record['location-description'] || '' }] : []);
                    const meterNumbers = meterDetails.map((item: any) => item.number).filter(Boolean);
                    const meterLocationSummary = meterDetails.length
                        ? meterDetails.map((item: any) => `${item.number || 'بدون رقم'}: ${item.locationType || 'غير محدد'}`).join(' • ')
                        : '-';

                    const detailHtml = `
                    <div class="info-card" style="margin-top: 18px;">
                        <h4>تفاصيل السجل</h4>
                        <div class="details-grid">
                            <div class="detail-item"><label>اسم العميل</label><span class="value">${record['client-name'] || '-'}</span></div>
                            <div class="detail-item"><label>العنوان</label><span class="value">${record.address || '-'}</span></div>
                            <div class="detail-item"><label>رقم البطاقة</label><span class="value">${record['card-number'] || '-'}</span></div>
                            <div class="detail-item"><label>رقم الطلب</label><span class="value">${record['order-number'] || '-'}</span></div>
                            <div class="detail-item"><label>رقم الموبايل</label><span class="value">${record.mobile || '-'}</span></div>
                            <div class="detail-item"><label>صفة العميل</label><span class="value">${record['client-description'] || '-'}</span></div>
                            <div class="detail-item"><label>اسم المالك</label><span class="value">${record['owner-name'] || '-'}</span></div>
                            <div class="detail-item"><label>وصف المكان</label><span class="value">${record['location-description'] || '-'}</span></div>
                            <div class="detail-item"><label>الحد الشرقي</label><span class="value">${record['east-boundary'] || '-'}</span></div>
                            <div class="detail-item"><label>الحد الغربي</label><span class="value">${record['west-boundary'] || '-'}</span></div>
                            <div class="detail-item"><label>الحد البحري</label><span class="value">${record['north-boundary'] || '-'}</span></div>
                            <div class="detail-item"><label>الحد القبلي</label><span class="value">${record['south-boundary'] || '-'}</span></div>
                            <div class="detail-item"><label>رقم النموذج</label><span class="value">${record['model-number'] || '-'}</span></div>
                            <div class="detail-item"><label>عدد العدادات</label><span class="value">${record['meter-count'] || meterNumbers.length || 1}</span></div>
                            <div class="detail-item"><label>أرقام العدادات ووصف المكان</label><span class="value">${meterLocationSummary}</span></div>
                            <div class="detail-item"><label>رقم القيد</label><span class="value">${record['registration-number'] || '-'}</span></div>
                            <div class="detail-item"><label>رقم إيصال المعاينة</label><span class="value">${record['inspection-receipt'] || '-'}</span></div>
                            <div class="detail-item"><label>تاريخ المعاينة</label><span class="value">${record['inspection-completion-date'] || '-'}</span></div>
                            <div class="detail-item"><label>تاريخ الصدور</label><span class="value">${record['issue-date'] || '-'}</span></div>
                            <div class="detail-item"><label>تاريخ الحفظ</label><span class="value">${record.savedAt ? new Date(record.savedAt).toLocaleString('ar-EG') : '-'}</span></div>
                        </div>
                        ${(record.modelImage || record.certificateImage || record.inspectionImage) ? `
                        <div style="margin-top: 22px;">
                            <h5 style="margin: 0 0 12px; color: var(--text-color);">الصور المرفقة</h5>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
                                ${record.modelImage ? `
                                    <div class="detail-item" style="padding: 12px; align-items: flex-start; gap: 10px;">
                                        <label>صورة النموذج</label>
                                        <div style="display: flex; gap: 8px; align-items: center; width: 100%;">
                                            <img src="${record.modelImage}" alt="صورة النموذج" data-accounting-image="${record.modelImage}" data-accounting-title="صورة النموذج" class="accounting-image-trigger" style="flex: 1; max-width: 180px; max-height: 180px; border-radius: 10px; border: 1px solid var(--border-color); object-fit: cover; cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease;" onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 8px 18px rgba(15, 23, 42, 0.18)';" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';" />
                                            <button type="button" class="btn secondary accounting-image-show-button" data-accounting-image="${record.modelImage}" data-accounting-title="صورة النموذج">عرض</button>
                                        </div>
                                    </div>
                                ` : ''}
                                ${record.certificateImage ? `
                                    <div class="detail-item" style="padding: 12px; align-items: flex-start; gap: 10px;">
                                        <label>صورة الشهادة</label>
                                        <div style="display: flex; gap: 8px; align-items: center; width: 100%;">
                                            <img src="${record.certificateImage}" alt="صورة الشهادة" data-accounting-image="${record.certificateImage}" data-accounting-title="صورة الشهادة" class="accounting-image-trigger" style="flex: 1; max-width: 180px; max-height: 180px; border-radius: 10px; border: 1px solid var(--border-color); object-fit: cover; cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease;" onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 8px 18px rgba(15, 23, 42, 0.18)';" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';" />
                                            <button type="button" class="btn secondary accounting-image-show-button" data-accounting-image="${record.certificateImage}" data-accounting-title="صورة الشهادة">عرض</button>
                                        </div>
                                    </div>
                                ` : ''}
                                ${record.inspectionImage ? `
                                    <div class="detail-item" style="padding: 12px; align-items: flex-start; gap: 10px;">
                                        <label>صورة المعاينة</label>
                                        <div style="display: flex; gap: 8px; align-items: center; width: 100%;">
                                            <img src="${record.inspectionImage}" alt="صورة المعاينة" data-accounting-image="${record.inspectionImage}" data-accounting-title="صورة المعاينة" class="accounting-image-trigger" style="flex: 1; max-width: 180px; max-height: 180px; border-radius: 10px; border: 1px solid var(--border-color); object-fit: cover; cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease;" onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 8px 18px rgba(15, 23, 42, 0.18)';" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';" />
                                            <button type="button" class="btn secondary accounting-image-show-button" data-accounting-image="${record.inspectionImage}" data-accounting-title="صورة المعاينة">عرض</button>
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                `;

                    const existingDetail = body.querySelector('.accounting-record-detail');
                    if (existingDetail) existingDetail.remove();

                    const wrapper = document.createElement('div');
                    wrapper.className = 'accounting-record-detail';
                    wrapper.innerHTML = detailHtml;
                    body.appendChild(wrapper);
                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                    return;
                }

                if (editButton) {
                    const id = Number(editButton.getAttribute('data-id'));
                    const record = getAccountingRequests().find(item => Number(item.id) === id);
                    if (!record) return;

                    renderAccountingRegistrationSection();
                    setTimeout(() => {
                        const fieldIds = [
                            'client-name', 'address', 'card-number', 'order-number', 'inspection-receipt', 'mobile',
                            'east-boundary', 'west-boundary', 'north-boundary', 'south-boundary', 'model-number',
                            'registration-number', 'issue-date', 'inspection-completion-date', 'owner-name'
                        ];

                        fieldIds.forEach(field => {
                            const input = document.getElementById(`accounting-${field}`) as HTMLInputElement | HTMLTextAreaElement | null;
                            if (input) input.value = record[field] || '';
                        });

                        const clientStatus = document.getElementById('accounting-client-status') as HTMLSelectElement | null;
                        if (clientStatus) clientStatus.value = record['client-description'] || '';

                        const locationType = document.getElementById('accounting-location-type') as HTMLSelectElement | null;
                        if (locationType) locationType.value = record['location-description'] || '';

                        const meterCount = document.getElementById('accounting-meter-count') as HTMLSelectElement | null;
                        const meterDetails = Array.isArray(record['meter-details']) && record['meter-details'].length
                            ? record['meter-details']
                            : Array.isArray(record['meter-numbers'])
                                ? record['meter-numbers'].map((number: string, index: number) => ({ number, locationType: record['meter-location-types']?.[index] || '' }))
                                : (record['meter-number'] ? [{ number: record['meter-number'], locationType: record['location-description'] || '' }] : [{ number: '', locationType: record['location-description'] || '' }]);
                        const meterNumbers = meterDetails.map((item: any) => item.number || '').filter(Boolean);
                        const meterLocationTypes = meterDetails.map((item: any) => item.locationType || '');
                        if (meterCount) {
                            meterCount.value = String(Number(record['meter-count']) || meterNumbers.length || 1);
                            renderMeterNumberInputs(Number(meterCount.value), meterNumbers, meterLocationTypes);
                        }

                        const idInput = document.getElementById('accounting-record-id') as HTMLInputElement | null;
                        if (idInput) idInput.value = String(record.id || '');

                        const modelPreview = document.getElementById('accounting-model-preview');
                        const certificatePreview = document.getElementById('accounting-certificate-preview');
                        const inspectionPreview = document.getElementById('accounting-inspection-preview');
                        if (modelPreview && record.modelImage) {
                            modelPreview.innerHTML = `<img src="${record.modelImage}" alt="معاينة النموذج" style="max-width: 220px; max-height: 180px; border-radius: 10px; border: 1px solid var(--border-color); object-fit: cover;" />`;
                        }
                        if (certificatePreview && record.certificateImage) {
                            certificatePreview.innerHTML = `<img src="${record.certificateImage}" alt="معاينة الشهادة" style="max-width: 220px; max-height: 180px; border-radius: 10px; border: 1px solid var(--border-color); object-fit: cover;" />`;
                        }
                        if (inspectionPreview && record.inspectionImage) {
                            inspectionPreview.innerHTML = `<img src="${record.inspectionImage}" alt="معاينة الصورة" style="max-width: 220px; max-height: 180px; border-radius: 10px; border: 1px solid var(--border-color); object-fit: cover;" />`;
                        }

                        const cancelBtn = document.getElementById('accounting-cancel-edit');
                        if (cancelBtn) cancelBtn.classList.remove('hidden');
                    }, 0);
                    return;
                }

                if (deleteButton) {
                    const id = Number(deleteButton.getAttribute('data-id'));
                    const updatedRecords = getAccountingRequests().filter(item => Number(item.id) !== id);
                    saveAccountingRequests(updatedRecords);
                    showToast('تم حذف السجل بنجاح.', 'success');
                    renderTable(updatedRecords);
                }
            });
        };

        if (!records.length) {
            renderTable([]);
            return;
        }

        renderTable(records);
    };

    const renderAccountingQuerySection = () => {
        document.querySelectorAll('.content-section.active').forEach(section => section.classList.remove('active'));
        const section = document.getElementById('accounting-query');
        if (!section) return;
        section.classList.add('active');
        setPageTitle('استعلام متعدد');

        const body = section.querySelector('.accounting-query-body');
        if (!body) return;

        body.innerHTML = `
        <div class="info-card">
            <h4>بحث متعدد في تسجيلات نظام المحاسبة</h4>
            <form id="accounting-query-form" class="form-grid" novalidate>
                <div class="input-group">
                    <label for="accounting-query-client-name">اسم العميل</label>
                    <input id="accounting-query-client-name" type="text" placeholder="ابحث باسم العميل">
                </div>
                <div class="input-group">
                    <label for="accounting-query-address">العنوان</label>
                    <input id="accounting-query-address" type="text" placeholder="ابحث بالعنوان">
                </div>
                <div class="input-group">
                    <label for="accounting-query-card-number">رقم البطاقة</label>
                    <input id="accounting-query-card-number" type="text" placeholder="ابحث برقم البطاقة">
                </div>
                <div class="input-group">
                    <label for="accounting-query-order-number">رقم الطلب</label>
                    <input id="accounting-query-order-number" type="text" placeholder="ابحث برقم الطلب">
                </div>
                <div class="input-group">
                    <label for="accounting-query-meter-number">رقم العداد</label>
                    <input id="accounting-query-meter-number" type="text" placeholder="ابحث برقم العداد">
                </div>
                <div class="input-group">
                    <label for="accounting-query-mobile">رقم الموبايل</label>
                    <input id="accounting-query-mobile" type="text" placeholder="ابحث برقم الموبايل">
                </div>
                <div class="input-group">
                    <label for="accounting-query-registration-number">رقم القيد</label>
                    <input id="accounting-query-registration-number" type="text" placeholder="ابحث برقم القيد">
                </div>
                <div class="input-group">
                    <label for="accounting-query-inspection-receipt">رقم إيصال المعاينة</label>
                    <input id="accounting-query-inspection-receipt" type="text" placeholder="ابحث برقم إيصال المعاينة">
                </div>
                <div class="input-group" style="grid-column: 1 / -1; display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="submit" class="btn">بحث</button>
                    <button type="button" id="accounting-query-reset" class="btn secondary">مسح</button>
                </div>
            </form>
            <div id="accounting-query-result" style="margin-top: 20px;"></div>
        </div>
    `;

        const form = document.getElementById('accounting-query-form') as HTMLFormElement | null;
        const result = document.getElementById('accounting-query-result');
        const resetBtn = document.getElementById('accounting-query-reset');

        const normalize = (value?: string) => (value || '').trim().toLowerCase();

        const displayResults = (records: Record<string, any>[]) => {
            if (!result) return;
            if (!records.length) {
                result.innerHTML = '<div class="no-results-message">لا توجد نتائج مطابقة لمعايير البحث.</div>';
                return;
            }

            result.innerHTML = records.map(record => `
            <div class="statement-result-card" style="margin-top: 12px;">
                <h4>اسم العميل: ${record['client-name'] || '-'}</h4>
                <div class="details-grid">
                    <div class="detail-item"><label>العنوان</label><span class="value">${record['address'] || '-'}</span></div>
                    <div class="detail-item"><label>رقم البطاقة</label><span class="value">${record['card-number'] || '-'}</span></div>
                    <div class="detail-item"><label>رقم الطلب</label><span class="value">${record['order-number'] || '-'}</span></div>
                    <div class="detail-item"><label>صفة العميل</label><span class="value">${record['client-description'] || '-'}</span></div>
                    <div class="detail-item"><label>اسم المالك</label><span class="value">${record['owner-name'] || '-'}</span></div>
                    <div class="detail-item"><label>وصف المكان</label><span class="value">${record['location-description'] || '-'}</span></div>
                    <div class="detail-item"><label>رقم النموذج</label><span class="value">${record['model-number'] || '-'}</span></div>
                    <div class="detail-item"><label>عدد العدادات</label><span class="value">${record['meter-count'] || (Array.isArray(record['meter-numbers']) ? record['meter-numbers'].length : 1)}</span></div>
                    <div class="detail-item"><label>أرقام العدادات</label><span class="value">${Array.isArray(record['meter-numbers']) && record['meter-numbers'].length ? record['meter-numbers'].join(' / ') : (record['meter-number'] || '-')}</span></div>
                    <div class="detail-item"><label>رقم الموبايل</label><span class="value">${record['mobile'] || '-'}</span></div>
                    <div class="detail-item"><label>رقم القيد</label><span class="value">${record['registration-number'] || '-'}</span></div>
                    <div class="detail-item"><label>تاريخ الصدور</label><span class="value">${record['issue-date'] || '-'}</span></div>
                    <div class="detail-item"><label>تاريخ المعاينة</label><span class="value">${record['inspection-completion-date'] || '-'}</span></div>
                </div>
            </div>
        `).join('');
        };

        form?.addEventListener('submit', (event) => {
            event.preventDefault();
            const filters = {
                clientName: normalize((document.getElementById('accounting-query-client-name') as HTMLInputElement)?.value),
                address: normalize((document.getElementById('accounting-query-address') as HTMLInputElement)?.value),
                cardNumber: normalize((document.getElementById('accounting-query-card-number') as HTMLInputElement)?.value),
                orderNumber: normalize((document.getElementById('accounting-query-order-number') as HTMLInputElement)?.value),
                meterNumber: normalize((document.getElementById('accounting-query-meter-number') as HTMLInputElement)?.value),
                mobile: normalize((document.getElementById('accounting-query-mobile') as HTMLInputElement)?.value),
                registrationNumber: normalize((document.getElementById('accounting-query-registration-number') as HTMLInputElement)?.value),
                inspectionReceipt: normalize((document.getElementById('accounting-query-inspection-receipt') as HTMLInputElement)?.value),
            };

            const records = getAccountingRequests().filter(record => {
                const matches = [
                    !filters.clientName || normalize(record['client-name']).includes(filters.clientName),
                    !filters.address || normalize(record.address).includes(filters.address),
                    !filters.cardNumber || normalize(record['card-number']).includes(filters.cardNumber),
                    !filters.orderNumber || normalize(record['order-number']).includes(filters.orderNumber),
                    !filters.meterNumber || normalize(record['meter-number']).includes(filters.meterNumber),
                    !filters.mobile || normalize(record.mobile).includes(filters.mobile),
                    !filters.registrationNumber || normalize(record['registration-number']).includes(filters.registrationNumber),
                    !filters.inspectionReceipt || normalize(record['inspection-receipt']).includes(filters.inspectionReceipt),
                ];
                return matches.every(Boolean);
            });

            displayResults(records);
        });

        resetBtn?.addEventListener('click', () => {
            form?.reset();
            if (result) result.innerHTML = '';
        });
    };

    const renderAccountingSaveRegistrationSection = renderAccountingRegistrationSection;

    const renderAccountingSystemPage = () => {
        renderAccountingSystemSection();
    };


    const renderSettingsSection = () => {
        // Inject containers for new signature sections if they don't exist
        const signatureKeys: SettingsListKey[] = ['judicialSignatures', 'collectionSignatures', 'mukayasatSignatures', 'faultyMeterSignatures', 'meterSupplyCompanies', 'councilNames'];
        const referenceContainer = document.getElementById('replacementSignatures-list-container');

        if (referenceContainer && referenceContainer.parentElement) {
            signatureKeys.forEach(key => {
                if (!document.getElementById(`${key}-list-container`)) {
                    const div = document.createElement('div');
                    div.id = `${key}-list-container`;
                    div.className = 'managed-list-container';
                    div.style.marginTop = '20px';

                    let title = '';
                    switch (key) {
                        case 'judicialSignatures': title = 'توقيعات الضبطية القضائية'; break;
                        case 'collectionSignatures': title = 'توقيعات التحصيل'; break;
                        case 'mukayasatSignatures': title = 'توقيعات المعاينات'; break;
                        case 'faultyMeterSignatures': title = 'توقيعات العدادات المرفوعة أعطال'; break;
                        case 'meterSupplyCompanies': title = 'شركات توريد العدادات'; break;
                        case 'councilNames': title = 'أسماء المجالس القروية'; break;
                    }

                    div.innerHTML = `
                    <h4>${title}</h4>
                    <ul></ul>
                    <div class="add-item-form">
                        <input type="text" id="new-${key}-input" placeholder="${key === 'councilNames' ? 'اسم مجلس قروي جديد...' : 'توقيع جديد...'}">
                        <button class="btn" data-list="${key}">إضافة</button>
                    </div>
                `;
                    referenceContainer.parentElement?.insertBefore(div, referenceContainer.nextSibling);
                }
            });
        }

        // Inject Error Codes Management
        if (!document.getElementById('error-codes-management-container')) {
            const div = document.createElement('div');
            div.id = 'error-codes-management-container';
            div.className = 'managed-list-container';
            div.style.marginTop = '20px';
            div.innerHTML = `
            <h4>إدارة أكواد الخطأ</h4>
            <div class="responsive-table">
                <table class="data-table" id="settings-error-codes-table" style="width: 100%;">
                    <thead><tr><th>نوع العداد</th><th>الكود</th><th>الوصف</th><th>الإجراء</th><th>إجراءات</th></tr></thead>
                    <tbody></tbody>
                </table>
            </div>
            <div class="add-item-form" style="display: grid; grid-template-columns: 1fr 1fr 2fr 2fr auto; gap: 10px; margin-top: 10px;">
                <input type="hidden" id="edit-error-code-index" value="-1">
                <select id="new-error-meter-type"></select>
                <input type="text" id="new-error-code" placeholder="الكود">
                <input type="text" id="new-error-desc" placeholder="الوصف">
                <input type="text" id="new-error-action" placeholder="الإجراء المقترح">
                <div style="display: flex; gap: 5px;">
                    <button class="btn btn-secondary hidden" id="cancel-error-code-edit-btn">إلغاء</button>
                    <button class="btn" id="add-error-code-btn">إضافة</button>
                </div>
            </div>
        `;
            referenceContainer?.parentElement?.appendChild(div);
            populateSelect(document.getElementById('new-error-meter-type') as HTMLSelectElement, ['الكل', ...state.settings.errorCodeMeterTypes]);
        }

        // Inject Meter Pages Management
        if (!document.getElementById('meter-pages-management-container')) {
            const div = document.createElement('div');
            div.id = 'meter-pages-management-container';
            div.className = 'managed-list-container';
            div.style.marginTop = '20px';
            div.innerHTML = `
            <h4>إدارة صفحات العدادات</h4>
            <div class="responsive-table">
                <table class="data-table" id="settings-meter-pages-table" style="width: 100%;">
                    <thead><tr><th>العنوان</th><th>الدليل</th><th>الشركة المصنعة</th><th>عدد الشاشات</th><th>الأعطال الشائعة</th><th>صورة</th><th>إجراءات</th></tr></thead>
                    <tbody></tbody>
                </table>
            </div>
            <div class="add-item-form" style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
                <input type="hidden" id="edit-meter-page-index" value="-1">
                <input type="text" id="new-meter-page-title" placeholder="عنوان الصفحة / العداد">
                <textarea id="new-meter-page-content" placeholder="المحتوى / الدليل" rows="3"></textarea>
                <input type="text" id="new-meter-page-manufacturer" placeholder="الشركة المصنعة">
                <textarea id="new-meter-page-common-issues" placeholder="الأعطال الشائعة" rows="2"></textarea>
                <textarea id="new-meter-page-structure" placeholder="وصف شاشات العداد (كل سطر يمثل صفحة، ورقم الصفحة هو ترتيب السطر)&#10;مثال:&#10;رقم الشاسية&#10;كود الاشتراك&#10;الرصيد المتبقي" rows="4"></textarea>
                <div class="input-group">
                    <label for="new-meter-page-image">صورة العداد</label>
                    <input type="file" id="new-meter-page-image" accept="image/*">
                </div>
                <div style="display: flex; gap: 10px; align-self: flex-end;">
                    <button class="btn btn-secondary hidden" id="cancel-meter-page-edit-btn">إلغاء</button>
                    <button class="btn btn-delete" id="clear-all-meter-pages-btn" style="background-color: #dc3545;">حذف الكل</button>
                    <button class="btn" id="add-meter-page-btn">إضافة</button>
                </div>
            </div>
        `;
            referenceContainer?.parentElement?.appendChild(div);
        }
        // Add new list keys for transformer management
        const listKeys: (SettingsListKey | 'roles')[] = ['roles', 'technicians', 'technicalEngineers', 'headEngineers', 'addresses', 'placeDescriptions', 'councilNames', 'transformerTypes', 'currentTransformerCapacities', 'subscriptionTypes', 'meterTypes', 'errorCodeMeterTypes', 'meterCapacities', 'activityTypes', 'repairStatuses', 'removalReasons', 'replacementSignatures', 'generalSignatures', 'cardStatuses', 'memoTypes', 'judicialSignatures', 'collectionSignatures', 'mukayasatSignatures', 'faultyMeterSignatures', 'meterSupplyCompanies'];

        listKeys.forEach(key => renderManagedList(key));

        // ربط أزرار القوائم بعد كل عملية إعادة رسم لضمان عملها للعناصر الديناميكية
        (['addresses', 'meterSupplyCompanies'] as const).forEach(listKey => {
            const listContainer = document.getElementById(`${listKey}-list-container`);
            if (!listContainer) return;

            const addButton = listContainer.querySelector('.add-item-form .btn') as HTMLButtonElement | null;
            if (addButton) {
                addButton.onclick = (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleAddItemToList(listKey);
                };
            }

            listContainer.querySelectorAll<HTMLButtonElement>('.managed-list .btn-delete').forEach(deleteButton => {
                deleteButton.onclick = (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleDeleteItemFromList(listKey, deleteButton.dataset.key || '');
                };
            });
        });

        // Render Error Codes Table in Settings
        const errorCodesTbody = document.querySelector('#settings-error-codes-table tbody');
        if (errorCodesTbody) {
            errorCodesTbody.innerHTML = '';
            (state.settings.errorCodes || []).forEach((item, index) => {
                errorCodesTbody.innerHTML += `
                <tr>
                    <td>${item.meterType}</td>
                    <td>${item.code}</td>
                    <td>${item.description}</td>
                    <td>${item.action}</td>
                    <td style="display: flex; gap: 5px;">
                        <button class="btn btn-edit-details edit-error-code-btn" data-index="${index}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                        <button class="btn btn-delete delete-error-code-btn" data-index="${index}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2"></path></svg></button>
                    </td>
                </tr>
            `;
            });
        }

        // Render Meter Pages Table in Settings
        const meterPagesTbody = document.querySelector('#settings-meter-pages-table tbody');
        if (meterPagesTbody) {
            meterPagesTbody.innerHTML = '';
            (state.settings.meterPages || []).forEach((item, index) => {
                meterPagesTbody.innerHTML += `
                <tr>
                    <td>${item.title}</td>
                    <td>${item.content.substring(0, 30)}...</td>
                    <td>${item.manufacturer}</td>
                    <td>${(item.pageStructure || '').split('\n').filter(l => l.trim()).length}</td>
                    <td>${item.commonIssues.substring(0, 30)}...</td>
                    <td>${item.image ? '<img src="' + item.image + '" style="max-height: 30px;">' : '-'}</td>
                    <td style="display: flex; gap: 5px;">
                        <button class="btn btn-edit-details edit-meter-page-btn" data-index="${index}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                        <button class="btn btn-delete delete-meter-page-btn" data-index="${index}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2"></path></svg></button>
                    </td>
                </tr>
            `;
            });
        }

        // Populate general settings
        (document.getElementById('settings-company-name') as HTMLTextAreaElement).value = state.settings.companyName;

        // Populate report settings
        (document.getElementById('report-header-text') as HTMLTextAreaElement).value = state.settings.reportHeaderText;
        (document.getElementById('replacement-report-company-name') as HTMLInputElement).value = state.settings.replacementReportCompanyName;
        (document.getElementById('replacement-report-footer-text') as HTMLTextAreaElement).value = state.settings.replacementReportFooterText;

        // Render company logo preview
        const logoPreview = document.getElementById('logo-preview');
        if (logoPreview) {
            if (state.settings.companyLogo) {
                logoPreview.innerHTML = `<img src="${state.settings.companyLogo}" alt="Company Logo Preview">`;
            } else {
                logoPreview.innerHTML = `<span class="placeholder-text">لا يوجد شعار حالي</span>`;
            }
        }

        // Populate logo size slider
        const logoSizeSlider = document.getElementById('logo-size-slider') as HTMLInputElement;
        const logoSizeValue = document.getElementById('logo-size-value');
        if (logoSizeSlider && logoSizeValue) {
            logoSizeSlider.value = String(state.settings.companyLogoSize);
            logoSizeValue.textContent = `${state.settings.companyLogoSize}%`;
        }

        // Populate dashboard visibility settings
        const visibilityContainer = document.getElementById('dashboard-visibility-settings');
        if (visibilityContainer) {
            const cardVisibilitySettings = state.settings.dashboardCardsVisibility;
            const cardLabels: { [key: string]: string } = {
                'all-subscribers-card': 'بطاقة جميع المشتركين',
                'new-meters-card': 'بطاقة عدادات جديدة',
                'lifted-meters-card': 'بطاقة عدادات مرفوعة',
                'replacement-card': 'بطاقة إحلال وتجديد',
                'scrapped-meters-card': 'بطاقة عدادات متهالكة',
                'users-card': 'بطاقة المستخدمين',
                'repairs-card': 'بطاقة الإصلاحات',
                'lost-memos-card': 'بطاقة مذكرات الفقد',
                'judicial-control-card': 'بطاقة الضبطية القضائية',
                'mukayasat-card': 'بطاقة المعاينات',
                'judicial-collection-card': 'بطاقة تحصيل الضبطية',
                'zinat-collection-card': 'بطاقة تحصيل زينات',
                'zinat-registration-card': 'بطاقة إضافة زينات',
            };

            visibilityContainer.innerHTML = '';

            Object.keys(cardLabels).forEach(key => {
                if (key in cardVisibilitySettings) {
                    const labelText = cardLabels[key];
                    const isChecked = (cardVisibilitySettings as any)[key] !== false; // Default to checked
                    const checkboxHTML = `
                    <div class="checkbox-group">
                        <label>
                            <input type="checkbox" class="dashboard-visibility-toggle" data-key="${key}" ${isChecked ? 'checked' : ''}>
                            <span>${labelText}</span>
                        </label>
                    </div>
                `;
                    visibilityContainer.insertAdjacentHTML('beforeend', checkboxHTML);
                }
            });
        }
    };

    const handleSaveReportSettings = () => {
        const headerText = (document.getElementById('report-header-text') as HTMLTextAreaElement).value;

        state.settings.reportHeaderText = headerText;

        saveState();
        showToast('تم حفظ إعدادات التقارير بنجاح.');
    }

    const handleSaveCompanyReportSettings = () => {
        state.settings.companyName = (document.getElementById('settings-company-name') as HTMLTextAreaElement).value;

        state.settings.replacementReportCompanyName = (document.getElementById('replacement-report-company-name') as HTMLInputElement).value;
        state.settings.replacementReportFooterText = (document.getElementById('replacement-report-footer-text') as HTMLTextAreaElement).value;

        saveState();
        updateUI(); // To update company name in header/sidebar
        showToast('تم حفظ إعدادات الشركة والتقارير بنجاح.');
    };

    // --- إدارة المستخدمين ---
    const renderUserManagementSection = () => {
        const tableBody = document.querySelector('#users-table tbody');
        if (!tableBody) return;

        document.querySelector('#users-table thead')!.innerHTML = `
        <tr>
            <th>الاسم الكامل</th>
            <th>اسم المستخدم</th>
            <th>الدور الوظيفي</th>
            <th>إجراءات</th>
        </tr>
    `;

        tableBody.innerHTML = '';
        state.users.forEach(user => {
            const role = state.settings.roles.find(r => r.key === user.role);
            const roleName = role ? role.name : user.role;
            const row = document.createElement('tr');
            row.innerHTML = ` 
            <td>${user.fullName}</td>
            <td>${user.username}</td>
            <td>${roleName}</td>
            <td class="actions-cell">
                ${(loggedInUser?.username === 'admin' || loggedInUser?.role === 'admin') ? `<button class="btn btn-edit-details" data-id="${user.id}">تعديل</button>` : ''}
                ${user.username !== 'admin' && (loggedInUser?.username === 'admin' || loggedInUser?.role === 'admin') ? `<button class="btn btn-delete" data-id="${user.id}">حذف</button>` : ''}
            </td>
        `;
            tableBody.appendChild(row);
        });

        const form = document.getElementById('user-form') as HTMLFormElement;
        form.reset();
        clearFormErrors(form);
        (form.querySelector('#user-id') as HTMLInputElement).value = '';
        const roleSelect = form.querySelector('#user-role') as HTMLSelectElement;
        roleSelect.disabled = false;

        // Populate roles dropdown
        roleSelect.innerHTML = '';
        state.settings.roles.forEach(role => {
            const option = document.createElement('option');
            option.value = role.key;
            option.textContent = role.name;
            roleSelect.appendChild(option);
        });

        // Hide form for non-admins
        const userFormContainer = document.querySelector('#user-management .form-container');
        if (userFormContainer) {
            (userFormContainer as HTMLElement).style.display = (loggedInUser?.username === 'admin' || loggedInUser?.role === 'admin') ? 'block' : 'none';
        }
    };

    const handleUserFormSubmit = (event: Event) => {
        event.preventDefault();
        const form = event.target as HTMLFormElement;

        if (!validateForm(form)) {
            showToast('يرجى تصحيح الأخطاء في النموذج.', 'error');
            return;
        }

        const idInput = form.querySelector('#user-id') as HTMLInputElement;
        const id = idInput.value ? parseInt(idInput.value, 10) : Date.now();
        const fullName = (form.querySelector('#user-fullName') as HTMLInputElement).value;
        const username = (form.querySelector('#user-username') as HTMLInputElement).value;
        const role = (form.querySelector('#user-role') as HTMLSelectElement).value;
        const password = (form.querySelector('#user-password') as HTMLInputElement).value;

        const existingUser = state.users.find(u => u.username === username && u.id !== id);
        if (existingUser) {
            showFieldError(form.querySelector('#user-username')!, 'اسم المستخدم هذا موجود بالفعل.');
            showToast('اسم المستخدم هذا موجود بالفعل.', 'error');
            return;
        }

        const userIndex = state.users.findIndex(u => u.id === id);

        if (userIndex > -1) { // Editing
            const user = state.users[userIndex];
            user.fullName = fullName;
            user.username = username;
            // The main admin's role cannot be changed
            if (user.username !== 'admin') {
                user.role = role;
            }
            if (password) {
                user.password = password;
            }

            const originalUser = { ...state.users[userIndex] }; // Make a copy before updating
            state.users[userIndex] = user;


            const changes: string[] = [];
            if (originalUser.fullName !== fullName) changes.push(`الاسم الكامل: من "${originalUser.fullName}" إلى "${fullName}"`);
            if (originalUser.username !== username) changes.push(`اسم المستخدم: من "${originalUser.username}" إلى "${username}"`);
            if (originalUser.role !== role) changes.push(`الدور الوظيفي: من "${originalUser.role}" إلى "${role}"`);
            if (password) changes.push('تم تغيير كلمة المرور');

            const changeSummary = changes.length > 0 ? changes.join(' | ') : 'لم يتم تغيير أي بيانات.';
            logActivity('تعديل مستخدم', `تعديل بيانات المستخدم "${originalUser.fullName}"`, changeSummary);
            showToast('تم تحديث المستخدم بنجاح.');
        } else { // Adding
            if (!password) {
                showFieldError(form.querySelector('#user-password')!, 'كلمة المرور مطلوبة للمستخدم الجديد.');
                showToast('كلمة المرور مطلوبة للمستخدم الجديد.', 'error');
                return;
            }
            state.users.push({ id, fullName, username, password, role });
            logActivity('إضافة مستخدم', `إضافة مستخدم جديد: "${fullName}".`, `اسم المستخدم: ${username}, الدور الوظيفي: ${role}`);
            showToast('تمت إضافة المستخدم بنجاح.');
        }

        saveState();
        renderUserManagementSection();
        populateUserDropdown(); // Update login screen dropdown
    };

    const openUserFormForEdit = (userId: number) => {
        const user = state.users.find(u => u.id === userId);
        if (!user) return;

        const form = document.getElementById('user-form') as HTMLFormElement;
        clearFormErrors(form);
        (form.querySelector('#user-id') as HTMLInputElement).value = String(user.id);
        (form.querySelector('#user-fullName') as HTMLInputElement).value = user.fullName;
        (form.querySelector('#user-username') as HTMLInputElement).value = user.username;
        (form.querySelector('#user-role') as HTMLSelectElement).value = user.role;
        (form.querySelector('#user-password') as HTMLInputElement).value = '';
        (form.querySelector('#user-confirmPassword') as HTMLInputElement).value = '';

        // Admin user cannot have role changed
        const roleSelect = form.querySelector('#user-role') as HTMLSelectElement;
        roleSelect.disabled = (user.username === 'admin');

        setPageTitle('تعديل مستخدم');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const deleteUser = (userId: number) => {
        const user = state.users.find(u => u.id === userId);
        if (!user) return;

        if (user.username === 'admin') {
            showToast('لا يمكن حذف حساب المدير.', 'error');
            return;
        }

        const onConfirm = () => {
            state.users = state.users.filter(u => u.id !== userId);
            const summary = `اسم المستخدم: ${user.username}, الدور الوظيفي: ${user.role}`;
            logActivity('حذف مستخدم', `حذف المستخدم "${user.fullName}".`, summary);
            saveState();
            showToast('تم حذف المستخدم بنجاح.');
            renderUserManagementSection();
            populateUserDropdown();
        };

        showConfirmationDialog(
            'تأكيد حذف المستخدم',
            `هل أنت متأكد من حذف المستخدم "${user.fullName}"؟ لا يمكن التراجع عن هذا الإجراء.`,
            onConfirm
        );
    };

    const handlePermissionChange = (event: Event) => {
        const checkbox = event.target as HTMLInputElement;
        const roleKey = checkbox.dataset.role!;
        const permissionKey = checkbox.dataset.permission as keyof typeof state.settings.permissions;
        const isChecked = checkbox.checked;

        const permission = state.settings.permissions[permissionKey];
        if (!permission) return;

        if (isChecked) {
            // Add role to permission if it doesn't exist
            if (!permission.roles.includes(roleKey)) {
                permission.roles.push(roleKey);
            }
        } else {
            // Remove role from permission
            const index = permission.roles.indexOf(roleKey);
            if (index > -1) {
                permission.roles.splice(index, 1);
            }
        }
        saveState();
        updateUI();
        showToast('تم تحديث الصلاحيات بنجاح.');
    };

    const renderDashboardPermissionsSection = () => {
        const container = document.getElementById('dashboard-permissions-container');
        if (!container) return;

        container.innerHTML = ''; // Clear previous content

        const roles = state.settings.roles;
        const permissions = state.settings.dashboardPermissions;

        const table = document.createElement('table');
        table.className = 'permissions-table';

        // Header Row
        const thead = document.createElement('thead');
        let headerRow = '<tr><th>صلاحية عرض البطاقة</th>';
        roles.forEach(role => {
            headerRow += `<th>${role.name}</th>`;
        });
        headerRow += '</tr>';
        thead.innerHTML = headerRow;
        table.appendChild(thead);

        // Body Rows
        const tbody = document.createElement('tbody');
        Object.keys(permissions).forEach(permissionKey => {
            const permission = permissions[permissionKey as keyof typeof permissions];
            let bodyRow = `<tr><td>${permission.name}</td>`;
            roles.forEach(role => {
                const isChecked = permission.roles.includes(role.key);
                const isDisabled = role.key === 'admin'; // Admin role is always checked and disabled
                bodyRow += `<td><label class="switch"><input type="checkbox" data-type="dashboard" data-role="${role.key}" data-permission="${permissionKey}" ${isChecked ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}><span class="slider round"></span></label></td>`;
            });
            bodyRow += '</tr>';
            tbody.innerHTML += bodyRow;
        });
        table.appendChild(tbody);
        container.appendChild(table);
    };

    const renderButtonPermissionsSection = () => {
        const container = document.getElementById('button-permissions-container');
        if (!container) return;

        container.innerHTML = ''; // Clear previous content

        const roles = state.settings.roles;
        const permissions = state.settings.buttonPermissions;

        const table = document.createElement('table');
        table.className = 'permissions-table';

        // Header Row
        const thead = document.createElement('thead');
        let headerRow = '<tr><th>الصلاحية</th>';
        roles.forEach(role => {
            headerRow += `<th>${role.name}</th>`;
        });
        headerRow += '</tr>';
        thead.innerHTML = headerRow;
        table.appendChild(thead);

        // Body Rows
        const tbody = document.createElement('tbody');
        Object.keys(permissions).forEach(permissionKey => {
            const permission = permissions[permissionKey as keyof typeof permissions];
            let bodyRow = `<tr><td>${permission.name}</td>`;
            roles.forEach(role => {
                const isChecked = permission.roles.includes(role.key);
                const isDisabled = role.key === 'admin'; // Admin role is always checked and disabled
                bodyRow += `<td><label class="switch"><input type="checkbox" data-type="button" data-role="${role.key}" data-permission="${permissionKey}" ${isChecked ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}><span class="slider round"></span></label></td>`;
            });
            bodyRow += '</tr>';
            tbody.innerHTML += bodyRow;
        });
        table.appendChild(tbody);
        container.appendChild(table);
    };

    const renderReportPermissionsSection = () => {
        const container = document.getElementById('report-permissions-container');
        if (!container) return;

        container.innerHTML = ''; // Clear previous content

        const roles = state.settings.roles;
        const permissions = state.settings.reportPermissions;

        const table = document.createElement('table');
        table.className = 'permissions-table';

        // Header Row
        const thead = document.createElement('thead');
        let headerRow = '<tr><th>صلاحية عرض التقرير</th>';
        roles.forEach(role => {
            headerRow += `<th>${role.name}</th>`;
        });
        headerRow += '</tr>';
        thead.innerHTML = headerRow;
        table.appendChild(thead);

        // Body Rows
        const tbody = document.createElement('tbody');
        Object.keys(permissions).forEach(permissionKey => {
            const permission = permissions[permissionKey as keyof typeof permissions];
            let bodyRow = `<tr><td>${permission.name}</td>`;
            roles.forEach(role => {
                const isChecked = permission.roles.includes(role.key);
                const isDisabled = role.key === 'admin'; // Admin role is always checked and disabled
                bodyRow += `<td><label class="switch"><input type="checkbox" data-type="report" data-role="${role.key}" data-permission="${permissionKey}" ${isChecked ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}><span class="slider round"></span></label></td>`;
            });
            bodyRow += '</tr>';
            tbody.innerHTML += bodyRow;
        });
        table.appendChild(tbody);
        container.appendChild(table);
    };

    const handleDashboardPermissionChange = (event: Event) => {
        const checkbox = event.target as HTMLInputElement;
        const roleKey = checkbox.dataset.role!;
        const permissionKey = checkbox.dataset.permission as keyof typeof state.settings.dashboardPermissions;
        const isChecked = checkbox.checked;

        const permission = state.settings.dashboardPermissions[permissionKey];
        if (!permission) return;

        if (isChecked) {
            // Add role to permission if it doesn't exist
            if (!permission.roles.includes(roleKey)) {
                permission.roles.push(roleKey);
            }
        } else {
            // Remove role from permission
            const index = permission.roles.indexOf(roleKey);
            if (index > -1) {
                permission.roles.splice(index, 1);
            }
        }
        saveState();
        updateUI();
        showToast('تم تحديث صلاحيات لوحة التحكم بنجاح.');
    };

    const handleButtonPermissionChange = (event: Event) => {
        const checkbox = event.target as HTMLInputElement;
        const roleKey = checkbox.dataset.role!;
        const permissionKey = checkbox.dataset.permission as keyof typeof state.settings.buttonPermissions;
        const isChecked = checkbox.checked;

        const permission = state.settings.buttonPermissions[permissionKey];
        if (!permission) return;

        if (isChecked) {
            // Add role to permission if it doesn't exist
            if (!permission.roles.includes(roleKey)) {
                permission.roles.push(roleKey);
            }
        } else {
            // Remove role from permission
            const index = permission.roles.indexOf(roleKey);
            if (index > -1) {
                permission.roles.splice(index, 1);
            }
        }
        saveState();
        updateUI();
        showToast('تم تحديث صلاحيات الأزرار بنجاح.');
    };

    const handleReportPermissionChange = (event: Event) => {
        const checkbox = event.target as HTMLInputElement;
        const roleKey = checkbox.dataset.role!;
        const permissionKey = checkbox.dataset.permission as keyof typeof state.settings.reportPermissions;
        const isChecked = checkbox.checked;

        const permission = state.settings.reportPermissions[permissionKey];
        if (!permission) return;

        if (isChecked) {
            // Add role to permission if it doesn't exist
            if (!permission.roles.includes(roleKey)) {
                permission.roles.push(roleKey);
            }
        } else {
            // Remove role from permission
            const index = permission.roles.indexOf(roleKey);
            if (index > -1) {
                permission.roles.splice(index, 1);
            }
        }
        saveState();
        updateUI();
        showToast('تم تحديث صلاحيات التقارير بنجاح.');
    };

    // --- استيراد وتصدير البيانات ---
    const handleExportBackup = () => {
        try {
            const dataStr = JSON.stringify(state, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
            link.download = `elmaghrabi-backup-${timestamp}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showToast('تم تصدير النسخة الاحتياطية بنجاح.');
        } catch (error) {
            console.error("Backup export failed:", error);
            showToast('فشل تصدير النسخة الاحتياطية.', 'error');
        }
    };

    const handleImportBackup = (onSuccess?: () => void) => {
        const fileInput = document.getElementById('import-backup-input') as HTMLInputElement;
        if (!fileInput) return;

        fileInput.onchange = (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const confirmationMessage = 'تحذير: سيؤدي استيراد ملف جديد إلى الكتابة فوق جميع البيانات الحالية. هل تريد المتابعة؟';
            if (!onSuccess && !confirm(confirmationMessage)) {
                fileInput.value = ''; // Reset input
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const result = e.target?.result;
                    if (typeof result !== 'string') {
                        throw new Error("File could not be read as text.");
                    }
                    const importedState = JSON.parse(result);

                    if (typeof importedState.meters !== 'object' || typeof importedState.settings !== 'object' || typeof importedState.users !== 'object') {
                        throw new Error("Invalid backup file format.");
                    }

                    state = importedState;
                    saveState();

                    if (onSuccess) {
                        showToast('تم استيراد النسخة الاحتياطية بنجاح.');
                        onSuccess();
                    } else {
                        showToast('تم استيراد النسخة الاحتياطية بنجاح. سيتم تحديث الصفحة.');
                        setTimeout(() => location.reload(), 1500);
                    }

                } catch (error) {
                    console.error("Backup import failed:", error);
                    showToast('فشل استيراد النسخة الاحتياطية. الملف تالف أو غير متوافق.', 'error');
                } finally {
                    fileInput.value = '';
                }
            };
            reader.readAsText(file);
        };

        fileInput.click();
    };


    const handleExportCSV = () => {
        if (state.meters.length === 0) {
            showToast('لا توجد بيانات عدادات لتصديرها.', 'error');
            return;
        }

        try {
            const headers = [
                'id', 'subscriberName', 'subscriptionCode', 'address', 'subscriberType',
                'meterChassisNumber', 'meterType', 'meterCapacity', 'panelNumber', 'accountReference',
                'activityType', 'subscriptionType', 'installationDate', 'installedBy', 'meterSupplyCompany', 'removalDate',
                'removedBy', 'removalReason', 'readingAtRemoval', 'cardStatus', 'demolitionDate',
                'meterReceivedBy', 'repairStatus', 'newMeterChassisNumberForReplacement'
            ];

            const csvRows = [headers.join(',')];

            state.meters.forEach(meter => {
                const values = headers.map(header => {
                    const val = meter[header] !== undefined && meter[header] !== null ? meter[header] : '';
                    const escaped = ('' + val).replace(/"/g, '""');
                    return `"${escaped}"`;
                });
                csvRows.push(values.join(','));
            });

            const csvString = csvRows.join('\n');
            const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
            const dataBlob = new Blob([bom, csvString], { type: 'text/csv;charset=utf-8;' });

            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            const timestamp = new Date().toISOString().slice(0, 10);
            link.download = `elmaghrabi-meters-${timestamp}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showToast('تم تصدير ملف CSV بنجاح.');

        } catch (error) {
            console.error("CSV export failed:", error);
            showToast('فشل تصدير ملف CSV.', 'error');
        }
    };

    /**
     * Handles starting a fresh application state from the welcome screen.
     */
    const handleStartNew = () => {
        saveState(); // Saves the default initial state
        populateUserDropdown();
        updateUI();
        showScreen('login-screen');
    };

    /**
     * Handles triggering the import process from the welcome screen.
     */
    const handleImportFromWelcome = () => {
        handleImportBackup(() => {
            // This callback runs after a successful import, avoiding a page reload.
            loadState(); // Re-load state from the newly saved localStorage
            populateUserDropdown();
            updateUI();
            showScreen('login-screen');
        });
    };

    const filterTable = (table: HTMLElement, filterValue: string) => {
        const tbody = table.querySelector('tbody');
        if (!tbody) return;
        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            const text = row.textContent?.toLowerCase() || '';
            row.style.display = text.includes(filterValue) ? '' : 'none';
        });
    };

    const formatBytes = (bytes: number, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    const renderErrorCodes = () => {
        const container = document.getElementById('help-error-codes-content');
        if (!container) return;

        // Search input
        const searchHTML = `
        <div class="input-group" style="margin-bottom: 1rem;">
            <input type="text" id="error-code-search-input" placeholder="بحث عن كود، وصف، أو إجراء..." style="flex-grow: 1; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
            <select id="error-code-meter-type-filter" style="padding: 10px; border: 1px solid #ddd; border-radius: 4px;"></select>
        </div>
    `;

        container.innerHTML = `
        <div class="card">
            <h3 style="margin-bottom: 1rem;">قائمة اكواد الخطأ الشائعة</h3>
            ${searchHTML}
            <div class="responsive-table">
                <table class="data-table" id="error-codes-table-view" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #f8f9fa;">
                            <th style="padding: 10px; border: 1px solid #ddd;">نوع العداد</th>
                            <th style="padding: 10px; border: 1px solid #ddd;">الكود</th>
                            <th style="padding: 10px; border: 1px solid #ddd;">الوصف</th>
                            <th style="padding: 10px; border: 1px solid #ddd;">الإجراء المقترح</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>
    `;

        const tbody = container.querySelector('tbody')!;
        const searchInput = document.getElementById('error-code-search-input') as HTMLInputElement;
        const meterTypeFilter = document.getElementById('error-code-meter-type-filter') as HTMLSelectElement;

        populateSelect(meterTypeFilter, ['الكل', ...state.settings.errorCodeMeterTypes], true);
        meterTypeFilter.value = 'الكل';

        const renderRows = (textFilter = '', typeFilter = 'الكل') => {
            tbody.innerHTML = '';
            const codes = state.settings.errorCodes || [];
            const filtered = codes.filter(c =>
                (c.code.toLowerCase().includes(textFilter) ||
                    c.description.toLowerCase().includes(textFilter) ||
                    c.action.toLowerCase().includes(textFilter)) &&
                (typeFilter === 'الكل' || c.meterType === typeFilter || c.meterType === 'الكل')
            );

            if (filtered.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 10px;">لا توجد نتائج</td></tr>';
                return;
            }

            filtered.forEach(c => {
                tbody.innerHTML += `
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;">${c.meterType}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${c.code}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${c.description}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${c.action}</td>
                </tr>
            `;
            });
        };

        renderRows();

        searchInput.addEventListener('input', (e) => {
            renderRows((e.target as HTMLInputElement).value.toLowerCase(), meterTypeFilter.value);
        });

        meterTypeFilter.addEventListener('change', (e) => {
            renderRows(searchInput.value.toLowerCase(), (e.target as HTMLSelectElement).value);
        });
    };

    const openMeterPageDetails = (index: number) => {
        const container = document.getElementById('help-meter-pages-content');
        if (!container) return;
        const page = state.settings.meterPages[index];
        if (!page) return;

        const lines = (page.pageStructure || '').split('\n').filter((l: string) => l.trim());
        const tableRows = lines.map((line: string, i: number) => `<tr><td style="text-align: center;">${i + 1}</td><td>${line}</td></tr>`).join('');

        container.innerHTML = `
        <div class="card">
            <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                <h3>${page.title}</h3>
                <button class="btn btn-secondary" id="back-to-meter-pages-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg> عودة
                </button>
            </div>
            <div class="card-body">
                ${page.image ? `<div style="text-align:center; margin-bottom: 20px;"><img src="${page.image}" style="max-height: 200px; max-width: 100%; border-radius: 8px; border: 1px solid #eee;"></div>` : ''}
                
                <div class="details-grid" style="margin-bottom: 20px;">
                    <fieldset><legend>معلومات عامة</legend>
                        <p><strong>الشركة المصنعة:</strong> ${page.manufacturer || '-'}</p>
                        <p><strong>الدليل:</strong> <span style="white-space: pre-wrap;">${page.content}</span></p>
                        <p><strong>أعطال شائعة:</strong> <span style="white-space: pre-wrap;">${page.commonIssues || 'لا توجد'}</span></p>
                    </fieldset>
                </div>

                <h4 style="margin-bottom: 10px; border-bottom: 2px solid #eee; padding-bottom: 5px;">شاشات العداد (الصفحات)</h4>
                <div class="responsive-table">
                    <table class="data-table" style="width: 100%;">
                        <thead>
                            <tr style="background-color: #f8f9fa;">
                                <th style="width: 80px; text-align: center;">رقم الصفحة</th>
                                <th>البيان / الوصف</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows.length ? tableRows : '<tr><td colspan="2" style="text-align: center;">لا توجد بيانات مسجلة لشاشات هذا العداد.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

        document.getElementById('back-to-meter-pages-btn')?.addEventListener('click', renderMeterPages);
    };

    const renderMeterPages = () => {
        const container = document.getElementById('help-meter-pages-content');
        if (!container) return;
        const pages = state.settings.meterPages || [];

        if (pages.length === 0) {
            container.innerHTML = '<div class="card"><p style="padding: 20px; text-align: center;">لا توجد صفحات مضافة حالياً.</p></div>';
            return;
        }

        container.innerHTML = `
        <div class="dashboard-grid">
            ${pages.map((p, index) => `
                <div class="card meter-page-card" data-index="${index}" style="cursor: pointer; transition: transform 0.2s;">
                    <div class="card-header">
                        <div class="card-icon bg-info">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2" ry="2"></rect><path d="M12 2v20"></path><path d="M2 12h20"></path></svg>
                        </div>
                        <h4>${p.title}</h4>
                    </div>
                    ${p.image ? `<div class="card-image" style="text-align: center; padding: 10px;"><img src="${p.image}" alt="${p.title}" style="max-width: 100%; max-height: 150px; object-fit: contain;"></div>` : ''}
                    <div class="card-body" style="padding: 10px; font-size: 0.9rem;">
                        <p style="margin-bottom: 0.5rem;"><strong>الشركة المصنعة:</strong> ${p.manufacturer || 'غير محدد'}</p>
                        <p style="color: #666; font-size: 0.8rem;">انقر لعرض تفاصيل الشاشات والدليل</p>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

        container.querySelectorAll('.meter-page-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const index = parseInt((e.currentTarget as HTMLElement).dataset.index!, 10);
                openMeterPageDetails(index);
            });
        });
    };

    const renderContactAdmin = () => {
        const container = document.getElementById('help-contact-admin-content');
        if (!container) return;
        container.innerHTML = `
        <div class="card" style="text-align: center; padding: 3rem; max-width: 600px; margin: 0 auto;">
            <div style="margin-bottom: 2rem; color: #3b82f6;">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </div>
            <h3 style="margin-bottom: 1rem;">للدعم الفني والاستفسارات</h3>
            <p style="margin-bottom: 2rem; color: #666;">يرجى التواصل مع مدير النظام لحل المشكلات التقنية</p>
            
            <a href="https://wa.me/201124158545" target="_blank" class="btn" style="background-color: #25D366; color: white; display: inline-flex; align-items: center; justify-content: center; gap: 10px; font-size: 1.2rem; padding: 12px 30px; border-radius: 50px; text-decoration: none; transition: transform 0.2s;">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                تواصل عبر واتساب
            </a>
            <p style="margin-top: 1rem; font-size: 1.2rem; font-weight: bold; color: #333;">01124158545</p>
            <p style="margin-top: 0.5rem; font-size: 1.1rem; font-weight: bold; color: #333;">ENG - MOSTAFA EL MGHRABI</p>
        </div>
    `;
    };

    const setupHelpSection = () => {
        // Inject Sidebar Item
        const sidebarNav = document.querySelector('.sidebar-nav');
        if (sidebarNav && !document.getElementById('help-category')) {
            const helpLi = document.createElement('li');
            helpLi.className = 'nav-category';
            helpLi.id = 'help-category';
            helpLi.setAttribute('data-permission', 'view_help_section');
            helpLi.innerHTML = `
            <details>
                <summary>
                    <div class="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    </div>
                    <span>المساعدة</span>
                    <span class="arrow">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </span>
                </summary>
                <ul class="nav-sub">
                    <li><a href="#" class="nav-link" data-target="help-error-codes"><span>اكواد الخطأ</span></a></li>
                    <li><a href="#" class="nav-link" data-target="help-meter-pages"><span>صفحات العدادات</span></a></li>
                    <li><a href="#" class="nav-link" data-target="help-contact-admin"><span>اتصل بمدير النظام</span></a></li>
                </ul>
            </details>
        `;
            sidebarNav.appendChild(helpLi);

            // Add click listeners to new links
            helpLi.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', handleNavigation);
            });
        }

        // Inject Content Sections
        const dashboardSection = document.getElementById('dashboard');
        const contentContainer = dashboardSection?.parentElement;

        if (contentContainer) {
            const sections = [
                { id: 'help-error-codes', title: 'اكواد الخطأ' },
                { id: 'help-meter-pages', title: 'صفحات العدادات' },
                { id: 'help-contact-admin', title: 'اتصل بمدير النظام' }
            ];

            sections.forEach(sec => {
                if (!document.getElementById(sec.id)) {
                    const section = document.createElement('section');
                    section.id = sec.id;
                    section.className = 'content-section';
                    section.innerHTML = `
                    <div class="main-header">
                        <h2>${sec.title}</h2>
                    </div>
                    <div class="content-body" id="${sec.id}-content"></div>
                `;
                    contentContainer.appendChild(section);
                }
            });
        }
    };

    // Helper to ensure SheetJS is loaded
    const ensureSheetJSLoaded = (): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (typeof XLSX !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('فشل تحميل مكتبة SheetJS. يرجى التحقق من الاتصال بالإنترنت.'));
            document.head.appendChild(script);
        });
    };

    const handleDownloadExcelTemplate = async () => {
        try {
            await ensureSheetJSLoaded();
            if (typeof XLSX === 'undefined') {
                throw new Error("مكتبة معالجة Excel (SheetJS) غير محملة.");
            }

            // تعريف رؤوس الأعمدة للنموذج (باللغة العربية كما هو متوقع في الاستيراد)
            const headers = [
                'اسم المشترك',
                'كود الاشتراك',
                'شاسية العداد',
                'العنوان',
                'نوع العداد',
                'شركة العداد',
                'الحالة', // (مثال: جديد, مرفوع أعطال)
                'نوع الاشتراك',
                'نوع النشاط',
                'القدرة',
                'رقم اللوحة',
                'تاريخ التركيب',
                'القراءة عند الرفع',
                'سبب الرفع',
                'تاريخ الرفع',
                'القائم بالرفع',
                'القائم بالتركيب',
                'ف', 'ح', 'ي', 'م'
            ];

            // بيانات افتراضية (مثال) لتوضيح طريقة التعبئة
            const exampleRow = [
                'محمد أحمد محمود', // اسم المشترك
                '123456789',       // كود الاشتراك
                '10203040',        // شاسية العداد
                'شارع الجمهورية - القاهرة', // العنوان
                'مسبق الدفع',      // نوع العداد
                'السويدي',         // شركة العداد
                'جديد',            // الحالة
                'منزلي',           // نوع الاشتراك
                'منزلي',           // نوع النشاط
                'أحادي',           // القدرة
                'A1-01',           // رقم اللوحة
                '2023-01-01',      // تاريخ التركيب
                '',                // القراءة عند الرفع
                '',                // سبب الرفع
                '',                // تاريخ الرفع
                '',                // القائم بالرفع
                'أحمد الفني',      // القائم بالتركيب
                '1', '2', '3', '4' // ف، ح، ي، م
            ];

            // إنشاء ورقة عمل تحتوي على صف العناوين وصف المثال
            const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);

            // إنشاء مصنف جديد
            const wb = XLSX.utils.book_new();

            // إضافة الورقة للمصنف
            XLSX.utils.book_append_sheet(wb, ws, 'بيانات العدادات');

            // حفظ الملف وتنزيله
            XLSX.writeFile(wb, 'نموذج_استيراد_العدادات.xlsx');

            showToast('تم بدء تحميل نموذج الإكسل.');
        } catch (error: any) {
            console.error("Error generating Excel template:", error);
            showToast(error.message || 'حدث خطأ أثناء إنشاء النموذج.', 'error');
        }
    };

    // --- Excel Import Section Logic ---
    const setupExcelImportSection = () => {
        // Inject Sidebar Item
        const sidebarNav = document.querySelector('.sidebar-nav');
        if (sidebarNav && !document.getElementById('excel-import-link')) {
            const li = document.createElement('li');
            li.className = 'nav-item';
            li.setAttribute('data-permission', 'view_excel_import');
            li.innerHTML = `
            <a href="#" class="nav-link" data-target="excel-import" id="excel-import-link">
                <div class="icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                </div>
                <span>استيراد اكسل</span>
            </a>
        `;

            // Insert before Help category
            const helpCat = document.getElementById('help-category');
            if (helpCat) {
                sidebarNav.insertBefore(li, helpCat);
            } else {
                sidebarNav.appendChild(li);
            }

            li.querySelector('.nav-link')?.addEventListener('click', handleNavigation);
        }

        // Inject Content Section
        const dashboardSection = document.getElementById('dashboard');
        const contentContainer = dashboardSection?.parentElement;
        if (contentContainer && !document.getElementById('excel-import')) {
            const section = document.createElement('section');
            section.id = 'excel-import';
            section.className = 'content-section';
            section.innerHTML = `
            <div class="main-header">
                <h2>استيراد بيانات عدادات (Excel)</h2>
            </div>
            <div class="content-body">
                <div class="card">
                    <div class="card-header">
                        <h3>رفع ملف اكسل</h3>
                    </div>
                    <div class="card-body">
                        <div class="alert alert-info" style="margin-bottom: 15px; background-color: #e7f1ff; border: 1px solid #b6d4fe; color: #084298; padding: 1rem; border-radius: 0.25rem;">
                            <strong>ملاحظة:</strong> سيقوم النظام بمحاولة التعرف على الأعمدة تلقائياً. يفضل استخدام أسماء الأعمدة القياسية (مثل: اسم المشترك، كود الاشتراك، شاسية العداد، العنوان، نوع العداد).
                        </div>
                        <div style="margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 20px;">
                            <button id="download-excel-template-btn" class="btn btn-secondary">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 8px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                تحميل نموذج اكسل فارغ
                            </button>
                        </div>
                        <div class="input-group">
                            <label for="excel-file-upload">اختر ملف (.xlsx, .xls)</label>
                            <input type="file" id="excel-file-upload" accept=".xlsx, .xls, .csv" class="form-control" style="padding: 10px; border: 1px solid #ddd;">
                        </div>
                        <div id="excel-import-progress-container" class="hidden" style="margin-top: 15px;">
                            <div style="margin-bottom: 5px; display: flex; justify-content: space-between; font-size: 0.9rem; color: #666;">
                                <span id="excel-progress-text">جاري المعالجة...</span>
                                <span id="excel-progress-percent">0%</span>
                            </div>
                            <div class="progress-bar-track" style="background: #eee; height: 8px; border-radius: 4px; overflow: hidden;">
                                <div id="excel-progress-bar" class="progress-bar-fill" style="background: #3b82f6; height: 100%; width: 0%; transition: width 0.1s linear;"></div>
                            </div>
                        </div>
                        <div id="excel-preview-container" class="hidden" style="margin-top: 20px;">
                            <h4 style="margin-bottom: 10px; border-bottom: 2px solid #eee; padding-bottom: 5px;">معاينة البيانات المستوردة</h4>
                            <div class="responsive-table" style="max-height: 400px; overflow: auto; border: 1px solid #eee;">
                                <table class="data-table" id="excel-preview-table" style="width: 100%;">
                                    <thead></thead>
                                    <tbody></tbody>
                                </table>
                            </div>
                            <div style="margin-top: 20px; display: flex; gap: 10px;">
                                <button id="save-excel-data-btn" class="btn btn-primary">حفظ البيانات في المنظومة</button>
                                <button id="cancel-excel-import-btn" class="btn btn-delete">إلغاء / مسح</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
            contentContainer.appendChild(section);

            // Add listeners
            document.getElementById('download-excel-template-btn')?.addEventListener('click', handleDownloadExcelTemplate);
            document.getElementById('excel-file-upload')?.addEventListener('change', handleExcelFileUpload);
            document.getElementById('save-excel-data-btn')?.addEventListener('click', handleSaveExcelData);
            document.getElementById('cancel-excel-import-btn')?.addEventListener('click', resetExcelImport);
        }
    };

    const handleExcelFileUpload = async (event: Event) => {
        const fileInput = event.target as HTMLInputElement;
        const file = fileInput.files?.[0];
        if (!file) return;

        try {
            await ensureSheetJSLoaded();
        } catch (error) {
            showToast('فشل تحميل مكتبة معالجة Excel. تأكد من الاتصال بالإنترنت.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                if (typeof XLSX === 'undefined') {
                    throw new Error("مكتبة معالجة Excel (SheetJS) غير محملة. يرجى التأكد من إضافتها.");
                }

                const result = e.target?.result;
                if (!result) throw new Error("فشل في قراءة محتوى الملف.");

                const data = new Uint8Array(result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });

                if (!workbook.SheetNames.length) throw new Error("ملف Excel فارغ أو لا يحتوي على أوراق عمل.");

                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // --- Smart Header Detection Logic ---
                // قراءة البيانات كمصفوفة خام للبحث عن صف العناوين
                const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
                let headerRowIndex = 0;
                let maxMatches = 0;

                // فحص أول 20 صف للبحث عن الصف الذي يحتوي على أكبر عدد من العناوين المعروفة
                const limit = Math.min(rawData.length, 20);
                for (let i = 0; i < limit; i++) {
                    const row = rawData[i];
                    if (!Array.isArray(row)) continue;

                    let matches = 0;
                    row.forEach((cell: any) => {
                        if (cell && typeof cell === 'string') {
                            const cleanHeader = cell.trim();
                            // التحقق مما إذا كانت الخلية تطابق أحد العناوين المعروفة
                            if (excelHeaderMap[cleanHeader]) {
                                matches++;
                            }
                        }
                    });

                    if (matches > maxMatches) {
                        maxMatches = matches;
                        headerRowIndex = i;
                    }
                }

                // استخدام الصف المكتشف كبداية للجدول
                const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIndex, cellDates: true });

                processExcelData(jsonData);
            } catch (error: any) {
                console.error("Error reading Excel file:", error);
                showToast(error.message || 'حدث خطأ أثناء قراءة الملف. تأكد من صيغة الملف.', 'error');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const processExcelData = async (data: any[]) => {
        const progressContainer = document.getElementById('excel-import-progress-container');
        const progressBar = document.getElementById('excel-progress-bar');
        const progressPercent = document.getElementById('excel-progress-percent');

        if (progressContainer) progressContainer.classList.remove('hidden');
        if (progressBar) progressBar.style.width = '0%';
        if (progressPercent) progressPercent.textContent = '0%';

        importedExcelData = [];
        currentExcelPage = 1; // Reset pagination
        const total = data.length;
        const chunkSize = 200; // معالجة 200 صف في كل دفعة لتجنب تجميد المتصفح
        const timestamp = Date.now();

        for (let i = 0; i < total; i += chunkSize) {
            const chunk = data.slice(i, i + chunkSize);

            const processedChunk = chunk.map((row, index) => {
                const newItem: DataItem = { id: timestamp + i + index };
                let hasValidData = false;

                Object.keys(row).forEach(key => {
                    const cleanKey = key.trim();
                    // Ignore empty headers or auto-generated ones from SheetJS
                    if (!cleanKey || cleanKey.startsWith('__EMPTY')) return;

                    const mappedKey = excelHeaderMap[cleanKey];
                    const value = row[key];

                    if (mappedKey) {
                        (newItem as any)[mappedKey] = value;
                        hasValidData = true;
                    } else {
                        // If no mapping found, check if the key itself matches a DataItem property
                        // We use a whitelist of allowed keys to ensure we don't import garbage
                        const allowedKeys = [
                            'subscriberName', 'subscriptionCode', 'meterChassisNumber', 'address', 'meterType',
                            'activityType', 'meterCapacity', 'panelNumber', 'installationDate',
                            'readingAtRemoval', 'removalReason', 'removalDate', 'removedBy', 'installedBy',
                            'accountRefF', 'accountRefH', 'accountRefY', 'accountRefM', 'subscriberType',
                            'subscriptionType', 'meterSupplyCompany', 'codeName', 'locationDescription',
                            'cardStatus', 'newMeterChassisNumber', 'newMeterType', 'demolitionType',
                            'demolitionDate', 'meterReceivedBy', 'repairStatus', 'repairDate', 'reinstallationDate',
                            'newSubscriberName', 'contractDate', 'installationStatus'
                        ];

                        if (allowedKeys.includes(cleanKey)) {
                            (newItem as any)[cleanKey] = value;
                            hasValidData = true;
                        }
                    }
                });

                // --- معالجة ذكية للبيانات (تواريخ ومرجع حساب) ---

                // 1. تقسيم مرجع الحساب إذا كان في عمود واحد
                if (newItem.accountReference && (!newItem.accountRefF || !newItem.accountRefH)) {
                    // تقسيم النص بناءً على الفواصل الشائعة (شرطة، مسافة، شرطة مائلة)
                    const parts = String(newItem.accountReference).split(/[\/\-\s\\]+/).filter(s => s.trim() !== '');
                    if (parts.length >= 4) {
                        newItem.accountRefF = parts[0];
                        newItem.accountRefH = parts[3];
                        newItem.accountRefY = parts[2];
                        newItem.accountRefM = parts[1];
                    }
                }

                // 2. تنسيق التواريخ (تحويل كائنات التاريخ أو الأرقام التسلسلية إلى نص YYYY-MM-DD)
                const dateFields = ['installationDate', 'removalDate', 'demolitionDate', 'contractDate', 'repairDate', 'reinstallationDate'];
                dateFields.forEach(field => {
                    const val = newItem[field];
                    if (val instanceof Date && !isNaN(val.getTime())) {
                        newItem[field] = val.toISOString().split('T')[0];
                    } else if (typeof val === 'number') {
                        // معالجة تواريخ إكسل الرقمية (في حال لم تعمل cellDates)
                        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
                        if (!isNaN(date.getTime())) {
                            newItem[field] = date.toISOString().split('T')[0];
                        }
                    }
                });

                if (!hasValidData) return null;

                // Defaults
                if (!newItem.subscriberType) newItem.subscriberType = 'بيانات مستوردة من إكسل';
                if (!newItem.meterType) newItem.meterType = 'غير محدد';
                if (!newItem.subscriptionType) newItem.subscriptionType = 'غير محدد';
                if (!newItem.meterCapacity) newItem.meterCapacity = 'غير محدد';

                return newItem;
            }).filter((item: DataItem | null) => item !== null) as DataItem[];

            importedExcelData.push(...processedChunk);

            // Update Progress
            const currentCount = Math.min(i + chunkSize, total);
            const percent = Math.round((currentCount / total) * 100);

            if (progressBar) progressBar.style.width = `${percent}%`;
            if (progressPercent) progressPercent.textContent = `${percent}%`;

            // Yield to UI thread to allow rendering
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        if (progressContainer) {
            setTimeout(() => {
                progressContainer.classList.add('hidden');
            }, 500);
        }
        renderExcelPreview();
    };

    const renderExcelPreview = () => {
        const container = document.getElementById('excel-preview-container');
        const tableHead = document.querySelector('#excel-preview-table thead');
        const tableBody = document.querySelector('#excel-preview-table tbody');

        if (!container || !tableHead || !tableBody) return;

        if (importedExcelData.length === 0) {
            showToast('لم يتم العثور على بيانات صالحة في الملف.', 'error');
            container.classList.add('hidden');
            return;
        }

        // Define columns to show in preview (based on what we mapped)
        const sampleItem = importedExcelData[0];
        const keysToShow = Object.keys(sampleItem).filter(k => k !== 'id' && k !== 'customData' && k !== 'accountReference');

        // Create header mapping for display
        const reverseHeaderMap: { [key: string]: string } = {
            'subscriberName': 'اسم المشترك',
            'subscriptionCode': 'كود الاشتراك',
            'meterChassisNumber': 'شاسية العداد',
            'address': 'العنوان',
            'meterType': 'نوع العداد',
            'meterSupplyCompany': 'شركة العداد',
            'subscriptionType': 'نوع الاشتراك',
            'subscriberType': 'الحالة',
            'activityType': 'نوع النشاط',
            'meterCapacity': 'القدرة',
            'panelNumber': 'رقم اللوحة',
            'installationDate': 'تاريخ التركيب',
            'readingAtRemoval': 'القراءة عند الرفع',
            'removalReason': 'سبب الرفع',
            'removalDate': 'تاريخ الرفع',
            'removedBy': 'القائم بالرفع',
            'installedBy': 'القائم بالتركيب',
            'accountReference': 'مرجع الحساب',
            'accountRefF': 'ف',
            'accountRefH': 'ح',
            'accountRefY': 'ي',
            'accountRefM': 'م',
            'codeName': 'الاسم الكودي',
            'locationDescription': 'وصف المكان',
            'cardStatus': 'حالة الكارت',
            'newMeterChassisNumber': 'شاسية العداد الجديد',
            'newMeterType': 'نوع العداد الجديد',
            'demolitionType': 'نوع الهدم',
            'demolitionDate': 'تاريخ الهدم',
            'meterReceivedBy': 'القائم بالاستلام',
            'repairStatus': 'حالة الإصلاح',
            'repairDate': 'تاريخ الإصلاح',
            'reinstallationDate': 'تاريخ الرجوع للتركيب',
            'newSubscriberName': 'اسم المشترك الجديد',
            'contractDate': 'تاريخ التعاقد'
        };

        tableHead.innerHTML = `<tr>${keysToShow.map(k => `<th>${reverseHeaderMap[k] || k}</th>`).join('')}</tr>`;

        tableBody.innerHTML = '';

        // --- Pagination Logic ---
        const totalPages = Math.ceil(importedExcelData.length / excelRowsPerPage);
        if (currentExcelPage > totalPages) currentExcelPage = 1;
        if (currentExcelPage < 1) currentExcelPage = 1;

        const start = (currentExcelPage - 1) * excelRowsPerPage;
        const end = start + excelRowsPerPage;
        const pageData = importedExcelData.slice(start, end);

        pageData.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = keysToShow.map(k => `<td>${(item as any)[k] || ''}</td>`).join('');
            tableBody.appendChild(row);
        });

        // --- Render Pagination Controls ---
        let paginationControls = document.getElementById('excel-preview-pagination');
        if (!paginationControls) {
            paginationControls = document.createElement('div');
            paginationControls.id = 'excel-preview-pagination';
            paginationControls.style.cssText = 'display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 4px;';
            container.insertBefore(paginationControls, container.lastElementChild); // Insert before buttons
        }

        paginationControls.innerHTML = `
        <button class="btn btn-secondary" id="excel-prev-page" ${currentExcelPage === 1 ? 'disabled' : ''}>السابق</button>
        <span style="font-weight: bold;">صفحة ${currentExcelPage} من ${totalPages} (الإجمالي: ${importedExcelData.length} سجل)</span>
        <button class="btn btn-secondary" id="excel-next-page" ${currentExcelPage === totalPages ? 'disabled' : ''}>التالي</button>
    `;

        // Re-attach listeners (simple way)
        document.getElementById('excel-prev-page')?.addEventListener('click', () => {
            if (currentExcelPage > 1) { currentExcelPage--; renderExcelPreview(); }
        });
        document.getElementById('excel-next-page')?.addEventListener('click', () => {
            if (currentExcelPage < totalPages) { currentExcelPage++; renderExcelPreview(); }
        });

        if (importedExcelData.length === 0) {
            if (paginationControls) paginationControls.innerHTML = '';
        }

        container.classList.remove('hidden');
        showToast(`تم قراءة ${importedExcelData.length} سجل بنجاح.`);
    };

    const handleSaveExcelData = async () => {
        if (importedExcelData.length === 0) return;

        const confirmMsg = `سيتم استيراد ${importedExcelData.length} سجل إلى قاعدة البيانات. هل أنت متأكد؟`;
        if (!confirm(confirmMsg)) return;

        // Assign unique IDs
        const timestamp = Date.now();
        const newMeters: DataItem[] = importedExcelData.map((item, index) => ({
            ...item,
            id: timestamp + index
        }));

        // تسجيل البيانات الجديدة تلقائياً في الإعدادات لضمان ظهورها في القوائم والتقارير (مثل القدرة، نوع الاشتراك، الخ)
        newMeters.forEach(m => {
            if (m.activityType && !state.settings.activityTypes.includes(m.activityType)) state.settings.activityTypes.push(m.activityType);
            if (m.locationDescription && !state.settings.placeDescriptions.includes(m.locationDescription)) state.settings.placeDescriptions.push(m.locationDescription);
            if (m.subscriptionType && !state.settings.subscriptionTypes.includes(m.subscriptionType)) state.settings.subscriptionTypes.push(m.subscriptionType);
            if (m.meterCapacity && !state.settings.meterCapacities.includes(m.meterCapacity)) state.settings.meterCapacities.push(m.meterCapacity);
            if (m.meterType && !state.settings.meterTypes.includes(m.meterType)) state.settings.meterTypes.push(m.meterType);
        });

        state.meters.push(...newMeters);
        logActivity('استيراد اكسل', `تم استيراد ${newMeters.length} سجل من ملف اكسل.`);

        await saveState();
        showToast('تم حفظ البيانات بنجاح.');
        resetExcelImport();

        // Redirect to meter management to see data
        (document.querySelector('.sidebar-nav .nav-link[data-target="meter-management"]') as HTMLElement)?.click();
    };

    const resetExcelImport = () => {
        importedExcelData = [];
        const fileInput = document.getElementById('excel-file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        document.getElementById('excel-preview-container')?.classList.add('hidden');
        document.getElementById('excel-import-progress-container')?.classList.add('hidden');
        document.getElementById('excel-preview-pagination')?.remove(); // Remove pagination controls
    };

    const handleDeleteSelectedNewMeters = async () => {
        const checkboxes = document.querySelectorAll('.select-new-meter-row:checked');
        if (checkboxes.length === 0) {
            showToast('يرجى تحديد سجل واحد على الأقل.', 'error');
            return;
        }

        const ids = Array.from(checkboxes).map(cb => parseInt((cb as HTMLInputElement).value, 10));

        const onConfirm = async () => {
            state.meters = state.meters.filter(m => !ids.includes(m.id));
            logActivity('حذف متعدد', `تم حذف ${ids.length} سجلات من العدادات الجديدة.`);
            await saveState();
            showToast('تم الحذف بنجاح.');
            // Refresh the view
            const dashboardLink = document.querySelector('.sidebar-nav .nav-link[data-target="subscribers-new"]') as HTMLElement;
            if (dashboardLink) dashboardLink.click();
            renderDashboard(); // Update counts
        };

        showConfirmationDialog('تأكيد الحذف', `هل أنت متأكد من حذف ${ids.length} سجلات؟`, onConfirm);
    };

    const handleDeleteSelectedSubscribersAll = async () => {
        const checkboxes = document.querySelectorAll('#subscribers-all-table tbody input[type="checkbox"].select-subscriber-row:checked');
        if (checkboxes.length === 0) {
            showToast('يرجى تحديد مشترك واحد على الأقل.', 'error');
            return;
        }

        const ids = Array.from(checkboxes).map(cb => parseInt((cb as HTMLInputElement).value, 10));

        const onConfirm = async () => {
            state.meters = state.meters.filter(m => !ids.includes(m.id));
            logActivity('حذف متعدد', `تم حذف ${ids.length} مشتركين من قائمة جميع المشتركين.`);
            await saveState();
            showToast('تم الحذف بنجاح.');
            handleAllSubscribersSearch(); // Refresh list to reflect changes
            renderDashboard(); // Update counts
        };

        showConfirmationDialog('تأكيد الحذف', `هل أنت متأكد من حذف ${ids.length} سجلات؟ لا يمكن التراجع عن هذا الإجراء.`, onConfirm);
    };

    const handleBulkUpdateLocation = async () => {
        const checkboxes = document.querySelectorAll('.select-subscriber-row:checked');
        if (checkboxes.length === 0) {
            showToast('يرجى تحديد مشترك واحد على الأقل.', 'error');
            return;
        }

        const select = document.getElementById('bulk-location-description-select') as HTMLSelectElement;
        const newValue = select.value;

        if (!newValue) {
            showToast('يرجى اختيار وصف مكان جديد من القائمة.', 'error');
            return;
        }

        const ids = Array.from(checkboxes).map(cb => parseInt((cb as HTMLInputElement).value, 10));

        const onConfirm = async () => {
            let updatedCount = 0;
            state.meters = state.meters.map(m => {
                if (ids.includes(m.id)) {
                    updatedCount++;
                    return { ...m, locationDescription: newValue };
                }
                return m;
            });

            logActivity('تعديل جماعي', `تم تعديل وصف المكان لـ ${updatedCount} مشتركين إلى "${newValue}".`);
            await saveState();
            showToast('تم التعديل بنجاح.');

            // إعادة تحميل الصفحة لتحديث الجدول
            const link = document.querySelector('.sidebar-nav .nav-link[data-target="subscribers-all"]') as HTMLElement;
            if (link) link.click();
        };

        showConfirmationDialog('تأكيد التعديل الجماعي', `هل أنت متأكد من تغيير وصف المكان لـ ${ids.length} مشتركين إلى "${newValue}"؟`, onConfirm);
    };

    const handleBulkUpdateSupplyCompany = async () => {
        const checkboxes = document.querySelectorAll('.select-subscriber-row:checked');
        if (checkboxes.length === 0) {
            showToast('يرجى تحديد مشترك واحد على الأقل.', 'error');
            return;
        }

        const select = document.getElementById('bulk-supply-company') as HTMLSelectElement;
        const newValue = select.value;

        if (!newValue) {
            showToast('يرجى اختيار شركة توريد من القائمة.', 'error');
            return;
        }

        const ids = Array.from(checkboxes).map(cb => parseInt((cb as HTMLInputElement).value, 10));

        const onConfirm = async () => {
            let updatedCount = 0;
            state.meters = state.meters.map(m => {
                if (ids.includes(m.id)) {
                    updatedCount++;
                    return { ...m, meterSupplyCompany: newValue };
                }
                return m;
            });

            logActivity('تعديل جماعي', `تم تعديل شركة توريد العداد لـ ${updatedCount} مشتركين إلى "${newValue}".`);
            await saveState();
            showToast('تم التعديل بنجاح.');

            // إعادة تحميل الصفحة لتحديث الجدول
            const link = document.querySelector('.sidebar-nav .nav-link[data-target="subscribers-all"]') as HTMLElement;
            if (link) link.click();
        };

        showConfirmationDialog('تأكيد التعديل الجماعي', `هل أنت متأكد من تغيير شركة توريد العداد لـ ${ids.length} مشتركين إلى "${newValue}"؟`, onConfirm);
    };

    const handleBulkUpdateActivityType = async () => {
        const checkboxes = document.querySelectorAll('.select-subscriber-row:checked');
        if (checkboxes.length === 0) {
            showToast('يرجى تحديد مشترك واحد على الأقل.', 'error');
            return;
        }

        const select = document.getElementById('bulk-activity-type') as HTMLSelectElement;
        const newValue = select.value;

        if (!newValue) {
            showToast('يرجى اختيار نوع نشاط من القائمة.', 'error');
            return;
        }

        const ids = Array.from(checkboxes).map(cb => parseInt((cb as HTMLInputElement).value, 10));

        const onConfirm = async () => {
            let updatedCount = 0;
            state.meters = state.meters.map(m => {
                if (ids.includes(m.id)) {
                    updatedCount++;
                    return { ...m, activityType: newValue };
                }
                return m;
            });

            logActivity('تعديل جماعي', `تم تعديل نوع النشاط لـ ${updatedCount} مشتركين إلى "${newValue}".`);
            await saveState();
            showToast('تم التعديل بنجاح.');

            // إعادة تحميل الصفحة لتحديث الجدول
            const link = document.querySelector('.sidebar-nav .nav-link[data-target="subscribers-all"]') as HTMLElement;
            if (link) link.click();
        };

        showConfirmationDialog('تأكيد التعديل الجماعي', `هل أنت متأكد من تغيير نوع النشاط لـ ${ids.length} مشتركين إلى "${newValue}"؟`, onConfirm);
    };

    const setupAllSubscribersBulkActions = () => {
        const section = document.getElementById('subscribers-all');
        if (!section || document.getElementById('bulk-action-container-all')) return;

        const container = document.createElement('div');
        container.id = 'bulk-action-container-all';
        container.className = 'bulk-actions-container';
        container.style.cssText = 'margin-bottom: 15px; padding: 10px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 4px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;';

        container.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-weight: bold; color: #0369a1;">تعديل وصف المكان:</span>
            <select id="bulk-location-description-select" style="padding: 6px; border-radius: 4px; border: 1px solid #ccc; min-width: 150px;">
                <option value="">اختر...</option>
            </select>
            <button id="btn-bulk-update-location" class="btn" style="padding: 6px 10px; background-color: #0284c7; color: white;">تحديث</button>
        </div>
        <div style="width: 1px; height: 20px; background: #bae6fd; margin: 0 5px;"></div>
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-weight: bold; color: #0369a1;">تعديل شركة التوريد:</span>
            <select id="bulk-supply-company" style="padding: 6px; border-radius: 4px; border: 1px solid #ccc; min-width: 150px;">
                <option value="">-- اختر الشركة --</option>
            </select>
            <button id="btn-bulk-update-supply-company" class="btn" style="padding: 6px 10px; background-color: #0284c7; color: white;">تحديث</button>
        </div>
        <div style="width: 1px; height: 20px; background: #bae6fd; margin: 0 5px;"></div>
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-weight: bold; color: #0369a1;">تعديل نوع النشاط:</span>
            <select id="bulk-activity-type" style="padding: 6px; border-radius: 4px; border: 1px solid #ccc; min-width: 150px;">
                <option value="">-- اختر النشاط --</option>
            </select>
            <button id="btn-bulk-update-activity-type" class="btn" style="padding: 6px 10px; background-color: #0284c7; color: white;">تحديث</button>
        </div>
        <div style="width: 1px; height: 20px; background: #bae6fd; margin: 0 5px;"></div>
        <div style="display: flex; align-items: center; gap: 10px;">
            <button id="btn-delete-selected-subscribers-all" class="btn btn-danger" style="padding: 6px 10px; background-color: #dc3545; color: white;">حذف متعدد</button>
        </div>
    `;

        const table = document.getElementById('subscribers-all-table');
        const tableContainer = table?.closest('.responsive-table') || table?.parentElement;

        if (tableContainer && tableContainer.parentElement) {
            tableContainer.parentElement.insertBefore(container, tableContainer);
        }

        // ضمان وجود بيانات في قائمة وصف المكان
        if (!state.settings.placeDescriptions || state.settings.placeDescriptions.length === 0) {
            state.settings.placeDescriptions = [
                'شقة', 'مصلحة حكومية', 'مسجد', 'ورشة نجارة', 'مخبز', 'كنيسة', 'مساجد أهلية', 'ماكينة طحين',
                'ورشة حدادة', 'محطه محمول متجددة', 'مخالف منزلى', 'محل خردوات', 'بيع هواتف محمولة', 'ادوات كهربائية',
                'ورشة لحام كهرباء', 'أجهزة وادوات طبية', 'مغسلة سيارات', 'وكالة إعلان', 'تجاري', 'مكتب خدمات',
                'أرض زراعية', 'استصلاح أراضى', 'رى أراضى', 'مزرعة', 'مزرعة دواجن', 'مزرعة مواشي', 'محطة صرف صحى',
                'كودي مزرعة مواشي', 'كودي مزرعة دواجن', 'منزلي كودى', 'محال تجارية كودي', 'باقى المشتركين كودى',
                'أستخدامات الرى كودى', 'أعلى شريحة تجارى كودى', 'قوي كودى', 'مسجد اهلى كودى', 'مسجد اوقاف كودى',
                'كنيسة كودى', 'دور عبادة كودى', 'جمعية اهلية كودى', 'محطة محمول كودى', 'عداد خدمات كودي',
                'مصعد تجارى كودي', 'جمعيه اهليه 50%', 'استراحات حكوميه'
            ];
        }

        populateSelect(document.getElementById('bulk-location-description-select') as HTMLSelectElement, state.settings.placeDescriptions, 'اختر...');
        document.getElementById('btn-bulk-update-location')?.addEventListener('click', handleBulkUpdateLocation);

        populateSelect(document.getElementById('bulk-supply-company') as HTMLSelectElement, state.settings.meterSupplyCompanies, 'اختر الشركة...');
        document.getElementById('btn-bulk-update-supply-company')?.addEventListener('click', handleBulkUpdateSupplyCompany);

        populateSelect(document.getElementById('bulk-activity-type') as HTMLSelectElement, state.settings.activityTypes, '-- اختر النشاط --');
        document.getElementById('btn-bulk-update-activity-type')?.addEventListener('click', handleBulkUpdateActivityType);

        document.getElementById('btn-delete-selected-subscribers-all')?.addEventListener('click', handleDeleteSelectedSubscribersAll);

        // منطق تحديد الكل (مع مراعاة الصفوف الظاهرة فقط عند الفلترة)
        const selectAllCb = document.getElementById('select-all-subscribers');
        selectAllCb?.addEventListener('change', (e) => {
            const isChecked = (e.target as HTMLInputElement).checked;
            const rows = Array.from(document.querySelectorAll('#subscribers-all-table tbody tr'));
            rows.forEach(row => {
                if ((row as HTMLElement).style.display !== 'none') {
                    const cb = row.querySelector('.select-subscriber-row') as HTMLInputElement;
                    if (cb) cb.checked = isChecked;
                }
            });
        });
    };

    const setupNewMetersBulkActions = () => {
        const section = document.getElementById('subscribers-new');
        if (!section) return;

        if (loggedInUser?.role === 'admin') {
            const btn = document.createElement('button');
            btn.id = 'delete-selected-new-meters-btn';
            btn.className = 'btn btn-delete';
            btn.style.marginBottom = '10px';
            btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2"></path></svg> حذف المحدد`;
            btn.onclick = handleDeleteSelectedNewMeters;

            const table = document.getElementById('subscribers-new-table');
            const tableContainer = table?.closest('.responsive-table') || table?.parentElement;

            if (tableContainer && tableContainer.parentElement) {
                tableContainer.parentElement.insertBefore(btn, tableContainer);
            }
        }
    };

    const addSidebarArrows = () => {
        // Inject CSS for arrows if not present
        if (!document.getElementById('sidebar-arrow-styles')) {
            const style = document.createElement('style');
            style.id = 'sidebar-arrow-styles';
            style.textContent = `
            .sidebar-nav details > summary {
                list-style: none;
                display: flex;
                align-items: center;
            }
            .sidebar-nav details > summary::-webkit-details-marker {
                display: none;
            }
            .sidebar-nav .arrow {
                margin-right: auto; /* Push to the left in RTL */
                transition: transform 0.3s ease;
                display: flex;
                align-items: center;
            }
            .sidebar-nav details[open] > summary .arrow {
                transform: rotate(180deg);
            }
        `;
            document.head.appendChild(style);
        }

        document.querySelectorAll('.sidebar-nav .nav-category details summary').forEach(summary => {
            if (!summary.querySelector('.arrow')) {
                const arrowSpan = document.createElement('span');
                arrowSpan.className = 'arrow';
                arrowSpan.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
                summary.appendChild(arrowSpan);
            }
        });
    };

    const handleDeleteSelectedMeters = async () => {
        const checkboxes = document.querySelectorAll('#meters-table tbody input[type="checkbox"].select-row:checked');
        if (checkboxes.length === 0) {
            showToast('يرجى تحديد سجل واحد على الأقل.', 'error');
            return;
        }

        const ids = Array.from(checkboxes).map(cb => parseInt((cb as HTMLInputElement).value, 10));

        const onConfirm = async () => {
            state.meters = state.meters.filter(m => !ids.includes(m.id));
            logActivity('حذف متعدد', `تم حذف ${ids.length} سجلات من العدادات.`);
            await saveState();
            showToast('تم الحذف بنجاح.');
            renderMeterManagementSection();
        };

        showConfirmationDialog('تأكيد الحذف', `هل أنت متأكد من حذف ${ids.length} سجلات؟`, onConfirm);
    };

    /**
     * معالجة التنقل في الشريط الجانبي وعناصر التنقل الأخرى
     * Handles navigation clicks in the sidebar and other nav elements.
     * @param event The click event.
     */
    function handleNavigation(event: Event) {
        const currentActiveSection = document.querySelector('.content-section.active');
        if (currentActiveSection && currentActiveSection.id !== 'dashboard') {
            // Don't push if we are already on the target page to avoid duplicates on refresh-like actions
            if (navigationHistory[navigationHistory.length - 1] !== currentActiveSection.id) {
                navigationHistory.push(currentActiveSection.id);
            }
        }
        event.preventDefault();
        const targetLink = (event.currentTarget as HTMLElement).closest('.nav-link, .btn-back, .card');
        if (!targetLink) return;

        const filter = (targetLink as HTMLElement).dataset.filter;
        const targetId = (targetLink as HTMLElement).dataset.target;
        if (!targetId) return;

        localStorage.setItem('lastActiveSection', targetId);

        if (targetId === 'meter-registration' && targetLink.id === 'sidebar-add-meter-btn') {
            openMeterForm();
            return; // Stop further execution to avoid double navigation logic
        }

        // Update active link in sidebar
        document.querySelectorAll('.sidebar-nav .nav-link.active').forEach(link => link.classList.remove('active'));
        const sidebarLink = document.querySelector(`.sidebar-nav .nav-link[data-target="${targetId}"]`);
        sidebarLink?.classList.add('active');

        // Show active section
        document.querySelectorAll('.content-section.active').forEach(section => section.classList.remove('active'));
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Update header title based on sidebar link text
        let pageTitle = state.settings.companyName || 'ELMAGHRABI';
        if (targetId === 'dashboard') {
            // Keep company name for dashboard view
        } else if (sidebarLink) {
            pageTitle = sidebarLink.querySelector('span')?.textContent || pageTitle;
        } else {
            const cardTitle = targetLink.querySelector('h4')?.textContent;
            if (cardTitle) {
                pageTitle = cardTitle;
            }
        }
        setPageTitle(pageTitle);

        if (targetId === 'dashboard') {
            document.querySelectorAll('.nav-category details[open]').forEach(d => (d as HTMLDetailsElement).open = false);
            renderDashboard();
        } else if (targetId === 'meter-management') {
            renderMeterManagementSection(filter);
        } else if (targetId === 'mukayasat-registration') {
            openMukayasatForm();
        } else if (targetId === 'mukayasat-list') {
            renderMukayasatList();
        } else if (targetId === 'repaired-meters') {
            renderRepairedMetersSection();
        } else if (targetId === 'settings') {
            renderSettingsSection();
        } else if (targetId === 'reports') {
            renderReportsSection();
        } else if (targetId === 'user-management') {
            renderUserManagementSection();
        } else if (targetId === 'activity-log') {
            renderActivityLogSection();
        } else if (targetId === 'permissions') {
            renderPermissionsSection();
        } else if (targetId === 'developer-info') {
            // This section is static HTML, no render function needed, just show it.
        } else if (targetId === 'subscriber-statement') {
            renderSubscriberStatementSection();
        } else if (targetId === 'subscribers-all') {
            // تنظيف واجهة التعديل الجماعي السابقة لضمان عدم التكرار
            document.getElementById('bulk-action-container-all')?.remove();

            // نقل زر الرجوع من رأس الصفحة إلى حاوية البحث الأساسية لسهولة الوصول
            const backBtn = document.querySelector('#subscribers-all .btn-back-page');
            const searchBtn = document.getElementById('btn-search-subscribers-all');
            if (backBtn && searchBtn && searchBtn.parentElement) {
                searchBtn.parentElement.appendChild(backBtn);
                backBtn.classList.add('btn', 'secondary'); // تحويله لنمط زر ثانوي ليتناسق مع أزرار البحث
            }

            let columns = [...columnConfigs['subscribers-all']];
            // إضافة عمود الاختيار فقط للمسؤولين والمشرفين
            if (loggedInUser?.role === 'admin' || loggedInUser?.role === 'supervisor') {
                columns.unshift({
                    key: 'selection',
                    header: '<input type="checkbox" id="select-all-subscribers">',
                    render: (item) => `<input type="checkbox" class="select-subscriber-row" value="${item.id}">`
                });
                setTimeout(setupAllSubscribersBulkActions, 0);
            }

            // ملء قائمة الحالة للبحث
            populateSelect(document.getElementById('search-all-status') as HTMLSelectElement, ['جديد', 'مرفوع أعطال', 'مرفوع إحلال', 'استغناء', 'تغير عقد اشتراك', 'استبدال', 'هدم', 'تم الإصلاح', 'لا يمكن إصلاحه', 'تم استبداله', 'تم تغير العداد', 'بيانات مستوردة من إكسل'], 'كل الحالات');

            // Populate Address Multiselect for Search
            const addressContainer = document.getElementById('options-search-all-address');
            // Get addresses from settings + unique existing addresses in data
            const allAddresses = new Set([...state.settings.addresses, ...state.meters.map(m => m.address).filter(a => a)]);
            const sortedAddresses = Array.from(allAddresses).sort();

            if (addressContainer) {
                addressContainer.innerHTML = sortedAddresses.map(addr => `
                <label><input type="checkbox" class="search-all-checkbox" value="${addr}"><span>${addr}</span></label>
            `).join('');
            }

            // Populate Activity Multiselect for Search
            const activityContainer = document.getElementById('options-search-all-activity');
            const allActivities = new Set([...state.settings.activityTypes, ...state.meters.map(m => m.activityType).filter(a => a)]);
            const sortedActivities = Array.from(allActivities).sort();

            if (activityContainer) {
                activityContainer.innerHTML = sortedActivities.map(act => `
                <label><input type="checkbox" class="search-all-checkbox" value="${act}"><span>${act}</span></label>
            `).join('');
            }

            renderFilteredMeterTable('subscribers-all-table',
                ['جديد', 'مرفوع أعطال', 'مرفوع إحلال', 'استغناء', 'تغير عقد اشتراك', 'استبدال', 'هدم', 'تم الإصلاح', 'لا يمكن إصلاحه', 'تم استبداله', 'تم تغير العداد', 'بيانات مستوردة من إكسل'],
                columns
            );
        } else if (targetId === 'subscribers-new') {
            // Remove existing button to ensure correct state
            document.getElementById('delete-selected-new-meters-btn')?.remove();

            let columns = [...columnConfigs['subscribers-new']];
            if (loggedInUser?.role === 'admin') {
                columns.unshift({
                    key: 'selection',
                    header: '<input type="checkbox" id="select-all-new-meters">',
                    render: (item) => `<input type="checkbox" class="select-new-meter-row" value="${item.id}">`
                });
                setTimeout(setupNewMetersBulkActions, 0);
            }
            renderFilteredMeterTable('subscribers-new-table', ['جديد'], columns);
        } else if (targetId === 'subscribers-faults') {
            renderFilteredMeterTable('subscribers-faults-table', ['مرفوع أعطال'], columnConfigs['subscribers-faults']);
        } else if (targetId === 'subscribers-replacement') {
            renderFilteredMeterTable('subscribers-replacement-table', ['مرفوع إحلال'], columnConfigs['subscribers-replacement']);
        } else if (targetId === 'subscribers-substituted') {
            renderFilteredMeterTable('subscribers-substituted-table', ['استبدال'], columnConfigs['subscribers-substituted']);
        } else if (targetId === 'subscribers-scrapped') {
            renderFilteredMeterTable('subscribers-scrapped-table', ['استغناء'], columnConfigs['subscribers-scrapped']);
        } else if (targetId === 'subscribers-demolition') {
            renderFilteredMeterTable('subscribers-demolition-table', ['هدم'], columnConfigs['subscribers-demolition']);
        } else if (targetId === 'judicial-control-registration') {
            openJudicialControlForm();
        } else if (targetId === 'judicial-control-list') {
            renderJudicialControlSection();
        } else if (targetId === 'lost-memos-search') {
            renderLostMemosSection();
        } else if (targetId === 'lost-memos-write') {
            openLostMemoForm();
        } else if (targetId === 'about-app') {
            renderAboutAppSection();
        } else if (targetId === 'transformer-registration') {
            renderTransformerRegistrationForm();
        } else if (targetId === 'transformer-query') {
            renderTransformerQuerySection();
        } else if (targetId === 'transformer-list') {
            renderTransformerListSection();
        } else if (targetId === 'transformer-loads') {
            renderTransformerLoadSection();
        } else if (targetId === 'transformer-load-records') {
            renderTransformerLoadRecordsSection();
        } else if (targetId === 'accounting-system') {
            renderAccountingSystemSection();
        } else if (targetId === 'accounting-save-registration') {
            renderAccountingRegistrationSection();
        } else if (targetId === 'accounting-saved-records') {
            renderAccountingSavedRecordsSection();
        } else if (targetId === 'accounting-query') {
            renderAccountingQuerySection();
        } else if (targetId === 'collection-judicial') {
            renderJudicialCollectionSection();
        } else if (targetId === 'collection-zinat') {
            renderZinatCollectionSection();
        } else if (targetId === 'zinat-registration') {
            openZinatForm();
        } else if (targetId === 'help-error-codes') {
            renderErrorCodes();
        } else if (targetId === 'help-meter-pages') {
            renderMeterPages();
        } else if (targetId === 'help-contact-admin') {
            renderContactAdmin();
        } else if (targetId === 'excel-import') {
            resetExcelImport();
        } else if (targetId === 'pending-requests-section') {
            renderPendingRequestsSection();
        }
    }

    /**
     * إعداد جميع مستمعي الأحداث للتطبيق
     * Sets up all the event listeners for the application.
     */
    const setupEventListeners = () => {
        // Welcome Screen Listeners
        document.getElementById('start-new-btn')?.addEventListener('click', handleStartNew);
        document.getElementById('import-from-welcome-btn')?.addEventListener('click', handleImportFromWelcome);

        // Dialog Listeners
        setupDialogListeners();

        // Dark Mode Toggle
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        const sunIcon = document.getElementById('dark-mode-icon-sun');
        const moonIcon = document.getElementById('dark-mode-icon-moon');

        darkModeToggle?.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDarkMode = document.body.classList.contains('dark-mode');
            localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
            if (sunIcon && moonIcon) {
                sunIcon.style.display = isDarkMode ? 'none' : 'block';
                moonIcon.style.display = isDarkMode ? 'block' : 'none';
            }
        });

        // Password Change Modal
        const passwordDialog = document.getElementById('password-change-dialog');
        const userSettingsBtn = document.getElementById('user-settings-btn');
        const passwordConfirmBtn = document.getElementById('password-dialog-confirm-btn');
        const passwordCancelBtn = document.getElementById('password-dialog-cancel-btn');

        userSettingsBtn?.addEventListener('click', () => {
            if (passwordDialog) {
                (document.getElementById('password-change-form') as HTMLFormElement)?.reset();
                clearFormErrors(document.getElementById('password-change-form') as HTMLFormElement);
                passwordDialog.hidden = false;
            }
        });
        passwordCancelBtn?.addEventListener('click', () => {
            if (passwordDialog) passwordDialog.hidden = true;
        });
        passwordConfirmBtn?.addEventListener('click', handlePasswordChange);

        // Login Screen Listeners
        document.getElementById('login-form')?.addEventListener('submit', handleLogin);
        document.getElementById('header-logout-btn')?.addEventListener('click', handleLogout);

        // Main App Listeners
        document.querySelectorAll('.sidebar-nav .nav-link, .btn-back, .card.nav-link').forEach(link => {
            link.addEventListener('click', handleNavigation);
        });

        // Meter Management Listeners
        document.getElementById('add-meter-record-btn')?.addEventListener('click', () => openMeterForm());
        document.getElementById('meter-form')?.addEventListener('submit', handleMeterFormSubmit);
        document.getElementById('meterType')?.addEventListener('change', () => updateMeterFormVisibility());

        document.getElementById('sidebar-add-mukaysa-btn')?.addEventListener('click', (e) => { e.preventDefault(); openMukayasatForm(); });
        document.getElementById('mukayasat-form')?.addEventListener('submit', handleMukayasatFormSubmit);
        document.getElementById('print-mukayasa-btn')?.addEventListener('click', handlePrintMukayasaDetails);

        // Transformer Management Listeners
        document.getElementById('transformer-form')?.addEventListener('submit', handleTransformerRegistrationSubmit);
        document.getElementById('transformer-query-form')?.addEventListener('submit', handleTransformerQuerySearch);
        document.getElementById('transformer-load-form')?.addEventListener('submit', handleTransformerLoadSubmit);
        document.getElementById('transformer-load-name')?.addEventListener('change', handleTransformerLoadNameChange);
        initializeTransformerLoadRecordFilters();
        ['transformer-load-capacity', 'transformer-load-s1-r', 'transformer-load-s1-s', 'transformer-load-s1-t', 'transformer-load-s2-r', 'transformer-load-s2-s', 'transformer-load-s2-t', 'transformer-load-s3-r', 'transformer-load-s3-s', 'transformer-load-s3-t', 'transformer-load-s4-r', 'transformer-load-s4-s', 'transformer-load-s4-t', 'transformer-load-streets-r', 'transformer-load-streets-s', 'transformer-load-streets-t'].forEach((id) => {
            const element = document.getElementById(id) as HTMLInputElement | null;
            element?.addEventListener('input', calculateTransformerLoadAutoValues);
        });
        document.getElementById('print-transformers-list-btn')?.addEventListener('click', () => handlePrintTable('transformers-table', 'قائمة المحولات'));
        document.getElementById('import-transformers-excel-trigger')?.addEventListener('click', () => document.getElementById('transformers-excel-upload')?.click());
        document.getElementById('transformers-excel-upload')?.addEventListener('change', handleImportTransformersExcel);
        document.getElementById('delete-selected-transformers-btn')?.addEventListener('click', handleDeleteSelectedTransformers);

        // Transformer List Filters
        ['filter-transformer-name', 'filter-transformer-chassis'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => renderTransformerListSection());
        });
        document.getElementById('select-all-transformers')?.addEventListener('change', (e) => {
            const isChecked = (e.target as HTMLInputElement).checked;
            document.querySelectorAll<HTMLInputElement>('.transformer-row-checkbox').forEach(cb => cb.checked = isChecked);
        });

        document.getElementById('print-installation-details-btn')?.addEventListener('click', handlePrintInstallationDetails);
        document.getElementById('clear-mukayasa-form-btn')?.addEventListener('click', handleClearMukayasaForm);
        // Judicial Control Listeners
        document.getElementById('print-judicial-control-btn')?.addEventListener('click', handlePrintJudicialControlDetails);
        document.getElementById('judicial-control-form')?.addEventListener('submit', handleJudicialControlFormSubmit);

        // Judicial Control Filter Listeners
        document.getElementById('add-zinat-btn')?.addEventListener('click', openZinatForm);
        document.getElementById('zinat-form')?.addEventListener('submit', handleZinatFormSubmit);
        const zinatFilterForm = document.getElementById('zinat-collection-filter-form');
        zinatFilterForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            renderZinatCollectionSection();
        });
        zinatFilterForm?.addEventListener('reset', () => {
            setTimeout(() => renderZinatCollectionSection(), 0);
        });

        // Print List Buttons
        document.getElementById('print-lost-memos-list-btn')?.addEventListener('click', () => handlePrintTable('lost-memos-table', 'قائمة مذكرات الفقد'));
        document.getElementById('print-judicial-control-list-btn')?.addEventListener('click', () => handlePrintTable('judicial-control-table', 'قائمة الضبطية القضائية'));
        document.getElementById('print-collection-judicial-btn')?.addEventListener('click', () => handlePrintTable('collection-judicial-table', 'قائمة تحصيل الضبطية القضائية'));
        document.getElementById('print-collection-zinat-btn')?.addEventListener('click', () => handlePrintTable('collection-zinat-table', 'قائمة تحصيل زينات'));

        // Judicial Collection Filter Listener
        document.getElementById('judicial-collection-filter-form')?.addEventListener('input', () => {
            renderJudicialCollectionSection();
        });

        // Judicial Control Filter Listeners
        const judicialControlFilterForm = document.getElementById('judicial-control-filter-form');
        judicialControlFilterForm?.addEventListener('submit', (e) => {
            e.preventDefault(); // Prevent form from submitting the traditional way
            applyAndRenderJudicialControlList();
        });
        judicialControlFilterForm?.addEventListener('input', (e) => {
            e.preventDefault(); // Prevent form from submitting the traditional way
            applyAndRenderJudicialControlList();
        });
        judicialControlFilterForm?.addEventListener('reset', () => {
            setTimeout(() => applyAndRenderJudicialControlList(), 0); // Use timeout to allow form to reset first
        });


        // Lost Memo Listeners
        document.getElementById('add-lost-memo-btn')?.addEventListener('click', () => openLostMemoForm());
        document.getElementById('lost-memo-form')?.addEventListener('submit', handleLostMemoFormSubmit);
        document.getElementById('print-lost-memo-btn')?.addEventListener('click', handlePrintLostMemo);

        const mukSearchForm = document.getElementById('mukayasat-search-form') as HTMLFormElement | null;
        mukSearchForm?.addEventListener('submit', handleMukayasatSearch);
        if (mukSearchForm) {
            mukSearchForm.addEventListener('input', () => handleMukayasatSearch({ preventDefault: () => { }, target: mukSearchForm } as any));
        }

        // Header navigation buttons
        document.body.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).closest('.btn-back-page')) {
                handleGoBack();
            }
        });

        document.getElementById('meters-table-filter')?.addEventListener('input', (e) => {
            const filterValue = (e.target as HTMLInputElement).value.toLowerCase();
            const table = document.getElementById('meters-table');
            filterTable(table!, filterValue);
        });

        // Add listeners for multi-filter inputs
        document.querySelectorAll('.multi-filter-container').forEach(container => {
            // استثناء نموذج زينات من المستمع العام لأنه يستخدم منطق بحث مخصص
            if (container.id === 'zinat-collection-filter-form') return;

            container.addEventListener('input', (e) => {
                filterTableByMultipleCriteria((e.currentTarget as HTMLElement).dataset.tableId!);
            });
        });

        // All Subscribers Search - تفعيل البحث المباشر والمتعدد
        const allSearchIds = ['search-all-name', 'search-all-code', 'search-all-chassis', 'search-all-panel', 'search-all-status', 'search-all-refF', 'search-all-refH', 'search-all-refY', 'search-all-refM'];
        allSearchIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                // تفعيل البحث عند الضغط على Enter في أي من حقول البحث
                el.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAllSubscribersSearch();
                    }
                });
            }
        });
        document.getElementById('btn-search-subscribers-all')?.addEventListener('click', handleAllSubscribersSearch);
        document.getElementById('btn-reset-subscribers-all')?.addEventListener('click', handleResetAllSubscribersSearch);
        document.getElementById('btn-delete-selected-subscribers-all')?.addEventListener('click', handleDeleteSelectedSubscribersAll);

        document.getElementById('subscriberType')?.addEventListener('change', (e) => {
            const select = e.target as HTMLSelectElement;
            const isSearchMode = !document.getElementById('meter-search-clear-btn')?.classList.contains('hidden');

            if (isSearchMode && select.value === 'مرفوع أعطال') {
                const subscriptionCode = (document.getElementById('subscriptionCode') as HTMLInputElement).value;
                const subscriberName = (document.getElementById('subscriberName') as HTMLInputElement).value;

                // Find the latest meter for this subscriber (Newest first)
                const latestMeter = [...state.meters].reverse().find(m =>
                    (subscriptionCode && m.subscriptionCode === subscriptionCode) ||
                    (!subscriptionCode && subscriberName && m.subscriberName === subscriberName)
                );

                if (latestMeter) {
                    populateMeterFormForSearch(latestMeter);
                    // Restore the selected value as populateMeterFormForSearch might have overwritten it
                    select.value = 'مرفوع أعطال';
                }
            }
            updateMeterFormVisibility();
        });

        // Subscriber Statement Listener
        document.getElementById('subscriber-statement-form')?.addEventListener('submit', handleSubscriberStatementSearch);

        // Generic Print Record Listener (Delegation)
        document.body.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;
            const printBtn = target.closest('.btn-print-record');
            if (printBtn) {
                const id = parseInt((printBtn as HTMLElement).dataset.id!, 10);
                const type = (printBtn as HTMLElement).dataset.type;
                if (type === 'lost-memo') {
                    currentLostMemoIdForDetails = id;
                    handlePrintLostMemo();
                } else if (type === 'judicial-control') {
                    currentJudicialControlIdForDetails = id;
                    handlePrintJudicialControlDetails();
                }
            }
        });

        // Subscriber & User Details Page Listeners
        document.body.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;
            const parentSection = target.closest('.content-section.active');
            if (!parentSection) return;

            if (parentSection.id.startsWith('subscribers-') || parentSection.id === 'meter-management' || parentSection.id === 'repaired-meters') {
                const editButton = target.closest('.btn-edit-details');
                const viewButton = target.closest('.btn-view-details');
                const deleteButton = target.closest('.btn-delete');

                if (editButton) {
                    const meterId = parseInt((editButton as HTMLElement).dataset.id!, 10);
                    openSubscriberDetailsPage(meterId, 'edit');
                } else if (viewButton) {
                    const meterId = parseInt((viewButton as HTMLElement).dataset.id!, 10);
                    openSubscriberDetailsPage(meterId, 'view');
                } else if (deleteButton) {
                    currentMeterIdForDetails = parseInt((deleteButton as HTMLElement).dataset.id!, 10);
                    handleDeleteSubscriber();
                }
            } else if (parentSection.id === 'user-management') {
                const editButton = target.closest('.btn-edit-details');
                const deleteButton = target.closest('.btn-delete');
                if (editButton) {
                    const userId = parseInt((editButton as HTMLElement).dataset.id!, 10);
                    openUserFormForEdit(userId);
                } else if (deleteButton) {
                    const userId = parseInt((deleteButton as HTMLElement).dataset.id!, 10);
                    deleteUser(userId);
                }
            } else if (parentSection.id === 'mukayasat-list') {
                const viewButton = target.closest('.btn-view-details');
                const editButton = target.closest('.btn-edit-mukayasa');
                const deleteButton = target.closest('.btn-delete-mukayasa');

                if (viewButton) {
                    const mukayasaId = parseInt((viewButton as HTMLElement).dataset.id!, 10);
                    openMukayasaDetails(mukayasaId);
                } else if (editButton) {
                    const mukayasaId = parseInt((editButton as HTMLElement).dataset.id!, 10);
                    openMukayasatFormForEdit(mukayasaId);
                } else if (deleteButton) {
                    const mukayasaId = parseInt((deleteButton as HTMLElement).dataset.id!, 10);
                    handleDeleteMukayasa(mukayasaId);
                }
            } else if (parentSection.id === 'judicial-control-list') {
                const viewButton = target.closest('.btn-view-details');
                const editButton = target.closest('.btn-edit-details');
                const deleteButton = target.closest('.btn-delete');
                if (viewButton) {
                    const recordId = parseInt((viewButton as HTMLElement).dataset.id!, 10);
                    openJudicialControlDetails(recordId);
                } else if (editButton) {
                    const recordId = parseInt((editButton as HTMLElement).dataset.id!, 10);
                    openJudicialControlForm(recordId);
                } else if (deleteButton) {
                    const recordId = parseInt((deleteButton as HTMLElement).dataset.id!, 10);
                    handleDeleteJudicialControlRecord(recordId);
                }
            } else if (parentSection.id === 'lost-memos-search') {
                const viewButton = target.closest('.btn-view-details');
                const editButton = target.closest('.btn-edit-details');
                const deleteButton = target.closest('.btn-delete');
                if (viewButton) {
                    openLostMemoDetails(parseInt((viewButton as HTMLElement).dataset.id!, 10));
                } else if (editButton) {
                    openLostMemoForm(parseInt((editButton as HTMLElement).dataset.id!, 10));
                } else if (deleteButton) {
                    const memoId = parseInt((deleteButton as HTMLElement).dataset.id!, 10);
                    const memo = state.lostMeterMemos.find(m => m.id === memoId);
                    if (memo) {
                        showConfirmationDialog('تأكيد الحذف', `هل أنت متأكد من حذف مذكرة الفقد للمشترك "${memo.subscriberName}"؟`, async () => {
                            state.lostMeterMemos = state.lostMeterMemos.filter(m => m.id !== memoId);
                            await saveState();
                            renderLostMemosSection();
                            showToast('تم حذف المذكرة بنجاح.');
                        });
                    }
                }
            }
        });

        document.getElementById('save-details-btn')?.addEventListener('click', handleSaveDetails);
        document.getElementById('delete-subscriber-btn')?.addEventListener('click', handleDeleteSubscriber);
        document.getElementById('details-meterType')?.addEventListener('change', () => updateMeterFormVisibility('details-'));
        document.getElementById('details-subscriberType')?.addEventListener('change', () => updateMeterFormVisibility('details-'));

        document.body.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;
            if (target.id === 'delete-selected-meters') {
                handleDeleteSelectedMeters();
                return;
            }

            if (target.id === 'select-all-meters') {
                const selectAllCheckbox = target as HTMLInputElement;
                const checkboxes = Array.from(document.querySelectorAll('#meters-table tbody input[type="checkbox"].select-row')) as HTMLInputElement[];
                checkboxes.forEach(checkbox => checkbox.checked = selectAllCheckbox.checked);
            }
        });

        document.getElementById('select-all-meters')?.addEventListener('click', (event) => {
            const isChecked = (event.target as HTMLInputElement).checked;
            document.querySelectorAll('#meters-table tbody input[type="checkbox"].select-row').forEach((checkbox: HTMLInputElement) => {
                checkbox.checked = isChecked;
            });
        });

        document.getElementById('btn-delete-by-status')?.addEventListener('click', () => {
            const dialog = document.getElementById('delete-by-status-dialog');
            const select = document.getElementById('delete-status-select') as HTMLSelectElement;
            if (dialog && select) {
                const statuses = ['جديد', 'مرفوع أعطال', 'مرفوع إحلال', 'استغناء', 'تغير عقد اشتراك', 'استبدال', 'هدم', 'تم الإصلاح', 'لا يمكن إصلاحه', 'تم استبداله', 'تم تغير العداد', 'بيانات مستوردة من إكسل'];
                populateSelect(select, statuses, 'اختر الحالة...');
                dialog.hidden = false;
            }
        });

        document.getElementById('delete-by-status-cancel')?.addEventListener('click', () => {
            const dialog = document.getElementById('delete-by-status-dialog');
            if (dialog) dialog.hidden = true;
        });

        document.getElementById('delete-by-status-confirm')?.addEventListener('click', () => {
            const select = document.getElementById('delete-status-select') as HTMLSelectElement;
            const status = select.value;
            if (!status) {
                showToast('يرجى اختيار حالة للحذف.', 'error');
                return;
            }

            const count = state.meters.filter(m => m.subscriberType === status).length;
            if (count === 0) {
                showToast(`لا توجد سجلات بحالة "${status}" لحذفها.`, 'error');
                const dialog = document.getElementById('delete-by-status-dialog');
                if (dialog) dialog.hidden = true;
                return;
            }

            const dialog = document.getElementById('delete-by-status-dialog');
            if (dialog) dialog.hidden = true;

            const onConfirm = async () => {
                state.meters = state.meters.filter(m => m.subscriberType !== status);
                await saveState();
                logActivity('حذف جماعي', `تم حذف ${count} سجلات بحالة "${status}".`);
                showToast(`تم حذف ${count} سجلات بنجاح.`);

                const allSubscribersLink = document.querySelector('.sidebar-nav .nav-link[data-target="subscribers-all"]') as HTMLElement;
                if (document.getElementById('subscribers-all')?.classList.contains('active') && allSubscribersLink) {
                    allSubscribersLink.click();
                }
                renderDashboard();
            };

            showConfirmationDialog('تأكيد الحذف الجماعي', `هل أنت متأكد من حذف جميع المشتركين (${count}) الذين حالتهم "${status}"؟ لا يمكن التراجع عن هذا الإجراء.`, onConfirm);
        });

        // Repaired Meters Listeners
        document.getElementById('repair-search-form')?.addEventListener('submit', handleFaultyMeterSearch);
        document.getElementById('repair-form')?.addEventListener('submit', handleRepairFormSubmit);
        document.getElementById('repairStatus')?.addEventListener('change', updateRepairFormVisibility);

        // Reports Listeners
        document.getElementById('report-type')?.addEventListener('change', updateReportFilters);
        document.getElementById('report-generation-form')?.addEventListener('submit', handleGenerateReport);
        document.getElementById('print-report-btn')?.addEventListener('click', handlePrintReport);

        // Custom multiselect listener
        document.body.addEventListener('click', (e) => {
            const btn = (e.target as HTMLElement).closest('.multiselect-btn');
            if (btn) {
                const options = btn.nextElementSibling as HTMLElement;

                // Close other open multiselects
                document.querySelectorAll('.multiselect-options').forEach(el => {
                    if (el !== options) {
                        el.classList.add('hidden');
                    }
                });

                options?.classList.toggle('hidden');
                return;
            }

            // Action Dropdown Listener (Gear Icon)
            const actionDropdownBtn = (e.target as HTMLElement).closest('.action-dropdown-btn');
            if (actionDropdownBtn) {
                const content = actionDropdownBtn.nextElementSibling;
                if (content) {
                    document.querySelectorAll('.dropdown-content').forEach(el => {
                        if (el !== content) el.classList.add('hidden');
                    });
                    content.classList.toggle('hidden');
                }
                return;
            }

            // Close if clicking outside
            if (!(e.target as HTMLElement).closest('.custom-multiselect')) {
                document.querySelectorAll('.multiselect-options').forEach(o => o.classList.add('hidden'));
            }
            if (!(e.target as HTMLElement).closest('.action-dropdown')) {
                document.querySelectorAll('.dropdown-content').forEach(el => el.classList.add('hidden'));
            }
        });

        document.body.addEventListener('change', (e) => {
            const checkbox = e.target as HTMLInputElement;
            if (checkbox.matches('.meter-type-checkbox') || checkbox.matches('.address-checkbox') || checkbox.matches('.search-all-checkbox')) {
                const container = checkbox.closest('.custom-multiselect');
                const btn = container?.querySelector('.multiselect-btn') as HTMLButtonElement;
                let selector = '.search-all-checkbox:checked';
                if (checkbox.matches('.meter-type-checkbox')) selector = '.meter-type-checkbox:checked';
                else if (checkbox.matches('.address-checkbox')) selector = '.address-checkbox:checked';

                const selected = Array.from(container?.querySelectorAll<HTMLInputElement>(selector) || []);
                btn.textContent = selected.length > 0 ? selected.map(cb => cb.value).join(', ') : (btn.dataset.placeholder || 'اختر...');
            }
        });

        // Activity Log Listener
        document.getElementById('print-activity-log-btn')?.addEventListener('click', handlePrintActivityLog);

        // User Management Listeners
        document.getElementById('user-form')?.addEventListener('submit', handleUserFormSubmit);

        // Permissions Listeners (delegated inside render function)
        document.getElementById('permissions')?.addEventListener('change', (event) => {
            const target = event.target as HTMLInputElement;
            if (!target.matches('input[type="checkbox"]')) return;

            if (target.dataset.type === 'dashboard') handleDashboardPermissionChange(event);
            else if (target.dataset.type === 'report') handleReportPermissionChange(event);
            else if (target.dataset.type === 'button') handleButtonPermissionChange(event);
            else handlePermissionChange(event);
        });

        // Settings Listeners
        document.getElementById('export-backup-btn')?.addEventListener('click', handleExportBackup);
        document.getElementById('import-backup-btn')?.addEventListener('click', () => handleImportBackup());
        document.getElementById('export-csv-btn')?.addEventListener('click', handleExportCSV);
        document.getElementById('save-report-settings-btn')?.addEventListener('click', handleSaveReportSettings);
        document.getElementById('save-company-report-settings-btn')?.addEventListener('click', handleSaveCompanyReportSettings);

        // مستمعات أحداث الطلبات قيد الانتظار
        document.getElementById('add-area-dialog-confirm-btn')?.addEventListener('click', confirmAddPendingArea);
        document.getElementById('add-area-dialog-cancel-btn')?.addEventListener('click', hideAddPendingAreaDialog);
        document.getElementById('add-pending-area-dialog')?.addEventListener('click', (event) => {
            if (event.target === document.getElementById('add-pending-area-dialog')) {
                hideAddPendingAreaDialog();
            }
        });

        document.getElementById('import-pending-excel-trigger-btn')?.addEventListener('click', () => document.getElementById('pending-excel-upload')?.click());
        document.getElementById('pending-excel-upload')?.addEventListener('change', handleImportPendingExcel);
        document.getElementById('print-pending-requests-btn')?.addEventListener('click', handlePrintPendingRequests);
        document.getElementById('export-pending-excel-btn')?.addEventListener('click', handleExportPendingRequestsToExcel);

        // ربط أزرار العمليات الجماعية في صفحة الانتظار
        document.getElementById('assign-pending-requests-btn')?.addEventListener('click', handleAssignSelectedPendingRequests);
        document.getElementById('move-to-mukayasat-btn')?.addEventListener('click', handleMovePendingToMukayasat);
        document.getElementById('delete-selected-pending-btn')?.addEventListener('click', handleDeleteSelectedPendingRequests);
        document.getElementById('add-pending-address-tab-btn')?.addEventListener('click', handleAddNewPendingAddressTab);

        const pendingFilters = document.getElementById('pending-filters');
        if (pendingFilters) {
            const resetPending = () => { currentPendingPage = 1; pendingSelectedRequests = []; renderPendingRequestsSection(); };
            pendingFilters.addEventListener('input', resetPending);
            pendingFilters.addEventListener('change', resetPending);
        }


        // Delegated listener for all settings lists (add, delete, edit)
        const settingsContainer = document.getElementById('settings');
        if (settingsContainer) {
            settingsContainer.addEventListener('click', (event) => {
                const target = event.target as HTMLElement;
                const addButton = target.closest('.add-item-form .btn');
                const editButton = target.closest('.managed-list .btn-edit-details');
                const deleteButton = target.closest('.managed-list .btn-delete');
                const visibilityToggle = target.closest('.dashboard-visibility-toggle');

                // Handle Error Codes Add/Delete
                if (target.closest('#add-error-code-btn')) {
                    const codeInput = document.getElementById('new-error-code') as HTMLInputElement;
                    const descInput = document.getElementById('new-error-desc') as HTMLInputElement;
                    const actionInput = document.getElementById('new-error-action') as HTMLInputElement;
                    const meterTypeInput = document.getElementById('new-error-meter-type') as HTMLSelectElement;
                    const editIndexInput = document.getElementById('edit-error-code-index') as HTMLInputElement;
                    const editIndex = parseInt(editIndexInput?.value || '-1', 10);

                    if (codeInput.value && descInput.value) {
                        const newError = { code: codeInput.value, description: descInput.value, action: actionInput.value, meterType: meterTypeInput.value };

                        if (editIndex >= 0) {
                            state.settings.errorCodes[editIndex] = newError;
                            showToast('تم تحديث كود الخطأ.');
                        } else {
                            state.settings.errorCodes.push(newError);
                            showToast('تم إضافة كود الخطأ.');
                        }

                        saveState();
                        renderSettingsSection();
                        codeInput.value = '';
                        descInput.value = '';
                        actionInput.value = '';
                        meterTypeInput.value = 'الكل';
                        if (editIndexInput) editIndexInput.value = '-1';

                        const addBtn = document.getElementById('add-error-code-btn');
                        if (addBtn) addBtn.textContent = 'إضافة';
                        document.getElementById('cancel-error-code-edit-btn')?.classList.add('hidden');
                    }
                    return;
                } else if (target.closest('.edit-error-code-btn')) {
                    const index = parseInt((target.closest('.edit-error-code-btn') as HTMLElement).dataset.index!, 10);
                    const item = state.settings.errorCodes[index];
                    if (item) {
                        (document.getElementById('new-error-code') as HTMLInputElement).value = item.code;
                        (document.getElementById('new-error-desc') as HTMLInputElement).value = item.description;
                        (document.getElementById('new-error-action') as HTMLInputElement).value = item.action;
                        (document.getElementById('new-error-meter-type') as HTMLSelectElement).value = item.meterType;
                        (document.getElementById('edit-error-code-index') as HTMLInputElement).value = String(index);

                        const addBtn = document.getElementById('add-error-code-btn');
                        if (addBtn) addBtn.textContent = 'حفظ التعديلات';
                        document.getElementById('cancel-error-code-edit-btn')?.classList.remove('hidden');
                    }
                    return;
                } else if (target.closest('#cancel-error-code-edit-btn')) {
                    (document.getElementById('new-error-code') as HTMLInputElement).value = '';
                    (document.getElementById('new-error-desc') as HTMLInputElement).value = '';
                    (document.getElementById('new-error-action') as HTMLInputElement).value = '';
                    (document.getElementById('new-error-meter-type') as HTMLSelectElement).value = 'الكل';
                    (document.getElementById('edit-error-code-index') as HTMLInputElement).value = '-1';

                    const addBtn = document.getElementById('add-error-code-btn');
                    if (addBtn) addBtn.textContent = 'إضافة';
                    document.getElementById('cancel-error-code-edit-btn')?.classList.add('hidden');
                    return;
                } else if (target.closest('.delete-error-code-btn')) {
                    const index = parseInt((target.closest('.delete-error-code-btn') as HTMLElement).dataset.index!, 10);
                    if (!isNaN(index)) {
                        state.settings.errorCodes.splice(index, 1);
                        saveState();
                        renderSettingsSection();
                        showToast('تم حذف كود الخطأ.');
                    }
                    return;
                }

                // Handle Meter Pages Add/Delete
                if (target.closest('#add-meter-page-btn')) {
                    const titleInput = document.getElementById('new-meter-page-title') as HTMLInputElement;
                    const contentInput = document.getElementById('new-meter-page-content') as HTMLTextAreaElement;
                    const manufacturerInput = document.getElementById('new-meter-page-manufacturer') as HTMLInputElement;
                    const commonIssuesInput = document.getElementById('new-meter-page-common-issues') as HTMLTextAreaElement;
                    const structureInput = document.getElementById('new-meter-page-structure') as HTMLTextAreaElement;
                    const imageInput = document.getElementById('new-meter-page-image') as HTMLInputElement;
                    const editIndexInput = document.getElementById('edit-meter-page-index') as HTMLInputElement;
                    const editIndex = parseInt(editIndexInput?.value || '-1', 10);

                    if (titleInput.value && contentInput.value) {
                        const saveItem = (imgData: string | null) => {
                            const newItem = {
                                title: titleInput.value,
                                content: contentInput.value,
                                manufacturer: manufacturerInput.value,
                                commonIssues: commonIssuesInput.value,
                                pageStructure: structureInput.value,
                                image: imgData
                            };

                            if (editIndex >= 0) {
                                // Update existing
                                if (imgData === null && state.settings.meterPages[editIndex].image) {
                                    newItem.image = state.settings.meterPages[editIndex].image;
                                }
                                state.settings.meterPages[editIndex] = newItem;
                                showToast('تم تحديث صفحة العداد.');
                            } else {
                                // Add new
                                state.settings.meterPages.push(newItem);
                                showToast('تم إضافة صفحة العداد.');
                            }

                            saveState();
                            renderSettingsSection();
                            titleInput.value = '';
                            contentInput.value = '';
                            manufacturerInput.value = '';
                            commonIssuesInput.value = '';
                            structureInput.value = '';
                            if (imageInput) imageInput.value = '';
                            if (editIndexInput) editIndexInput.value = '-1';

                            const addBtn = document.getElementById('add-meter-page-btn');
                            if (addBtn) addBtn.textContent = 'إضافة';
                            document.getElementById('cancel-meter-page-edit-btn')?.classList.add('hidden');
                        };

                        if (imageInput && imageInput.files && imageInput.files[0]) {
                            const reader = new FileReader();
                            reader.onload = (e) => saveItem(e.target?.result as string);
                            reader.readAsDataURL(imageInput.files[0]);
                        } else {
                            saveItem(null);
                        }
                    }
                    return;
                } else if (target.closest('.edit-meter-page-btn')) {
                    const index = parseInt((target.closest('.edit-meter-page-btn') as HTMLElement).dataset.index!, 10);
                    const page = state.settings.meterPages[index];
                    if (page) {
                        (document.getElementById('new-meter-page-title') as HTMLInputElement).value = page.title;
                        (document.getElementById('new-meter-page-content') as HTMLTextAreaElement).value = page.content;
                        (document.getElementById('new-meter-page-manufacturer') as HTMLInputElement).value = page.manufacturer;
                        (document.getElementById('new-meter-page-common-issues') as HTMLTextAreaElement).value = page.commonIssues;
                        (document.getElementById('new-meter-page-structure') as HTMLTextAreaElement).value = page.pageStructure || '';
                        (document.getElementById('edit-meter-page-index') as HTMLInputElement).value = String(index);

                        const addBtn = document.getElementById('add-meter-page-btn');
                        if (addBtn) addBtn.textContent = 'حفظ التعديلات';
                        document.getElementById('cancel-meter-page-edit-btn')?.classList.remove('hidden');

                        document.getElementById('meter-pages-management-container')?.scrollIntoView({ behavior: 'smooth' });
                    }
                    return;
                } else if (target.closest('#cancel-meter-page-edit-btn')) {
                    (document.getElementById('new-meter-page-title') as HTMLInputElement).value = '';
                    (document.getElementById('new-meter-page-content') as HTMLTextAreaElement).value = '';
                    (document.getElementById('new-meter-page-manufacturer') as HTMLInputElement).value = '';
                    (document.getElementById('new-meter-page-common-issues') as HTMLTextAreaElement).value = '';
                    (document.getElementById('new-meter-page-structure') as HTMLTextAreaElement).value = '';
                    (document.getElementById('new-meter-page-image') as HTMLInputElement).value = '';
                    (document.getElementById('edit-meter-page-index') as HTMLInputElement).value = '-1';

                    const addBtn = document.getElementById('add-meter-page-btn');
                    if (addBtn) addBtn.textContent = 'إضافة';
                    document.getElementById('cancel-meter-page-edit-btn')?.classList.add('hidden');
                    return;
                } else if (target.closest('.delete-meter-page-btn')) {
                    const index = parseInt((target.closest('.delete-meter-page-btn') as HTMLElement).dataset.index!, 10);
                    if (!isNaN(index)) {
                        state.settings.meterPages.splice(index, 1);
                        saveState();
                        renderSettingsSection();
                        showToast('تم حذف صفحة العداد.');
                        const page = state.settings.meterPages[index];
                        showConfirmationDialog(
                            'تأكيد الحذف',
                            `هل أنت متأكد من حذف صفحة العداد "${page.title}"؟`,
                            () => {
                                state.settings.meterPages.splice(index, 1);
                                saveState();
                                renderSettingsSection();
                                showToast('تم حذف صفحة العداد.');
                            }
                        );
                    }
                    return;
                } else if (target.closest('#clear-all-meter-pages-btn')) {
                    showConfirmationDialog(
                        'تأكيد حذف الكل',
                        'هل أنت متأكد من حذف جميع صفحات العدادات؟ لا يمكن التراجع عن هذا الإجراء.',
                        () => {
                            state.settings.meterPages = [];
                            saveState();
                            renderSettingsSection();
                            showToast('تم حذف جميع صفحات العدادات.');
                        }
                    );
                    return;
                }

                if (addButton) {
                    event.preventDefault();
                    const listKey = (addButton as HTMLElement).dataset.list as SettingsListKey | 'roles';
                    if (listKey) {
                        handleAddItemToList(listKey);
                    }
                } else if (editButton) {
                    const listKey = (editButton as HTMLElement).dataset.list as 'roles' | 'addresses';
                    const key = (editButton as HTMLElement).dataset.key!;
                    if (key) {
                        handleEditItemFromList(listKey, key);
                    }
                } else if (deleteButton) {
                    const listKey = (deleteButton as HTMLElement).dataset.list as SettingsListKey | 'roles';
                    const keyOrIndex = (deleteButton as HTMLElement).dataset.key!;
                    if (listKey && keyOrIndex) {
                        handleDeleteItemFromList(listKey, keyOrIndex);
                    }
                } else if (visibilityToggle && visibilityToggle instanceof HTMLInputElement) {
                    const key = visibilityToggle.dataset.key;
                    const isVisible = visibilityToggle.checked;
                    if (key && key in state.settings.dashboardCardsVisibility) {
                        (state.settings.dashboardCardsVisibility as any)[key] = isVisible;
                        saveState();
                        showToast('تم تحديث إعدادات لوحة التحكم.');
                    }
                }
            });
        }

        // Company Logo Settings Listeners
        document.getElementById('upload-logo-btn')?.addEventListener('click', () => {
            document.getElementById('logo-upload-input')?.click();
        });
        document.getElementById('remove-logo-btn')?.addEventListener('click', () => {
            state.settings.companyLogo = null;
            saveState();
            updateUI();
            renderSettingsSection(); // To update the preview
            showToast('تمت إزالة الشعار بنجاح.');
        });
        document.getElementById('logo-upload-input')?.addEventListener('change', (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (!file) return;

            if (!file.type.startsWith('image/')) {
                showToast('يرجى اختيار ملف صورة صالح.', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                state.settings.companyLogo = result;
                saveState();
                updateUI();
                renderSettingsSection(); // To update the preview
                showToast('تم رفع الشعار بنجاح.');
            };
            reader.onerror = () => {
                showToast('حدث خطأ أثناء قراءة الملف.', 'error');
            };
            reader.readAsDataURL(file);
        });
        document.getElementById('logo-size-slider')?.addEventListener('input', (event) => {
            const slider = event.target as HTMLInputElement;
            const newSize = parseInt(slider.value, 10);
            const valueDisplay = document.getElementById('logo-size-value');
            if (valueDisplay) {
                valueDisplay.textContent = `${newSize}%`;
            }
            state.settings.companyLogoSize = newSize;
            applyLogoSize(newSize);
            saveState();
        });

        // إضافة أزرار التحكم الجماعي في العناوين
        const addressContainer = document.getElementById('addresses-list-container');
        if (addressContainer && !document.getElementById('address-bulk-actions')) {
            const bulkActions = document.createElement('div');
            bulkActions.id = 'address-bulk-actions';
            bulkActions.style.margin = '10px 0';
            bulkActions.innerHTML = `
            <button class="btn secondary" id="btn-select-all-addresses" style="padding: 4px 8px; font-size: 0.8rem;">تحديد الكل</button>
            <button class="btn btn-delete" id="btn-delete-selected-addresses" style="padding: 4px 8px; font-size: 0.8rem;">حذف المحدد</button>
        `;
            addressContainer.insertBefore(bulkActions, addressContainer.querySelector('ul'));

            document.getElementById('btn-select-all-addresses')?.addEventListener('click', () => {
                const cbs = document.querySelectorAll('.address-bulk-checkbox') as NodeListOf<HTMLInputElement>;
                const allSelected = Array.from(cbs).every(cb => cb.checked);
                cbs.forEach(cb => cb.checked = !allSelected);
            });

            document.getElementById('btn-delete-selected-addresses')?.addEventListener('click', () => {
                const selected = Array.from(document.querySelectorAll('.address-bulk-checkbox:checked')) as HTMLInputElement[];
                if (selected.length === 0) return showToast('يرجى تحديد عناوين أولاً', 'error');
                const indices = selected.map(cb => parseInt(cb.value, 10)).sort((a, b) => b - a);
                showConfirmationDialog('حذف متعدد', `هل تريد حذف ${indices.length} عنوان؟`, () => {
                    indices.forEach(idx => state.settings.addresses.splice(idx, 1));
                    saveState(); renderManagedList('addresses'); showToast('تم الحذف بنجاح');
                });
            });
        }

        // Sidebar toggle
        document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
            document.body.classList.toggle('sidebar-collapsed');
        });

        // Accordion behavior for sidebar categories: when one <details> opens, close the others
        document.querySelectorAll('.nav-category details').forEach(det => {
            det.addEventListener('toggle', (e) => {
                const opened = (e.currentTarget as HTMLDetailsElement).open;
                if (opened) {
                    document.querySelectorAll('.nav-category details').forEach(other => {
                        if (other !== e.currentTarget) {
                            (other as HTMLDetailsElement).open = false;
                        }
                    });
                }
            });
        });

    };

    // تهيئة التطبيق
    const initApp = async () => {
        setupHelpSection();
        setupExcelImportSection();
        setupLiquidationSection();
        addSidebarArrows();
        setupEventListeners();
        updateFavicon('normal');
        // Ensure sidebar categories are all collapsed on app start
        document.querySelectorAll('.nav-category details').forEach(d => (d as HTMLDetailsElement).open = false);

        // Apply saved theme
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            const sunIcon = document.getElementById('dark-mode-icon-sun');
            const moonIcon = document.getElementById('dark-mode-icon-moon');
            if (sunIcon && moonIcon) {
                sunIcon.style.display = 'none';
                moonIcon.style.display = 'block';
            }
        }

        document.title = 'المنظومة الموحدة للعدادات';

        await loadState(); // Always load state first (now async)

        const savedUserJSON = localStorage.getItem('currentUser');
        if (savedUserJSON) {
            try {
                loggedInUser = JSON.parse(savedUserJSON);
                updateUI();
                applyLogoSize(state.settings.companyLogoSize);
                showScreen('app-container');

                // Restore last active section
                const lastSection = localStorage.getItem('lastActiveSection') || 'dashboard';
                const link = document.querySelector(`.nav-link[data-target="${lastSection}"]`) as HTMLElement;
                if (link) {
                    const details = link.closest('details');
                    if (details) details.open = true;
                    link.click();
                } else {
                    renderDashboard();
                    document.querySelector('.nav-link[data-target="dashboard"]')?.classList.add('active');
                    const dashboardLink = document.querySelector('.sidebar-nav .nav-link[data-target="dashboard"]');
                    if (dashboardLink) {
                        setPageTitle(dashboardLink.querySelector('span')?.textContent || state.settings.companyName || 'ELMAGHRABI');
                    }
                }
            } catch (e) {
                console.error("Session restore failed", e);
                localStorage.removeItem('currentUser');
                showScreen('login-screen');
                populateUserDropdown();
            }
        } else {
            // Check if we have any state loaded (either from IDB or localStorage)
            if (state.users.length > 1 || state.meters.length > 0) {
                populateUserDropdown();
                updateUI();
                applyLogoSize(state.settings.companyLogoSize);
                showScreen('login-screen');
            } else {
                updateUI();
                applyLogoSize(state.settings.companyLogoSize);
                showScreen('welcome-screen');
            }
        }
    };

document.addEventListener('DOMContentLoaded', initApp);
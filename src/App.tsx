import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Boxes,
  Building2,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock,
  CloudUpload,
  Cpu,
  Download,
  FileText,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  MessageSquarePlus,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sun,
  UserCheck,
  UserPlus,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { AuthProvider, formatCompanyCode, useAuth } from './context/AuthContext.tsx';
import {
  CompanyDirectoryItem,
  NavSectionId,
  PLANT_ROLES,
  PLANT_SHIFTS,
  PlantStateData,
  SUPER_ADMIN_EMAILS,
  normalizeShiftLabel,
} from './types.ts';
import { DashboardScreen } from './components/DashboardScreen.tsx';
import { AssetsScreen } from './components/AssetsScreen.tsx';
import { MaintenanceScreen } from './components/MaintenanceScreen.tsx';
import { ComplaintsScreen } from './components/ComplaintsScreen.tsx';
import { StoreScreen } from './components/StoreScreen.tsx';
import { ProcurementScreen } from './components/ProcurementScreen.tsx';
import {
  ActivityLogScreen,
  DocumentsScreen,
  ReportsScreen,
  UsersScreen,
} from './components/ManagementScreens.tsx';
import { InstructionsBookScreen } from './components/InstructionsBookScreen.tsx';
import {
  CompanyScreenshotModal,
  UpdateRequestsScreen,
  downloadCompanyCardPng,
  findSimilarCompanies,
} from './components/CompanyPortalScreens.tsx';
import { SuperAdminPanel } from './components/SuperAdminPanel.tsx';
import {
  applyLocalMutation,
  buildLocalCompaniesDirectory,
  isRetiredOrDeletedCompany,
  loadLocalPlantState,
  saveLocalPlantState,
  restoreAndRefreshWhitelistedCompanies,
  restoreAllDeletedCompanyData,
} from './lib/clientFallbackStore.ts';

const INITIAL_EMPTY_STATE: PlantStateData = {
  updateRequests: [],
  departments: [],
  users: [],
  sections: [],
  machines: [],
  components: [],
  spareParts: [],
  breakdownLogs: [],
  dailyMaintenance: [],
  preventiveSchedules: [],
  machineHistory: [],
  complaints: [],
  spareStock: [],
  stockIssues: [],
  stockReceives: [],
  lowStockAlerts: [],
  requisitions: [],
  approvals: [],
  purchaseHistory: [],
  activityLogs: [],
  documents: [],
  syncedAt: new Date().toISOString(),
};

const NAV_ITEMS: { id: NavSectionId; label: string; topLabel?: string; icon: React.FC<any> }[] = [
  { id: 'dashboard', label: 'Dashboard', topLabel: 'Dashboard', icon: LayoutDashboard },
  { id: 'companies', label: 'Super Admin Panel', topLabel: 'Super Admin', icon: ShieldCheck },
  { id: 'assets', label: 'Asset Management', topLabel: 'Assets', icon: Cpu },
  { id: 'maintenance', label: 'Maintenance', topLabel: 'Maintenance', icon: Wrench },
  { id: 'complaints', label: 'Complaints', topLabel: 'Complaints', icon: ShieldAlert },
  { id: 'store', label: 'Store & Inventory', topLabel: 'Store', icon: Boxes },
  { id: 'procurement', label: 'Procurement', topLabel: 'Procurement', icon: ClipboardList },
  { id: 'users', label: 'Users & Roles', topLabel: 'Users', icon: Users },
  { id: 'activity', label: 'Activity Log', topLabel: 'Activity', icon: Activity },
  { id: 'reports', label: 'Reports & Analytics', topLabel: 'Reports', icon: BarChart3 },
  { id: 'documents', label: 'Documents', topLabel: 'Documents', icon: FileText },
  { id: 'update-requests', label: 'Request For An Update', topLabel: 'Update Requests', icon: MessageSquarePlus },
  { id: 'instructions', label: 'Instructions Book', topLabel: 'User Guide', icon: BookOpen },
];

const TOP_NAV_TAB_IDS: NavSectionId[] = [
  'dashboard',
  'companies',
  'assets',
  'maintenance',
  'complaints',
  'store',
  'procurement',
];

const ROLE_DESCRIPTIONS: Record<string, string> = {
  'Plant Admin': 'Full factory setup, users, departments & all modules',
  'Maintenance Engineer': 'Breakdowns, PM schedules, repairs & machine history',
  'Production Supervisor': 'Daily machine inspections, floor monitoring & maintenance coordination',
  'Store Keeper': 'Catalog spare parts, issue stock & receive GRN',
  'Procurement Officer': 'Purchase requisitions, approvals & PO tracking',
};

const SCREENSHOT_ACK_PREFIX = 'cmms_screenshot_ack_v1_';

function hasTakenScreenshotForCompany(companyCode: string): boolean {
  try {
    return localStorage.getItem(`${SCREENSHOT_ACK_PREFIX}${companyCode}`) === '1';
  } catch {
    return false;
  }
}

function markScreenshotTakenForCompany(companyCode: string) {
  try {
    localStorage.setItem(`${SCREENSHOT_ACK_PREFIX}${companyCode}`, '1');
  } catch {
    // ignore
  }
}

function FactoryMaintenanceShell() {
  const {
    user,
    loading,
    authError,
    knownGmailAccounts,
    workspaceProfile,
    savedCompanies,
    updateWorkspaceProfile,
    removeSavedCompanyProfile,
    signInWithGoogleAccountSelector,
    signInDirectWithGmail,
    switchGmailAccount,
    logout,
    authedFetch,
  } = useAuth();

  const [activeNav, setActiveNav] = useState<NavSectionId>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('cmms_ui_theme_v1');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // ignore
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    try {
      localStorage.setItem('cmms_ui_theme_v1', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [plantData, setPlantData] = useState<PlantStateData>(INITIAL_EMPTY_STATE);
  const [syncing, setSyncing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showLoginGuideModal, setShowLoginGuideModal] = useState(false);
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);
  const [screenshotTarget, setScreenshotTarget] = useState<{
    companyName: string;
    companyCode: string;
  } | null>(null);
  const [customGmailHint, setCustomGmailHint] = useState('');

  // Login Screen form states for Company Profile + Role Selection
  const [loginCompanyName, setLoginCompanyName] = useState(workspaceProfile.companyName);
  const [loginCompanyCode, setLoginCompanyCode] = useState(workspaceProfile.companyCode);
  const [loginRole, setLoginRole] = useState(workspaceProfile.selectedRole || PLANT_ROLES[0]);
  const [loginShift, setLoginShift] = useState(workspaceProfile.selectedShift || PLANT_SHIFTS[0]);
  const [loginValidationMsg, setLoginValidationMsg] = useState<string | null>(null);

  // Switch Company Modal form state
  const [modalCompanyName, setModalCompanyName] = useState(workspaceProfile.companyName);
  const [modalCompanyCode, setModalCompanyCode] = useState(workspaceProfile.companyCode);
  const [modalRole, setModalRole] = useState(workspaceProfile.selectedRole || PLANT_ROLES[0]);
  const [modalShift, setModalShift] = useState(workspaceProfile.selectedShift || PLANT_SHIFTS[0]);

  const isWebsiteSuperAdmin = Boolean(
    user?.email &&
      SUPER_ADMIN_EMAILS.some((e) => e.toLowerCase() === user.email!.toLowerCase())
  );

  useEffect(() => {
    restoreAllDeletedCompanyData();
  }, []);

  useEffect(() => {
    if (!isWebsiteSuperAdmin && activeNav === 'companies') {
      setActiveNav('dashboard');
    }
  }, [isWebsiteSuperAdmin, activeNav]);

  // Only merge all companies across the platform when the logged-in user is Website Super Admin
  const allKnownCompanies: CompanyDirectoryItem[] = useMemo(() => {
    if (!isWebsiteSuperAdmin) {
      if (
        !workspaceProfile.companyCode ||
        isRetiredOrDeletedCompany(workspaceProfile.companyCode, workspaceProfile.companyName)
      ) {
        return [];
      }
      return [
        {
          companyCode: workspaceProfile.companyCode,
          companyName: workspaceProfile.companyName,
          plantAdmins: user?.email ? [user.email] : [],
          userCount: plantData.users.length || 1,
          departmentCount: plantData.departments.length,
          machineCount: plantData.machines.length,
          openBreakdowns: plantData.breakdownLogs.filter(
            (b) => b.status !== 'Resolved' && b.status !== 'Closed'
          ).length,
          sparePartCount: plantData.spareParts.length,
          lastActiveAt: plantData.syncedAt || new Date().toISOString(),
        },
      ];
    }

    const map = new Map<string, CompanyDirectoryItem>();
    const serverList = plantData.companyDirectory || [];
    const localList = buildLocalCompaniesDirectory();

    for (const item of serverList) {
      if (
        item.companyCode &&
        !isRetiredOrDeletedCompany(item.companyCode, item.companyName)
      ) {
        map.set(item.companyCode, item);
      }
    }
    for (const item of localList) {
      if (
        item.companyCode &&
        !map.has(item.companyCode) &&
        !isRetiredOrDeletedCompany(item.companyCode, item.companyName)
      ) {
        map.set(item.companyCode, item);
      }
    }
    for (const sc of savedCompanies) {
      if (
        sc.companyCode &&
        !map.has(sc.companyCode) &&
        !isRetiredOrDeletedCompany(sc.companyCode, sc.companyName)
      ) {
        map.set(sc.companyCode, {
          companyCode: sc.companyCode,
          companyName: sc.companyName,
          plantAdmins: [],
          userCount: 1,
          departmentCount: 0,
          machineCount: 0,
          openBreakdowns: 0,
          sparePartCount: 0,
          lastActiveAt: new Date().toISOString(),
        });
      }
    }
    if (
      workspaceProfile.companyCode &&
      !map.has(workspaceProfile.companyCode) &&
      !isRetiredOrDeletedCompany(workspaceProfile.companyCode, workspaceProfile.companyName)
    ) {
      map.set(workspaceProfile.companyCode, {
        companyCode: workspaceProfile.companyCode,
        companyName: workspaceProfile.companyName,
        plantAdmins: user?.email ? [user.email] : [],
        userCount: plantData.users.length || 1,
        departmentCount: plantData.departments.length,
        machineCount: plantData.machines.length,
        openBreakdowns: plantData.breakdownLogs.filter(
          (b) => b.status !== 'Resolved' && b.status !== 'Closed'
        ).length,
        sparePartCount: plantData.spareParts.length,
        lastActiveAt: plantData.syncedAt || new Date().toISOString(),
      });
    }
    return Array.from(map.values());
  }, [isWebsiteSuperAdmin, plantData, savedCompanies, workspaceProfile, user]);

  // Prompt Plant Admin to take a screenshot when they first log into or create a company profile
  useEffect(() => {
    if (!user) return;
    if (
      !workspaceProfile.companyCode ||
      isRetiredOrDeletedCompany(workspaceProfile.companyCode, workspaceProfile.companyName)
    ) {
      return;
    }
    const activeRole =
      plantData.currentUser?.role || workspaceProfile.selectedRole || PLANT_ROLES[0];
    if (
      activeRole.toLowerCase().includes('admin') &&
      !hasTakenScreenshotForCompany(workspaceProfile.companyCode)
    ) {
      setScreenshotTarget({
        companyName: workspaceProfile.companyName,
        companyCode: workspaceProfile.companyCode,
      });
      setShowScreenshotModal(true);
    }
  }, [user, workspaceProfile.companyCode, workspaceProfile.companyName, workspaceProfile.selectedRole, plantData.currentUser?.role]);

  const fetchPlantState = useCallback(async () => {
    if (!user) return;
    setSyncing(true);
    setApiError(null);
    try {
      const res = await authedFetch('/api/plant-state');
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const localData = loadLocalPlantState(
          {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
          },
          workspaceProfile
        );
        setPlantData(localData);
        return;
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to synchronize plant data');
      }
      const data: PlantStateData = await res.json();
      setPlantData((prev) => {
        if (!data) return prev;
        // Merge seamlessly with existing state so user's created items are always preserved
        return {
          ...data,
          departments: data.departments?.length ? data.departments : prev.departments,
          sections: data.sections?.length ? data.sections : prev.sections,
          machines: data.machines?.length ? data.machines : prev.machines,
          components: data.components?.length ? data.components : prev.components,
          spareParts: data.spareParts?.length ? data.spareParts : prev.spareParts,
          spareStock: data.spareStock?.length ? data.spareStock : prev.spareStock,
          breakdownLogs: data.breakdownLogs?.length ? data.breakdownLogs : prev.breakdownLogs,
          complaints: data.complaints?.length ? data.complaints : prev.complaints,
        };
      });
      saveLocalPlantState(data, workspaceProfile.companyCode);
    } catch {
      const localData = loadLocalPlantState(
        {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        },
        workspaceProfile
      );
      setPlantData(localData);
    } finally {
      setSyncing(false);
    }
  }, [user, authedFetch, workspaceProfile]);

  useEffect(() => {
    if (user) {
      fetchPlantState();
      const interval = setInterval(fetchPlantState, 15000);
      return () => clearInterval(interval);
    }
  }, [user, fetchPlantState]);

  const handleSwitchProfileAndRole = async (updates: {
    companyName?: string;
    companyCode?: string;
    role?: string;
    shift?: string;
  }) => {
    const nextWorkspace = updateWorkspaceProfile({
      companyName: updates.companyName ?? workspaceProfile.companyName,
      companyCode: updates.companyCode ?? workspaceProfile.companyCode,
      selectedRole: updates.role ?? workspaceProfile.selectedRole,
      selectedShift: updates.shift ?? workspaceProfile.selectedShift,
    });

    // Optimistic UI update so Quick Role Switch feels instantaneous
    setPlantData((prev) => {
      const rlsScope =
        nextWorkspace.selectedRole === 'Plant Admin'
          ? 'FULL_RLS_SUPERUSER'
          : 'COMPANY_RLS_SCOPED';
      const updatedCurrentUser = prev.currentUser
        ? {
            ...prev.currentUser,
            companyCode: nextWorkspace.companyCode,
            companyName: nextWorkspace.companyName,
            role: nextWorkspace.selectedRole,
            shift: nextWorkspace.selectedShift,
            rlsPolicyLevel: rlsScope,
          }
        : undefined;
      const updatedUsers = prev.users.map((u) =>
        u.uid === user?.uid || u.email.toLowerCase() === user?.email?.toLowerCase()
          ? {
              ...u,
              companyCode: nextWorkspace.companyCode,
              companyName: nextWorkspace.companyName,
              role: nextWorkspace.selectedRole,
              shift: nextWorkspace.selectedShift,
              rlsPolicyLevel: rlsScope,
            }
          : u
      );
      return {
        ...prev,
        currentUser: updatedCurrentUser,
        users: updatedUsers,
      };
    });

    if (!user) return;
    setSyncing(true);
    setApiError(null);
    const payload = {
      uid: user.uid,
      companyCode: nextWorkspace.companyCode,
      companyName: nextWorkspace.companyName,
      role: nextWorkspace.selectedRole,
      shift: nextWorkspace.selectedShift,
    };
    try {
      const res = await authedFetch('/api/users/switch-profile', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json') || !res.ok) {
        const localUpdated = applyLocalMutation(
          '/api/users/switch-profile',
          'POST',
          payload,
          user.email || 'operator@factory.io',
          nextWorkspace.companyCode
        );
        setPlantData(localUpdated);
        return;
      }
      const freshState = await res.json();
      setPlantData(freshState);
      saveLocalPlantState(freshState, nextWorkspace.companyCode);
    } catch {
      const localUpdated = applyLocalMutation(
        '/api/users/switch-profile',
        'POST',
        payload,
        user.email || 'operator@factory.io',
        nextWorkspace.companyCode
      );
      setPlantData(localUpdated);
    } finally {
      setSyncing(false);
    }
  };

  const handleManualBackupSync = async () => {
    setSyncing(true);
    setApiError(null);
    const payload = {
      deviceLabel: navigator.userAgent.includes('Mobile')
        ? 'Mobile Phone Gmail Terminal'
        : 'Industrial Control Workstation',
    };
    try {
      const res = await authedFetch('/api/sync-backup', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json') || !res.ok) {
        const updatedLocal = applyLocalMutation(
          '/api/sync-backup',
          'POST',
          payload,
          user?.email || 'operator@factory.io',
          workspaceProfile.companyCode
        );
        setPlantData(updatedLocal);
        return;
      }
      const updated = await res.json();
      setPlantData(updated);
      saveLocalPlantState(updated, workspaceProfile.companyCode);
    } catch {
      const updatedLocal = applyLocalMutation(
        '/api/sync-backup',
        'POST',
        payload,
        user?.email || 'operator@factory.io',
        workspaceProfile.companyCode
      );
      setPlantData(updatedLocal);
    } finally {
      setSyncing(false);
    }
  };

  const mutateAndRefresh = async (url: string, method: string, payload: any) => {
    setSyncing(true);
    setApiError(null);
    try {
      const updatedLocal = applyLocalMutation(
        url,
        method,
        payload,
        user?.email || 'operator@factory.io',
        workspaceProfile.companyCode
      );
      setPlantData(updatedLocal);

      const res = await authedFetch(url, {
        method,
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await fetchPlantState();
      }
    } catch {
      // Local mutation is already applied and persisted
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteCompanyProfile = async (companyCode: string, _companyName: string) => {
    setSyncing(true);
    setApiError(null);
    try {
      removeSavedCompanyProfile(companyCode);
      const res = await authedFetch(`/api/companies/${encodeURIComponent(companyCode)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const result = await res.json().catch(() => null);
        if (result?.companyDirectory) {
          setPlantData((prev) => ({
            ...prev,
            companyDirectory: result.companyDirectory,
          }));
        }
      }
      await fetchPlantState();
    } catch {
      await fetchPlantState();
    } finally {
      setSyncing(false);
    }
  };

  const handleStartLoginWithProfile = async (emailHint?: string) => {
    const trimmedName = loginCompanyName.trim();
    const trimmedCode = formatCompanyCode(loginCompanyCode || trimmedName);
    if (!trimmedName || !trimmedCode) {
      setLoginValidationMsg('অনুগ্রহ করে প্রথমে আপনার নিজস্ব কোম্পানি বা ফ্যাক্টরির নাম ও কোড লিখুন (Please enter your Company / Factory Name & Code).');
      return;
    }
    if (isRetiredOrDeletedCompany(trimmedCode, trimmedName)) {
      setLoginValidationMsg(
        '"Default Factory" এবং "Main Industrial Factory" ডিলিট করা হয়েছে। অনুগ্রহ করে আপনার নিজস্ব ফ্যাক্টরি বা কোম্পানির আসল নাম ও কোড লিখুন।'
      );
      return;
    }
    setLoginValidationMsg(null);
    const effectiveEmail = emailHint || customGmailHint.trim() || undefined;
    await signInWithGoogleAccountSelector(effectiveEmail, {
      companyName: trimmedName,
      companyCode: trimmedCode,
      selectedRole: loginRole,
      selectedShift: loginShift,
    });
  };

  const handleDirectGmailLogin = async (emailToUse?: string) => {
    const trimmedName = loginCompanyName.trim();
    const trimmedCode = formatCompanyCode(loginCompanyCode || trimmedName);
    if (!trimmedName || !trimmedCode) {
      setLoginValidationMsg('অনুগ্রহ করে প্রথমে আপনার নিজস্ব কোম্পানি বা ফ্যাক্টরির নাম ও কোড লিখুন (Please enter your Company / Factory Name & Code).');
      return;
    }
    if (isRetiredOrDeletedCompany(trimmedCode, trimmedName)) {
      setLoginValidationMsg(
        '"Default Factory" এবং "Main Industrial Factory" ডিলিট করা হয়েছে। অনুগ্রহ করে আপনার নিজস্ব ফ্যাক্টরি বা কোম্পানির আসল নাম ও কোড লিখুন।'
      );
      return;
    }
    const targetEmail = (emailToUse || customGmailHint).trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      setLoginValidationMsg('অনুগ্রহ করে নিচের Gmail বক্সে আপনার পূর্ণ Gmail ঠিকানা লিখুন (যেমন: yourname@gmail.com)।');
      return;
    }
    setLoginValidationMsg(null);
    await signInDirectWithGmail(targetEmail, {
      companyName: trimmedName,
      companyCode: trimmedCode,
      selectedRole: loginRole,
      selectedShift: loginShift,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D1014] text-[#F1F5F9] flex items-center justify-center">
        <div className="bg-[#151A21] border border-[#262F3D] rounded-md p-6 flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-[#0070F3] animate-spin" />
          <span className="text-xs font-mono-tech uppercase tracking-wider">
            Initializing Industrial Maintenance Terminal...
          </span>
        </div>
      </div>
    );
  }

  // Dedicated Multi-Company Profile, Role Selector & Gmail Login Screen (X.com Style)
  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center p-4">
        <div className="max-w-xl w-full bg-[#16181C] border border-[#2F3336] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="border-b border-[#2F3336] pb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-[#1D9BF0] flex items-center justify-center text-white font-bold shadow-md">
                <Wrench className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                  MAINTEX
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#1D9BF0]/15 text-[#1D9BF0] font-mono border border-[#1D9BF0]/30">
                    X-EDITION
                  </span>
                </h1>
                <p className="text-xs text-[#71767B]">
                  MULTI-TENANT INDUSTRIAL CMMS &bull; ROLE-BASED ACCESS
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="inline-flex items-center p-0.5 rounded-full bg-[#202327] border border-[#2F3336]"
                role="group"
                aria-label="Theme mode toggle"
              >
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    theme === 'light'
                      ? 'bg-white text-black font-bold shadow-xs'
                      : 'text-[#71767B] hover:text-white'
                  }`}
                  title="Switch to Light Mode"
                >
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span className="hidden sm:inline">Light</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    theme === 'dark'
                      ? 'bg-white text-black font-bold shadow-xs'
                      : 'text-[#71767B] hover:text-white'
                  }`}
                  title="Switch to Dark Mode"
                >
                  <Moon className="w-3.5 h-3.5 text-[#1D9BF0]" />
                  <span className="hidden sm:inline">Dark</span>
                </button>
              </div>
            </div>
          </div>

          {/* Step 1: Company / Factory Workspace Profile */}
          <div className="bg-black border border-[#2F3336] rounded-xl p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1D9BF0]">
                <Building2 className="w-4 h-4" />
                <span>১. কোম্পানি / ফ্যাক্টরি প্রোফাইল (Company Profile)</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#202327] text-[#71767B]">
                TENANT ISOLATION
              </span>
            </div>
            <p className="text-xs text-[#71767B] leading-relaxed">
              প্রতিটি কোম্পানির জন্য আলাদা প্রোফাইল থাকবে। আপনার কোম্পানির নাম ও কোড দিন—এক কোম্পানির লোক অন্য কোম্পানির কোনো তথ্য দেখতে পাবে না।
            </p>

            {savedCompanies.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] uppercase tracking-wider text-[#71767B] font-semibold">
                  Saved Company Profiles on This Device:
                </div>
                <div className="flex flex-wrap gap-2">
                  {savedCompanies.map((sc) => {
                    const isCurrent = sc.companyCode === loginCompanyCode;
                    return (
                      <button
                        key={sc.companyCode}
                        type="button"
                        onClick={() => {
                          setLoginCompanyName(sc.companyName);
                          setLoginCompanyCode(sc.companyCode);
                          if (sc.selectedRole) setLoginRole(sc.selectedRole);
                          if (sc.selectedShift) setLoginShift(sc.selectedShift);
                        }}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-mono transition-all border ${
                          isCurrent
                            ? 'bg-[#1D9BF0] border-[#1D9BF0] text-white font-bold shadow-md'
                            : 'bg-[#202327] border-[#2F3336] text-[#71767B] hover:text-white hover:border-[#1D9BF0]'
                        }`}
                      >
                        <span className="font-bold">{sc.companyName}</span>{' '}
                        <span className="opacity-80">({sc.companyCode})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-[#71767B] mb-1.5">
                  Company / Factory Name (কোম্পানির নাম) *
                </label>
                <input
                  type="text"
                  required
                  value={loginCompanyName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLoginCompanyName(val);
                    setLoginCompanyCode(formatCompanyCode(val));
                  }}
                  placeholder="e.g. Square Textiles Ltd"
                  className="w-full bg-[#202327] border border-[#2F3336] focus:border-[#1D9BF0] focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#71767B] mb-1.5">
                  Company Access Code (কোম্পানি কোড) *
                </label>
                <input
                  type="text"
                  required
                  value={loginCompanyCode}
                  onChange={(e) => setLoginCompanyCode(formatCompanyCode(e.target.value))}
                  placeholder="e.g. SQUARE-TEXTILES"
                  className="w-full bg-[#202327] border border-[#2F3336] focus:border-[#1D9BF0] focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-[#1D9BF0] font-mono font-bold"
                />
              </div>
            </div>

            {/* Duplicate Spelling Mistake Warning if similar company exists */}
            {(() => {
              const similar = findSimilarCompanies(
                loginCompanyName,
                loginCompanyCode,
                allKnownCompanies
              ).filter((m) => !m.exactMatch);
              if (similar.length === 0) return null;
              return (
                <div className="p-3.5 rounded-xl bg-[#FFAD1F]/10 border border-[#FFAD1F]/30 text-xs space-y-2">
                  <div className="font-bold text-[#FFAD1F] flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      বানান সতর্কতা (Spelling Mistake Check): কাছাকাছি নামের কোম্পানি ইতিমধ্যে রয়েছে!
                    </span>
                  </div>
                  <p className="text-[11px] text-white">
                    আপনি কি নিচের বিদ্যমান কোম্পানিতে লগইন করতে চাচ্ছেন? ভুলবশত নতুন কোম্পানি তৈরি এড়াতে নিচের সঠিক প্রোফাইলটিতে ক্লিক করুন:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {similar.map((sim) => (
                      <button
                        key={sim.companyCode}
                        type="button"
                        onClick={() => {
                          setLoginCompanyName(sim.companyName);
                          setLoginCompanyCode(sim.companyCode);
                        }}
                        className="px-3 py-1 rounded-full bg-[#202327] hover:bg-[#1D9BF0]/20 border border-[#FFAD1F] text-xs font-mono text-[#1D9BF0]"
                      >
                        Use Existing: {sim.companyName} ({sim.companyCode})
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Plant Admin Screenshot Instruction & Official Card Download */}
            <div className="p-3.5 rounded-xl bg-[#1D9BF0]/10 border border-[#1D9BF0]/30 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#1D9BF0]">
                  <Camera className="w-4 h-4 text-[#FFAD1F] shrink-0" />
                  <span>
                    প্লান্ট এডমিনের জন্য নির্দেশনা: স্ক্রিনশট (Screenshot) তুলে রাখুন!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    downloadCompanyCardPng({
                      companyName: loginCompanyName.trim() || loginCompanyCode,
                      companyCode: formatCompanyCode(loginCompanyCode || loginCompanyName),
                      adminEmail: customGmailHint.trim() || 'Plant Admin',
                      role: loginRole,
                      shift: loginShift,
                    })
                  }
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#202327] hover:bg-black border border-[#2F3336] text-[11px] font-bold text-[#00BA7C] transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>কার্ড ডাউনলোড (.PNG)</span>
                </button>
              </div>
              <p className="text-[11px] text-[#71767B] leading-relaxed">
                কোম্পানি প্লান্ট এডমিন যখন নতুন কোম্পানি প্রোফাইল খুলবেন, তখন উপরের{' '}
                <span className="font-mono font-bold text-[#1D9BF0]">
                  {formatCompanyCode(loginCompanyCode || loginCompanyName)}
                </span>{' '}
                কোড ও নামের একটি <strong>স্ক্রিনশট (Screenshot)</strong> তুলে রাখুন এবং আপনার কোম্পানির সবাইকে দিন।
              </p>
            </div>
          </div>

          {/* Step 2: Select Role & Shift Before Login */}
          <div className="bg-black border border-[#2F3336] rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#00BA7C]">
                <UserCheck className="w-4 h-4" />
                <span>২. আপনার পদবী / Role নির্বাচন করুন (Select Role to Login)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PLANT_ROLES.map((roleOption) => {
                const selected = loginRole === roleOption;
                return (
                  <button
                    key={roleOption}
                    type="button"
                    onClick={() => setLoginRole(roleOption)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selected
                        ? 'bg-[#1D9BF0]/15 border-[#1D9BF0] text-white'
                        : 'bg-[#202327] border-[#2F3336] text-[#71767B] hover:border-[#1D9BF0]/50 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{roleOption}</span>
                      {selected && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00BA7C]/20 text-[#00BA7C] font-bold">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#71767B] mt-1">
                      {ROLE_DESCRIPTIONS[roleOption]}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-1">
              <label className="block text-xs font-medium text-[#71767B] mb-1.5">
                Duty Shift (আপনার ডিউটি শিফট)
              </label>
              <select
                value={loginShift}
                onChange={(e) => setLoginShift(e.target.value)}
                className="w-full bg-[#202327] border border-[#2F3336] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:border-[#1D9BF0] focus:outline-none"
              >
                {PLANT_SHIFTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loginValidationMsg && (
            <div className="p-3.5 rounded-xl bg-[#FFAD1F]/15 border border-[#FFAD1F]/40 text-xs text-[#FFAD1F]">
              {loginValidationMsg}
            </div>
          )}

          {/* Step 3: Google Account Authentication */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#71767B]">
              <Smartphone className="w-4 h-4 text-[#1D9BF0]" />
              <span>৩. Google / Gmail দিয়ে লগইন করুন</span>
            </div>

            {knownGmailAccounts.length > 0 && (
              <div className="space-y-2">
                {knownGmailAccounts.map((acc) => (
                  <button
                    key={acc.email}
                    onClick={() => handleStartLoginWithProfile(acc.email)}
                    className="w-full text-left p-3.5 rounded-full bg-[#202327] hover:bg-black border border-[#2F3336] hover:border-[#1D9BF0] transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1D9BF0]/20 border border-[#1D9BF0]/40 flex items-center justify-center text-[#1D9BF0] font-mono text-xs font-bold">
                        G
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-[#1D9BF0]">
                          {acc.email}
                        </div>
                        <div className="text-[11px] text-[#71767B]">
                          Login as {loginRole} &bull; {loginCompanyCode}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#1D9BF0] mr-2">Connect &rarr;</span>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => handleStartLoginWithProfile()}
              className="w-full py-3.5 px-6 rounded-full bg-[#1D9BF0] hover:bg-[#1A8CD8] text-white text-sm font-bold flex items-center justify-center gap-2 transition-transform active:scale-[0.99] shadow-lg cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              <span>
                Sign In with Gmail as [{loginRole}] &bull; {loginCompanyCode}
              </span>
            </button>

            <div className="space-y-1.5">
              <label className="block text-xs text-[#71767B]">
                কাস্টম ডোমেইন (`maintex.ai.studio`) বা পপ-আপ ছাড়া সরাসরি লগইন করতে আপনার Gmail লিখুন:
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={customGmailHint}
                  onChange={(e) => setCustomGmailHint(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleDirectGmailLogin();
                    }
                  }}
                  placeholder="আপনার Gmail লিখুন (যেমন: user@gmail.com)..."
                  className="flex-1 bg-[#202327] border border-[#2F3336] rounded-full px-4 py-2.5 text-xs text-white font-mono focus:border-[#1D9BF0] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleDirectGmailLogin()}
                  className="px-5 py-2.5 rounded-full bg-[#00BA7C] hover:bg-[#009e69] text-black text-xs font-bold shrink-0 transition-colors"
                >
                  Direct Login &rarr;
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowLoginGuideModal(true)}
              className="w-full py-2.5 px-4 rounded-full bg-[#202327] hover:bg-black border border-[#2F3336] text-xs font-bold text-[#1D9BF0] flex items-center justify-center gap-2 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span>Instructions Book (ব্যবহারবিধি দেখুন)</span>
            </button>
          </div>

          {authError && (
            <div className="p-3.5 rounded-xl bg-[#F4212E]/15 border border-[#F4212E]/30 text-xs text-[#F4212E]">
              {authError}
            </div>
          )}
        </div>

        {showLoginGuideModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#16181C] border border-[#2F3336] rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="px-6 py-4 bg-black border-b border-[#2F3336] flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <BookOpen className="w-4 h-4 text-[#1D9BF0]" />
                  <span>Instructions Book — ব্যবহারবিধি ও নির্দেশিকা</span>
                </div>
                <button
                  onClick={() => setShowLoginGuideModal(false)}
                  className="px-4 py-1.5 rounded-full bg-[#202327] hover:bg-[#2F3336] text-xs text-white font-bold"
                >
                  Close
                </button>
              </div>
              <div className="p-6 overflow-y-auto">
                <InstructionsBookScreen />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const currentActiveRole =
    plantData.currentUser?.role || workspaceProfile.selectedRole || PLANT_ROLES[0];
  const currentActiveShift = normalizeShiftLabel(
    plantData.currentUser?.shift || workspaceProfile.selectedShift || PLANT_SHIFTS[0]
  );

  return (
    <div className="min-h-screen bg-black text-white flex justify-center">
      {/* Mobile Sidebar Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs lg:hidden no-print"
        />
      )}

      {/* Main 3-Column Responsive Container (Centered X Layout) */}
      <div className="max-w-7xl w-full flex min-h-screen">
        {/* =========================================================================
            COLUMN 1: LEFT NAVIGATION SIDEBAR (X.COM STYLE)
            ========================================================================= */}
        <aside
          className={`no-print bg-black shrink-0 flex flex-col justify-between transition-all duration-200 z-50 ${
            mobileMenuOpen
              ? 'fixed inset-y-0 left-0 w-72 bg-[#16181C] border-r border-[#2F3336] p-4 shadow-2xl overflow-y-auto'
              : 'hidden lg:flex w-16 xl:w-64 sticky top-0 h-screen py-3 px-2 xl:px-4 border-r border-[#2F3336]'
          }`}
        >
          <div className="space-y-2">
            {/* Top Brand Logo Button */}
            <div className="flex items-center justify-between px-2 mb-2">
              <button
                type="button"
                onClick={() => setActiveNav('dashboard')}
                className="w-12 h-12 rounded-full hover:bg-[#181818] flex items-center justify-center text-white transition-colors cursor-pointer"
                title="MAINTEX Industrial Platform"
              >
                <div className="w-9 h-9 rounded-full bg-[#1D9BF0] flex items-center justify-center text-white font-black shadow-md">
                  <Wrench className="w-5 h-5" />
                </div>
              </button>

              {/* Close Drawer Button on Mobile */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="lg:hidden p-2 rounded-full hover:bg-[#202327] text-[#71767B] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Items List (X Pill Style) */}
            <nav className="flex flex-col gap-1 overflow-y-auto max-h-[calc(100vh-230px)] no-scrollbar">
              {NAV_ITEMS.filter((item) => item.id !== 'companies' || isWebsiteSuperAdmin).map(
                (item) => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveNav(item.id);
                        setMobileMenuOpen(false);
                      }}
                      title={item.label}
                      className={`flex items-center gap-4 px-3.5 py-3 rounded-full transition-all group cursor-pointer ${
                        isActive
                          ? 'font-black text-white bg-white/10'
                          : 'font-normal text-white hover:bg-[#181818]'
                      }`}
                    >
                      <Icon
                        className={`w-6 h-6 shrink-0 transition-transform group-hover:scale-110 ${
                          isActive ? 'text-[#1D9BF0]' : 'text-white'
                        }`}
                      />
                      <span className="hidden xl:inline text-lg leading-tight truncate">
                        {item.label}
                      </span>
                      {mobileMenuOpen && (
                        <span className="inline text-base font-medium truncate">
                          {item.label}
                        </span>
                      )}
                    </button>
                  );
                }
              )}
            </nav>

            {/* Large X-Style Action Pill Button */}
            <button
              onClick={() => {
                if (activeNav === 'maintenance') {
                  setActiveNav('dashboard');
                } else {
                  setActiveNav('maintenance');
                }
              }}
              className="w-full py-3.5 px-4 bg-[#1D9BF0] hover:bg-[#1A8CD8] text-white font-bold rounded-full text-base shadow-md hidden xl:flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
            >
              <Wrench className="w-4 h-4" />
              <span>Log Maintenance</span>
            </button>

            {/* Collapsed Icon-Only Action Button */}
            <button
              onClick={() => setActiveNav('maintenance')}
              title="Log Maintenance"
              className="w-12 h-12 bg-[#1D9BF0] hover:bg-[#1A8CD8] text-white rounded-full hidden lg:flex xl:hidden items-center justify-center mx-auto shadow-md transition-transform active:scale-95 cursor-pointer"
            >
              <Wrench className="w-5 h-5" />
            </button>
          </div>

          {/* User Profile Chip at Bottom of Sidebar (X.com User Badge) */}
          <div className="pt-2 border-t border-[#2F3336] mt-auto">
            <div
              onClick={() => setShowAccountModal(true)}
              className="flex items-center justify-between p-2 rounded-full hover:bg-[#181818] cursor-pointer group transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[#1D9BF0]/20 border border-[#1D9BF0]/40 flex items-center justify-center text-[#1D9BF0] font-bold text-sm shrink-0">
                  {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden xl:block min-w-0 text-left">
                  <div className="text-sm font-bold text-white truncate group-hover:text-[#1D9BF0]">
                    {workspaceProfile.companyName || 'Industrial Plant'}
                  </div>
                  <div className="text-xs text-[#71767B] font-mono truncate">
                    @{workspaceProfile.companyCode || 'TENANT'} &bull; {currentActiveRole}
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  logout();
                }}
                title="Sign Out"
                className="hidden xl:block p-1.5 rounded-full hover:bg-[#202327] text-[#71767B] hover:text-[#F4212E]"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* =========================================================================
            COLUMN 2: CENTER FEED / MAIN MODULE VIEWPORT (X.COM STYLE)
            ========================================================================= */}
        <div className="flex-1 max-w-2xl lg:max-w-3xl xl:max-w-4xl border-r border-[#2F3336] min-h-screen bg-black flex flex-col min-w-0 pb-16 lg:pb-0">
          {/* Sticky Header with Backdrop Blur */}
          <header className="no-print sticky top-0 z-30 backdrop-blur-md bg-black/80 border-b border-[#2F3336] flex flex-col">
            {/* Upper Header Row: Title & Mobile Hamburger & Utility Badges */}
            <div className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="lg:hidden p-2 rounded-full hover:bg-[#202327] text-white shrink-0"
                  aria-label="Open Navigation Drawer"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-black text-white tracking-tight truncate">
                    {NAV_ITEMS.find((n) => n.id === activeNav)?.label || 'Dashboard'}
                  </h2>
                  <div className="text-xs text-[#71767B] font-mono truncate">
                    {workspaceProfile.companyName} ({workspaceProfile.companyCode})
                  </div>
                </div>
              </div>

              {/* Right Quick Actions (Shift / Role / Sync / Theme) */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Switch Company Pill */}
                <button
                  type="button"
                  onClick={() => {
                    setModalCompanyName(workspaceProfile.companyName);
                    setModalCompanyCode(workspaceProfile.companyCode);
                    setModalRole(currentActiveRole);
                    setModalShift(workspaceProfile.selectedShift);
                    setShowCompanyModal(true);
                  }}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#202327] hover:bg-[#2F3336] border border-[#2F3336] text-xs font-mono text-white transition-colors"
                >
                  <Building2 className="w-3.5 h-3.5 text-[#1D9BF0]" />
                  <span>Switch Factory</span>
                </button>

                {/* Cloud Sync Pill */}
                <button
                  type="button"
                  onClick={handleManualBackupSync}
                  disabled={syncing}
                  title="Realtime Sync"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#202327] hover:bg-[#2F3336] border border-[#2F3336] text-xs font-mono text-[#1D9BF0] transition-colors"
                >
                  <CloudUpload className={`w-3.5 h-3.5 ${syncing ? 'animate-bounce' : ''}`} />
                  <span className="hidden sm:inline">{syncing ? 'Syncing' : 'Sync'}</span>
                </button>

                {/* Theme Switcher Toggle */}
                <div
                  className="inline-flex items-center p-0.5 rounded-full bg-[#202327] border border-[#2F3336]"
                  role="group"
                  aria-label="Theme toggle"
                >
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`p-1.5 rounded-full transition-colors ${
                      theme === 'light' ? 'bg-white text-black font-bold' : 'text-[#71767B]'
                    }`}
                    title="Light Mode"
                  >
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`p-1.5 rounded-full transition-colors ${
                      theme === 'dark' ? 'bg-white text-black font-bold' : 'text-[#71767B]'
                    }`}
                    title="Dark Mode"
                  >
                    <Moon className="w-3.5 h-3.5 text-[#1D9BF0]" />
                  </button>
                </div>
              </div>
            </div>

            {/* X-Style Top Tab Bar with Active Electric Blue Bottom Indicator */}
            <div className="flex items-center border-t border-[#2F3336] overflow-x-auto no-scrollbar">
              {TOP_NAV_TAB_IDS.filter((id) => id !== 'companies' || isWebsiteSuperAdmin).map(
                (tabId) => {
                  const navItem = NAV_ITEMS.find((n) => n.id === tabId);
                  if (!navItem) return null;
                  const isActive = activeNav === tabId;
                  return (
                    <button
                      key={tabId}
                      type="button"
                      onClick={() => setActiveNav(tabId)}
                      className="flex-1 py-3 px-4 text-center text-sm font-bold relative hover:bg-[#080808] transition-colors whitespace-nowrap cursor-pointer min-w-[90px]"
                    >
                      <span className={isActive ? 'text-white' : 'text-[#71767B]'}>
                        {navItem.topLabel || navItem.label}
                      </span>
                      {isActive && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-[#1D9BF0] rounded-full" />
                      )}
                    </button>
                  );
                }
              )}
            </div>
          </header>

          {/* Global Broadcast Announcement */}
          {(plantData.globalAnnouncements || []).length > 0 && (
            <div className="p-3 space-y-2 border-b border-[#2F3336] bg-[#16181C]">
              {(plantData.globalAnnouncements || []).map((notice) => (
                <div
                  key={notice.id}
                  className="px-4 py-2.5 rounded-xl bg-[#1D9BF0]/10 border border-[#1D9BF0]/30 text-xs flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-[#1D9BF0] shrink-0" />
                    <span>
                      <strong className="text-white font-bold">{notice.title}:</strong>{' '}
                      <span className="text-[#71767B]">{notice.message}</span>
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#1D9BF0]">
                    {notice.targetCompanyCode}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* X.com-Style Quick Composer / Plant Activity Log Box */}
          <div className="p-4 border-b border-[#2F3336] flex gap-3.5 bg-black">
            <div className="w-10 h-10 rounded-full bg-[#1D9BF0]/20 border border-[#1D9BF0]/40 flex items-center justify-center text-[#1D9BF0] font-bold shrink-0">
              {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-1 space-y-3">
              <div className="text-sm text-[#71767B] font-medium">
                {currentActiveRole} on {currentActiveShift} shift &bull; What is happening in the factory?
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#2F3336]">
                <div className="flex items-center gap-1 text-[#1D9BF0]">
                  <button
                    type="button"
                    onClick={() => setActiveNav('maintenance')}
                    title="Log Breakdown"
                    className="p-2 rounded-full hover:bg-[#1D9BF0]/10 transition-colors"
                  >
                    <Wrench className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveNav('complaints')}
                    title="Raise Issue / Complaint"
                    className="p-2 rounded-full hover:bg-[#1D9BF0]/10 transition-colors"
                  >
                    <ShieldAlert className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveNav('store')}
                    title="Issue / Receive Spare Stock"
                    className="p-2 rounded-full hover:bg-[#1D9BF0]/10 transition-colors"
                  >
                    <Boxes className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScreenshotTarget({
                        companyName: workspaceProfile.companyName,
                        companyCode: workspaceProfile.companyCode,
                      });
                      setShowScreenshotModal(true);
                    }}
                    title="View Plant Security Card"
                    className="p-2 rounded-full hover:bg-[#1D9BF0]/10 transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={currentActiveRole}
                    onChange={(e) => handleSwitchProfileAndRole({ role: e.target.value })}
                    className="bg-[#202327] border border-[#2F3336] rounded-full px-3 py-1 text-xs text-white font-medium focus:outline-none"
                  >
                    {PLANT_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setActiveNav('maintenance')}
                    className="px-4 py-1.5 rounded-full bg-[#1D9BF0] hover:bg-[#1A8CD8] text-white text-xs font-bold transition-all"
                  >
                    Post / Log
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Active Screen Viewport */}
          <main className="flex-1 p-4 sm:p-5 overflow-y-auto">
            {/* Official Print Header (Shown only during actual document printing) */}
            <div className="print-only mb-6 pb-4 border-b-2 border-slate-800 text-black">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold uppercase tracking-wider text-black">
                    {workspaceProfile.companyName} ({workspaceProfile.companyCode})
                  </div>
                  <div className="text-xs text-slate-700 font-mono">
                    MAINTEX Industrial CMMS &bull; Module:{' '}
                    {NAV_ITEMS.find((n) => n.id === activeNav)?.label} &bull; Role:{' '}
                    {currentActiveRole} ({currentActiveShift})
                  </div>
                </div>
                <div className="text-right text-xs font-mono text-slate-700">
                  <div>Printed: {new Date().toLocaleString()}</div>
                  <div>User: {user.email}</div>
                </div>
              </div>
            </div>

            {activeNav === 'dashboard' && (
              <DashboardScreen data={plantData} onNavigate={(sec) => setActiveNav(sec)} />
            )}

            {activeNav === 'companies' && isWebsiteSuperAdmin && (
              <SuperAdminPanel
                knownCompanies={allKnownCompanies}
                activeCompanyCode={workspaceProfile.companyCode}
                superAdminEmail={user.email || 'mdmahfuj0987@gmail.com'}
                currentPlantData={plantData}
                authedFetch={authedFetch}
                onSelectCompanyWorkspace={async (companyCode, companyName) => {
                  await handleSwitchProfileAndRole({
                    companyCode,
                    companyName,
                    role: currentActiveRole,
                    shift: workspaceProfile.selectedShift,
                  });
                  setActiveNav('dashboard');
                }}
                onDeleteCompanyProfile={handleDeleteCompanyProfile}
                onOpenCreateCompanyModal={() => {
                  setModalCompanyName('');
                  setModalCompanyCode('');
                  setModalRole('Plant Admin');
                  setModalShift(workspaceProfile.selectedShift);
                  setShowCompanyModal(true);
                }}
                onOpenScreenshotCard={(companyCode, companyName) => {
                  setScreenshotTarget({ companyCode, companyName });
                  setShowScreenshotModal(true);
                }}
                onRespondToUpdateRequest={(id, status, superAdminReply) =>
                  mutateAndRefresh(`/api/update-requests/${id}`, 'PATCH', {
                    status,
                    superAdminReply,
                  })
                }
                onRefreshGlobalState={fetchPlantState}
              />
            )}

          {activeNav === 'assets' && (
            <AssetsScreen
              data={plantData}
              onCreateSection={(p) => mutateAndRefresh('/api/sections', 'POST', p)}
              onCreateMachine={(p) => mutateAndRefresh('/api/machines', 'POST', p)}
              onCreateComponent={(p) => mutateAndRefresh('/api/components', 'POST', p)}
              onCreateSparePart={(p) => mutateAndRefresh('/api/spare-parts', 'POST', p)}
            />
          )}

          {activeNav === 'maintenance' && (
            <MaintenanceScreen
              data={plantData}
              onLogBreakdown={(p) => mutateAndRefresh('/api/breakdowns', 'POST', p)}
              onUpdateBreakdownStatus={(id, status, actionTaken) =>
                mutateAndRefresh(`/api/breakdowns/${id}`, 'PATCH', { status, actionTaken })
              }
              onLogDailyMaintenance={(p) => mutateAndRefresh('/api/daily-maintenance', 'POST', p)}
              onCreatePreventiveSchedule={(p) =>
                mutateAndRefresh('/api/preventive-schedules', 'POST', p)
              }
            />
          )}

          {activeNav === 'complaints' && (
            <ComplaintsScreen
              data={plantData}
              onCreateComplaint={(p) => mutateAndRefresh('/api/complaints', 'POST', p)}
              onAdvanceWorkflow={(id, workflowStage, assignedTo, workNotes, verifiedByProduction) =>
                mutateAndRefresh(`/api/complaints/${id}/stage`, 'PATCH', {
                  workflowStage,
                  assignedTo,
                  workNotes,
                  verifiedByProduction,
                })
              }
            />
          )}

          {activeNav === 'store' && (
            <StoreScreen
              data={plantData}
              onIssueStock={(p) => mutateAndRefresh('/api/store/issue', 'POST', p)}
              onReceiveStock={(p) => mutateAndRefresh('/api/store/receive', 'POST', p)}
            />
          )}

          {activeNav === 'procurement' && (
            <ProcurementScreen
              data={plantData}
              onCreateRequisition={(p) =>
                mutateAndRefresh('/api/procurement/requisitions', 'POST', p)
              }
              onApproveRequisition={(p) =>
                mutateAndRefresh('/api/procurement/approvals', 'POST', p)
              }
            />
          )}

          {activeNav === 'users' && (
            <UsersScreen
              data={plantData}
              currentCompanyName={workspaceProfile.companyName}
              currentCompanyCode={workspaceProfile.companyCode}
              currentRole={currentActiveRole}
              onUpdateUserRole={(userId, role, departmentId, shift, rlsPolicyLevel) =>
                mutateAndRefresh(`/api/users/${userId}/role`, 'PATCH', {
                  role,
                  departmentId,
                  shift,
                  rlsPolicyLevel,
                })
              }
              onSwitchOwnRole={(role, shift) => handleSwitchProfileAndRole({ role, shift })}
              onCreateDepartment={(p) => mutateAndRefresh('/api/departments', 'POST', p)}
            />
          )}

          {activeNav === 'activity' && <ActivityLogScreen data={plantData} />}

          {activeNav === 'reports' && <ReportsScreen data={plantData} />}

          {activeNav === 'documents' && (
            <DocumentsScreen
              data={plantData}
              onCreateDocument={(p) => mutateAndRefresh('/api/documents', 'POST', p)}
            />
          )}

          {activeNav === 'update-requests' && (
            <UpdateRequestsScreen
              requests={plantData.updateRequests || []}
              currentCompanyCode={workspaceProfile.companyCode}
              currentCompanyName={workspaceProfile.companyName}
              currentUserEmail={user.email || 'operator@factory.io'}
              currentUserName={
                plantData.currentUser?.displayName ||
                user.displayName ||
                (user.email ? user.email.split('@')[0] : 'Plant Operator')
              }
              currentUserRole={currentActiveRole}
              isWebsiteSuperAdmin={isWebsiteSuperAdmin}
              onSubmitUpdateRequest={(payload) =>
                mutateAndRefresh('/api/update-requests', 'POST', payload)
              }
              onRespondToUpdateRequest={(id, status, superAdminReply) =>
                mutateAndRefresh(`/api/update-requests/${id}`, 'PATCH', {
                  status,
                  superAdminReply,
                })
              }
            />
          )}

          {activeNav === 'instructions' && (
            <InstructionsBookScreen onNavigate={(sec) => setActiveNav(sec)} />
          )}
        </main>
      </div>

      {/* =========================================================================
          COLUMN 3: RIGHT SIDEBAR UTILITY & WIDGETS PANEL (X.COM STYLE)
          ========================================================================= */}
      <aside className="w-80 xl:w-88 shrink-0 hidden lg:flex flex-col gap-4 py-3 px-4 sticky top-0 h-screen overflow-y-auto no-scrollbar no-print">
        {/* Search Bar Input (X.com Style with #202327 rounded-full) */}
        <div className="bg-[#202327] rounded-full px-4 py-2.5 flex items-center gap-3 border border-transparent focus-within:border-[#1D9BF0] focus-within:bg-black transition-all">
          <span className="text-[#71767B]">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search plant, orders, assets..."
            className="bg-transparent text-sm text-white placeholder-[#71767B] focus:outline-none w-full"
          />
        </div>

        {/* Widget 1: What's happening in [Company] (Trending & Plant Health) */}
        <div className="bg-[#16181C] border border-[#2F3336] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-white">What's happening</h3>
            <span className="text-xs font-mono text-[#1D9BF0]">{workspaceProfile.companyCode}</span>
          </div>

          <div className="space-y-3 divide-y divide-[#2F3336]/60">
            <div
              onClick={() => setActiveNav('maintenance')}
              className="pt-2 flex items-center justify-between cursor-pointer group"
            >
              <div>
                <div className="text-[11px] text-[#71767B]">Breakdown Stream &bull; Live</div>
                <div className="text-xs font-bold text-white group-hover:text-[#1D9BF0]">
                  {plantData.breakdownLogs.filter((b) => b.status !== 'Resolved' && b.status !== 'Closed').length} Active Breakdowns
                </div>
                <div className="text-[11px] text-[#71767B]">
                  {plantData.breakdownLogs.length} total recorded
                </div>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#F4212E]/20 text-[#F4212E]">
                CRITICAL
              </span>
            </div>

            <div
              onClick={() => setActiveNav('store')}
              className="pt-2 flex items-center justify-between cursor-pointer group"
            >
              <div>
                <div className="text-[11px] text-[#71767B]">Inventory &bull; Spares</div>
                <div className="text-xs font-bold text-white group-hover:text-[#1D9BF0]">
                  {plantData.lowStockAlerts.length} Low Stock Alerts
                </div>
                <div className="text-[11px] text-[#71767B]">
                  {plantData.spareParts.length} cataloged parts
                </div>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#FFAD1F]/20 text-[#FFAD1F]">
                RESTOCK
              </span>
            </div>

            <div
              onClick={() => setActiveNav('procurement')}
              className="pt-2 flex items-center justify-between cursor-pointer group"
            >
              <div>
                <div className="text-[11px] text-[#71767B]">Procurement &bull; Orders</div>
                <div className="text-xs font-bold text-white group-hover:text-[#1D9BF0]">
                  {plantData.requisitions.filter((r) => r.status === 'Pending').length} Pending Approvals
                </div>
                <div className="text-[11px] text-[#71767B]">
                  {plantData.requisitions.length} requisitions
                </div>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#1D9BF0]/20 text-[#1D9BF0]">
                REVIEW
              </span>
            </div>
          </div>
        </div>

        {/* Widget 2: Plant Duty Crew / Who to coordinate */}
        <div className="bg-[#16181C] border border-[#2F3336] rounded-2xl p-4 space-y-3">
          <h3 className="text-base font-black text-white">Duty Crew</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-[#00BA7C]/20 border border-[#00BA7C]/40 flex items-center justify-center text-[#00BA7C] font-bold text-xs shrink-0">
                  ADM
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    Plant Admin
                  </div>
                  <div className="text-[11px] text-[#71767B] font-mono truncate">
                    {user.email || 'admin@factory.io'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalCompanyName(workspaceProfile.companyName);
                  setModalCompanyCode(workspaceProfile.companyCode);
                  setModalRole('Plant Admin');
                  setModalShift(workspaceProfile.selectedShift);
                  setShowCompanyModal(true);
                }}
                className="px-3.5 py-1 rounded-full bg-white hover:bg-[#EFF3F4] text-black text-xs font-bold shrink-0 transition-colors cursor-pointer"
              >
                Switch
              </button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-[#1D9BF0]/20 border border-[#1D9BF0]/40 flex items-center justify-center text-[#1D9BF0] font-bold text-xs shrink-0">
                  ENG
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    Maintenance Lead
                  </div>
                  <div className="text-[11px] text-[#71767B] truncate">
                    Shift: {currentActiveShift}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSwitchProfileAndRole({ role: 'Maintenance Engineer' })}
                className="px-3.5 py-1 rounded-full bg-[#202327] hover:bg-[#2F3336] text-white text-xs font-bold border border-[#2F3336] shrink-0 transition-colors cursor-pointer"
              >
                Take
              </button>
            </div>
          </div>
        </div>

        {/* Widget 3: Realtime Database Status & Company Card */}
        <div className="bg-[#16181C] border border-[#2F3336] rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00BA7C] animate-pulse" />
              Live PostgreSQL & Cloud Sync
            </span>
            <span className="text-[10px] font-mono text-[#00BA7C]">ONLINE</span>
          </div>
          <p className="text-[11px] text-[#71767B] leading-relaxed">
            Industrial tenant records are isolated with Row Level Security for {workspaceProfile.companyCode}.
          </p>
          <button
            type="button"
            onClick={() => {
              setScreenshotTarget({
                companyName: workspaceProfile.companyName,
                companyCode: workspaceProfile.companyCode,
              });
              setShowScreenshotModal(true);
            }}
            className="w-full py-2 px-3 rounded-full bg-[#202327] hover:bg-[#2F3336] border border-[#2F3336] text-xs font-bold text-[#1D9BF0] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Official Screenshot ID Card</span>
          </button>
        </div>

        {/* Footer Metadata */}
        <div className="px-2 text-[11px] text-[#71767B] space-y-1">
          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
            <button onClick={() => setShowLoginGuideModal(true)} className="hover:underline">User Guide</button>
            <span>&bull;</span>
            <button onClick={() => setActiveNav('documents')} className="hover:underline">Docs</button>
            <span>&bull;</span>
            <button onClick={() => setActiveNav('update-requests')} className="hover:underline">Requests</button>
          </div>
          <div>&copy; 2026 MAINTEX Industrial &bull; X Edition</div>
        </div>
      </aside>
    </div>

      {/* Multi-Company Workspace & Role Switcher Modal (X.com Style) */}
      {showCompanyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#16181C] border border-[#2F3336] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2F3336] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#1D9BF0]" />
                Multi-Factory Company Profile & Role Switcher
              </h3>
              <button
                onClick={() => setShowCompanyModal(false)}
                className="p-1 rounded-full hover:bg-[#202327] text-[#71767B] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#71767B] leading-relaxed">
              এক কোম্পানির প্রোফাইলের তথ্য অন্য কোম্পানি দেখতে পাবে না। নতুন কোম্পানি প্রোফাইল তৈরি করতে বা অন্য কোম্পানিতে সুইচ করতে নিচে কোম্পানির নাম ও কোড দিন:
            </p>

            {savedCompanies.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] uppercase tracking-wider text-[#71767B] font-semibold">
                  Saved Company Profiles on Device:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {savedCompanies.map((sc) => {
                    const isCurrent = sc.companyCode === workspaceProfile.companyCode;
                    return (
                      <button
                        key={sc.companyCode}
                        type="button"
                        onClick={async () => {
                          setModalCompanyName(sc.companyName);
                          setModalCompanyCode(sc.companyCode);
                          await handleSwitchProfileAndRole({
                            companyName: sc.companyName,
                            companyCode: sc.companyCode,
                            role: sc.selectedRole || modalRole,
                            shift: sc.selectedShift || modalShift,
                          });
                          setShowCompanyModal(false);
                        }}
                        className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-[#1D9BF0]/15 border-[#1D9BF0] text-white font-bold'
                            : 'bg-[#202327] border-[#2F3336] text-[#71767B] hover:text-white hover:border-[#1D9BF0]'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="text-xs font-bold text-white truncate">
                            {sc.companyName}
                          </div>
                          <div className="text-[11px] font-mono text-[#1D9BF0] font-semibold mt-0.5">
                            ({sc.companyCode})
                          </div>
                        </div>
                        {isCurrent && (
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#00BA7C]/20 text-[#00BA7C] font-bold">
                            ACTIVE
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-3 pt-2 border-t border-[#2F3336] text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#71767B] mb-1 font-medium">Company / Factory Name</label>
                  <input
                    type="text"
                    value={modalCompanyName}
                    onChange={(e) => {
                      setModalCompanyName(e.target.value);
                      setModalCompanyCode(formatCompanyCode(e.target.value));
                    }}
                    placeholder="e.g. Akij Plastics Ltd"
                    className="w-full bg-[#202327] border border-[#2F3336] rounded-xl px-3.5 py-2 text-white focus:border-[#1D9BF0] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#71767B] mb-1 font-medium">Company Unique Code</label>
                  <input
                    type="text"
                    value={modalCompanyCode}
                    onChange={(e) => setModalCompanyCode(formatCompanyCode(e.target.value))}
                    placeholder="e.g. AKIJ-PLASTICS"
                    className="w-full bg-[#202327] border border-[#2F3336] rounded-xl px-3.5 py-2 text-[#1D9BF0] font-mono font-bold focus:border-[#1D9BF0] focus:outline-none"
                  />
                </div>
              </div>

              {/* Duplicate Spelling Mistake Warning inside Switch/Create Modal */}
              {(() => {
                const similar = findSimilarCompanies(
                  modalCompanyName,
                  modalCompanyCode,
                  allKnownCompanies
                ).filter((m) => !m.exactMatch);
                if (similar.length === 0) return null;
                return (
                  <div className="p-3 rounded-xl bg-[#FFAD1F]/10 border border-[#FFAD1F]/30 text-xs space-y-2">
                    <div className="font-bold text-[#FFAD1F] flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>
                        বানান সতর্কতা: কাছাকাছি নামের কোম্পানি ইতিমধ্যে নিবন্ধিত রয়েছে!
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {similar.map((sim) => (
                        <button
                          key={sim.companyCode}
                          type="button"
                          onClick={() => {
                            setModalCompanyName(sim.companyName);
                            setModalCompanyCode(sim.companyCode);
                          }}
                          className="px-3 py-1 rounded-full bg-[#202327] hover:bg-[#1D9BF0]/20 border border-[#FFAD1F] text-xs font-mono text-[#1D9BF0]"
                        >
                          Select Existing: {sim.companyName} ({sim.companyCode})
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#71767B] mb-1 font-medium">Your Role in This Company</label>
                  <select
                    value={modalRole}
                    onChange={(e) => setModalRole(e.target.value)}
                    className="w-full bg-[#202327] border border-[#2F3336] rounded-xl px-3.5 py-2 text-white focus:border-[#1D9BF0] focus:outline-none"
                  >
                    {PLANT_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#71767B] mb-1 font-medium">Shift</label>
                  <select
                    value={modalShift}
                    onChange={(e) => setModalShift(e.target.value)}
                    className="w-full bg-[#202327] border border-[#2F3336] rounded-xl px-3.5 py-2 text-white font-mono focus:border-[#1D9BF0] focus:outline-none"
                  >
                    {PLANT_SHIFTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#2F3336]">
                <button
                  type="button"
                  onClick={() => setShowCompanyModal(false)}
                  className="px-4 py-2 rounded-full bg-[#202327] text-[#71767B] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const finalName = modalCompanyName.trim() || modalCompanyCode.trim();
                    const finalCode = formatCompanyCode(modalCompanyCode || modalCompanyName);
                    if (!finalName || !finalCode || isRetiredOrDeletedCompany(finalCode, finalName)) {
                      setApiError(
                        '"Default Factory" এবং "Main Industrial Factory" ডিলিট করা হয়েছে। অনুগ্রহ করে আপনার নিজস্ব কোম্পানি বা ফ্যাক্টরির আসল নাম ও কোড লিখুন।'
                      );
                      return;
                    }
                    await handleSwitchProfileAndRole({
                      companyName: finalName,
                      companyCode: finalCode,
                      role: modalRole,
                      shift: modalShift,
                    });
                    setShowCompanyModal(false);
                    if (modalRole.toLowerCase().includes('admin')) {
                      setScreenshotTarget({
                        companyName: finalName,
                        companyCode: finalCode,
                      });
                      setShowScreenshotModal(true);
                    }
                  }}
                  className="px-5 py-2 rounded-full bg-[#1D9BF0] hover:bg-[#1A8CD8] text-white font-bold transition-all"
                >
                  Apply & View Card
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official Company Profile Screenshot Modal for Plant Admins */}
      <CompanyScreenshotModal
        isOpen={showScreenshotModal}
        companyName={screenshotTarget?.companyName || workspaceProfile.companyName}
        companyCode={screenshotTarget?.companyCode || workspaceProfile.companyCode}
        adminEmail={user.email || 'admin@factory.io'}
        role={currentActiveRole}
        shift={workspaceProfile.selectedShift}
        onConfirmScreenshotTaken={() => {
          const codeToAck = screenshotTarget?.companyCode || workspaceProfile.companyCode;
          markScreenshotTakenForCompany(codeToAck);
          setShowScreenshotModal(false);
        }}
        onClose={() => setShowScreenshotModal(false)}
      />

      {/* Multi-Account Gmail Switcher Modal (X.com Style) */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#16181C] border border-[#2F3336] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2F3336] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#1D9BF0]" />
                Multi-Account Gmail & Device Sync
              </h3>
              <button
                onClick={() => setShowAccountModal(false)}
                className="p-1 rounded-full hover:bg-[#202327] text-[#71767B] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#71767B]">
              Select a known Gmail account from your phone/device or open the Google multi-account
              selector to switch operators with automatic real-time backup sync.
            </p>

            <div className="space-y-2">
              {knownGmailAccounts.map((acc) => {
                const isCurrent = acc.email.toLowerCase() === user.email?.toLowerCase();
                return (
                  <div
                    key={acc.email}
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                      isCurrent
                        ? 'bg-[#1D9BF0]/15 border-[#1D9BF0]'
                        : 'bg-[#202327] border-[#2F3336]'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-mono font-bold text-white">
                        {acc.email}
                      </div>
                      <div className="text-[11px] text-[#71767B]">{acc.deviceSource}</div>
                    </div>
                    {isCurrent ? (
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#00BA7C]/20 text-[#00BA7C] font-bold">
                        ACTIVE
                      </span>
                    ) : (
                      <button
                        onClick={async () => {
                          await switchGmailAccount(acc.email);
                          setShowAccountModal(false);
                        }}
                        className="text-xs font-bold text-[#1D9BF0] hover:underline"
                      >
                        Switch
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-[#2F3336] flex flex-col gap-2">
              <button
                onClick={async () => {
                  await switchGmailAccount();
                  setShowAccountModal(false);
                }}
                className="w-full py-3 px-4 rounded-full bg-[#1D9BF0] hover:bg-[#1A8CD8] text-white text-xs font-bold flex items-center justify-center gap-2 transition-transform active:scale-95"
              >
                <UserPlus className="w-4 h-4" />
                <span>Choose Another Gmail Account</span>
              </button>
              <button
                onClick={() => setShowAccountModal(false)}
                className="w-full py-2 px-4 rounded-full bg-[#202327] hover:bg-[#2F3336] text-[#71767B] hover:text-white text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (Ergonomic Thumb-Zone Navigation for Mobile Browsers) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-md border-t border-[#2F3336] lg:hidden no-print shadow-2xl">
        <div className="grid grid-cols-5 items-center h-14 px-1 max-w-lg mx-auto">
          {[
            { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
            { id: 'assets', label: 'Assets', icon: Cpu },
            { id: 'maintenance', label: 'Maintain', icon: Wrench },
            { id: 'complaints', label: 'Issues', icon: ShieldAlert },
            { id: 'store', label: 'Store', icon: Boxes },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeNav === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveNav(tab.id as NavSectionId)}
                className={`flex flex-col items-center justify-center py-1 gap-0.5 text-[10px] font-semibold transition-colors min-h-[44px] ${
                  isActive
                    ? 'text-[#1D9BF0] font-bold'
                    : 'text-[#71767B] hover:text-white'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? 'text-[#1D9BF0] scale-110' : 'text-[#71767B]'
                  } transition-transform`}
                />
                <span className="truncate max-w-[56px] leading-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <FactoryMaintenanceShell />
    </AuthProvider>
  );
}

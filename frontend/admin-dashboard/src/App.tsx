/**
 * ── Elite Actuarial Control Plane & Visibility Layer ──────────────────────
 * 
 * The Aegis Admin Dashboard is a clinical, high-fidelity command interface 
 * engineered for absolute transparency and industrial-scale oversight. 
 * As the nervous system of the Aegis ecosystem, it rejects synthetic 
 * approximations in favor of authoritative, forensic-ready telemetry.
 * 
 * For the definitive architectural source of truth, refer to:
 * - ARCHITECTURE/ADMIN_CONTROL_PLANE.md
 * 
 * For a deep dive into the system design, refer to ARCHITECTURE/SYSTEM_ARCHITECTURE.md 
 * and ARCHITECTURE/OVERALL_PROJECT_SYSTEM_VIEW.md.
 */

import { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  Settings,
  LogOut,
  Search,
  Zap,
  LayoutDashboard,
  ChevronRight,
  Bell,
  BarChart3,
  Target,
  FileText,
  ArrowLeft,
  MapPinned
} from 'lucide-react';
import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { adminApi } from './services/api';
import DriverScooterMap from './components/DriverScooterMap';
import logo from './assets/logo.png';
import MetricDonutChart from './components/charts/MetricDonutChart';
import ActivityBarChart from './components/charts/ActivityBarChart';
import RiskTrendChart from './components/charts/RiskTrendChart';


// --- MAIN APP COMPONENT ---
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('adminToken'));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [email, setEmail] = useState('suryaravichandran5555@gmail.com');
  const [password, setPassword] = useState('surya@100416');
  const [otp, setOtp] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchGlobalData();
    }
  }, [isAuthenticated]);

  const fetchGlobalData = async () => {
    try {
      setLoading(true);
      const dashboard = await adminApi.getDashboard();
      setData(dashboard);
    } catch (e) {
      console.error('Fetch error:', e);
      if (e instanceof Error && (e.message.includes('Unauthorized') || e.message.includes('token'))) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      setAuthError('');

      if (!mfaRequired) {
        // Step 1: Password Authentication
        const res = await adminApi.login({ email, password });

        if (res.message && res.message.includes('OTP')) {
          setMfaRequired(true);
        } else {
          // Some configurations might skip MFA for certain nodes
          const token = res.accessToken || res.access_token;
          if (token) {
            localStorage.setItem('adminToken', token);
            setIsAuthenticated(true);
          } else {
            throw new Error('MFA required but no redirect provided');
          }
        }
      } else {
        // Step 2: OTP Verification
        const res = await adminApi.verifyOtp({ email, otp: otp.trim() });

        const token = res.accessToken || res.access_token;
        if (token) {
          localStorage.setItem('adminToken', token);
          setIsAuthenticated(true);
          setMfaRequired(false);
          setOtp(''); // Clear OTP on success
        } else {
          throw new Error('Verification successful, but session token is missing');
        }
      }
    } catch (e: any) {
      console.error('Authentication Error Detail:', e);
      setAuthError(e.message || 'Authentication Protocol Rejected');
      if (e.message.includes('expired')) {
        setMfaRequired(false);
        setOtp('');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsAuthenticated(false);
    setData(null);
    setMfaRequired(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50">
        <div className="neo-card w-full max-w-md bg-white">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-night p-2 border-2 border-black">
              <Shield className="text-coral" size={32} />
            </div>
            <h1 className="text-4xl italic">AEGIS ADMIN</h1>
          </div>
          <p className="font-bold mb-6 text-gray-500 uppercase tracking-tighter">
            {mfaRequired ? 'Multi-Factor Verification' : 'Operational Command Entrance'}
          </p>

          {authError && (
            <div className="p-3 bg-red-100 border-2 border-red-600 text-red-600 font-bold text-xs uppercase mb-4">
              {authError}
            </div>
          )}

          <div className="flex flex-col gap-4">
            {!mfaRequired ? (
              <>
                <input
                  type="email"
                  placeholder="ADMIN@AEGIS.COM"
                  className="neo-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="neo-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-black uppercase text-gray-400 mb-1">Enter Security Code sent to email</p>
                <input
                  type="text"
                  placeholder="6-DIGIT OTP"
                  className="neo-input text-center text-2xl tracking-[0.5em] font-black"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                />
                <button
                  className="text-sm font-bold text-coral underline text-left mt-1"
                  onClick={() => setMfaRequired(false)}
                >
                  Return to email/password
                </button>
              </div>
            )}

            <button
              className={`neo-btn w-full mt-4 ${loading ? 'opacity-50 cursor-wait' : ''}`}
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? 'VERIFYING...' : mfaRequired ? 'Complete Sign-In' : 'Initialize Secure Session'}
            </button>
          </div>
          <p className="text-xs mt-8 text-gray-400 font-bold uppercase tracking-[0.2em] text-center">
            {mfaRequired ? 'MFA Protocol v2 - Node Validated' : 'Secured by Aegis Enforcer v2 • Real-time Monitoring Active'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-shell">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem', padding: '0.75rem', border: '2px solid #000', backgroundColor: '#FFFFFF', boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)' }}>
          <div style={{ width: '40px', height: '40px', backgroundColor: '#111827', border: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
            <img src={logo} alt="Aegis Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'invert(1) brightness(100%)' }} />
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.05em', color: '#000', margin: 0 }}>AEGIS</h1>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/analytics" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <BarChart3 size={20} />
            <span>Analytics</span>
          </NavLink>
          <NavLink to="/workers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Target size={20} />
            <span>Workers</span>
          </NavLink>
          <NavLink to="/live-map" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <MapPinned size={20} />
            <span>Live Map</span>
          </NavLink>
          <NavLink to="/claims" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <FileText size={20} />
            <span>Claims</span>
          </NavLink>
          <NavLink to="/setup" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Settings size={20} />
            <span>Setup</span>
          </NavLink>
        </nav>
        <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
          <button
            onClick={handleLogout}
            className="nav-item border-danger !bg-[#DC2626] !text-white"
          >
            <LogOut size={18} />
            <span className="italic uppercase">Terminate</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<LiveOperationalDashboard data={data} loading={loading} />} />
          <Route path="/analytics" element={<AnalyticsPage data={data} loading={loading} />} />
          <Route path="/workers" element={<WorkersPage />} />
          <Route path="/live-map" element={<LiveMapPage workerCount={data?.totalWorkers ?? data?.workers?.total ?? 0} />} />
          <Route path="/claims" element={<ClaimsPage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

function AnalyticsPage({ data, loading }: any) {
  const navigate = useNavigate();

  const formatINR = (val: number) => `₹${Math.round(val || 0).toLocaleString('en-IN')}`;
  const formatPercent = (val: number) => `${Number(val || 0).toFixed(2)}%`;

  const dashboardData = data || {
    totalPremiumCollected: 0,
    totalApprovedPayout: 0,
    lossRatioPercent: 0,
    riskTrend: [],
    payoutTrend: [],
    workersByCity: [],
    platformSplit: [],
    claimsByType: [],
    alertsByType: [],
    fraudStatusSplit: [],
    predictiveLossForecast: []
  };

  return (
    <div className="animate-in fade-in duration-500">
      <header className="sticky top-0 z-30 bg-[#FCFBE3] border-b-4 border-[#1B1D0E] shadow-[0px_4px_0px_0px_rgba(27,29,14,1)] -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10 min-h-20 sm:h-24 py-4 sm:py-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 sm:mb-10">
        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center border-4 border-[#1B1D0E] shadow-[4px_4px_0px_0px_rgba(27,29,14,1)] bg-white hover:bg-coral transition-colors shrink-0"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-4xl font-heading font-black italic uppercase tracking-tighter leading-none">ANALYTICS</h1>
            <p className="text-[10px] sm:text-sm font-heading font-bold uppercase opacity-70 tracking-widest truncate">Tamil Nadu Operations</p>
          </div>
        </div>
      </header>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-8 border-black border-t-coral animate-spin"></div>
          <p className="font-heading font-black uppercase text-xs tracking-widest">Synthesizing Actuarial Data...</p>
        </div>
      )}

      {!loading && (
        <div className="space-y-16 pb-20">
          {/* SECTION: RISK POOL STATUS */}
          <section>
            <div className="border-b-4 border-[#1B1D0E] mb-8 pb-3">
              <h2 className="text-2xl sm:text-3xl font-heading font-black italic uppercase tracking-tight">Executive Risk Overview</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <AnalyticsCard title="Loss Ratio" metric="Metric-A" icon="trending_up" iconColor="text-[#AE311F]">
                <h4 className="text-4xl sm:text-6xl font-heading font-black italic break-all">{formatPercent(dashboardData.lossRatioPercent)}</h4>
                <div className="mt-6 border-t-2 border-dashed border-black/10 pt-4">
                  <p className="text-[11px] font-black uppercase text-[#AE311F] tracking-widest">Actuarial Threshold Breached</p>
                </div>
              </AnalyticsCard>
              <AnalyticsCard title="Premium Pool" metric="Metric-B" icon="account_balance_wallet" iconColor="text-[#006D37]">
                <h4 className="text-4xl sm:text-6xl font-heading font-black italic break-all">₹{Math.round(dashboardData.totalPremiumCollected / 1000)}k</h4>
                <div className="mt-6 border-t-2 border-dashed border-black/10 pt-4">
                  <p className="text-[11px] font-black uppercase text-[#006D37] tracking-widest">+12.4% vs Last Cycle</p>
                </div>
              </AnalyticsCard>
              <AnalyticsCard title="Approved Payout" metric="Metric-C" icon="verified" iconColor="text-coral">
                <h4 className="text-3xl sm:text-6xl font-heading font-black italic break-all">{formatINR(dashboardData.totalApprovedPayout)}</h4>
                <div className="mt-6 border-t-2 border-dashed border-black/10 pt-4">
                  <p className="text-[11px] font-black uppercase opacity-40 italic tracking-widest">Pending Verification: 4</p>
                </div>
              </AnalyticsCard>
            </div>
          </section>

          {/* SECTION: FRAUD SIGNALS & STATUS */}
          {/**
            * [IN-LINE PRIDE]: Sentinel Fraud Intelligence
            * Surfaces high-confidence anomaly signals derived from the Sentinel Fraud Engine. 
            * Architectural Reference: docs @[c:\projects\Aegis\ARCHITECTURE\ADMIN_CONTROL_PLANE.md#5-fraud-queue]
            */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-7 space-y-8">
              <div className="border-b-4 border-[#1B1D0E] pb-3 text-left">
                <h2 className="text-2xl sm:text-3xl font-heading font-black italic uppercase tracking-tight">Fraud Analytics: Risk Trend</h2>
              </div>
              <div className="bg-[#FCFBE3] border-4 border-[#1B1D0E] p-4 sm:p-8 shadow-[12px_12px_0px_0px_rgba(27,29,14,1)] min-h-[360px] sm:min-h-[420px] relative">
                <div className="flex items-center gap-3 absolute top-8 left-8 z-10">
                  <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest italic opacity-70">Critical Variance Detected</span>
                </div>
                <div className="mt-8">
                  <RiskTrendChart data={dashboardData.riskTrend} variant="trend" />
                </div>
              </div>
            </div>
            <div className="lg:col-span-5 space-y-8">
              <div className="border-b-4 border-[#1B1D0E] pb-3 text-left">
                <h2 className="text-2xl sm:text-3xl font-heading font-black italic uppercase tracking-tight">Fraud Status Mix</h2>
              </div>
              <div className="bg-white border-4 border-[#1B1D0E] p-4 sm:p-8 shadow-[12px_12px_0px_0px_rgba(27,29,14,1)] min-h-[360px] sm:min-h-[420px] flex items-center justify-center">
                <MetricDonutChart data={dashboardData.fraudStatusSplit} />
              </div>
            </div>
          </section>

          {/* SECTION: OPERATIONAL DISTRIBUTION */}
          <section>
            <div className="border-b-4 border-[#1B1D0E] mb-8 pb-3">
              <h2 className="text-2xl sm:text-3xl font-heading font-black italic uppercase tracking-tight">Platform Distribution</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="bg-white border-4 border-[#1B1D0E] p-4 sm:p-10 shadow-[12px_12px_0px_0px_rgba(27,29,14,1)]">
                <h4 className="font-heading font-black italic uppercase text-xl mb-10 border-b-2 border-black pb-2">Claims by Type</h4>
                <div className="space-y-4">
                  <ActivityBarChart data={dashboardData.claimsByType} color="#ae311f" horizontal />
                </div>
              </div>
              <div className="bg-[#FCFBE3] border-4 border-[#1B1D0E] p-4 sm:p-10 shadow-[12px_12px_0px_0px_rgba(27,29,14,1)]">
                <h4 className="font-heading font-black italic uppercase text-xl mb-10 border-b-2 border-black pb-2">Top Platforms</h4>
                <div className="space-y-4">
                  <ActivityBarChart data={dashboardData.platformSplit} color="#ff6b53" horizontal />
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function AnalyticsCard({ title, metric, icon, iconColor, children }: { title: string; metric: string; icon: string; iconColor: string; children: React.ReactNode }) {
  return (
    <div className="bg-white p-6 border-4 border-[#1B1D0E] shadow-[8px_8px_0px_0px_rgba(27,29,14,1)] flex flex-col h-full transform transition-transform hover:-translate-x-1 hover:-translate-y-1">
      <div className="flex justify-between items-start mb-10">
        <span className={`material-symbols-outlined text-4xl ${iconColor}`}>{icon}</span>
        <span className="text-[10px] font-heading font-black bg-[#1B1D0E] text-white px-2 py-1 uppercase tracking-widest">{metric}</span>
      </div>
      <div>
        <p className="font-heading font-bold uppercase text-[10px] opacity-40 tracking-[0.2em] mb-1">{title}</p>
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}


function LiveOperationalDashboard({ data }: any) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setLoading(true);
        const res = await adminApi.getSubmissions();
        setSubmissions(res.submissions || []);
      } catch (e) {
        console.error('Failed to fetch fraud submissions:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, []);

  const visibleSubmissions = isExpanded ? submissions : submissions.slice(0, 3);

  const totalWorkers = data?.totalWorkers ?? data?.workers?.total ?? 0;

  return (
    <div className="animate-in fade-in duration-500">
      <header className="header-row mb-10 gap-4">
        <div>
          <h2 className="text-2xl sm:text-4xl">Command Overview</h2>
          <p className="text-gray-500 font-bold uppercase text-[10px] sm:text-sm tracking-widest mt-1">Real-time platform oversight & risk enforcement</p>
        </div>
        <div className="flex gap-3 sm:gap-4 w-full sm:w-auto justify-end">
          <button className="neo-btn secondary p-3"><Search size={20} /></button>
          <button className="neo-btn flex items-center gap-2 justify-center sm:justify-start flex-1 sm:flex-none">
            <Zap size={18} />
            <span>Enforce Protocol</span>
          </button>
        </div>
      </header>

      {/* STATS */}
      <div className="stat-grid mb-12">
        <MetricCard label="Total Workers" value={totalWorkers} trend="+0%" up />
        <MetricCard label="Active Plans" value={data?.activePlans ?? 0} trend="+0%" up />
        <MetricCard label="Active Alerts" value={data?.activeAlerts ?? 0} marker="bg-success" trend="N/A" up />
        <MetricCard label="Claims Today" value={data?.claimsToday ?? 0} trend="0" />
      </div>

      {/* FRAUD TABLE - CENTRAL PIECE OF PREVIOUS DASHBOARD */}
      {/**
        * [IN-LINE PRIDE]: Real-Time Enforcement Pipeline
        * Displays the clinical state of the fraud submission queue. 
        * Refer to ARCHITECTURE/ADMIN_CONTROL_PLANE.md for enforcement protocol validation.
        */}
      <section style={{ marginTop: '3rem', marginBottom: '4rem' }}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Fraud Analysis Pipeline</h3>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-black uppercase text-coral underline"
          >
            {isExpanded ? 'Show Less' : 'View Full Queue'}
          </button>
        </div>

        <div className="table-container shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-2 border-black min-h-[150px] relative overflow-x-auto">
          {loading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
              <div className="text-xs font-black uppercase tracking-widest animate-pulse">Syncing Database...</div>
            </div>
          )}
          <table>
            <thead>
              <tr>
                <th>Analysis ID</th>
                <th>Worker Name</th>
                <th>Risk Score</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody className="animate-in slide-in-from-top-2 duration-300">
              {visibleSubmissions.map((sub, i) => (
                <tr key={sub.analysisId || i} className="animate-in fade-in duration-300">
                  <td className="font-mono font-bold text-coral">{sub.analysisId || 'SYNCING...'}</td>
                  <td className="font-bold">{sub.user || 'Unknown'}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 w-32 border border-black">
                        <div
                          className={`h-full ${sub.riskScore > 60 ? 'bg-danger' : sub.riskScore > 30 ? 'bg-warning' : 'bg-success'}`}
                          style={{ width: `${sub.riskScore}%` }}
                        ></div>
                      </div>
                      <span className="font-black text-xs text-center min-w-[3ch]">{Math.round(sub.riskScore)}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${sub.status === 'APPROVED' || sub.status === 'AUTO_APPROVED' ? 'badge-success' : sub.status === 'REJECTED' || sub.status === 'AUTO_REJECTED' ? 'badge-danger' : 'badge-warning'}`}>
                      {sub.status?.replace('_', ' ') || 'PENDING'}
                    </span>
                  </td>
                  <td className="text-right">
                    <button className="p-1 border-2 border-black hover:bg-parchment transition-all"><ChevronRight size={16} /></button>
                  </td>
                </tr>
              ))}
              {!loading && visibleSubmissions.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 italic text-gray-400">No recent submissions detected in database</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* LIVE FEEDS - RESTORED SPLIT GRID */}
      <div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-12"
        style={{ marginTop: '4rem', paddingBottom: '3rem' }}
      >
        <div className="neo-card flex flex-col" style={{ marginBottom: '2rem' }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black italic uppercase tracking-tighter">Live Alert Feed</h3>
            <Bell className="text-coral animate-bounce" size={18} />
          </div>
          <div className="space-y-4">
            {(data?.recentAlerts ?? []).length > 0 ? (
              data.recentAlerts.map((alert: any) => (
                <AlertItem
                  key={alert.id}
                  title={alert.title}
                  subtitle={`${alert.type} • ${alert.expectedPayout ? `₹${alert.expectedPayout}` : 'CALCULATING...'}`}
                  time={new Date(alert.occurredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  active
                />
              ))
            ) : (
              <div className="py-8 text-center border-2 border-dashed border-black/10 text-xs font-black uppercase opacity-30">
                No active disruptions detected
              </div>
            )}
          </div>
          <button className="neo-btn w-full mt-auto secondary text-xs">Refresh Stream</button>
        </div>

        <DriverScooterMap workerCount={totalWorkers} />
      </div>
    </div>
  );
}

function LiveMapPage({ workerCount }: { workerCount: number }) {
  return (
    <div className="live-map-page animate-in fade-in duration-300">
      <header className="live-map-page-header">
        <div>
          <h2 className="text-2xl sm:text-4xl">Live Risk Map</h2>
          <p className="text-gray-500 font-bold uppercase text-xs tracking-widest mt-1">
            Dedicated full-screen H3 risk and worker telemetry view
          </p>
        </div>
      </header>

      <DriverScooterMap workerCount={workerCount} variant="full" />
    </div>
  );
}

function WorkersPage() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [platformFilter, setPlatformFilter] = useState('ALL');

  const cityOptions = ['ALL', 'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli'];
  const platformOptions = [
    { label: 'ALL', value: 'ALL' },
    { label: 'ZEPTO', value: 'zepto' },
    { label: 'BLINKIT', value: 'blinkit' },
    { label: 'INSTAMART', value: 'instamart' },
    { label: 'BIGBASKET', value: 'bigbasket' },
    { label: 'JIOMART', value: 'jiomart' },
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchWorkers();
    }, 350);
    return () => clearTimeout(timer);
  }, [search, cityFilter, platformFilter]);

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getWorkers({
        search: search.trim() ? search.trim() : undefined,
        city: cityFilter === 'ALL' ? undefined : cityFilter,
        platform: platformFilter === 'ALL' ? undefined : platformFilter,
      });
      setWorkers(res || []);
    } catch (e: any) {
      console.error('Fleet Retrieval Error:', e);
      if (e.message?.includes('Unauthorized') || e.message?.includes('token')) {
        // Session expired, handleLogout is in parent scope but we'll let parent handle it via fetchGlobalData
        setWorkers([]);
      }
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="animate-in slide-in-from-right-4 duration-500">
      <header className="mb-8">
        <h2 className="text-2xl sm:text-4xl font-black uppercase">Workers</h2>
        <p className="text-gray-500 font-bold uppercase tracking-widest text-sm mt-1">Fleet Node Management</p>
      </header>

      <div className="neo-card bg-white p-6 mb-8">
        <div className="relative mb-6">
          <Search className="absolute left-6 top-4 text-gray-400" size={20} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workers by email or phone"
            className="neo-input pl-16 py-4 w-full text-lg"
          />
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <span className="text-xs font-black uppercase text-gray-400">City:</span>
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              {cityOptions.slice(0, 4).map(c => (
                <button
                  key={c}
                  onClick={() => setCityFilter(c)}
                  className={`neo-btn text-xs px-4 py-2 ${cityFilter === c ? 'active' : 'secondary'}`}
                >
                  {c}
                </button>
              ))}
              <select
                className="neo-input text-xs py-2 px-4 italic"
                onChange={(e) => setCityFilter(e.target.value)}
                value={cityOptions.includes(cityFilter) ? cityFilter : cityOptions[0]}
              >
                {cityOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full lg:w-auto lg:ml-auto">
            <span className="text-xs font-black uppercase text-gray-400">Platform:</span>
            <div className="flex gap-2 overflow-x-auto pb-1 w-full lg:w-auto">
              {platformOptions.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPlatformFilter(p.value)}
                  className={`neo-btn text-xs px-3 py-1.5 ${platformFilter === p.value ? 'active' : 'secondary'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 mt-8 mb-8">
        <div className="neo-card hover:-translate-y-1 transition-transform" style={{ border: '2px solid #000', backgroundColor: '#E0E7FF', boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)', padding: '1.5rem' }}>
          <p className="text-xs font-black uppercase tracking-widest text-[#3730A3] mb-2">Total Managed</p>
          <p className="text-5xl font-black italic text-[#3730A3]">{workers.length}</p>
        </div>
        <div className="neo-card hover:-translate-y-1 transition-transform" style={{ border: '2px solid #000', backgroundColor: '#F3E8FF', boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)', padding: '1.5rem' }}>
          <p className="text-xs font-black uppercase tracking-widest text-[#6B21A8] mb-2">Selected City</p>
          <p className="text-4xl font-black uppercase tracking-tighter truncate text-[#6B21A8]">{cityFilter}</p>
        </div>
        <div className="neo-card hover:-translate-y-1 transition-transform" style={{ border: '2px solid #000', backgroundColor: '#DBEAFE', boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)', padding: '1.5rem' }}>
          <p className="text-xs font-black uppercase tracking-widest text-[#1E40AF] mb-2">Active Platform</p>
          <p className="text-4xl font-black uppercase tracking-tighter truncate text-[#1E40AF]">{platformFilter}</p>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-12 h-12 border-4 border-black border-r-coral animate-spin"></div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {!loading && workers.map((worker, i) => {
          let badgeBg = '#f3f4f6';
          let badgeColor = '#000';
          const p = worker.platform?.toLowerCase();
          if (p === 'zepto') { badgeBg = '#E0E7FF'; badgeColor = '#3730A3'; }
          else if (p === 'blinkit') { badgeBg = '#FEF3C7'; badgeColor = '#92400E'; }
          else if (p === 'instamart') { badgeBg = '#FFEDD5'; badgeColor = '#9A3412'; }
          else if (p === 'bigbasket') { badgeBg = '#D1FAE5'; badgeColor = '#065F46'; }

          let rawStatus = worker.status ? worker.status.toUpperCase() : 'PENDING';
          let displayStatus = rawStatus.replace('_', ' ');

          // Normalize statuses to match the design requested
          if (displayStatus === 'SUBMITTED' || displayStatus === 'NOT STARTED') {
            displayStatus = 'PENDING';
          }

          let statusBg = '#F59E0B'; // Default Orange for Pending
          let statusColor = '#000';

          if (displayStatus === 'APPROVED') {
            statusBg = '#16A34A'; // Green
            statusColor = '#fff';
          } else if (displayStatus === 'REJECTED') {
            statusBg = '#DC2626'; // Red
            statusColor = '#fff';
          }

          return (
            <div key={i} className="neo-card hover:-translate-y-2 transition-transform" style={{ border: '2px solid #000', backgroundColor: '#ffffff', padding: '1.5rem', display: 'flex', flexDirection: 'column', boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1rem' }}>
                <span style={{ border: '2px solid #000', backgroundColor: statusBg, color: statusColor, padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', fontStyle: 'normal' }}>
                  {displayStatus}
                </span>
              </div>

              <h4 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '1.5rem', wordBreak: 'break-all' }}>{worker.email || 'anonymous@node.io'}</h4>

              <div style={{ borderTop: '2px solid rgba(0,0,0,0.1)', paddingTop: '1rem', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '1rem', fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic' }}>
                  {worker.city || 'TNP'}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', padding: '0.25rem 0.5rem', border: '2px solid #000', backgroundColor: badgeBg, color: badgeColor }}>
                  {worker.platform || 'General'}
                </div>
              </div>
            </div>
          );
        })}
        {!loading && workers.length === 0 && (
          <div className="col-span-full py-20 text-center border-4 border-dashed border-black rounded-3xl">
            <Users size={64} className="mx-auto text-black/20 mb-4" />
            <h3 className="text-2xl font-black opacity-30 italic">NO WORKERS DETECTED IN THIS SECTOR</h3>
          </div>
        )}
      </div>
    </div>
  );
}

function ClaimsPage() {
  const [claimsData, setClaimsData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [filters] = useState({ search: '', status: '', type: '' });

  useEffect(() => {
    fetchClaims();
  }, [filters]);

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getClaims(filters);
      setClaimsData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8">
        <h2 className="text-2xl sm:text-4xl font-black uppercase">Payout Sentinel</h2>
        <p className="text-gray-500 font-bold uppercase tracking-widest text-sm mt-1 italic">Real-time Claims & Financial Oversight</p>

        {/**
          * [IN-LINE PRIDE]: Financial Sustainability Ledger
          * High-fidelity visibility into the platform's solvency and payout integrity.
          * Architectural Context: @[c:\projects\Aegis\ARCHITECTURE\ADMIN_CONTROL_PLANE.md#3-financial-sustainability-monitoring]
          */}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="neo-card bg-white border-2 border-black p-6 hover:bg-parchment transition-colors">
          <p className="text-xs font-black uppercase text-gray-400 mb-2">Total Claims Logged</p>
          <p className="text-4xl sm:text-6xl font-black">{claimsData?.total ?? 0}</p>
        </div>
        <div className="neo-card bg-white border-2 border-black p-6 hover:bg-red-50 transition-colors">
          <p className="text-xs font-black uppercase text-gray-400 mb-2">Pending Review</p>
          <p className="text-4xl sm:text-5xl font-black text-coral">{claimsData?.pendingReview ?? 0}</p>
        </div>
        <div className="neo-card bg-night text-parchment p-6">
          <p className="text-xs font-black uppercase opacity-40 mb-2 text-white">Total Approved Payout</p>
          <p className="text-3xl sm:text-5xl font-black text-success break-all">₹{(claimsData?.totalPayout ?? 0).toLocaleString()}</p>
        </div>
      </div>

      <div className="table-container border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        {loading ? (
          <div className="p-20 text-center font-black italic opacity-30">SYNCHRONIZING CLAIMS...</div>
        ) : (
          <table>
            <thead>
              <tr className="bg-night text-parchment">
                <th>Worker Entity</th>
                <th>Disruption Type</th>
                <th>Estimated Loss</th>
                <th>Payout Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {claimsData?.claims?.map((claim: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50 cursor-pointer">
                  <td className="font-bold">{claim.userEmail}</td>
                  <td>
                    <div className="flex flex-col">
                      <span className="font-black text-sm uppercase tracking-tighter">{claim.disruption?.type}</span>
                      <span className="text-xs text-gray-400 font-bold">{claim.disruption?.title}</span>
                    </div>
                  </td>
                  <td className="font-mono">₹{claim.estimatedLoss?.toLocaleString()}</td>
                  <td className="font-mono font-black text-coral">₹{claim.approvedPayout?.toLocaleString()}</td>
                  <td>
                    <span className={`badge border-2 border-black ${claim.status === 'APPROVED' ? 'badge-success' :
                        claim.status === 'PROCESSING' ? 'badge-warning' :
                          'badge-danger'
                      }`}>
                      {claim.status}
                    </span>
                  </td>
                </tr>
              ))}
              {(!claimsData?.claims || claimsData.claims.length === 0) && (
                <tr>
                  <td colSpan={5} className="p-12 text-center font-black opacity-20 text-3xl italic">NO CLAIMS REGISTERED</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function SetupPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedModule, setSelectedModule] = useState<any>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getSettings();
      setSettings(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const setupModules = [
    {
      title: "Alert Thresholds",
      desc: "Configure sensitivity for automated alerts",
      details: [
        { label: "Fraud Block Threshold", value: `${(settings?.alertThresholds?.fraudBlockThreshold * 100)?.toFixed(0) || 0}%` },
        { label: "High Risk Trigger", value: `${settings?.alertThresholds?.highRiskScore || 0}` }
      ]
    },
    {
      title: "Risk Configuration",
      desc: "Manage risk assessment parameters",
      details: [
        { label: "Device Frequency", value: `${settings?.riskConfig?.deviceSwitchFrequency || 0}x / day` },
        { label: "Max Speed Alert", value: `${settings?.riskConfig?.gpsSpeedMax || 0} km/h` }
      ]
    },
    {
      title: "Plan Configuration",
      desc: "Subscription and tier settings",
      details: [
        { label: "Grace Period", value: `${settings?.planConfig?.gracePeriodDays || 0} Days` },
        { label: "Auto-Renew Default", value: settings?.planConfig?.autoRenewDefault ? "ENABLED" : "DISABLED" }
      ]
    },
    {
      title: "Verification Settings",
      desc: "Identity and background check rules",
      details: [
        { label: "KYC SLA", value: `${settings?.verificationSettings?.kycReviewSlaHours || 0} Hours` },
        { label: "Manual Override", value: settings?.verificationSettings?.allowManualOverride ? "ALLOWED" : "BLOCKED" }
      ]
    }
  ];

  const systemModules = [
    { title: "Admin Profile", desc: "Access level and authentication", details: [] },
    { title: "Notifications", desc: "Alert routing and webhook channels", details: [] }
  ];

  return (
    <div className="animate-in slide-in-from-right-4 duration-500 w-full" style={{ maxWidth: '800px' }}>
      <header className="mb-12">
        <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter">Setup</h2>
      </header>

      {loading ? (
        <div className="p-20 text-center font-black italic opacity-30">HYDRATING SYSTEM ARCHITECTURE...</div>
      ) : (
        <>
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-4">System Configuration</h3>
          <div style={{ display: 'flex', flexDirection: 'column', border: '2px solid #000', backgroundColor: '#fff', boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)', marginBottom: '3rem' }}>
            {setupModules.map((m, i) => (
              <div
                key={i}
                onClick={() => setSelectedModule(m)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1.5rem',
                  borderBottom: i < setupModules.length - 1 ? '2px solid rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer',
                  backgroundColor: '#fff',
                  transition: 'background-color 0.1s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
              >
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.25rem' }}>{m.title}</h3>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 600 }}>{m.desc}</p>
                </div>
                <ChevronRight size={20} color="#9ca3af" />
              </div>
            ))}
          </div>

          <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-4">System</h3>
          <div style={{ display: 'flex', flexDirection: 'column', border: '2px solid #000', backgroundColor: '#fff', boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)' }}>
            {systemModules.map((m, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1.5rem',
                  borderBottom: i < systemModules.length - 1 ? '2px solid rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer',
                  backgroundColor: '#fff',
                  transition: 'background-color 0.1s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
              >
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900 }}>{m.title}</h3>
                <ChevronRight size={20} color="#9ca3af" />
              </div>
            ))}
          </div>
        </>
      )}

      {selectedModule && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}>
          <div className="animate-in zoom-in-95 duration-200" style={{ backgroundColor: '#fff', border: '4px solid #000', padding: '2rem', width: '100%', maxWidth: '500px', maxHeight: 'calc(100vh - 2rem)', overflowY: 'auto', boxShadow: '8px 8px 0px 0px rgba(0,0,0,1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.1 }}>{selectedModule.title}</h3>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#6b7280', marginTop: '0.5rem' }}>{selectedModule.desc}</p>
              </div>
              <button onClick={() => setSelectedModule(null)} style={{ background: 'none', border: '2px solid #000', padding: '0.25rem', cursor: 'pointer', color: '#000' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
              {selectedModule.details?.map((d: any, j: number) => (
                <div key={j} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px dashed rgba(0,0,0,0.2)', paddingBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: '#4b5563' }}>{d.label}</span>
                  <span style={{ fontSize: '1.125rem', fontWeight: 900 }}>{d.value}</span>
                </div>
              ))}
              {(!selectedModule.details || selectedModule.details.length === 0) && (
                <p style={{ fontStyle: 'italic', opacity: 0.5, fontWeight: 900 }}>Module requires system administrator unlock.</p>
              )}
            </div>

            <button onClick={() => setSelectedModule(null)} style={{ width: '100%', padding: '1rem', backgroundColor: '#000', color: '#fff', fontWeight: 900, textTransform: 'uppercase', border: 'none', marginTop: '2.5rem', cursor: 'pointer', fontSize: '1rem' }}>
              Acknowledge
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SHARED UI COMPONENTS ---

function MetricCard({ label, value, marker }: any) {
  return (
    <div className="neo-card bg-white p-4 group hover:translate-x-1 hover:-translate-y-1 transition-transform">
      <div className="flex items-center gap-2 mb-1">
        {marker && <div className={`w-1.5 h-1.5 rounded-full ${marker}`}></div>}
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{label}</p>
      </div>
      <p className="text-xl sm:text-2xl font-black break-words">{value}</p>
    </div>
  );
}

function AlertItem({ title, subtitle, time, active }: any) {
  return (
    <div className="neo-card bg-white p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group hover:border-coral transition-colors">
      <div className="flex items-center gap-4 min-w-0">
        <div className={`w-2 h-2 rounded-full ${active ? 'bg-success animate-pulse' : 'bg-gray-300'}`}></div>
        <div className="min-w-0">
          <h4 className="text-sm sm:text-base font-black uppercase tracking-tight break-words">{title}</h4>
          <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase mt-0.5 break-words">{subtitle}</p>
        </div>
      </div>
      <span className="text-[10px] sm:text-xs font-black text-gray-400 shrink-0">{time}</span>
    </div>
  );
}


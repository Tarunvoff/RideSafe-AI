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
  ArrowLeft
} from 'lucide-react';
import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { adminApi } from './services/api';
import DriverScooterMap from './components/DriverScooterMap';
import PredictiveRiskChart from './components/PredictiveRiskChart';


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
        console.log('Login Step 1 Response:', res);

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
        console.log('Attempting Step 2: OTP Verification for', email);
        const res = await adminApi.verifyOtp({ email, otp: otp.trim() });
        console.log('OTP Verification Response:', res);

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
            <h1 className="text-3xl italic">AEGIS ADMIN</h1>
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
                <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Enter Security Code sent to email</p>
                <input 
                  type="text" 
                  placeholder="6-DIGIT OTP" 
                  className="neo-input text-center text-2xl tracking-[0.5em] font-black" 
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                />
                <button 
                  className="text-xs font-bold text-coral underline text-left mt-1" 
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
          <p className="text-[10px] mt-8 text-gray-400 font-bold uppercase tracking-[0.2em] text-center">
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
        <div className="flex items-center gap-3 mb-12 p-3 border-2 border-black bg-parchment shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="bg-night p-1.5 border-2 border-black">
            <Shield className="text-coral" size={18} />
          </div>
          <h1 className="text-xl font-black italic tracking-tighter">AEGIS</h1>
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
             style={{ 
               width: '100%', 
               display: 'flex', 
               alignItems: 'center', 
               gap: '1rem', 
               padding: '1.25rem 1rem', 
               backgroundColor: '#DC2626',
               border: '2px solid #000', 
               boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)', 
               color: '#FFFFFF',
               fontFamily: '"Sora", sans-serif', 
               fontWeight: 800, 
               textTransform: 'uppercase', 
               fontSize: '0.875rem', 
               cursor: 'pointer'
             }}
          >
            <LogOut size={18} />
            <span style={{ letterSpacing: '0.05em' }}>Terminate</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<LiveOperationalDashboard data={data} loading={loading} />} />
          <Route path="/analytics" element={<AnalyticsPage data={data} loading={loading} />} />
          <Route path="/workers" element={<WorkersPage />} />
          <Route path="/claims" element={<ClaimsPage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

// --- SUB-PAGES ---

function AnalyticsPage({ data, loading }: any) {
  const navigate = useNavigate();

  const safeData = data || {
    totalPremiumCollected: 0,
    totalApprovedPayout: 0,
    lossRatioPercent: 0,
    riskTrend: [],
    payoutTrend: [],
    workersByCity: [],
    platformSplit: [],
    claimsByType: [],
    alertsByType: [],
    fraudStatusSplit: []
  };

  const formatINR = (val: number) => `₹${Math.round(val).toLocaleString('en-IN')}`;
  const formatPercent = (val: number) => `${Number(val || 0).toFixed(2)}%`;

  return (
    <div className="animate-in fade-in duration-500">
      <header className="flex items-center gap-6 mb-12">
        <button 
          onClick={() => navigate(-1)}
          className="p-3 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-white transition-all bg-parchment"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="text-center flex-1 pr-16">
          <h2 className="text-2xl font-black tracking-[0.3em] uppercase">Analytics</h2>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Tamil Nadu Operations</p>
        </div>
      </header>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-black border-t-coral animate-spin"></div>
          <p className="font-black uppercase text-xs tracking-widest">Synthesizing Actuarial Data...</p>
        </div>
      )}

      {!loading && (
        <div className="space-y-16 pb-20">
          {/* SECTION: PREDICTIVE FORECAST */}
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-6 font-bold">Predictive Risk Forecast (ML-Inferred)</h3>
            <div className="grid grid-cols-1 gap-6">
              <AnalyticsCard title="Risk Velocity Forecast" subtitle="Projected Disruption Probability (Next 24h)">
                <div className="h-80 w-full bg-slate-900 rounded-xl p-4 shadow-inner border border-black scroll-m-2">
                  <PredictiveRiskChart data={safeData.predictiveLossForecast || []} />
                </div>
              </AnalyticsCard>
            </div>
          </section>

          {/* SECTION: RISK POOL */}
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-6">Risk Pool Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <AnalyticsCard title="Loss Ratio" subtitle="Approved payout / premium pool">
                <div className="text-4xl font-black mt-4">{formatPercent(safeData.lossRatioPercent)}</div>
              </AnalyticsCard>
              <AnalyticsCard title="Premium Pool" subtitle="Total collected premiums">
                <div className="text-4xl font-black mt-4">{formatINR(safeData.totalPremiumCollected)}</div>
              </AnalyticsCard>
              <AnalyticsCard title="Approved Payout" subtitle="Historical claim volume">
                <div className="text-4xl font-black mt-4 text-coral">{formatINR(safeData.totalApprovedPayout)}</div>
              </AnalyticsCard>
            </div>
          </section>

          {/* SECTION: FRAUD SIGNALS */}
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-6">Fraud Signals</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <AnalyticsCard title="Risk Trend" subtitle="Avg risk score (7 days)">
                <div className="h-32 mt-4 flex items-end gap-[1px]">
                  {safeData.riskTrend.slice(-14).map((point: any, i: number) => (
                    <div 
                      key={i} 
                      className="flex-1 bg-night hover:bg-coral transition-colors relative group"
                      style={{ height: `${point.avg_risk}%` }}
                    >
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-black text-white text-[10px] p-1 whitespace-nowrap z-10">
                        {Math.round(point.avg_risk)}%
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-[10px] font-bold text-gray-400 italic">
                  <span>14 Days Ago</span>
                  <span className="text-coral">Latest: {Math.round(safeData.riskTrend[safeData.riskTrend.length - 1]?.avg_risk || 0)}%</span>
                </div>
              </AnalyticsCard>

              <AnalyticsCard title="Fraud Status Mix" subtitle="Analyst outcomes (Real-time)">
                <div className="mt-4 space-y-4">
                  {(safeData.fraudStatusSplit || []).map((item: any, i: number) => (
                    <BarIndicator key={i} label={item.label} value={item.value} color="#14b8a6" max={Math.max(...safeData.fraudStatusSplit.map((s:any)=>s.value))} />
                  ))}
                </div>
              </AnalyticsCard>
            </div>
          </section>

          {/* SECTION: CLAIMS & PAYOUTS */}
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-6">Claims & Payouts</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <AnalyticsCard title="Payout Velocity" subtitle="Daily approved volumes">
                <div className="h-32 mt-4 flex items-end gap-1">
                  {safeData.payoutTrend.slice(-7).map((point: any, i: number) => (
                    <div 
                      key={i} 
                      className="flex-1 bg-blue-500 hover:bg-black transition-colors"
                      style={{ height: `${(point.total_payout / (Math.max(...safeData.payoutTrend.map((p:any)=>p.total_payout)) || 1)) * 100}%` }}
                    />
                  ))}
                </div>
                <p className="text-[10px] font-bold mt-2 text-gray-400 italic">Trailing 7 days activity</p>
              </AnalyticsCard>

              <AnalyticsCard title="Claims by Type" subtitle="Last 30 days">
                <div className="mt-4 space-y-3">
                  {(safeData.claimsByType || []).map((item: any, i: number) => (
                    <BarIndicator key={i} label={item.label} value={item.value} color="#6366f1" max={Math.max(...safeData.claimsByType.map((s:any)=>s.value))} />
                  ))}
                </div>
              </AnalyticsCard>

              <AnalyticsCard title="Alerts by Type" subtitle="Disruption sources">
                <div className="mt-4 space-y-3">
                  {(safeData.alertsByType || []).map((item: any, i: number) => (
                    <BarIndicator key={i} label={item.label} value={item.value} color="#ef4444" max={Math.max(...safeData.alertsByType.map((s:any)=>s.value))} />
                  ))}
                </div>
              </AnalyticsCard>
            </div>
          </section>

          {/* SECTION: DISTRIBUTION */}
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-6">Driver Distribution</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <AnalyticsCard title="Workers by City" subtitle="Regional density">
                <div className="mt-4 space-y-4">
                  {(safeData.workersByCity || []).map((item: any, i: number) => (
                    <BarIndicator key={i} label={item.label} value={item.value} color="#22c55e" max={Math.max(...safeData.workersByCity.map((s:any)=>s.value))} />
                  ))}
                </div>
              </AnalyticsCard>

              <AnalyticsCard title="Platform Split" subtitle="Aggregator share">
                <div className="mt-4 space-y-4">
                  {(safeData.platformSplit || []).map((item: any, i: number) => (
                    <BarIndicator key={i} label={item.label} value={item.value} color="#f59e0b" max={Math.max(...safeData.platformSplit.map((s:any)=>s.value))} />
                  ))}
                </div>
              </AnalyticsCard>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function AnalyticsCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="neo-card flex flex-col h-full">
      <div className="mb-4">
        <h4 className="text-sm font-black italic uppercase tracking-tighter">{title}</h4>
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">{subtitle}</p>
      </div>
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}

function BarIndicator({ label, value, color, max }: { label: string; value: number; color: string; max: number }) {
  const percentage = Math.max(5, (value / (max || 1)) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-600">
        <span>{label}</span>
        <span className="font-mono">{value}</span>
      </div>
      <div className="h-2 bg-gray-200 border border-black overflow-hidden">
        <div 
          className="h-full transition-all duration-1000" 
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
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

  return (
    <div className="animate-in fade-in duration-500">
      <header className="header-row mb-10">
        <div>
          <h2 className="text-4xl">Command Overview</h2>
          <p className="text-gray-500 font-bold uppercase text-xs tracking-widest mt-1">Real-time platform oversight & risk enforcement</p>
        </div>
        <div className="flex gap-4">
          <button className="neo-btn secondary p-3"><Search size={20} /></button>
          <button className="neo-btn flex items-center gap-2">
            <Zap size={18} />
            <span>Enforce Protocol</span>
          </button>
        </div>
      </header>

      {/* STATS */}
      <div className="stat-grid mb-12">
        <MetricCard label="Total Workers" value={data?.workers?.total ?? 10} trend="+12%" up />
        <MetricCard label="Active Plans" value={data?.plans?.active ?? 3} trend="+5%" up />
        <MetricCard label="Active Alerts" value={data?.alerts?.active ?? 5} marker="bg-success" trend="Stable" up />
        <MetricCard label="Claims Today" value={data?.claims?.today ?? 2} trend="-3" />
      </div>

      {/* FRAUD TABLE - CENTRAL PIECE OF PREVIOUS DASHBOARD */}
      <section style={{ marginTop: '3rem', marginBottom: '4rem' }}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Fraud Analysis Pipeline</h3>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[10px] font-black uppercase text-coral underline"
          >
            {isExpanded ? 'Show Less' : 'View Full Queue'}
          </button>
        </div>

        <div className="table-container shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-2 border-black min-h-[150px] relative">
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
        className="grid grid-cols-1 lg:grid-cols-2 gap-12" 
        style={{ marginTop: '4rem', paddingBottom: '3rem' }}
      >
        <div className="neo-card flex flex-col" style={{ marginBottom: '2rem' }}>
          <div className="flex items-center justify-between mb-6">
             <h3 className="font-black italic uppercase tracking-tighter">Live Alert Feed</h3>
             <Bell className="text-coral animate-bounce" size={18} />
          </div>
          <div className="space-y-4">
            <AlertItem title="Chennai Monsoon Surge" subtitle="RAIN • ₹820" time="9:12 pm" active />
            <AlertItem title="Delta Flood Advisory" subtitle="FLOOD • ₹1,100" time="7:12 am" active />
          </div>
          <button className="neo-btn w-full mt-auto secondary text-[10px]">Refresh Stream</button>
        </div>

          <DriverScooterMap />

          <div className="neo-card flex flex-col bg-slate-900 border-2 border-black">
            <div className="flex items-center justify-between mb-6">
               <h3 className="font-black italic uppercase tracking-tighter text-white">Projected Risk Velocity</h3>
               <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Live Forecast</span>
               </div>
            </div>
            <div className="h-64">
              <PredictiveRiskChart data={data?.predictiveLossForecast || []} />
            </div>
          </div>
      </div>
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
      console.log('Fetching fleet data with filters:', { search, cityFilter, platformFilter });
      const res = await adminApi.getWorkers({
        search: search.trim() ? search.trim() : undefined,
        city: cityFilter === 'ALL' ? undefined : cityFilter,
        platform: platformFilter === 'ALL' ? undefined : platformFilter,
      });
      console.log('Fleet synchronization complete. Workers detected:', res?.length || 0);
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
        <h2 className="text-4xl font-black uppercase">Workers</h2>
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mt-1">Fleet Node Management</p>
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
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-black uppercase text-gray-400">City:</span>
               <div className="flex gap-2">
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
            <div className="flex items-center gap-2 ml-auto">
               <span className="text-[10px] font-black uppercase text-gray-400">Platform:</span>
               <div className="flex gap-2">
                  {platformOptions.map(p => (
                     <button 
                       key={p.value}
                       onClick={() => setPlatformFilter(p.value)}
                       className={`neo-btn text-[10px] px-3 py-1.5 ${platformFilter === p.value ? 'active' : 'secondary'}`}
                     >
                       {p.label}
                     </button>
                  ))}
               </div>
            </div>
         </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1.5rem', marginTop: '2rem', marginBottom: '2rem' }}>
         <div className="neo-card hover:-translate-y-1 transition-transform" style={{ border: '2px solid #000', backgroundColor: '#E0E7FF', boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)', padding: '1.5rem' }}>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#3730A3] mb-2">Total Managed</p>
            <p className="text-5xl font-black italic text-[#3730A3]">{workers.length}</p>
         </div>
         <div className="neo-card hover:-translate-y-1 transition-transform" style={{ border: '2px solid #000', backgroundColor: '#F3E8FF', boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)', padding: '1.5rem' }}>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#6B21A8] mb-2">Selected City</p>
            <p className="text-4xl font-black uppercase tracking-tighter truncate text-[#6B21A8]">{cityFilter}</p>
         </div>
         <div className="neo-card hover:-translate-y-1 transition-transform" style={{ border: '2px solid #000', backgroundColor: '#DBEAFE', boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)', padding: '1.5rem' }}>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#1E40AF] mb-2">Active Platform</p>
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
        <h2 className="text-4xl font-black uppercase">Payout Sentinel</h2>
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mt-1 italic">Real-time Claims & Financial Oversight</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
         <div className="neo-card bg-white border-2 border-black p-6 hover:bg-parchment transition-colors">
            <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Total Claims Logged</p>
            <p className="text-5xl font-black">{claimsData?.total ?? 0}</p>
         </div>
         <div className="neo-card bg-white border-2 border-black p-6 hover:bg-red-50 transition-colors">
            <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Pending Review</p>
            <p className="text-5xl font-black text-coral">{claimsData?.pendingReview ?? 0}</p>
         </div>
         <div className="neo-card bg-night text-parchment p-6">
            <p className="text-[10px] font-black uppercase opacity-40 mb-2 text-white">Total Approved Payout</p>
            <p className="text-5xl font-black text-success">₹{(claimsData?.totalPayout ?? 0).toLocaleString()}</p>
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
                      <span className="font-black text-xs uppercase tracking-tighter">{claim.disruption?.type}</span>
                      <span className="text-[10px] text-gray-400 font-bold">{claim.disruption?.title}</span>
                    </div>
                  </td>
                  <td className="font-mono">₹{claim.estimatedLoss?.toLocaleString()}</td>
                  <td className="font-mono font-black text-coral">₹{claim.approvedPayout?.toLocaleString()}</td>
                  <td>
                    <span className={`badge border-2 border-black ${
                      claim.status === 'APPROVED' ? 'badge-success' : 
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
    <div className="animate-in slide-in-from-right-4 duration-500" style={{ maxWidth: '800px' }}>
      <header className="mb-12">
        <h2 className="text-5xl font-black uppercase tracking-tighter">Setup</h2>
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
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <div className="animate-in zoom-in-95 duration-200" style={{ backgroundColor: '#fff', border: '4px solid #000', padding: '2rem', width: '90%', maxWidth: '500px', boxShadow: '8px 8px 0px 0px rgba(0,0,0,1)' }}>
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
         <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
      </div>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
}

function AlertItem({ title, subtitle, time, active }: any) {
  return (
    <div className="neo-card bg-white p-4 flex items-center justify-between group hover:border-coral transition-colors">
       <div className="flex items-center gap-4">
          <div className={`w-2 h-2 rounded-full ${active ? 'bg-success animate-pulse' : 'bg-gray-300'}`}></div>
          <div>
             <h4 className="text-sm font-black uppercase tracking-tight">{title}</h4>
             <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">{subtitle}</p>
          </div>
       </div>
       <span className="text-[10px] font-black text-gray-400">{time}</span>
    </div>
  );
}


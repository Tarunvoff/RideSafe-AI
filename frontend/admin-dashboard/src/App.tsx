import { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  Map as MapIcon,
  Settings,
  LogOut,
  Search,
  Zap,
  LayoutDashboard,
  ShieldAlert,
  ChevronRight,
  Bell,
  User
} from 'lucide-react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { adminApi } from './services/api';


// --- MAIN APP COMPONENT ---
export default function App() {
  const location = useLocation();
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
          <SidebarItem icon={<LayoutDashboard size={18} />} label="Dash" to="/" active={location.pathname === '/'} />
          <SidebarItem icon={<Users size={18} />} label="Workers" to="/workers" active={location.pathname === '/workers'} />
          <SidebarItem icon={<ShieldAlert size={18} />} label="Claims" to="/claims" active={location.pathname === '/claims'} />
          <SidebarItem icon={<Settings size={18} />} label="Setup" to="/setup" active={location.pathname === '/setup'} />
        </nav>

        <div className="mt-auto flex flex-col gap-4">
          <div className="neo-card p-4 bg-gray-50 border-2 border-dashed border-gray-400">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-night border border-black"></div>
                <div>
                   <p className="text-[10px] font-black uppercase">Session Active</p>
                   <p className="text-[9px] font-bold text-gray-500">Node-01 • Coimbatore</p>
                </div>
             </div>
          </div>
          <button className="nav-item hover:bg-red-50 hover:text-red-600" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Terminate</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<DashboardPage data={data} loading={loading} />} />
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

function DashboardPage({ data }: any) {
  const [submissions] = useState([
    { id: 'ANL-9021', user: 'Maya Johnson', score: 12, status: 'APPROVED', date: '2026-04-16' },
    { id: 'ANL-8932', user: 'Carlos Rodriguez', score: 68, status: 'REJECTED', date: '2026-04-16' },
    { id: 'ANL-8841', user: 'Sarah Chen', score: 45, status: 'PENDING', date: '2026-04-15' },
  ]);

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
      <section className="mt-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Fraud Analysis Pipeline</h3>
          <button className="text-[10px] font-black uppercase text-coral underline">View Full Queue</button>
        </div>

        <div className="table-container shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-2 border-black">
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
            <tbody>
              {submissions.map((sub, i) => (
                <tr key={i}>
                  <td className="font-mono font-bold text-coral">{sub.id}</td>
                  <td className="font-bold">{sub.user}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 w-32 border border-black">
                        <div
                          className={`h-full ${sub.score > 60 ? 'bg-danger' : sub.score > 30 ? 'bg-warning' : 'bg-success'}`}
                          style={{ width: `${sub.score}%` }}
                        ></div>
                      </div>
                      <span className="font-black text-xs">{sub.score}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${sub.status === 'APPROVED' ? 'badge-success' : sub.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'}`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="text-right">
                    <button className="p-1 border-2 border-black hover:bg-parchment transition-all"><ChevronRight size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* LIVE FEEDS - RESTORED SPLIT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
        <div className="neo-card flex flex-col">
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

        <div className="neo-card bg-night text-parchment flex flex-col items-center justify-center p-12 min-h-[300px] group overflow-hidden relative">
          <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none"></div>
          <div className="bg-white/10 p-4 border border-white/20 mb-4 group-hover:scale-110 transition-transform">
             <MapIcon size={48} className="text-coral" />
          </div>
          <h3 className="text-2xl font-black italic">SPATIAL INSIGHT</h3>
          <p className="text-xs font-bold opacity-50 mt-2 uppercase tracking-widest text-center">Connecting to H3 Grid Layer...</p>
          <button className="neo-btn mt-8 secondary border-parchment text-parchment hover:bg-parchment hover:text-night">
             Explore Risk Map
          </button>
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

  const getPlatformColor = (platform: string) => {
    const p = platform?.toLowerCase();
    if (p === 'zepto') return 'bg-[#FF4D8D15] border-[#FF4D8D] text-[#FF4D8D]';
    if (p === 'blinkit') return 'bg-[#FFFF0015] border-[#D4D400] text-[#808000]';
    if (p === 'instamart') return 'bg-[#FF7D3315] border-[#FF7D33] text-[#FF7D33]';
    if (p === 'bigbasket') return 'bg-[#66AB2415] border-[#66AB24] text-[#66AB24]';
    return 'bg-gray-50 border-black text-gray-800';
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

      <div className="grid grid-cols-3 gap-0 mb-8 border-4 border-black divide-x-4 divide-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
         <div className="p-6 bg-white hover:bg-parchment transition-colors">
            <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Total Managed</p>
            <p className="text-5xl font-black italic">{workers.length}</p>
         </div>
         <div className="p-6 bg-white hover:bg-parchment transition-colors">
            <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Selected City</p>
            <p className="text-4xl font-black uppercase tracking-tighter">{cityFilter}</p>
         </div>
         <div className="p-6 bg-white hover:bg-parchment transition-colors">
            <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Active platform</p>
            <p className="text-4xl font-black uppercase tracking-tighter">{platformFilter}</p>
         </div>
      </div>

      {loading && (
        <div className="flex justify-center py-20">
           <div className="w-12 h-12 border-4 border-black border-r-coral animate-spin"></div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
         {!loading && workers.map((worker, i) => {
           const cardStyles = getPlatformColor(worker.platform);
           return (
             <div key={i} className={`neo-card border-2 flex flex-col p-6 transition-all hover:-translate-y-2 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] ${cardStyles.split(' ')[0]} border-black`}>
                <div className="flex items-start justify-between mb-4">
                   <div className="w-12 h-12 rounded-full border-2 border-black bg-white flex items-center justify-center font-black text-xl">
                      {worker.email?.[0].toUpperCase() || 'A'}
                   </div>
                   <span className={`badge border-2 border-black font-black italic ${
                     worker.status === 'APPROVED' ? 'badge-success' : 
                     worker.status === 'SUBMITTED' ? 'badge-warning' : 
                     'badge-night text-white'
                   }`}>
                     {worker.status || 'UNRANKED'}
                   </span>
                </div>
                
                <h4 className="text-xl font-black truncate mb-1">{worker.email || 'anonymous@node.io'}</h4>
                <p className="text-xs font-bold opacity-60 uppercase tracking-widest mb-6">{worker.phone || '+91 90000 00000'}</p>
                
                <div className="mt-auto pt-4 border-t-2 border-black/10 flex items-center justify-between">
                   <div className="flex flex-col">
                      <span className="text-[9px] font-black uppercase opacity-40">City</span>
                      <span className="text-xs font-black uppercase italic">{worker.city || 'TNP'}</span>
                   </div>
                   <div className="flex flex-col text-right">
                      <span className="text-[9px] font-black uppercase opacity-40">Node</span>
                      <span className={`text-[10px] font-black uppercase p-1 border-2 border-black ${cardStyles.split(' ').slice(1).join(' ')}`}>
                        {worker.platform || 'General'}
                      </span>
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
      icon: <Zap size={24} />, 
      color: "bg-[#FF4D8D15]", 
      borderColor: "border-[#FF4D8D]",
      textColor: "text-[#FF4D8D]", 
      desc: "Confidence & Block Scoring",
      details: [
        { label: "Fraud Block Threshold", value: `${(settings?.alertThresholds?.fraudBlockThreshold * 100).toFixed(0)}%` },
        { label: "High Risk Trigger", value: `${settings?.alertThresholds?.highRiskScore}` }
      ]
    },
    { 
      title: "Risk Engine", 
      icon: <ShieldAlert size={24} />, 
      color: "bg-[#FFFF0015]", 
      borderColor: "border-[#D4D400]",
      textColor: "text-[#808000]", 
      desc: "Device & GPS Validation",
      details: [
        { label: "Device Frequency", value: `${settings?.riskConfig?.deviceSwitchFrequency}x / day` },
        { label: "Max Speed Alert", value: `${settings?.riskConfig?.gpsSpeedMax} km/h` }
      ]
    },
    { 
      title: "Subscription", 
      icon: <Users size={24} />, 
      color: "bg-[#66AB2415]", 
      borderColor: "border-[#66AB24]",
      textColor: "text-[#66AB24]", 
      desc: "Plan & Renew Config",
      details: [
        { label: "Grace Period", value: `${settings?.planConfig?.gracePeriodDays} Days` },
        { label: "Auto-Renew Default", value: settings?.planConfig?.autoRenewDefault ? "ENABLED" : "DISABLED" }
      ]
    },
    { 
      title: "Verifications", 
      icon: <User size={24} />, 
      color: "bg-[#FF7D3315]", 
      borderColor: "border-[#FF7D33]",
      textColor: "text-[#FF7D33]", 
      desc: "Identity & SLA Settings",
      details: [
        { label: "KYC SLA", value: `${settings?.verificationSettings?.kycReviewSlaHours} Hours` },
        { label: "Manual Override", value: settings?.verificationSettings?.allowManualOverride ? "ALLOWED" : "BLOCKED" }
      ]
    }
  ];

  return (
    <div className="animate-in zoom-in-95 duration-500">
      <header className="mb-12">
        <h2 className="text-5xl font-black uppercase tracking-tighter">System Architect</h2>
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mt-2">Core Protocol Configuration • Admin Portal v2</p>
      </header>

      {loading ? (
        <div className="p-20 text-center font-black italic opacity-30">HYDRATING SYSTEM ARCHITECTURE...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {setupModules.map((m, i) => (
            <div key={i} className={`neo-card border-4 border-black ${m.color} p-8 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-2 transition-all flex flex-col group`}>
               <div className="flex items-center justify-between mb-8">
                  <div className={`p-4 border-2 border-black bg-white ${m.textColor}`}>
                    {m.icon}
                  </div>
                  <button className="text-[10px] font-black uppercase text-coral underline opacity-0 group-hover:opacity-100 transition-opacity">Edit Config</button>
               </div>
               
               <h3 className="text-2xl font-black uppercase mb-1">{m.title}</h3>
               <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-8">{m.desc}</p>
               
               <div className="mt-auto space-y-4">
                  {m.details.map((d, j) => (
                    <div key={j} className="flex items-center justify-between border-b-2 border-black/10 pb-2">
                       <span className="text-[11px] font-black uppercase opacity-60">{d.label}</span>
                       <span className="text-sm font-black italic">{d.value}</span>
                    </div>
                  ))}
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- SHARED UI COMPONENTS ---

function SidebarItem({ icon, label, active, to }: any) {
  return (
    <Link 
      to={to}
      className={`nav-item group ${active ? 'active' : ''}`}
    >
      <span className={`${active ? 'text-black' : 'text-gray-500 group-hover:text-black'} transition-colors`}>{icon}</span>
      <span>{label}</span>
      {active && <div className="ml-auto w-2 h-2 bg-black rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]"></div>}
    </Link>
  );
}

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


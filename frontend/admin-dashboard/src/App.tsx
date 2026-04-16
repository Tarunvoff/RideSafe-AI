import { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  Map as MapIcon, 
  AlertTriangle, 
  Settings, 
  LogOut, 
  Search,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ClipboardList
} from 'lucide-react';

// --- MOCK DATA (To be replaced by API calls) ---
const MOCK_STATS = [
  { label: 'Total Workers', value: '1,248', trend: '+12%', up: true },
  { label: 'Active Plans', value: '852', trend: '+5%', up: true },
  { label: 'Pending Claims', value: '14', trend: '-2', up: false },
  { label: 'Risk Alerts', value: '3', trend: 'High', up: false, danger: true },
];

const MOCK_SUBMISSIONS = [
  { id: 'ANL-9021', user: 'Maya Johnson', score: 12, status: 'APPROVED', date: '2026-04-16' },
  { id: 'ANL-8932', user: 'Carlos Rodriguez', score: 68, status: 'REJECTED', date: '2026-04-16' },
  { id: 'ANL-8841', user: 'Sarah Chen', score: 45, status: 'PENDING', date: '2026-04-15' },
  { id: 'ANL-8750', user: 'Raj Patel', score: 82, status: 'ESCALATED', date: '2026-04-15' },
  { id: 'ANL-8663', user: 'Leila Ahmadi', score: 15, status: 'APPROVED', date: '2026-04-14' },
];

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [stats, setStats] = useState(MOCK_STATS);
  const [submissions] = useState(MOCK_SUBMISSIONS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      const fetchData = async () => {
        try {
          setLoading(true);
          // In a real scenario, we'd call adminApi.getDashboard()
          // For now, we simulate a slight delay and update
          setTimeout(async () => {
            // Simulated live updates
            setStats(prev => prev.map(s => ({ 
              ...s, 
              value: s.label === 'Total Workers' ? (parseInt(s.value.replace(',','')) + Math.floor(Math.random() * 3)).toLocaleString() : s.value
            })));
          }, 1000);
        } catch (e) {
          console.error('Failed to sync data', e);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
      const interval = setInterval(fetchData, 10000); // Poll every 10s
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="neo-card w-full max-width-md bg-white">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="text-coral" size={32} />
            <h1 className="text-3xl">AEGIS ADMIN</h1>
          </div>
          <p className="font-bold mb-6 text-gray-500 uppercase">Command Center Entrance</p>
          <div className="flex flex-col gap-4">
            <input type="email" placeholder="ADMIN@AEGIS.COM" className="neo-input" defaultValue="admin@example.com" />
            <input type="password" placeholder="••••••••" className="neo-input" defaultValue="password" />
            <button className="neo-btn w-full mt-4" onClick={() => setIsAuthenticated(true)}>
              Initialize Secure Session
            </button>
          </div>
          <p className="text-xs mt-6 text-gray-400 font-bold uppercase tracking-widest text-center">
            Secured by Aegis Enforcer v2
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-shell">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="flex items-center gap-3 mb-10 p-4 border-2 border-black bg-parchment shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="bg-night p-1.5 border-2 border-black">
            <Shield className="text-coral" size={24} />
          </div>
          <h1 className="text-2xl font-black tracking-tighter">AEGIS</h1>
        </div>

        <nav className="sidebar-nav">
          <SidebarItem 
            icon={<ClipboardList size={18} />} 
            label="Overview" 
            active={activeTab === 'overview'} 
            onClick={() => setActiveTab('overview')}
          />
          <SidebarItem 
            icon={<AlertTriangle size={18} />} 
            label="Fraud Review" 
            active={activeTab === 'fraud'} 
            onClick={() => setActiveTab('fraud')}
          />
          <SidebarItem 
            icon={<Users size={18} />} 
            label="Workers" 
            active={activeTab === 'workers'} 
            onClick={() => setActiveTab('workers')}
          />
          <SidebarItem 
            icon={<MapIcon size={18} />} 
            label="Live Risk" 
            active={activeTab === 'risk'} 
            onClick={() => setActiveTab('risk')}
          />
        </nav>

        <div className="flex flex-col gap-3 mt-auto">
          <SidebarItem icon={<Settings size={18} />} label="Settings" />
          <div className="neo-card p-4 flex items-center gap-3 bg-gray-100 border-2 border-black">
            <div className="w-10 h-10 bg-night rounded-full border-2 border-black"></div>
            <div className="flex-1">
              <p className="font-bold text-sm tracking-tight">SURYA R.</p>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">System Admin</p>
            </div>
            <LogOut size={18} className="cursor-pointer hover:text-coral transition-colors" />
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <header className="header-row">
          <div>
            <h2 className="text-3xl">Command Center</h2>
            <p className="text-gray-500 font-semibold">Real-time platform oversight & risk enforcement</p>
          </div>
          <div className="flex gap-4">
            <button className="neo-btn secondary">
              <Search size={18} />
              Quick search
            </button>
            <button className="neo-btn">
              <Plus size={18} />
              Manual Alert
            </button>
          </div>
        </header>

        {/* STATS */}
        <div className="stat-grid">
          {(loading && stats.length === 0 ? Array(4).fill({}) : stats).map((stat, i) => (
            <div key={i} className={`neo-card transition-all hover:scale-105 ${stat.danger ? 'bg-red-50' : 'bg-white'}`}>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">{stat.label || 'Loading...'}</p>
              <div className="flex items-end justify-between mt-2">
                <h3 className="text-4xl">{stat.value || '---'}</h3>
                {stat.trend && (
                  <div className={`flex items-center text-sm font-bold ${stat.up ? 'text-success' : 'text-danger'}`}>
                    {stat.up ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    {stat.trend}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* RECENT SUBMISSIONS */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl">Fraud Analysis Pipeline</h3>
            <button className="text-sm font-bold underline">View All Submissions</button>
          </div>
          
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Analysis ID</th>
                  <th>Worker Name</th>
                  <th>Risk Score</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub, i) => (
                  <tr key={i}>
                    <td className="font-mono font-bold text-coral">{sub.id}</td>
                    <td className="font-bold">{sub.user}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 w-24">
                          <div 
                            className={`h-full ${sub.score > 60 ? 'bg-danger' : sub.score > 30 ? 'bg-warning' : 'bg-success'}`}
                            style={{ width: `${sub.score}%` }}
                          ></div>
                        </div>
                        <span className="font-bold">{sub.score}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${
                        sub.status === 'APPROVED' ? 'badge-success' : 
                        sub.status === 'REJECTED' ? 'badge-danger' : 
                        sub.status === 'ESCALATED' ? 'badge-night' : 'badge-warning'
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="text-gray-500">{sub.date}</td>
                    <td>
                      <button className="neo-btn py-1 px-3 text-xs">Review</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* LIVE FEEDS GRID */}
        <div className="grid grid-cols-2 gap-8 mt-12">
          <div className="neo-card">
            <h3 className="mb-4">Live Alert Feed</h3>
            <div className="flex flex-col gap-4">
              <AlertItem title="Flood Watch: Chennai Zone 8" time="2m ago" severity="HIGH" />
              <AlertItem title="Anomalous Activity: Worker ID #9021" time="15m ago" severity="MEDIUM" />
              <AlertItem title="System: Kafka Broker lag spike" time="1h ago" severity="LOW" />
            </div>
          </div>
          <div className="neo-card flex flex-col items-center justify-center bg-night text-parchment">
            <MapIcon size={48} className="text-coral mb-4" />
            <h3 className="text-center">Spatial Insight Layer</h3>
            <p className="text-sm opacity-70 mt-2">Connecting to Mapbox Secure Grid...</p>
            <button className="neo-btn mt-6 secondary">Open Full Map</button>
          </div>
        </div>
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`nav-item ${active ? 'active' : ''}`}
    >
      <span className={active ? 'text-black' : 'text-gray-600'}>{icon}</span>
      <span>{label}</span>
      {active && <div className="ml-auto w-2 h-2 bg-black rounded-full"></div>}
    </button>
  );
}

function AlertItem({ title, time, severity }: any) {
  return (
    <div className="border-b border-black last:border-0 pb-3">
      <div className="flex justify-between items-start">
        <p className="font-bold text-sm">{title}</p>
        <span className={`text-[10px] font-bold px-2 py-0.5 border border-black ${
          severity === 'HIGH' ? 'bg-danger text-white' : 
          severity === 'MEDIUM' ? 'bg-warning' : 'bg-gray-200'
        }`}>
          {severity}
        </span>
      </div>
      <p className="text-xs text-gray-500 mt-1">{time}</p>
    </div>
  );
}

export default App;

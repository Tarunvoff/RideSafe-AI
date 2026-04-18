import React from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar, Cell } from 'recharts';
import { Shield } from 'lucide-react';

interface RiskTrendChartProps {
  data: any[];
  variant?: 'predictive' | 'trend';
}

const CustomTooltip = ({ active, payload, variant }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className={`border-4 border-black p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${variant === 'predictive' ? 'bg-[#FCFBE3] text-black' : 'bg-black text-white'}`}>
        <p className="font-heading font-black uppercase text-[10px] tracking-widest mb-1">
          {variant === 'predictive' ? 'Temporal Node' : 'Anomaly Signal'}
        </p>
        <p className="font-black text-2xl">{Math.round(payload[0].value)}%</p>
        <div className="mt-2 space-y-1">
          <p className={`font-black text-[10px] uppercase ${variant === 'predictive' ? 'text-coral' : 'text-primary-container'}`}>
             {variant === 'predictive' ? 'Projected Loss' : 'Risk Velocity'}
          </p>
          {variant === 'predictive' && payload[0].payload.projected_claims !== undefined && (
            <p className="font-black text-[9px] uppercase opacity-60">
              Anticipated Claims: {payload[0].payload.projected_claims ?? 'N/A'}
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const RiskTrendChart: React.FC<RiskTrendChartProps> = ({ data, variant = 'trend' }) => {
  const normalizedData = (data || [])
    .filter(d => d.avg_lf !== null && d.avg_risk !== null) // Filter out strict nulls from Task 3B
    .map(d => ({
      ...d,
      displayDate: d.date || d.day || d.hour || 'Awaiting...',
      riskValue: d.avg_lf ?? d.avg_risk ?? d.risk ?? (d.total_payout ? Math.min(100, d.total_payout/1000) : 0)
    }));

  if (normalizedData.length === 0) {
    return (
      <div className="h-[200px] w-full flex flex-col items-center justify-center border-4 border-dashed border-red-600 bg-red-50 p-6 text-center animate-in fade-in duration-500">
        <Shield className="text-red-600 mb-3 animate-pulse" size={40} />
        <h4 className="font-heading font-black uppercase text-red-600 tracking-tighter text-sm">INSUFFICIENT DATA: AWAITING TELEMETRY</h4>
        <p className="text-[10px] font-bold uppercase text-red-600/60 font-heading mt-2 italic max-w-[240px]">
          Actuarial Pool Inconclusive • Primary Nodes Offline • Predictive ML requires telemetry stream
        </p>
      </div>
    );
  }

  if (variant === 'predictive') {
    return (
      <div className="h-[250px] w-full px-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={normalizedData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="0 0" vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis 
              dataKey="displayDate" 
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 800 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(val) => {
                try {
                  return new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } catch { return val; }
              }}
            />
            <YAxis hide domain={[0, 100]} />
            <Tooltip content={<CustomTooltip variant="predictive" />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
            <Bar 
              dataKey="riskValue" 
              radius={[2, 2, 0, 0]}
              animationDuration={1500}
            >
              {normalizedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.riskValue > 60 ? '#ff6b53' : '#3d2b26'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={normalizedData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="4 4" vertical={true} stroke="rgba(0,0,0,0.1)" />
          <XAxis 
             dataKey="displayDate" 
             axisLine={{ stroke: '#000', strokeWidth: 4 }}
             tickLine={false}
             tick={{ fontSize: 10, fill: '#000', fontWeight: 800, fontFamily: 'Space Grotesk' }}
             hide
          />
          <YAxis 
             axisLine={{ stroke: '#000', strokeWidth: 4 }}
             tickLine={false}
             tick={{ fontSize: 10, fill: '#000', fontWeight: 800, fontFamily: 'Space Grotesk' }}
          />
          <Tooltip content={<CustomTooltip variant="trend" />} />
          <Line 
             type="monotone" 
             dataKey="riskValue" 
             stroke="#AE311F" 
             strokeWidth={6} 
             dot={{ r: 6, fill: '#1B1D0E', strokeWidth: 0 }}
             activeDot={{ r: 10, stroke: '#AE311F', strokeWidth: 4, fill: '#FFF' }}
             animationDuration={1500}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RiskTrendChart;

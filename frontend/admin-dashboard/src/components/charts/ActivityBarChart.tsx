import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Shield } from 'lucide-react';

interface ActivityBarChartProps {
  data: any[];
  color?: string;
  horizontal?: boolean;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#FCFBE3] border-4 border-black p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <p className="font-heading font-black uppercase text-[10px] tracking-widest mb-1">{payload[0].payload.label}</p>
        <p className="font-heading text-coral font-black text-2xl">{payload[0].value.toLocaleString()}</p>
        <p className="text-black/50 font-bold text-[9px] uppercase font-heading tracking-tighter">Validated Transaction Nodes</p>
      </div>
    );
  }
  return null;
};

const ActivityBarChart: React.FC<ActivityBarChartProps> = ({ data, color = "#ff6b53", horizontal = false }) => {
  const chartData = (data && data.length > 0) ? data : [];

  if (chartData.length === 0) {
    return (
      <div className="h-[200px] w-full flex flex-col items-center justify-center border-4 border-dashed border-black/10 bg-white/50 p-6 text-center animate-in fade-in duration-500">
        <Shield className="text-black/20 mb-2" size={32} />
        <h4 className="font-heading font-black uppercase text-black/30 tracking-widest text-[10px]">INSUFFICIENT DATA</h4>
        <p className="text-[9px] font-bold uppercase text-black/20 font-heading mt-1 italic">
          Telemetric Feed Offline • Awaiting Sector Sync
        </p>
      </div>
    );
  }

  return (
    <div className="h-[240px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout={horizontal ? "vertical" : "horizontal"}
          margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
          barSize={horizontal ? 24 : 32}
        >
          <CartesianGrid strokeDasharray="0 0" vertical={false} stroke="rgba(0,0,0,0.05)" />
          {horizontal ? (
            <>
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="label" 
                axisLine={{ stroke: '#000', strokeWidth: 4 }}
                tickLine={false}
                tick={{ fontSize: 9, fontWeight: 900, fill: '#000', fontFamily: 'Space Grotesk' }}
                width={80}
              />
            </>
          ) : (
            <>
              <XAxis 
                dataKey="label" 
                axisLine={{ stroke: '#000', strokeWidth: 4 }}
                tickLine={false}
                tick={{ fontSize: 9, fontWeight: 900, fill: '#000', fontFamily: 'Space Grotesk' }}
                dy={10}
              />
              <YAxis 
                axisLine={{ stroke: '#000', strokeWidth: 4 }}
                tickLine={false}
                tick={{ fontSize: 10, fontWeight: 800, fill: '#000', fontFamily: 'Space Grotesk' }}
              />
            </>
          )}
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Bar dataKey="value" animationDuration={1000}>
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={color} stroke="#000" strokeWidth={4} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ActivityBarChart;

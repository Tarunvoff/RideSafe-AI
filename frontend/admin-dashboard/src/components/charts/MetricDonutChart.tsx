import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface MetricDonutChartProps {
  data: any[];
}

const COLORS = [
  '#006d37', // Tertiary Green
  '#ff6b53', // Primary/Coral
  '#ae311f', // Accent Red
  '#1B1D0E', // Night
  '#6bfe9c', // Success Light
  '#ffdad4', // Error Light
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1B1D0E] border-4 border-white p-3 shadow-[8px_8px_0px_0px_rgba(255,107,83,1)]">
        <p className="text-white font-heading font-black uppercase text-[10px] tracking-widest mb-1">{payload[0].name}</p>
        <p className="text-coral font-heading font-black text-3xl">{payload[0].value.toLocaleString()}</p>
        <p className="text-white/40 font-bold text-[9px] uppercase font-heading tracking-widest">Active Pool Weight</p>
      </div>
    );
  }
  return null;
};

const MetricDonutChart: React.FC<MetricDonutChartProps> = ({ data }) => {
  const chartData = (data && data.length > 0) ? data : [];
  const total = chartData.reduce((acc, cur) => acc + cur.value, 0);

  if (chartData.length === 0) {
    return (
      <div className="h-[240px] w-full flex flex-col items-center justify-center border-4 border-dashed border-black/10 rounded-full aspect-square max-w-[240px] mx-auto">
        <div className="w-12 h-12 border-4 border-black/10 border-t-black/40 rounded-full animate-spin"></div>
        <p className="text-[9px] font-black uppercase text-black/30 mt-3 font-heading">Processing Mix...</p>
      </div>
    );
  }

  return (
    <div className="h-[320px] w-full flex flex-col items-center">
      <div className="relative w-full h-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={105}
              paddingAngle={2}
              dataKey="value"
              nameKey="label"
              animationDuration={1500}
            >
              {chartData.map((_, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]} 
                  stroke="#1B1D0E" 
                  strokeWidth={6}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-x-0 inset-y-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-heading font-black italic text-4xl text-black">84%</span>
          <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">Confidence</span>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-2">
         {chartData.slice(0, 3).map((item, index) => (
           <div key={index} className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-black" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
              <span className="font-heading font-black text-[10px] uppercase">{item.label} ({Math.round(item.value / total * 100)}%)</span>
           </div>
         ))}
      </div>
    </div>
  );
};

export default MetricDonutChart;

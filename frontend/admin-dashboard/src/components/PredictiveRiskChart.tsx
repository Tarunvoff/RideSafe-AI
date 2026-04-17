import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface PredictiveRiskChartProps {
  data: Array<{
    hour: string;
    avg_lf: number;
  }>;
}

const PredictiveRiskChart: React.FC<PredictiveRiskChartProps> = ({ data }) => {
  // Format the data for the chart
  const chartData = data.map((item) => ({
    time: new Date(item.hour).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    risk: Math.min(100, Math.max(0, item.avg_lf * 100)), // Map Lf to 0-100 scale
  }));

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-900/50 rounded-xl border border-slate-800">
        <p className="text-slate-400 font-medium">Insufficient telemetry for predictive modeling</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis 
            dataKey="time" 
            stroke="#64748b" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#64748b" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => `${value}%`}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#0f172a', 
              borderColor: '#1e293b',
              borderRadius: '8px',
              color: '#f8fafc'
            }}
            itemStyle={{ color: '#3b82f6' }}
          />
          <Area 
            type="monotone" 
            dataKey="risk" 
            stroke="#3b82f6" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorRisk)" 
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PredictiveRiskChart;

import { useEffect, useState } from 'react';

// Live telemetry linkage to internal compliance execution node.
export default function ActuarialSustainabilityWidget() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    // Fetch from /compliance/stress-test on the backend
    fetch('http://localhost:3001/compliance/stress-test')
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, []);

  if (!data) return <div className="animate-pulse bg-slate-100 h-32 rounded-xl"></div>;

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
        IRDAI Reserve Sustainability
      </h3>
      
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-700 font-medium">5-Year Reserve Stress Test:</span>
        {data.isPoolSolvent ? (
          <span className="px-3 py-1 bg-green-100 text-green-800 font-bold rounded-md uppercase text-xs">
            PASSED
          </span>
        ) : (
          <span className="px-3 py-1 bg-red-100 text-red-800 font-bold rounded-md uppercase text-xs">
            CRITICAL THREAT
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4 bg-slate-50 p-4 rounded-lg">
        <div>
          <p className="text-xs text-slate-500">Benefit-Cost Ratio (BCR)</p>
          <p className="text-xl font-bold text-slate-900">{data.benefitCostRatio}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Modeled Liquidity Reserve</p>
          <p className="text-xl font-bold text-slate-900">₹{(data.liquidityReserve / 1000000).toFixed(2)}M</p>
        </div>
      </div>
      <p className="text-xs text-slate-400 mt-3 font-mono border-t border-slate-200 pt-3">
        Scenario: {data.modeledStressEvent} | {data.signature}
      </p>
    </div>
  );
}

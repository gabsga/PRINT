
import React from 'react';
import { PieChart, Pie, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DatasetStats, IntegratedInteraction } from '../types';

interface StatsPanelProps {
  data: IntegratedInteraction[];
  totalInteractions?: number;
  stats?: DatasetStats;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ data, totalInteractions, stats }) => {
  const sourceCounts = stats?.sourceCounts || [
    { name: 'TARGET', count: data.filter(i => i.sources.includes('TARGET')).length },
    { name: 'DAP', count: data.filter(i => i.sources.includes('DAP')).length },
    { name: 'CHIP', count: data.filter(i => i.sources.includes('CHIP')).length },
  ];

  const COLORS = ['#4de7bf', '#d7aa63', '#69d7cf'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div className="print-panel p-6 rounded-3xl">
        <h3 className="text-lg font-bold mb-4 text-[var(--print-mint)]">Evidence Distribution</h3>
        <div className="h-64 min-h-64 min-w-0 w-full" style={{ minHeight: 256 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                cursor={{ fill: '#203038' }}
                contentStyle={{
                  backgroundColor: '#203038',
                  border: '1px solid rgba(119, 167, 159, 0.26)',
                  borderRadius: '12px',
                  color: '#eef4ef',
                  fontWeight: 600
                }}
              />
              <Pie data={sourceCounts} dataKey="count" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                {sourceCounts.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="print-panel p-6 rounded-3xl flex flex-col justify-center">
        <h3 className="text-lg font-bold mb-6 text-[var(--print-mint)]">Quick Stats</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-[rgba(77,231,191,0.08)] border border-[rgba(77,231,191,0.2)] rounded-2xl">
            <p className="text-sm text-[var(--print-mint)] font-bold">Total Interactions</p>
            <p className="text-3xl font-black text-[var(--print-mint-soft)] mt-1">{totalInteractions || data.length}</p>
          </div>
          <div className="p-4 bg-[rgba(105,215,207,0.08)] border border-[rgba(105,215,207,0.2)] rounded-2xl">
            <p className="text-sm text-[#69d7cf] font-bold">High Confidence (3+)</p>
            <p className="text-3xl font-black text-[#90e6df] mt-1">
              {stats?.highConfidence3 ?? data.filter(i => i.evidenceCount === 3).length}
            </p>
          </div>
          <div className="p-4 bg-[rgba(215,170,99,0.08)] border border-[rgba(215,170,99,0.22)] rounded-2xl">
            <p className="text-sm text-[#d7aa63] font-bold">Unique TFs</p>
            <p className="text-3xl font-black text-[#efc98e] mt-1">
              {stats?.uniqueTFs ?? new Set(data.map(i => i.tf)).size}
            </p>
          </div>
          <div className="p-4 bg-white/5 border border-[var(--print-line)] rounded-2xl">
            <p className="text-sm text-[var(--print-fog)] font-bold">Unique Targets</p>
            <p className="text-3xl font-black text-slate-100 mt-1">
              {stats?.uniqueTargets ?? new Set(data.map(i => i.target)).size}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPanel;

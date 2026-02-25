import React, { useMemo } from 'react';
type LandingProps = {
  onEnter: () => void;
};

const SOURCE_COLORS: Record<string, string> = {
  TARGET: '#22c55e',
  DAP: '#8b5cf6',
  CHIP: '#22d3ee'
};

export default function Landing({ onEnter }: LandingProps) {
  const sampleRows = useMemo(
    () => [
      { tf: 'MYBR1', target: 'AUX1', sources: ['DAP', 'CHIP'] },
      { tf: 'HB6', target: 'AUX1', sources: ['DAP', 'CHIP'] },
      { tf: 'MYBR1', target: 'GH9C2', sources: ['DAP', 'CHIP'] }
    ],
    []
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-200">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <header className="flex flex-col items-center text-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30 flex items-center justify-center">
              <img src="/logos/prnt-mark.svg" alt="PRINT logo" className="w-10 h-10" />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              PRINT
            </h1>
          </div>
          <p className="text-slate-300 max-w-2xl font-semibold">
            Plant Regulatory Information Network Tool
          </p>
          <p className="text-slate-400 max-w-2xl">
            PRINT your hypotheses into testable regulatory networks.
          </p>
          <div className="px-4 py-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 text-emerald-300 text-sm font-semibold">
            Start from one of the three tabs on the left sidebar.
          </div>
          <button
            onClick={onEnter}
            className="mt-2 px-6 py-3 rounded-xl bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 transition-colors"
          >
            Enter App
          </button>
        </header>

        <section className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-400 mb-4">
              Explore Data
            </div>
            <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950/60">
              <div className="grid grid-cols-3 text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-slate-900/50 border-b border-slate-800">
                <div className="px-3 py-2 border-r border-slate-800">TF</div>
                <div className="px-3 py-2 border-r border-slate-800">Target</div>
                <div className="px-3 py-2">Evidence</div>
              </div>
              <div className="divide-y divide-slate-800">
                {sampleRows.map((row, idx) => (
                  <div key={`${row.tf}-${row.target}-${idx}`} className="grid grid-cols-3 items-center text-xs bg-slate-950/30">
                    <div className="px-3 py-2 font-semibold text-emerald-300 border-r border-slate-800">{row.tf}</div>
                    <div className="px-3 py-2 text-slate-200 border-r border-slate-800">{row.target}</div>
                    <div className="px-3 py-2 flex items-center gap-1">
                      {row.sources.map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                          style={{
                            backgroundColor: `${SOURCE_COLORS[s]}22`,
                            color: SOURCE_COLORS[s],
                            border: `1px solid ${SOURCE_COLORS[s]}55`
                          }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              Function: filter TF–target interactions by evidence and GO context, and download results
              in a readable format.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Question: Which targets does MYBR1 regulate under Water Deprivation?
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center justify-between">
            <div className="w-full">
              <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-400 mb-4">
                Network View
              </div>
              <div className="w-full aspect-video rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-center">
                <svg width="240" height="140" viewBox="0 0 240 140" aria-hidden="true">
                  <defs>
                    <linearGradient id="nodeGlow" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#22c55e" />
                      <stop offset="1" stopColor="#14b8a6" />
                    </linearGradient>
                  </defs>
                  <circle cx="120" cy="18" r="9" fill="#60a5fa" stroke="#1e3a8a" strokeWidth="1" />
                  <text x="120" y="34" textAnchor="middle" fontSize="9" fill="#93c5fd" fontWeight="700">
                    NLP7
                  </text>
                  <line x1="120" y1="27" x2="120" y2="44" stroke="#475569" strokeWidth="2" />
                  <polygon points="120,48 146,92 94,92" fill="url(#nodeGlow)" stroke="#0f766e" strokeWidth="1" />
                  <line x1="120" y1="92" x2="82" y2="114" stroke="#475569" strokeWidth="2" />
                  <line x1="120" y1="92" x2="158" y2="114" stroke="#475569" strokeWidth="2" />
                  <circle cx="82" cy="114" r="9" fill="#f59e0b" stroke="#b45309" strokeWidth="1" />
                  <circle cx="158" cy="114" r="9" fill="#a855f7" stroke="#6b21a8" strokeWidth="1" />
                  <circle cx="60" cy="70" r="8" fill="#22d3ee" stroke="#0e7490" strokeWidth="1" />
                  <line x1="94" y1="70" x2="68" y2="70" stroke="#475569" strokeWidth="2" />
                </svg>
              </div>
              <p className="mt-4 text-xs text-slate-400">
                Function: visualize direct, hierarchical, and pathway networks.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Question: How does ABF2 connect to drought-related subnetworks?
              </p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-400 mb-4">
              Enrichment
            </div>
            <div className="w-full rounded-2xl bg-slate-950/60 border border-slate-800 p-4">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 mb-3">
                {['ABF2', 'HB6', 'NLP7', 'TGA1', 'MYBR1'].map((tf) => (
                  <span
                    key={tf}
                    className="px-2 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300"
                  >
                    {tf}
                  </span>
                ))}
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-5 gap-2">
                  {['#5b4ea6', '#3a6db5', '#2b8ac9', '#20a5d0', '#1bbf9b'].map((color, idx) => (
                    <div
                      key={idx}
                      className="h-6 rounded-md border border-slate-700"
                      style={{ backgroundColor: color }}
                    ></div>
                  ))}
                </div>
                <div className="h-8 rounded-xl bg-slate-800/70 border border-slate-700 flex items-center px-2">
                  <div className="h-3.5 w-full rounded-lg bg-gradient-to-r from-violet-500 via-cyan-500 to-emerald-500"></div>
                </div>
                <div className="flex items-center justify-between text-[9px] font-semibold text-slate-500">
                  <span>Low</span>
                  <span>Heatmap scale</span>
                  <span>High</span>
                </div>
              </div>
              <div className="mt-2 text-[10px] font-semibold text-slate-400 text-center">
                Water Deprivation Enrichment
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              Function: target enrichment across TFs in biological processes.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Question: Are TF targets enriched in Water Deprivation or Drought GO terms?
            </p>
          </div>
        </section>

        <footer className="mt-10 pt-6 border-t border-slate-800 flex flex-col items-center gap-4 text-xs text-slate-500">
          <div className="w-full max-w-3xl bg-slate-400/75 border border-slate-300 rounded-2xl px-6 py-4 flex items-center justify-center gap-10 shadow-lg shadow-slate-950/30 overflow-hidden">
            <div className="h-16 w-36 flex items-center justify-center shrink-0">
              <img
                src="/logos/Logo Lab (transparent bg).png"
                alt="Logo Lab"
                className="max-h-full max-w-full object-contain opacity-90"
              />
            </div>
            <div className="h-16 w-20 flex items-center justify-center shrink-0">
              <img
                src="/logos/2025 - Logo PhytoLearning sin fondo (1).png"
                alt="PhytoLearning"
                className="max-h-full max-w-full object-contain opacity-95 scale-[3] origin-center"
              />
            </div>
          </div>
          <div className="text-center max-w-3xl">
            This data integration was done with ConnecTF (M.D. Brooks, 2021). Developed by Gabriela
            Vásquez, Luciano Ahumada and Nicolás Müller. (Plant Genome Regulation Lab, UNAB).
          </div>
        </footer>
      </div>
    </div>
  );
}

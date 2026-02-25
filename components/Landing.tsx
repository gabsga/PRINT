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
    <div className="min-h-screen md:h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-200">
      <div className="max-w-6xl h-full mx-auto px-4 py-4 md:py-3 flex flex-col gap-3">
        <header className="grid w-full grid-cols-1 md:grid-cols-[auto,1fr] items-center gap-3 md:gap-6 shrink-0">
          <div className="flex items-center justify-center md:justify-start gap-3 md:pr-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30 flex items-center justify-center">
              <img src="/logos/prnt-mark.svg" alt="PRINT logo" className="w-8 h-8" />
            </div>
            <h1 className="text-3xl md:text-[2.2rem] leading-none font-extrabold tracking-tight text-white">
              PRINT
            </h1>
          </div>
          <div className="flex flex-col items-center md:items-start text-center md:text-left gap-1.5">
            <p className="text-slate-300 font-semibold text-lg md:text-xl leading-tight">
              <span className="text-emerald-300">P</span>lant <span className="text-emerald-300">R</span>egulatory <span className="text-emerald-300">I</span>nformation <span className="text-emerald-300">N</span>etwork <span className="text-emerald-300">T</span>ool
            </p>
            <div className="w-full flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
              <p className="text-slate-400 md:flex-1">
                PRINT your hypotheses into testable regulatory networks.
              </p>
              <div className="px-3 py-1 rounded-full border border-slate-600/60 bg-slate-900/40 text-slate-300 text-xs md:text-sm font-semibold whitespace-nowrap">
                Start from one of the three tabs on the left sidebar.
              </div>
              <button
                onClick={onEnter}
                className="px-7 py-2.5 rounded-xl bg-emerald-400 text-slate-950 font-extrabold shadow-lg shadow-emerald-400/40 hover:bg-emerald-300 transition-colors whitespace-nowrap"
              >
                Open Dashboard
              </button>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 md:flex-1 min-h-0">
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-4 shadow-2xl flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400/40 hover:shadow-emerald-500/10">
            <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-400 mb-3">
              Explore Data
            </div>
            <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950/60 min-h-[220px]">
              <div className="grid grid-cols-3 text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-slate-900/50 border-b border-slate-800">
                <div className="px-3 py-2.5 border-r border-slate-800">TF</div>
                <div className="px-3 py-2.5 border-r border-slate-800">Target</div>
                <div className="px-3 py-2.5">Evidence</div>
              </div>
              <div className="divide-y divide-slate-800">
                {sampleRows.map((row, idx) => (
                  <div key={`${row.tf}-${row.target}-${idx}`} className="grid grid-cols-3 items-center text-xs bg-slate-950/30">
                    <div className="px-3 py-3 font-semibold text-emerald-300 border-r border-slate-800">{row.tf}</div>
                    <div className="px-3 py-3 text-slate-200 border-r border-slate-800">{row.target}</div>
                    <div className="px-3 py-3 flex items-center gap-1">
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
            <p className="mt-3 text-xs leading-tight text-slate-400">
              Filter TF-target edges by evidence and GO context.
            </p>
            <p className="mt-1 text-xs leading-tight text-slate-500">
              Example: MYBR1 targets under Water Deprivation.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-4 shadow-2xl flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400/40 hover:shadow-emerald-500/10">
            <div className="w-full h-full flex flex-col">
              <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-400 mb-3">
                Network View
              </div>
              <div className="w-full aspect-[16/9] rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-center min-h-[220px]">
                <svg width="255" height="148" viewBox="0 0 240 140" aria-hidden="true">
                  <defs>
                    <linearGradient id="nodeGlow" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#22c55e" />
                      <stop offset="1" stopColor="#14b8a6" />
                    </linearGradient>
                    <marker
                      id="edgeArrow"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto"
                    >
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
                    </marker>
                  </defs>
                  <circle cx="120" cy="18" r="9" fill="#60a5fa" stroke="#1e3a8a" strokeWidth="1" />
                  <line x1="120" y1="48" x2="120" y2="28" stroke="#64748b" strokeWidth="2" markerEnd="url(#edgeArrow)" />
                  <polygon points="120,48 146,92 94,92" fill="url(#nodeGlow)" stroke="#0f766e" strokeWidth="1" />
                  <text x="120" y="76" textAnchor="middle" fontSize="9" fill="#042f2e" fontWeight="700">
                    NLP7
                  </text>
                  <line x1="94" y1="92" x2="89" y2="105" stroke="#64748b" strokeWidth="2" markerEnd="url(#edgeArrow)" />
                  <line x1="146" y1="92" x2="151" y2="105" stroke="#64748b" strokeWidth="2" markerEnd="url(#edgeArrow)" />
                  <circle cx="82" cy="114" r="9" fill="#f59e0b" stroke="#b45309" strokeWidth="1" />
                  <circle cx="158" cy="114" r="9" fill="#a855f7" stroke="#6b21a8" strokeWidth="1" />
                  <circle cx="60" cy="70" r="8" fill="#22d3ee" stroke="#0e7490" strokeWidth="1" />
                  <line x1="99" y1="70" x2="69" y2="70" stroke="#64748b" strokeWidth="2" markerEnd="url(#edgeArrow)" />
                </svg>
              </div>
              <p className="mt-3 text-xs leading-tight text-slate-400">
                Visualize direct, hierarchical, and pathway networks.
              </p>
              <p className="mt-1 text-xs leading-tight text-slate-500">
                Example: ABF2 links to drought-related subnetworks.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-4 shadow-2xl flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400/40 hover:shadow-emerald-500/10">
            <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-400 mb-3">
              Enrichment
            </div>
            <div className="w-full rounded-2xl bg-slate-950/60 border border-slate-800 p-3 min-h-[220px]">
              <div className="grid grid-cols-5 gap-2 text-[10px] font-bold text-slate-400 mb-3">
                {['ABF2', 'HB6', 'NLP7', 'TGA1', 'MYBR1'].map((tf) => (
                  <div key={tf} className="flex justify-center">
                    <span className="px-2 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300">
                      {tf}
                    </span>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-5 gap-2">
                  {['#5b4ea6', '#3a6db5', '#2b8ac9', '#20a5d0', '#1bbf9b'].map((color, idx) => (
                    <div key={idx} className="h-8 rounded-md border border-slate-700" style={{ backgroundColor: color }}></div>
                  ))}
                </div>
                <div className="h-10 rounded-xl bg-slate-800/70 border border-slate-700 flex items-center px-2">
                  <div className="h-4.5 w-full rounded-lg bg-gradient-to-r from-violet-500 via-cyan-500 to-emerald-500"></div>
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
            <p className="mt-3 text-xs leading-tight text-slate-400">
              Compare target enrichment across TFs.
            </p>
            <p className="mt-1 text-xs leading-tight text-slate-500">
              Example: enrichment in Water Deprivation vs Drought GO.
            </p>
          </div>
        </section>

        <footer className="pt-3 border-t border-slate-800 flex flex-col items-center gap-2 text-xs text-slate-500 shrink-0">
          <div className="w-full max-w-3xl bg-slate-400/55 border border-slate-300/70 rounded-2xl px-4 py-2.5 flex items-center justify-center gap-10 shadow-lg shadow-slate-950/20 overflow-hidden">
            <div className="h-16 w-44 flex items-center justify-center shrink-0">
              <img
                src="/logos/Logo Lab (transparent bg).png"
                alt="Logo Lab"
                className="max-h-full max-w-full object-contain opacity-90"
              />
            </div>
            <div className="h-16 w-28 flex items-center justify-center shrink-0">
              <img
                src="/logos/2025 - Logo PhytoLearning sin fondo (1).png"
                alt="PhytoLearning"
                className="max-h-full max-w-full object-contain opacity-90 scale-[2.9] origin-center"
              />
            </div>
          </div>
          <div className="text-center max-w-3xl leading-tight">
            This data integration was done with ConnecTF (M.D. Brooks, 2021). Developed by Gabriela
            Vásquez, Luciano Ahumada and Nicolás Müller. (Plant Genome Regulation Lab, UNAB).
          </div>
        </footer>
      </div>
    </div>
  );
}

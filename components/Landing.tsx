import React, { useMemo } from 'react';
type LandingProps = {
  onEnter: () => void;
};

const SOURCE_COLORS: Record<string, string> = {
  TARGET: '#4de7bf',
  DAP: '#d7aa63',
  CHIP: '#69d7cf'
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
    <div className="print-shell print-grid min-h-screen lg:h-screen text-slate-200">
      <div className="max-w-7xl mx-auto px-4 py-4 md:py-5 lg:py-4 flex flex-col gap-3 md:gap-4 lg:h-full">
        <header className="print-panel rounded-[2rem] grid w-full grid-cols-1 xl:grid-cols-[minmax(0,1.15fr),minmax(0,0.85fr)] items-center gap-4 lg:gap-5 p-5 md:p-6 lg:p-5 overflow-hidden relative shrink-0">
          <div className="absolute inset-y-0 right-0 hidden lg:flex items-center opacity-[0.08] pointer-events-none">
            <img src="/logos/sinfondoprint.png" alt="" className="h-[155%] w-auto object-contain translate-x-14" />
          </div>
          <div className="flex flex-col gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.35em] text-[var(--print-fog)]">Plant Network Intelligence</div>
                <h1 className="text-4xl md:text-[2.5rem] lg:text-[2.7rem] leading-none font-black tracking-[-0.04em] text-white">
                  PRINT
                </h1>
              </div>
            </div>
            <p className="text-slate-200 font-semibold text-lg md:text-[1.15rem] lg:text-[1.05rem] leading-tight max-w-2xl">
              Plant Regulatory Information Network Tool.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="print-chip px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.2em]">Regulatory networks</span>
              <span className="print-chip px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.2em]">GO enrichment</span>
              <span className="print-chip px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.2em]">Pathway context</span>
            </div>
            <div className="w-full flex flex-col md:flex-row md:items-center gap-3">
              <p className="text-slate-300 md:flex-1 max-w-xl text-sm lg:text-[0.95rem]">
                PRINT your hypotheses into testable regulatory networks.
              </p>
              <button
                onClick={onEnter}
                className="print-button px-7 py-3 lg:px-6 lg:py-2.5 rounded-2xl font-extrabold transition-colors whitespace-nowrap"
              >
                Open Dashboard
              </button>
            </div>
          </div>
          <div className="relative z-10 flex items-center justify-center">
            <div className="print-logo-frame w-full max-w-[250px] md:max-w-[290px] lg:max-w-[260px] aspect-square rounded-[2rem] p-5 md:p-7 lg:p-6 flex items-center justify-center">
              <img src="/logos/sinfondoprint.png" alt="PRINT principal mark" className="w-full h-full object-contain drop-shadow-[0_18px_40px_rgba(77,231,191,0.14)]" />
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-3 lg:flex-1">
          <div className="print-panel rounded-3xl p-4 lg:p-3.5 flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--print-line-strong)]">
            <div className="text-[11px] font-bold uppercase tracking-widest text-[var(--print-mint)] mb-3">
              Explore Data
            </div>
            <div className="print-panel-soft rounded-2xl overflow-hidden min-h-[220px] lg:min-h-[170px]">
              <div className="grid grid-cols-3 text-[10px] font-bold uppercase tracking-widest text-[var(--print-mint)] bg-black/10 border-b border-[var(--print-line)]">
                <div className="px-3 py-2.5 border-r border-[var(--print-line)]">TF</div>
                <div className="px-3 py-2.5 border-r border-[var(--print-line)]">Target</div>
                <div className="px-3 py-2.5">Evidence</div>
              </div>
              <div className="divide-y divide-[var(--print-line)]">
                {sampleRows.map((row, idx) => (
                  <div key={`${row.tf}-${row.target}-${idx}`} className="grid grid-cols-3 items-center text-xs bg-black/5">
                    <div className="px-3 py-3 lg:py-2.5 font-semibold text-[var(--print-mint-soft)] border-r border-[var(--print-line)]">{row.tf}</div>
                    <div className="px-3 py-3 lg:py-2.5 text-slate-200 border-r border-[var(--print-line)]">{row.target}</div>
                    <div className="px-3 py-3 lg:py-2.5 flex items-center gap-1">
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
            <p className="mt-3 lg:mt-2 text-xs leading-tight text-slate-300">
              Filter TF-target edges by evidence and GO context.
            </p>
            <p className="mt-1 text-xs leading-tight text-[var(--print-fog)]">
              Example: MYBR1 targets under Water Deprivation.
            </p>
          </div>

          <div className="print-panel rounded-3xl p-4 lg:p-3.5 flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--print-line-strong)]">
            <div className="w-full h-full flex flex-col">
              <div className="text-[11px] font-bold uppercase tracking-widest text-[var(--print-mint)] mb-3">
                Network View
              </div>
              <div className="w-full aspect-[16/9] rounded-2xl bg-black/10 border border-[var(--print-line)] flex items-center justify-center min-h-[220px] lg:min-h-[170px]">
                <svg width="255" height="148" viewBox="0 0 240 140" aria-hidden="true">
                  <defs>
                    <linearGradient id="nodeGlow" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#4de7bf" />
                      <stop offset="1" stopColor="#69d7cf" />
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
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#8ca7a0" />
                    </marker>
                  </defs>
                  <circle cx="120" cy="18" r="9" fill="#d7aa63" stroke="#7f5a2a" strokeWidth="1" />
                  <line x1="120" y1="48" x2="120" y2="28" stroke="#8ca7a0" strokeWidth="2" markerEnd="url(#edgeArrow)" />
                  <polygon points="120,48 146,92 94,92" fill="url(#nodeGlow)" stroke="#2f7f76" strokeWidth="1" />
                  <text x="120" y="76" textAnchor="middle" fontSize="9" fill="#163037" fontWeight="700">
                    NLP7
                  </text>
                  <line x1="94" y1="92" x2="89" y2="105" stroke="#8ca7a0" strokeWidth="2" markerEnd="url(#edgeArrow)" />
                  <line x1="146" y1="92" x2="151" y2="105" stroke="#8ca7a0" strokeWidth="2" markerEnd="url(#edgeArrow)" />
                  <circle cx="82" cy="114" r="9" fill="#d97777" stroke="#7c4444" strokeWidth="1" />
                  <circle cx="158" cy="114" r="9" fill="#d7aa63" stroke="#836139" strokeWidth="1" />
                  <circle cx="60" cy="70" r="8" fill="#69d7cf" stroke="#2f7f76" strokeWidth="1" />
                  <line x1="99" y1="70" x2="69" y2="70" stroke="#8ca7a0" strokeWidth="2" markerEnd="url(#edgeArrow)" />
                </svg>
              </div>
              <p className="mt-3 lg:mt-2 text-xs leading-tight text-slate-300">
                Visualize direct, hierarchical, and pathway networks.
              </p>
              <p className="mt-1 text-xs leading-tight text-[var(--print-fog)]">
                Example: ABF2 links to drought-related subnetworks.
              </p>
            </div>
          </div>

          <div className="print-panel rounded-3xl p-4 lg:p-3.5 flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--print-line-strong)]">
            <div className="text-[11px] font-bold uppercase tracking-widest text-[var(--print-mint)] mb-3">
              Enrichment
            </div>
            <div className="w-full rounded-2xl bg-black/10 border border-[var(--print-line)] p-3 lg:p-2.5 min-h-[220px] lg:min-h-[170px]">
              <div className="grid grid-cols-5 gap-2 text-[10px] font-bold text-[var(--print-fog)] mb-3">
                {['ABF2', 'HB6', 'NLP7', 'TGA1', 'MYBR1'].map((tf) => (
                  <div key={tf} className="flex justify-center">
                    <span className="px-2 py-1 rounded-full bg-black/10 border border-[var(--print-line)] text-slate-200">
                      {tf}
                    </span>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-5 gap-2">
                  {['#6c999c', '#2ca680', '#887eb6', '#56a98f', '#7a86b2'].map((color, idx) => (
                    <div key={idx} className="h-8 rounded-md border border-[var(--print-line)]" style={{ backgroundColor: color }}></div>
                  ))}
                </div>
                <div className="h-10 lg:h-8 rounded-xl bg-black/10 border border-[var(--print-line)] flex items-center px-2">
                  <div className="h-[10px] w-full rounded-lg bg-gradient-to-r from-[#887eb6] via-[#6c999c] to-[#2ca680]"></div>
                </div>
                <div className="flex items-center justify-between text-[9px] font-semibold text-[var(--print-fog)]">
                  <span>Low</span>
                  <span>Purple to green scale</span>
                  <span>High</span>
                </div>
              </div>
              <div className="mt-2 text-[10px] font-semibold text-slate-300 text-center">
                Water Deprivation Enrichment
              </div>
            </div>
            <p className="mt-3 lg:mt-2 text-xs leading-tight text-slate-300">
              Compare target enrichment across TFs.
            </p>
            <p className="mt-1 text-xs leading-tight text-[var(--print-fog)]">
              Example: enrichment in Water Deprivation vs Drought GO.
            </p>
          </div>
        </section>

        <footer className="pt-2 md:pt-3 border-t border-[var(--print-line)] flex flex-col items-center gap-1.5 text-xs text-[var(--print-fog)] shrink-0">
          <div className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href="https://pgrlab.cl"
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl px-4 py-2 flex items-center justify-center overflow-hidden transition-all hover:border-[var(--print-line-strong)] hover:bg-white/5 border border-[rgba(119,167,159,0.22)] bg-[linear-gradient(180deg,rgba(48,72,80,0.9),rgba(31,47,54,0.9))]"
            >
              <div className="h-12 w-36 md:h-14 md:w-40 flex items-center justify-center shrink-0">
                <img
                  src="/logos/Logo Lab (transparent bg).png"
                  alt="Plant Genome Regulation Lab"
                  className="max-h-full max-w-full object-contain opacity-90"
                />
              </div>
            </a>
            <a
              href="https://phytolearning.cl"
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl px-4 py-2 flex items-center justify-center overflow-hidden transition-all hover:border-[var(--print-line-strong)] hover:bg-white/5 border border-[rgba(119,167,159,0.28)] bg-[linear-gradient(180deg,rgba(78,112,121,0.9),rgba(55,81,89,0.9))]"
            >
              <div className="h-14 w-28 md:h-16 md:w-32 flex items-center justify-center shrink-0">
                <img
                  src="/logos/2025 - Logo PhytoLearning sin fondo (1).png"
                  alt="PhytoLearning"
                  className="h-full w-full object-contain opacity-90"
                />
              </div>
            </a>
          </div>
          <div className="text-center max-w-3xl leading-tight text-[10px] md:text-[11px]">
            This data integration was done with ConnecTF (M.D. Brooks, 2021). Developed by Gabriela
            Vásquez, Luciano Ahumada and Nicolás Müller. (Plant Genome Regulation Lab, UNAB).
          </div>
        </footer>
      </div>
    </div>
  );
}

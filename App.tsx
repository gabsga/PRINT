
import React, { useState, useMemo, useEffect } from 'react';
import { IntegratedInteraction, AnalysisResult, AppView, PathwayMapping, HubMapping, DatasetStats } from './types';
import StatsPanel from './components/StatsPanel';
import NetworkVisualization from './components/NetworkVisualization';
import EnrichmentPanel from './components/EnrichmentPanel';
import Landing from './components/Landing';
import { analyzeNetwork } from './services/geminiService';
import { fetchSupabaseExploreAll, fetchSupabaseExplorePage, loadIntegratedData } from './services/dataLoader';
import { PathwayData } from './services/pathwayLoader';


function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

const App: React.FC = () => {
  const [data, setData] = useState<IntegratedInteraction[]>([]);
  const [pathwayMapping, setPathwayMapping] = useState<PathwayMapping>({});
  const [goAnnotations, setGoAnnotations] = useState<Record<string, string[]>>({});
  const [hubMapping, setHubMapping] = useState<HubMapping>({});
  const [geneMapping, setGeneMapping] = useState<Record<string, string>>({});
  const [totalInteractions, setTotalInteractions] = useState(0);
  const [datasetStats, setDatasetStats] = useState<DatasetStats | undefined>(undefined);
  const [explorerRows, setExplorerRows] = useState<IntegratedInteraction[]>([]);
  const [explorerTotal, setExplorerTotal] = useState(0);
  const [explorerPage, setExplorerPage] = useState(1);
  const [explorerLoading, setExplorerLoading] = useState(false);
  const [exportingTSV, setExportingTSV] = useState(false);
  const [exportProgress, setExportProgress] = useState<string | null>(null);
  const explorerPageSize = 100;

  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState("Initializing PRINT...");

  const [activeView, setActiveView] = useState<AppView>('explorer');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AnalysisResult | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 350);
  const [minConfidence, setMinConfidence] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedPathway, setSelectedPathway] = useState<string>('all');
  const [selectedGoTerm, setSelectedGoTerm] = useState<string>('all');
  const [priorityTfFilter, setPriorityTfFilter] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<'symbol' | 'geneId'>('geneId');

  const [selectedSources, setSelectedSources] = useState<string[]>(['TARGET', 'DAP', 'CHIP']);
  const [graphScope, setGraphScope] = useState<'global' | 'direct' | 'cascade'>('global');
  const [pathwayData, setPathwayData] = useState<PathwayData | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showExplorerSummary, setShowExplorerSummary] = useState(false);
  const [showLanding, setShowLanding] = useState(true);

  const PRIORITY_GO_TERMS = [
    { id: 'all', label: 'Todos los Procesos' },
    { id: 'Water deprivation', label: 'Water Deprivation (GO:0009414)' },
    { id: 'Response to ABA', label: 'Response to ABA (GO:0009737)' },
    { id: 'ABA-activated signaling pathway', label: 'ABA Signaling (GO:0009738)' },
    { id: 'Response to osmotic stress', label: 'Osmotic Stress (GO:0006970)' },
    { id: 'Response to auxin', label: 'Auxin Response (GO:0009733)' }
  ];

  const PRIORITY_TFS = ['NLP7', 'TGA1', 'HB7', 'ABF2', 'GBF3', 'MYBR1']; // MYBR1 is MYB44

  // Load data only after the user leaves the landing screen.
  useEffect(() => {
    if (showLanding) return;

    const init = async () => {
      setLoading(true);
      try {
        const result = await loadIntegratedData((msg) => setLoadingMsg(msg));
        setData(result.interactions);
        setTotalInteractions(result.totalInteractions || result.interactions.length);
        setDatasetStats(result.stats);
        setPathwayMapping(result.pathwayMapping);
        setGoAnnotations(result.goAnnotations || {});
        setGeneMapping(result.geneMapping || {});
        // If hub mapping was loaded, we would set it here. For now empty.
        setHubMapping({});
      } catch (e) {
        console.error(e);
        setErrorMessage("Error crítico: No se pudieron cargar los datos regulatorios locales.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [showLanding]);

  const allPathways = useMemo(() => {
    const pSet = new Set<string>();
    (Object.values(pathwayMapping) as string[][]).forEach(p => p.forEach(v => pSet.add(v)));
    return Array.from(pSet).sort();
  }, [pathwayMapping]);

  const filteredData = useMemo(() => {
    const normalizedSearch = debouncedSearchTerm.trim().toUpperCase();
    const selectedGoGeneSet = selectedGoTerm === 'all'
      ? null
      : new Set((goAnnotations[selectedGoTerm] || []).map(g => g.toUpperCase()));

    let output = data.filter(i => {
      const matchesSearch = normalizedSearch === '' || [i.tf, i.target, i.tfId, i.targetId]
        .some(g => (g || '').toUpperCase().includes(normalizedSearch));
      const matchesConfidence = i.evidenceCount >= minConfidence;

      let matchesPathway = true;
      if (selectedPathway !== 'all') {
        const p1 = [
          ...(pathwayMapping[i.tf.toUpperCase()] || []),
          ...(pathwayMapping[(i.tfId || '').toUpperCase()] || [])
        ];
        const p2 = [
          ...(pathwayMapping[i.target.toUpperCase()] || []),
          ...(pathwayMapping[(i.targetId || '').toUpperCase()] || [])
        ];
        matchesPathway = p1.includes(selectedPathway) || p2.includes(selectedPathway);
      }

      let matchesGo = true;
      if (selectedGoGeneSet) {
        matchesGo = [i.tf, i.target, i.tfId, i.targetId].some(g => selectedGoGeneSet.has((g || '').toUpperCase()));
      }

      let matchesTf = true;
      if (priorityTfFilter) {
        matchesTf = i.tf.toUpperCase() === priorityTfFilter;
      }

      const matchesSource = i.sources.some(s => selectedSources.includes(s));

      return matchesSearch && matchesConfidence && matchesPathway && matchesGo && matchesTf && matchesSource;
    });

    // Stage 2: Scope Logic (Global vs Direct vs Cascade)
    if (graphScope === 'global') {
      if (priorityTfFilter) {
        output = output.filter(i => i.tf.toUpperCase() === priorityTfFilter);
      }
    } else {
      // Direct or Cascade requires a "Center"
      const center = priorityTfFilter || (output.some(i => i.tf.toUpperCase() === debouncedSearchTerm.toUpperCase()) ? debouncedSearchTerm.toUpperCase() : null);

      if (center) {
        if (graphScope === 'direct') {
          output = output.filter(i => i.tf.toUpperCase() === center);
        } else if (graphScope === 'cascade') {
          const level1 = output.filter(i => i.tf.toUpperCase() === center);
          const level1Targets = new Set(level1.map(i => i.target.toUpperCase()));
          const level2 = output.filter(i => level1Targets.has(i.tf.toUpperCase()));
          output = [...level1, ...level2];
          // Deduplicate
          output = Array.from(new Set(output));
        }
      }
    }

    return output;
  }, [data, debouncedSearchTerm, minConfidence, selectedPathway, pathwayMapping, selectedGoTerm, goAnnotations, priorityTfFilter, selectedSources, graphScope]);

  useEffect(() => {
    setExplorerPage(1);
  }, [debouncedSearchTerm, minConfidence, selectedSources.join('|'), priorityTfFilter]);

  useEffect(() => {
    if (showLanding || loading || activeView !== 'explorer') return;

    let cancelled = false;
    setExplorerLoading(true);

    fetchSupabaseExplorePage({
      searchTerm: debouncedSearchTerm,
      minConfidence,
      selectedSources,
      exactTF: priorityTfFilter,
      page: explorerPage,
      pageSize: explorerPageSize
    })
      .then((result) => {
        if (cancelled || !result) return;
        setExplorerRows(result.rows);
        setExplorerTotal(result.total);
      })
      .catch((error) => {
        console.warn('Remote explorer query unavailable, using local sample.', error);
        if (!cancelled) {
          setExplorerRows([]);
          setExplorerTotal(0);
        }
      })
      .finally(() => {
        if (!cancelled) setExplorerLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [showLanding, loading, activeView, debouncedSearchTerm, minConfidence, selectedSources.join('|'), priorityTfFilter, explorerPage]);

  const explorerDisplayRows = explorerRows.length > 0 ? explorerRows : filteredData.slice(0, explorerPageSize);
  const explorerDisplayTotal = explorerTotal || filteredData.length;
  const explorerTotalPages = Math.max(1, Math.ceil(explorerDisplayTotal / explorerPageSize));

  const handleDownloadTSV = () => {
    const run = async () => {
      setExportingTSV(true);
      setExportProgress('Preparing export...');

      try {
        const remoteRows = await fetchSupabaseExploreAll(
          {
            searchTerm: debouncedSearchTerm,
            minConfidence,
            selectedSources,
            exactTF: priorityTfFilter
          },
          (loaded, total) => {
            setExportProgress(`Preparing export... ${loaded.toLocaleString()} / ${total.toLocaleString()}`);
          }
        );

        const sourceRows = remoteRows && remoteRows.length > 0 ? remoteRows : explorerDisplayRows;
        const sanitizeTSVCell = (value: string | number) => String(value).replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
        const headers = ['TF', 'Target', 'Evidence_Sources', 'Direction', 'Evidence_Count', 'Processes'];
        const rows = sourceRows.map(row => {
          const tfVal = exportFormat === 'symbol' ? row.tf : (row.tfId || row.tf);
          const targetVal = exportFormat === 'symbol' ? row.target : (row.targetId || row.target);
          const processes = Array.from(new Set([
            ...(pathwayMapping[row.target.toUpperCase()] || []),
            ...(pathwayMapping[(row.targetId || '').toUpperCase()] || [])
          ])).join('|');

          return [
            sanitizeTSVCell(tfVal),
            sanitizeTSVCell(targetVal),
            sanitizeTSVCell(row.sources.join('|')),
            sanitizeTSVCell(row.direction),
            sanitizeTSVCell(row.evidenceCount),
            sanitizeTSVCell(processes)
          ].join('\t');
        });

        const blob = new Blob([headers.join('\t') + '\n' + rows.join('\n')], { type: 'text/tab-separated-values' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `genereg_export_${exportFormat}_${new Date().toISOString().split('T')[0]}.tsv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error(error);
        setErrorMessage('Error exporting filtered TSV from Supabase.');
      } finally {
        setExportingTSV(false);
        setExportProgress(null);
      }
    };

    void run();
  };

  const handleAiAnalysis = async () => {
    if (filteredData.length === 0) return;
    setIsAnalyzing(true);
    setActiveView('ai');
    try {
      const result = await analyzeNetwork(filteredData.slice(0, 50)); // Limit analysis to top 50 filtered
      setAiAnalysis(result);
    } catch (e) { setErrorMessage("Error en análisis AI"); }
    finally { setIsAnalyzing(false); }
  };

  if (showLanding) {
    return (
      <Landing
        onEnter={() => {
          setShowLanding(false);
          setActiveView('explorer');
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="print-shell h-screen w-full flex flex-col items-center justify-center text-white">
        <div className="relative mb-7 flex flex-col items-center">
          <div className="absolute inset-0 blur-3xl opacity-30 bg-[radial-gradient(circle,rgba(77,231,191,0.35)_0%,transparent_65%)]"></div>
          <img
            src="/logos/sinfondoprint.png"
            alt="PRINT logo"
            className="relative z-10 w-44 md:w-52 h-auto object-contain drop-shadow-[0_22px_50px_rgba(77,231,191,0.12)]"
          />
        </div>
        <p className="text-slate-300 mt-2 text-sm font-semibold text-center px-4">
          Plant Regulatory Information Network Tool
        </p>
        <p className="text-slate-400 mt-2 text-sm text-center px-4">
          PRINT your hypotheses into testable regulatory networks.
        </p>
        <div className="mt-6 w-56 max-w-[80vw]">
          <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/3 rounded-full bg-[linear-gradient(90deg,rgba(77,231,191,0.15),rgba(77,231,191,0.95),rgba(215,170,99,0.75))] animate-[pulse_1.8s_ease-in-out_infinite]"></div>
          </div>
        </div>
        <p className="text-[var(--print-fog)] mt-4 text-sm text-center px-4">{loadingMsg}</p>
      </div>
    );
  }

  return (
    <div className="print-shell print-grid flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      <div className={`fixed inset-0 bg-slate-950/70 z-20 transition-opacity md:hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsSidebarOpen(false)}></div>
      <aside className={`fixed md:static z-30 w-72 h-full print-panel border-r border-[var(--print-line)] text-slate-300 flex flex-col shrink-0 transition-transform md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-[var(--print-line)] flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <div className="print-logo-frame w-16 h-16 rounded-2xl flex items-center justify-center p-2">
              <img src="/logos/sinfondoprint.png" alt="PRINT logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight leading-tight">PRINT</h1>
              <p className="text-[10px] text-[var(--print-fog)] -mt-0.5">Plant Regulatory Information Network Tool</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white">✕</button>
        </div>

        <nav className="print-scrollbar flex-1 p-4 space-y-2 overflow-y-auto">
          <div className="mb-6 px-3 py-3 print-panel-soft rounded-xl">
            <div className="text-[10px] font-bold text-[var(--print-mint)] uppercase tracking-widest mb-2">Database</div>
            <div className="text-xs font-medium text-slate-300 flex justify-between">
              <span>Interactions:</span>
              <span className="text-[var(--print-mint)] font-bold">{totalInteractions || data.length}</span>
            </div>
            <div className="text-xs font-medium text-slate-300 flex justify-between mt-1">
              <span>Genes/Processes:</span>
              <span className="text-[var(--print-mint)] font-bold">{Object.keys(pathwayMapping).length}</span>
            </div>
          </div>

          <button onClick={() => setActiveView('explorer')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeView === 'explorer' ? 'print-button' : 'hover:bg-white/5 text-slate-400'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Explore Data
          </button>
          <button onClick={() => setActiveView('network')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeView === 'network' ? 'print-button' : 'hover:bg-white/5 text-slate-400'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Network View
          </button>

          <button onClick={() => setActiveView('enrichment')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeView === 'enrichment' ? 'print-button' : 'hover:bg-white/5 text-slate-400'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v18h18M7 13l3-3 4 4 5-6" />
            </svg>
            Enrichment
          </button>

        </nav>
        <div className="p-4 border-t border-[var(--print-line)]">
          <div className="grid grid-cols-2 gap-3">
            <a
              href="https://pgrlab.cl"
              target="_blank"
              rel="noreferrer"
              className="print-panel-soft rounded-2xl px-3 py-2 flex items-center justify-center overflow-hidden transition-all hover:border-[var(--print-line-strong)] hover:bg-white/5"
            >
              <div className="h-10 w-24 flex items-center justify-center shrink-0">
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
              className="rounded-2xl px-3 py-2 flex items-center justify-center overflow-hidden transition-all hover:border-[var(--print-line-strong)] hover:bg-white/5 border border-[rgba(119,167,159,0.28)] bg-[linear-gradient(180deg,rgba(78,112,121,0.9),rgba(55,81,89,0.9))]"
            >
              <div className="h-10 w-24 flex items-center justify-center shrink-0">
                <img
                  src="/logos/2025 - Logo PhytoLearning sin fondo (1).png"
                  alt="PhytoLearning"
                  className="max-h-full max-w-full object-contain opacity-95"
                />
              </div>
            </a>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-black/10">
        <header className="h-20 print-panel-soft border-b border-[var(--print-line)] flex items-center justify-between px-4 md:px-8 shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden px-3 py-2 rounded-lg bg-black/10 border border-[var(--print-line)] text-slate-200">☰</button>
            <div className="flex flex-col gap-1 items-start">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-bold text-[var(--print-mint)]">Regulatory Dashboard</h2>
              </div>

            </div>
          </div>

        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {errorMessage && <div className="mb-6 p-4 bg-red-900/20 text-red-400 text-sm font-bold rounded-2xl border border-red-800 flex justify-between items-center backdrop-blur-sm"><span>{errorMessage}</span><button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-300">✕</button></div>}

          {activeView === 'explorer' ? (
            <div className="animate-in fade-in duration-500 space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowExplorerSummary(v => !v)}
                  className="px-4 py-2 bg-black/10 border border-[var(--print-line)] text-slate-300 rounded-xl text-xs font-bold hover:border-[var(--print-line-strong)] hover:text-[var(--print-mint)] transition-all"
                >
                  {showExplorerSummary ? 'Hide Summary' : 'Show Summary'}
                </button>
              </div>
              {showExplorerSummary && <StatsPanel data={filteredData} totalInteractions={totalInteractions} stats={datasetStats} />}
              <div className="print-panel rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-[var(--print-line)] bg-black/10">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="w-full lg:max-w-xl">
                      <input
                        type="text"
                        placeholder="Search by Gene ID (AGI) or Gene Symbol..."
                        className="w-full pl-4 pr-4 py-2.5 bg-black/10 border border-[var(--print-line)] rounded-2xl text-sm outline-none shadow-sm focus:ring-2 focus:ring-[var(--print-mint)] text-slate-200 placeholder-slate-500"
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setPriorityTfFilter(null);
                        }}
                      />
                      <p className="mt-2 text-[11px] text-[var(--print-fog)]">
                        Search supports Gene ID (AGI; e.g. AT1G01010) and Gene Symbol (e.g. ABI5).
                      </p>
                      <p className="mt-3 text-[11px] text-[var(--print-fog)]">
                        Tambien puedes hacer una busqueda rapida usando genes de interes frecuente:
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {PRIORITY_TFS.map(gene => {
                          const isActive = priorityTfFilter === gene;
                          return (
                            <button
                              key={gene}
                              onClick={() => {
                                setPriorityTfFilter(isActive ? null : gene);
                                setSearchTerm(isActive ? '' : gene);
                              }}
                              className={`px-3 py-1 rounded-md text-[11px] font-bold border transition-all ${isActive ? 'print-button border-transparent' : 'bg-black/10 text-slate-300 border-[var(--print-line)] hover:border-[var(--print-line-strong)]'}`}
                            >
                              {gene}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-black/10 rounded-lg p-1 border border-[var(--print-line)]">
                        <button onClick={() => setExportFormat('geneId')} className={`px-2 py-1 text-[10px] font-bold rounded ${exportFormat === 'geneId' ? 'print-button' : 'text-slate-400 hover:text-slate-300'}`}>ID</button>
                        <button onClick={() => setExportFormat('symbol')} className={`px-2 py-1 text-[10px] font-bold rounded ${exportFormat === 'symbol' ? 'print-button' : 'text-slate-400 hover:text-slate-300'}`}>Symbol</button>
                      </div>
                      <button onClick={handleDownloadTSV} disabled={explorerDisplayRows.length === 0 || exportingTSV} className="px-4 py-2 bg-[rgba(77,231,191,0.08)] text-[var(--print-mint)] border border-[rgba(77,231,191,0.22)] rounded-xl text-xs font-black hover:bg-[rgba(77,231,191,0.14)] disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-widest flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>
                        {exportingTSV ? 'EXPORTING' : 'TSV'}
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 text-xs font-bold text-[var(--print-mint)]">
                    {explorerLoading ? 'Loading page...' : `${explorerDisplayTotal} interactions found`}
                  </div>
                  {exportProgress && (
                    <div className="mt-2 text-[11px] text-[var(--print-fog)]">{exportProgress}</div>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-black/10 text-[10px] text-[var(--print-mint)] font-bold uppercase tracking-widest border-b border-[var(--print-line)]">
                      <tr>
                        <th className="px-6 py-4">Regulator (TF)</th>
                        <th className="px-6 py-4">Target Gene</th>
                        <th className="px-6 py-4">Evidence</th>
                        <th className="px-6 py-4">Direction</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--print-line)]">
                      {explorerDisplayRows.map((row, idx) => {
                        const isHub = !!hubMapping[row.target];

                        return (
                          <tr key={idx} className="hover:bg-white/5 transition-colors group">
                            <td className="px-6 py-4 text-xs font-black text-[var(--print-mint-soft)]">{row.tf}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold ${isHub ? 'text-[#d7aa63]' : 'text-slate-300'}`}>{row.target}</span>
                                {isHub && <span className="text-[8px] bg-[rgba(215,170,99,0.15)] text-[#d7aa63] px-1.5 py-0.5 rounded-full font-black border border-[rgba(215,170,99,0.28)]">HUB</span>}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-1">
                                {row.sources.map(s => (
                                  <span key={s} className={`text-[9px] px-1.5 py-0.5 rounded-full font-black text-[var(--print-ink)] ${s === 'TARGET' ? 'bg-[var(--print-mint)]' : s === 'DAP' ? 'bg-[#d7aa63]' : 'bg-[#69d7cf]'}`}>{s}</span>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-tight ${row.direction === 'activation' ? 'bg-[rgba(77,231,191,0.12)] text-[var(--print-mint)] border border-[rgba(77,231,191,0.26)]' : row.direction === 'repression' ? 'bg-[rgba(217,119,119,0.14)] text-[#d97777] border border-[rgba(217,119,119,0.28)]' : 'bg-white/5 text-slate-400 border border-[var(--print-line)]'}`}>{row.direction}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="p-4 text-center text-xs text-[var(--print-fog)] font-medium border-t border-[var(--print-line)] flex items-center justify-center gap-4">
                    <button
                      onClick={() => setExplorerPage((page) => Math.max(1, page - 1))}
                      disabled={explorerPage <= 1 || explorerLoading}
                      className="px-3 py-1 rounded-lg border border-[var(--print-line)] disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <span>Page {explorerPage} / {explorerTotalPages}</span>
                    <button
                      onClick={() => setExplorerPage((page) => Math.min(explorerTotalPages, page + 1))}
                      disabled={explorerPage >= explorerTotalPages || explorerLoading}
                      className="px-3 py-1 rounded-lg border border-[var(--print-line)] disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : activeView === 'network' ? (
            <NetworkVisualization
              data={filteredData}
              pathwayMapping={pathwayMapping}
              pathwayData={pathwayData}
              geneMapping={geneMapping}
              onPathwayChange={setPathwayData}
            />
          ) : activeView === 'enrichment' ? (
            <EnrichmentPanel
              data={data}
              selectedSources={selectedSources}
              minConfidence={minConfidence}
              goAnnotations={goAnnotations}
            />
          ) : (
            <div className="bg-white p-12 rounded-[48px] border border-slate-100 shadow-2xl max-w-4xl mx-auto mt-10 animate-in zoom-in-95 duration-500">
              <h3 className="text-3xl font-black mb-8 text-slate-900 tracking-tight">Interpretación Funcional (AI)</h3>
              {aiAnalysis ? (
                <div className="space-y-10">
                  <p className="text-xl text-slate-600 italic border-l-8 border-indigo-500 pl-8 font-medium leading-relaxed">{aiAnalysis.summary}</p>
                  <div className="grid md:grid-cols-2 gap-8">
                    {aiAnalysis.insights.map((ins, i) => (
                      <div key={i} className="p-8 bg-slate-50 rounded-3xl border border-slate-100 hover:border-indigo-200 hover:bg-white transition-all hover:shadow-xl">
                        <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-black mb-4">0{i + 1}</div>
                        <p className="text-base font-bold text-slate-800 leading-relaxed">{ins}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 text-slate-400 font-bold text-lg">
                  <div className="animate-pulse mb-4">🤖</div>
                  Generando insights biológicos sobre la red filtrada...
                </div>
              )}
            </div>
          )
          }
          <div className="mt-10 pt-6 border-t border-[var(--print-line)] text-center text-[11px] text-[var(--print-fog)] max-w-4xl mx-auto">
            This data integration was done with ConnecTF (M.D. Brooks, 2021). Developed by Gabriela
            Vásquez, Luciano Ahumada and Nicolás Müller. (Plant Genome Regulation Lab, UNAB).
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;

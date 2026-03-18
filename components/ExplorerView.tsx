import React, { Suspense } from 'react';
import { DatasetStats, IntegratedInteraction, HubMapping } from '../types';

const StatsPanel = React.lazy(() => import('./StatsPanel'));

const PRIORITY_TFS = ['NLP7', 'TGA1', 'HB7', 'ABF2', 'GBF3', 'MYBR1'];

interface ExplorerViewProps {
  data: IntegratedInteraction[];
  datasetStats?: DatasetStats;
  errorMessage: string | null;
  explorerLoading: boolean;
  exportFormat: 'symbol' | 'geneId';
  exportProgress: string | null;
  exportingTSV: boolean;
  explorerPage: number;
  explorerTotalPages: number;
  explorerDisplayRows: IntegratedInteraction[];
  explorerDisplayTotal: number;
  hubMapping: HubMapping;
  onClearError: () => void;
  onDownloadTSV: () => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  onSearchTermChange: (value: string) => void;
  onSetExportFormat: (format: 'symbol' | 'geneId') => void;
  onTogglePriorityTf: (gene: string) => void;
  onToggleSummary: () => void;
  priorityTfFilter: string | null;
  searchTerm: string;
  showExplorerSummary: boolean;
  totalInteractions: number;
}

function SummaryFallback() {
  return (
    <div className="print-panel p-6 rounded-3xl text-sm text-[var(--print-fog)]">
      Loading summary...
    </div>
  );
}

export default function ExplorerView({
  data,
  datasetStats,
  errorMessage,
  explorerLoading,
  exportFormat,
  exportProgress,
  exportingTSV,
  explorerPage,
  explorerTotalPages,
  explorerDisplayRows,
  explorerDisplayTotal,
  hubMapping,
  onClearError,
  onDownloadTSV,
  onNextPage,
  onPrevPage,
  onSearchTermChange,
  onSetExportFormat,
  onTogglePriorityTf,
  onToggleSummary,
  priorityTfFilter,
  searchTerm,
  showExplorerSummary,
  totalInteractions
}: ExplorerViewProps) {
  return (
    <div className="animate-in fade-in duration-500 space-y-4">
      {errorMessage && (
        <div className="mb-6 p-4 bg-red-900/20 text-red-400 text-sm font-bold rounded-2xl border border-red-800 flex justify-between items-center backdrop-blur-sm">
          <span>{errorMessage}</span>
          <button onClick={onClearError} className="text-red-400 hover:text-red-300">✕</button>
        </div>
      )}

      <div className="flex justify-end gap-3 flex-wrap">
        <button
          onClick={onToggleSummary}
          className="px-4 py-2 bg-black/10 border border-[var(--print-line)] text-slate-300 rounded-xl text-xs font-bold hover:border-[var(--print-line-strong)] hover:text-[var(--print-mint)] transition-all"
        >
          {showExplorerSummary ? 'Hide Stats' : 'Show Stats'}
        </button>
      </div>

      {showExplorerSummary && (
        <Suspense fallback={<SummaryFallback />}>
          <StatsPanel data={data} totalInteractions={totalInteractions} stats={datasetStats} />
        </Suspense>
      )}

      <div className="print-panel rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-[var(--print-line)] bg-black/10">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="w-full lg:max-w-xl">
              <input
                type="text"
                placeholder="Search by Gene ID (AGI) or Gene Symbol..."
                className="w-full pl-4 pr-4 py-2.5 bg-black/10 border border-[var(--print-line)] rounded-2xl text-sm outline-none shadow-sm focus:ring-2 focus:ring-[var(--print-mint)] text-slate-200 placeholder-slate-500"
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)}
              />
              <p className="mt-2 text-[11px] text-[var(--print-fog)]">
                Search supports Gene ID (AGI; e.g. AT1G01010) and Gene Symbol (e.g. ABI5).
              </p>
              <p className="mt-3 text-[11px] text-[var(--print-fog)]">
                Tambien puedes hacer una busqueda rapida usando genes de interes frecuente:
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {PRIORITY_TFS.map((gene) => {
                  const isActive = priorityTfFilter === gene;
                  return (
                    <button
                      key={gene}
                      onClick={() => onTogglePriorityTf(gene)}
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
                <button onClick={() => onSetExportFormat('geneId')} className={`px-2 py-1 text-[10px] font-bold rounded ${exportFormat === 'geneId' ? 'print-button' : 'text-slate-400 hover:text-slate-300'}`}>ID</button>
                <button onClick={() => onSetExportFormat('symbol')} className={`px-2 py-1 text-[10px] font-bold rounded ${exportFormat === 'symbol' ? 'print-button' : 'text-slate-400 hover:text-slate-300'}`}>Symbol</button>
              </div>
              <button onClick={onDownloadTSV} disabled={explorerDisplayRows.length === 0 || exportingTSV} className="px-4 py-2 bg-[rgba(77,231,191,0.08)] text-[var(--print-mint)] border border-[rgba(77,231,191,0.22)] rounded-xl text-xs font-black hover:bg-[rgba(77,231,191,0.14)] disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-widest flex items-center gap-2">
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
                        {row.sources.map((s) => (
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
              onClick={onPrevPage}
              disabled={explorerPage <= 1 || explorerLoading}
              className="px-3 py-1 rounded-lg border border-[var(--print-line)] disabled:opacity-40"
            >
              Prev
            </button>
            <span>Page {explorerPage} / {explorerTotalPages}</span>
            <button
              onClick={onNextPage}
              disabled={explorerPage >= explorerTotalPages || explorerLoading}
              className="px-3 py-1 rounded-lg border border-[var(--print-line)] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <div className="mt-10 pt-6 border-t border-[var(--print-line)] text-center text-[11px] text-[var(--print-fog)] max-w-4xl mx-auto">
        This data integration was done with ConnecTF (M.D. Brooks, 2021). Developed by Gabriela
        Vásquez, Luciano Ahumada and Nicolás Müller. (Plant Genome Regulation Lab, UNAB).
      </div>
    </div>
  );
}

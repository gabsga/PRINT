import React, { useEffect, useMemo, useState } from 'react';
import { IntegratedInteraction } from '../types';
import { computeEnrichment, EnrichmentResult } from '../services/enrichment';
import { fetchSupabaseTfTargetSets } from '../services/dataLoader';

interface EnrichmentPanelProps {
  data: IntegratedInteraction[];
  selectedSources: string[];
  minConfidence: number;
  goAnnotations: Record<string, string[]>;
}

const GENE_UNIVERSE_URL = '/data/araport11_genes.tsv';
const SIGNIFICANCE_FDR = 0.05;

const GO_TERMS = [
  { id: 'Water deprivation', label: 'Water deprivation (GO:0009414)' },
  { id: 'Response to ABA', label: 'Response to abscisic acid (GO:0009737)' },
  { id: 'Salt stress', label: 'Salt stress (GO:0009651)' },
  { id: 'Osmotic stress', label: 'Osmotic stress (GO:0006970)' },
  { id: 'Response to auxin', label: 'Response to auxin (GO:0009733)' },
  { id: 'Response to nitrate', label: 'Response to nitrate (GO:0010167)' }
];

const DEFAULT_GO = ['Water deprivation', 'Response to ABA'];

export default function EnrichmentPanel({ data, selectedSources, minConfidence, goAnnotations }: EnrichmentPanelProps) {
  const [results, setResults] = useState<EnrichmentResult[]>([]);
  const [termGeneCount, setTermGeneCount] = useState(0);
  const [evidenceThreshold, setEvidenceThreshold] = useState(minConfidence);
  const [viewMode, setViewMode] = useState<'table' | 'heatmap'>('table');
  const [activeTerm, setActiveTerm] = useState<string>('');
  const [selectedTerms, setSelectedTerms] = useState<string[]>([]);

  const [universe, setUniverse] = useState<Set<string> | null>(null);
  const [universeError, setUniverseError] = useState<string | null>(null);
  const [loadingUniverse, setLoadingUniverse] = useState(false);
  const [remoteTfTargets, setRemoteTfTargets] = useState<Map<string, Set<string>> | null>(null);
  const [loadingRemoteTfTargets, setLoadingRemoteTfTargets] = useState(false);

  const availableTerms = useMemo(() => {
    return GO_TERMS.map((term) => ({
      ...term,
      available: Array.isArray(goAnnotations[term.id]) && goAnnotations[term.id].length > 0
    }));
  }, [goAnnotations]);

  useEffect(() => {
    const availableIds = availableTerms.filter((t) => t.available).map((t) => t.id);
    if (!availableIds.length) {
      setSelectedTerms([]);
      setActiveTerm('');
      return;
    }

    const defaultTerms = DEFAULT_GO.filter((t) => availableIds.includes(t));
    const fallbackTerms = defaultTerms.length ? defaultTerms : availableIds.slice(0, 2);

    setSelectedTerms((prev) => {
      if (prev.length === 0) return fallbackTerms;
      const filtered = prev.filter((t) => availableIds.includes(t));
      return filtered.length ? filtered : fallbackTerms;
    });

    setActiveTerm((prev) => (prev && availableIds.includes(prev) ? prev : availableIds[0]));
  }, [availableTerms]);

  useEffect(() => {
    const loadUniverse = async () => {
      setLoadingUniverse(true);
      setUniverseError(null);
      try {
        const res = await fetch(GENE_UNIVERSE_URL);
        if (!res.ok) throw new Error('No se pudo cargar el universo de Araport11');
        const text = await res.text();
        const genes = text
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .map((line) => line.toUpperCase());
        setUniverse(new Set(genes));
      } catch (err) {
        setUniverse(null);
        setUniverseError('Falta el archivo de Araport11. Agrega /public/data/araport11_genes.tsv (una columna con IDs AT...).');
      } finally {
        setLoadingUniverse(false);
      }
    };
    loadUniverse();
  }, []);

  const tfTargets = useMemo(() => {
    if (remoteTfTargets && remoteTfTargets.size > 0) {
      return remoteTfTargets;
    }
    const map = new Map<string, Set<string>>();
    data.forEach((i) => {
      if (i.evidenceCount < evidenceThreshold) return;
      if (!i.sources.some((s) => selectedSources.includes(s))) return;
      const tf = i.tf;
      const targetId = (i.targetId || i.target || '').toUpperCase();
      if (!targetId) return;
      const entry = map.get(tf) || new Set<string>();
      entry.add(targetId);
      map.set(tf, entry);
    });
    return map;
  }, [data, evidenceThreshold, selectedSources, remoteTfTargets]);

  useEffect(() => {
    let cancelled = false;
    setLoadingRemoteTfTargets(true);

    fetchSupabaseTfTargetSets({
      minConfidence: evidenceThreshold,
      selectedSources
    })
      .then((result) => {
        if (!cancelled) {
          setRemoteTfTargets(result);
        }
      })
      .catch((error) => {
        console.warn('Remote enrichment source unavailable, using local sample.', error);
        if (!cancelled) {
          setRemoteTfTargets(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingRemoteTfTargets(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [evidenceThreshold, selectedSources.join('|')]);

  const termGenes = useMemo(() => {
    const map = new Map<string, Set<string>>();
    availableTerms.forEach((term) => {
      const genes = new Set<string>();
      (goAnnotations[term.id] || []).forEach((g) => genes.add(g.toUpperCase()));
      map.set(term.id, genes);
    });
    return map;
  }, [availableTerms, goAnnotations]);

  const resultsByTerm = useMemo(() => {
    if (!universe) return new Map<string, EnrichmentResult[]>();
    const map = new Map<string, EnrichmentResult[]>();
    const terms = new Set([activeTerm, ...selectedTerms].filter(Boolean));
    terms.forEach((termId) => {
      const genes = termGenes.get(termId) || new Set<string>();
      const enriched = computeEnrichment(tfTargets, genes, universe);
      map.set(termId, enriched);
    });
    return map;
  }, [activeTerm, selectedTerms, termGenes, tfTargets, universe]);

  useEffect(() => {
    if (!activeTerm || !universe) {
      setResults([]);
      setTermGeneCount(0);
      return;
    }

    const genes = termGenes.get(activeTerm) || new Set<string>();
    setTermGeneCount(genes.size);
    setResults(resultsByTerm.get(activeTerm) || []);
  }, [activeTerm, universe, termGenes, resultsByTerm]);

  const universeSize = universe?.size || 0;

  const byTermByTf = useMemo(() => {
    const map = new Map<string, Map<string, EnrichmentResult>>();
    resultsByTerm.forEach((rows, termId) => {
      const tfMap = new Map<string, EnrichmentResult>();
      rows.forEach((r) => tfMap.set(r.tf, r));
      map.set(termId, tfMap);
    });
    return map;
  }, [resultsByTerm]);

  const heatmapTerms = selectedTerms.filter((t) => byTermByTf.has(t));
  const heatmapRows = useMemo(() => {
    const tfs = Array.from(tfTargets.keys());
    const scored = tfs.map((tf) => {
      let best = 1;
      heatmapTerms.forEach((term) => {
        const r = byTermByTf.get(term)?.get(tf);
        if (r && r.fdr < best) best = r.fdr;
      });
      return { tf, best };
    });
    return scored.sort((a, b) => a.best - b.best).slice(0, 30).map((s) => s.tf);
  }, [tfTargets, byTermByTf, heatmapTerms]);

  const heatmapRange = useMemo(() => {
    let min = 0;
    let max = 0;
    heatmapTerms.forEach((term) => {
      const tfMap = byTermByTf.get(term);
      if (!tfMap) return;
      heatmapRows.forEach((tf) => {
        const r = tfMap.get(tf);
        if (!r) return;
        const orValue = r.oddsRatio;
        if (!Number.isFinite(orValue) || orValue <= 0) return;
        const log2 = Math.log2(orValue);
        if (log2 < min) min = log2;
        if (log2 > max) max = log2;
      });
    });
    if (min === max) {
      min -= 1;
      max += 1;
    }
    return { min, max };
  }, [heatmapRows, heatmapTerms, byTermByTf]);

  const heatmapColor = (value: number) => {
    const { min, max } = heatmapRange;
    const t = (value - min) / (max - min);
    const clamped = Math.max(0, Math.min(1, t));
    const left = [136, 126, 182];
    const middle = [108, 154, 156];
    const right = [44, 166, 128];
    const localT = clamped < 0.5 ? clamped / 0.5 : (clamped - 0.5) / 0.5;
    const from = clamped < 0.5 ? left : middle;
    const to = clamped < 0.5 ? middle : right;
    const r = Math.round(from[0] + (to[0] - from[0]) * localT);
    const g = Math.round(from[1] + (to[1] - from[1]) * localT);
    const b = Math.round(from[2] + (to[2] - from[2]) * localT);
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div className="space-y-6">
      <div className="print-panel p-6 rounded-3xl">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-xl font-black text-[var(--print-mint)]">Enrichment (GO + Fisher)</h3>
            <p className="text-xs text-[var(--print-fog)] mt-1">Universo: Araport11 (IDs AT). TFs se evalúan por targets con evidencia ≥ {evidenceThreshold}.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-black/10 rounded-lg p-1 border border-[var(--print-line)]">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 text-[10px] font-bold rounded ${viewMode === 'table' ? 'print-button' : 'text-slate-400 hover:text-slate-300'}`}
              >
                Tabla
              </button>
              <button
                onClick={() => setViewMode('heatmap')}
                className={`px-3 py-1 text-[10px] font-bold rounded ${viewMode === 'heatmap' ? 'print-button' : 'text-slate-400 hover:text-slate-300'}`}
              >
                Heatmap
              </button>
            </div>

            <select
              value={evidenceThreshold}
              onChange={(e) => setEvidenceThreshold(Number(e.target.value))}
              className="px-3 py-2 bg-black/10 border border-[var(--print-line)] rounded-xl text-xs font-bold text-[#69d7cf] outline-none focus:ring-2 focus:ring-[#69d7cf]"
              title="Evidencia mínima"
            >
              <option value={1}>≥1 evidencia</option>
              <option value={2}>≥2 evidencia</option>
              <option value={3}>3 evidencias</option>
            </select>

            {viewMode === 'table' && (
              <select
                value={activeTerm}
                onChange={(e) => setActiveTerm(e.target.value)}
                className="px-4 py-2 bg-black/10 border border-[var(--print-line)] rounded-xl text-sm font-bold text-[var(--print-mint)] outline-none focus:ring-2 focus:ring-[var(--print-mint)]"
              >
                {availableTerms.map((term) => (
                  <option key={term.id} value={term.id} disabled={!term.available}>
                    {term.label}{term.available ? '' : ' (sin datos)'}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="mt-4 text-xs text-[var(--print-fog)] flex flex-wrap gap-4">
          <div>Universe: <span className="text-[var(--print-mint-soft)] font-bold">{loadingUniverse ? 'cargando...' : universeSize.toLocaleString()}</span></div>
          <div>GO genes: <span className="text-[#69d7cf] font-bold">{termGeneCount.toLocaleString()}</span></div>
          <div>TFs evaluados: <span className="text-[#efc98e] font-bold">{loadingRemoteTfTargets ? 'cargando...' : tfTargets.size.toLocaleString()}</span></div>
          <div className="mt-2 text-[10px] text-[var(--print-fog)]">Fuente GO: TAIR (ATH_GO_GOSLIM.txt) obtenido el 03-02-2026.</div>
</div>

        {viewMode === 'heatmap' && (
          <div className="mt-4 flex flex-wrap gap-2">
            {availableTerms.map((term) => (
              <button
                key={term.id}
                disabled={!term.available}
                onClick={() => {
                  setSelectedTerms((prev) => {
                    const exists = prev.includes(term.id);
                    if (exists) {
                      const next = prev.filter((t) => t !== term.id);
                      return next.length ? next : prev;
                    }
                    return [...prev, term.id];
                  });
                }}
                className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${selectedTerms.includes(term.id) ? 'bg-[rgba(77,231,191,0.12)] text-[var(--print-mint-soft)] border-[rgba(77,231,191,0.28)]' : 'bg-black/10 text-slate-400 border-[var(--print-line)]'} ${!term.available ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                {term.label}
              </button>
            ))}
          </div>
        )}

        {universeError && (
          <div className="mt-4 p-4 bg-red-900/20 text-red-400 text-xs font-bold rounded-2xl border border-red-800">
            {universeError}
          </div>
        )}
      </div>

      <div className="print-panel rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-[var(--print-line)] bg-black/10 flex items-center justify-between">
          <h4 className="text-sm font-black text-[var(--print-mint)] uppercase tracking-widest">Top TFs</h4>
          <div className="text-xs text-[var(--print-fog)]">Ordenado por p-valor (Fisher, cola derecha)</div>
        </div>

        {results.length === 0 ? (
          <div className="p-8 text-center text-[var(--print-fog)] text-sm">Selecciona un término GO con datos para ver resultados.</div>
        ) : viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-black/10 text-[10px] text-[var(--print-mint)] font-bold uppercase tracking-widest border-b border-[var(--print-line)]">
                <tr>
                  <th className="px-6 py-4">TF</th>
                  <th className="px-6 py-4">Overlap</th>
                  <th className="px-6 py-4">Targets TF</th>
                  <th className="px-6 py-4">Genes GO</th>
                  <th className="px-6 py-4">Odds</th>
                  <th className="px-6 py-4">P</th>
                  <th className="px-6 py-4">FDR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--print-line)]">
                {results.slice(0, 50).map((row) => (
                  <tr key={row.tf} className={`hover:bg-white/5 transition-colors ${row.fdr > SIGNIFICANCE_FDR ? 'text-red-300' : ''}`}>
                    <td className={`px-6 py-4 text-xs font-black ${row.fdr > SIGNIFICANCE_FDR ? 'text-red-300' : 'text-[var(--print-mint-soft)]'}`}>{row.tf}</td>
                    <td className="px-6 py-4 text-xs text-slate-300">{row.overlap}</td>
                    <td className="px-6 py-4 text-xs text-slate-300">{row.tfTargets}</td>
                    <td className="px-6 py-4 text-xs text-slate-300">{row.pathwayGenes}</td>
                    <td className="px-6 py-4 text-xs text-slate-300">{Number.isFinite(row.oddsRatio) ? row.oddsRatio.toFixed(2) : 'inf'}</td>
                    <td className="px-6 py-4 text-xs text-slate-300">{row.pValue.toExponential(2)}</td>
                    <td className="px-6 py-4 text-xs text-slate-300">{row.fdr.toExponential(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {results.length > 50 && (
              <div className="p-4 text-center text-xs text-[var(--print-fog)] font-medium border-t border-[var(--print-line)]">
                Mostrando 50 de {results.length}
              </div>
            )}
          </div>
        ) : (
          <div className="p-6">
            <div className="grid gap-2" style={{ gridTemplateColumns: `200px repeat(${heatmapTerms.length}, 90px)` }}>
              <div></div>
              {heatmapTerms.map((term) => (
                <div key={term} className="text-[10px] uppercase tracking-widest text-[var(--print-fog)] font-bold text-center">
                  {term}
                </div>
              ))}
              {heatmapRows.map((tf) => (
                <React.Fragment key={tf}>
                  <div className="text-xs font-bold pr-3 truncate text-[var(--print-mint-soft)]" title={tf}>{tf}</div>
                  {heatmapTerms.map((term) => {
                    const row = byTermByTf.get(term)?.get(tf);
                    if (!row || !Number.isFinite(row.oddsRatio) || row.oddsRatio <= 0) {
                      return (
                          <div key={term} className="h-12 w-[90px] rounded-md bg-black/10 border border-[var(--print-line)]" />
                      );
                    }
                    const log2 = Math.log2(row.oddsRatio);
                    const logp = -Math.log10(Math.max(row.pValue, 1e-12));
                    return (
                      <div
                        key={term}
                        className="h-12 w-[90px] rounded-md flex flex-col items-center justify-center text-[10px] font-bold text-slate-900 shadow-inner border border-slate-800"
                        style={{ background: heatmapColor(log2) }}
                        title={`log2(OR): ${log2.toFixed(2)} | -log10(p): ${logp.toFixed(2)} | overlap: ${row.overlap}`}
                      >
                        <div>{log2.toFixed(1)}</div>
                        <div className="text-[9px]">{logp.toFixed(1)}</div>
                        <div className="text-[9px]">({row.overlap})</div>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-3 text-xs text-[var(--print-fog)]">
              <div className="h-3 w-40 rounded" style={{ background: `linear-gradient(90deg, ${heatmapColor(heatmapRange.min)} 0%, ${heatmapColor((heatmapRange.min + heatmapRange.max) / 2)} 50%, ${heatmapColor(heatmapRange.max)} 100%)` }}></div>
              <span>log2(odds-ratio): {heatmapRange.min.toFixed(1)} → {heatmapRange.max.toFixed(1)}</span>
            </div>

            {results.length > heatmapRows.length && (
              <div className="pt-4 text-center text-xs text-[var(--print-fog)] font-medium border-t border-[var(--print-line)] mt-4">
                Mostrando {heatmapRows.length} de {results.length}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-[var(--print-line)]">
              <h5 className="text-sm font-black text-[var(--print-mint)]">What does it mean?</h5>
              <div className="mt-3 print-panel-soft rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-4">
                <div
                  className="h-16 w-24 rounded-md flex flex-col items-center justify-center text-[10px] font-bold text-slate-900 shadow-inner border border-slate-800 shrink-0"
                  style={{ background: heatmapColor((heatmapRange.min + heatmapRange.max) / 2) }}
                >
                  <div>1.4</div>
                  <div className="text-[9px]">3.2</div>
                  <div className="text-[9px]">(18)</div>
                </div>
                <div className="text-xs text-slate-300 leading-relaxed">
                  <div><span className="text-[var(--print-mint-soft)] font-bold">Top number:</span> `log2(OR)`; higher means stronger enrichment for that TF-term pair.</div>
                  <div><span className="text-[var(--print-mint-soft)] font-bold">Middle number:</span> `-log10(p)`; higher means stronger statistical support.</div>
                  <div><span className="text-[var(--print-mint-soft)] font-bold">Bottom number:</span> overlap; the number of shared genes between TF targets and the selected GO term.</div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[var(--print-line)]">
              <h5 className="text-sm font-black text-[var(--print-mint)]">How was this computed?</h5>
              <div className="mt-3 print-panel-soft rounded-2xl p-4 text-xs text-slate-300 leading-relaxed">
                For each transcription factor, the app collects its target genes after applying the selected evidence filters. That target set is then compared against the genes annotated for each biological process using a one-sided Fisher exact test, with the Araport11 gene set as background universe. The heatmap summarizes three values per TF-process pair: enrichment strength as `log2(odds ratio)`, statistical support as `-log10(p-value)`, and the observed gene overlap.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

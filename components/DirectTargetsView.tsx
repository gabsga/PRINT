import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { IntegratedInteraction, PathwayMapping } from '../types';

interface DirectTargetsViewProps {
    data: IntegratedInteraction[];
    pathwayMapping: PathwayMapping;
    selectedTF: string;
    onTFChange: (tf: string) => void;
    tfOptions?: string[];
}

export default function DirectTargetsView({ data, pathwayMapping, selectedTF, onTFChange, tfOptions }: DirectTargetsViewProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [minEvidence, setMinEvidence] = useState(1);
    const [showLabels, setShowLabels] = useState(true);
    const [selectedSources, setSelectedSources] = useState<string[]>(['TARGET', 'DAP', 'CHIP']);
    const [sourceFilterMode, setSourceFilterMode] = useState<'OR' | 'AND'>('OR');

    // Get unique TFs for selector
    const availableTFs = useMemo(() => {
        if (tfOptions && tfOptions.length > 0) return tfOptions;
        return Array.from(new Set(data.map(d => d.tf))).sort();
    }, [data, tfOptions]);

    // Filter targets by selected TF, evidence level, and sources
    const targets = useMemo(() => {
        return data
            .filter(d => {
                const matchesTF = d.tf === selectedTF;
                const matchesEvidence = d.evidenceCount >= minEvidence;

                let matchesSource = false;
                if (sourceFilterMode === 'OR') {
                    matchesSource = d.sources.some(s => selectedSources.includes(s));
                } else {
                    matchesSource = selectedSources.every(s => d.sources.includes(s));
                }

                return matchesTF && matchesEvidence && matchesSource;
            })
            .map(d => ({
                target: d.target,
                evidence: d.evidenceCount,
                direction: d.direction,
                sources: d.sources
            }));
    }, [data, selectedTF, minEvidence, selectedSources, sourceFilterMode]);

    // Group targets by biological process
    const groupedTargets = useMemo(() => {
        const groups: Record<string, typeof targets> = {};

        targets.forEach(target => {
            const processes = pathwayMapping[target.target] || ['Unknown'];
            processes.forEach(process => {
                // Simplify process names
                let groupName = 'Other';
                if (process.includes('ABA') || process.includes('abscisic')) groupName = 'ABA Response';
                else if (process.includes('WATER') || process.includes('water')) groupName = 'Water Deprivation';
                else if (process.includes('OSMOTIC') || process.includes('osmotic')) groupName = 'Osmotic Stress';
                else if (process.includes('AUXIN') || process.includes('auxin')) groupName = 'Auxin Signaling';
                else if (process.includes('ETHYLENE') || process.includes('ethylene')) groupName = 'Ethylene Response';
                else if (process.includes('JASMONIC') || process.includes('jasmonic')) groupName = 'Jasmonic Acid';
                else if (process.includes('CYTOKININ') || process.includes('cytokinin')) groupName = 'Cytokinin';
                else if (process.includes('GIBBERELLIN') || process.includes('gibberellin')) groupName = 'Gibberellin';

                if (!groups[groupName]) groups[groupName] = [];
                if (!groups[groupName].find(t => t.target === target.target)) {
                    groups[groupName].push(target);
                }
            });
        });

        return groups;
    }, [targets, pathwayMapping]);

    // Color scheme for biological processes
    const PROCESS_COLORS: Record<string, string> = {
        'ABA Response': '#69d7cf',
        'Water Deprivation': '#4de7bf',
        'Osmotic Stress': '#78f0d3',
        'Auxin Signaling': '#d7aa63',
        'Ethylene Response': '#d97777',
        'Jasmonic Acid': '#c46868',
        'Cytokinin': '#8ca7a0',
        'Gibberellin': '#9bb7b0',
        'Other': '#6c8580'
    };

    useEffect(() => {
        if (!svgRef.current || !selectedTF || targets.length === 0) return;

        const width = svgRef.current.clientWidth;
        const height = 800;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        // Create main group for zoom/pan
        const g = svg.append('g');

        // Setup zoom behavior
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                g.attr('transform', event.transform.toString());
            });

        svg.call(zoom);

        // Calculate layout
        const groups = Object.keys(groupedTargets);
        const groupSpacing = 250;
        const nodeSpacing = 60;
        const startX = 100;
        const tfY = 100;

        // Draw TF node (center top)
        const tfX = startX + (groups.length * groupSpacing) / 2;
        const tfNode = g.append('g').attr('transform', `translate(${tfX}, ${tfY})`);

        tfNode.append('path')
            .attr('d', d3.symbol().type(d3.symbolTriangle).size(400)())
            .attr('fill', '#4de7bf')
            .attr('stroke', '#2f7f76')
            .attr('stroke-width', 3);

        if (showLabels) {
            tfNode.append('text')
                .text(selectedTF)
                .attr('y', -25)
                .attr('text-anchor', 'middle')
                .attr('fill', '#4de7bf')
                .attr('font-size', '16px')
                .attr('font-weight', 'bold');
        }

        // Draw groups and targets
        groups.forEach((groupName, groupIdx) => {
            const groupX = startX + groupIdx * groupSpacing;
            const groupY = 250;
            const groupTargets = groupedTargets[groupName];
            const color = PROCESS_COLORS[groupName] || PROCESS_COLORS['Other'];

            // Draw group label
            g.append('text')
                .text(groupName)
                .attr('x', groupX)
                .attr('y', groupY - 30)
                .attr('text-anchor', 'middle')
                .attr('fill', color)
                .attr('font-size', '14px')
                .attr('font-weight', 'bold');

            // Draw group box
            const boxHeight = Math.max(groupTargets.length * nodeSpacing, 100);
            g.append('rect')
                .attr('x', groupX - 80)
                .attr('y', groupY - 10)
                .attr('width', 160)
                .attr('height', boxHeight)
                .attr('fill', 'none')
                .attr('stroke', color)
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '5,5')
                .attr('rx', 8);

            // Draw connection from TF to group
            g.append('line')
                .attr('x1', tfX)
                .attr('y1', tfY + 15)
                .attr('x2', groupX)
                .attr('y2', groupY - 10)
                .attr('stroke', color)
                .attr('stroke-width', 2)
                .attr('opacity', 0.5);

            // Draw target genes
            groupTargets.forEach((target, idx) => {
                const targetY = groupY + 20 + idx * nodeSpacing;
                const targetNode = g.append('g').attr('transform', `translate(${groupX}, ${targetY})`);

                // Gene node
                targetNode.append('circle')
                    .attr('r', 8)
                    .attr('fill', color)
                    .attr('stroke', '#132026')
                    .attr('stroke-width', 2);

                // Evidence badge
                const evidenceColor = target.evidence === 3 ? '#d7aa63' : target.evidence === 2 ? '#4de7bf' : '#6c8580';
                targetNode.append('circle')
                    .attr('cx', 12)
                    .attr('cy', -8)
                    .attr('r', 6)
                    .attr('fill', evidenceColor)
                    .attr('stroke', '#132026')
                    .attr('stroke-width', 1);

                targetNode.append('text')
                    .text(target.evidence)
                    .attr('x', 12)
                    .attr('y', -6)
                    .attr('text-anchor', 'middle')
                    .attr('fill', 'white')
                    .attr('font-size', '8px')
                    .attr('font-weight', 'bold');

                if (showLabels) {
                    targetNode.append('text')
                        .text(target.target)
                        .attr('x', 20)
                        .attr('y', 4)
                        .attr('fill', '#e2e8f0')
                        .attr('font-size', '11px')
                        .attr('font-weight', '600');
                }

                // Tooltip
                targetNode.append('title')
                    .text(`${target.target}\nEvidence: ${target.evidence} source(s)\nDirection: ${target.direction}\nSources: ${target.sources.join(', ')}`);
            });
        });

        // Reset zoom button
        svg.on('dblclick.zoom', null);
        svg.on('dblclick', () => {
            svg.transition().duration(750).call(zoom.transform as any, d3.zoomIdentity);
        });

    }, [selectedTF, targets, groupedTargets, showLabels, minEvidence]);

    return (
        <div className="print-panel rounded-3xl flex flex-col overflow-hidden h-[800px] relative">
            {/* Header */}
            <div className="p-6 border-b border-[var(--print-line)] bg-black/10 backdrop-blur-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="print-logo-frame w-10 h-10 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white tracking-tight">Direct Targets View</h3>
                        <p className="text-sm text-[var(--print-mint)] font-medium">TF → Target Genes (GO Grouped)</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* TF Selector */}
                    <select
                        value={selectedTF}
                        onChange={(e) => onTFChange(e.target.value)}
                        className="px-4 py-2 bg-black/10 border border-[var(--print-line)] rounded-xl text-sm font-bold text-[var(--print-mint)] outline-none focus:ring-2 focus:ring-[var(--print-mint)]"
                    >
                        <option value="">Select TF...</option>
                        {availableTFs.map(tf => (
                            <option key={tf} value={tf}>{tf}</option>
                        ))}
                    </select>

                    {/* Source Filters with AND/OR toggle */}
                    <div className="flex items-center gap-2">
                        {/* AND/OR Toggle */}
                        <div className="flex items-center bg-black/10 border border-[var(--print-line)] rounded-xl p-1">
                            <button
                                onClick={() => setSourceFilterMode('OR')}
                                className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                    sourceFilterMode === 'OR'
                                        ? 'bg-[#69d7cf] text-[var(--print-ink)] shadow-lg'
                                        : 'text-slate-400 hover:text-slate-300'
                                }`}
                                title="Show genes regulated by ANY selected source"
                            >
                                OR
                            </button>
                            <button
                                onClick={() => setSourceFilterMode('AND')}
                                className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                    sourceFilterMode === 'AND'
                                        ? 'bg-[#d7aa63] text-[var(--print-ink)] shadow-lg'
                                        : 'text-slate-400 hover:text-slate-300'
                                }`}
                                title="Show genes regulated by ALL selected sources"
                            >
                                AND
                            </button>
                        </div>

                        {/* Source Selection Buttons */}
                        <div className="flex items-center gap-2 bg-black/10 border border-[var(--print-line)] rounded-xl px-3 py-2">
                            {['TARGET', 'DAP', 'CHIP'].map(source => (
                                <button
                                    key={source}
                                    onClick={() => {
                                        if (selectedSources.includes(source)) {
                                            setSelectedSources(selectedSources.filter(s => s !== source));
                                        } else {
                                            setSelectedSources([...selectedSources, source]);
                                        }
                                    }}
                                    className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                                        selectedSources.includes(source)
                                            ? source === 'TARGET'
                                                ? 'bg-[var(--print-mint)] text-[var(--print-ink)]'
                                                : source === 'DAP'
                                                ? 'bg-[#d7aa63] text-[var(--print-ink)]'
                                                : 'bg-[#69d7cf] text-[var(--print-ink)]'
                                            : 'bg-white/5 text-slate-400'
                                    }`}
                                >
                                    {source}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Evidence Filter */}
                    <select
                        value={minEvidence}
                        onChange={(e) => setMinEvidence(+e.target.value)}
                        className="px-4 py-2 bg-black/10 border border-[var(--print-line)] rounded-xl text-sm font-bold text-[#69d7cf] outline-none focus:ring-2 focus:ring-[#69d7cf]"
                    >
                        <option value={1}>≥1 source</option>
                        <option value={2}>≥2 sources</option>
                        <option value={3}>3 sources</option>
                    </select>

                    {/* Show Labels Toggle */}
                    <button
                        onClick={() => setShowLabels(!showLabels)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${showLabels
                                ? 'bg-[rgba(77,231,191,0.12)] border-[rgba(77,231,191,0.28)] text-[var(--print-mint)] border'
                                : 'bg-black/10 border-[var(--print-line)] text-slate-400 border'
                            }`}
                    >
                        {showLabels ? 'Hide Labels' : 'Show Labels'}
                    </button>
                </div>
            </div>

            {/* Visualization */}
            <div className="flex-1 relative bg-black/10 overflow-hidden">
                {/* Instructions */}
                <div className="absolute top-6 left-6 p-4 bg-[rgba(27,40,46,0.86)] backdrop-blur-md border border-[var(--print-line)] rounded-2xl z-10 shadow-2xl">
                    <div className="text-xs font-bold text-[var(--print-mint)] mb-2">Controls</div>
                    <div className="text-xs text-slate-300 space-y-1">
                        <div>• Scroll to zoom</div>
                        <div>• Drag to pan</div>
                        <div>• Double-click to reset</div>
                    </div>
                </div>

                {/* Stats */}
                {selectedTF && (
                    <div className="absolute top-6 right-6 p-4 bg-[rgba(27,40,46,0.86)] backdrop-blur-md border border-[var(--print-line)] rounded-2xl shadow-2xl">
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div>
                                <div className="text-2xl font-black text-[var(--print-mint)]">{targets.length}</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase">Targets</div>
                            </div>
                            <div>
                                <div className="text-2xl font-black text-[#d7aa63]">{Object.keys(groupedTargets).length}</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase">Groups</div>
                            </div>
                        </div>
                    </div>
                )}

                {!selectedTF ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <div className="text-6xl mb-4">🎯</div>
                            <div className="text-xl font-bold text-slate-400">Select a TF to view targets</div>
                        </div>
                    </div>
                ) : targets.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <div className="text-6xl mb-4">🔍</div>
                            <div className="text-xl font-bold text-slate-400">No targets found</div>
                            <div className="text-sm text-slate-500 mt-2">Try lowering the evidence filter</div>
                        </div>
                    </div>
                ) : (
                    <svg ref={svgRef} className="w-full h-full"></svg>
                )}
            </div>
        </div>
    );
}

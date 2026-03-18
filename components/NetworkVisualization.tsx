import React, { useState } from 'react';
import DirectTargetsView from './DirectTargetsView';
import HierarchicalView from './HierarchicalView';
import PathwayVisualization from './PathwayVisualization';
import { PathwayData } from '../services/pathwayLoader';
import PathwaySelector from './PathwaySelector';
import { useNetworkData } from '../hooks/useNetworkData';

export type NetworkView = 'direct' | 'hierarchical' | 'pathway';

interface NetworkVisualizationProps {
    pathwayData?: PathwayData | null;
    onViewChange?: (view: NetworkView) => void;
    onPathwayChange?: (pathway: PathwayData | null) => void;
}

export default function NetworkVisualization({ pathwayData, onViewChange, onPathwayChange }: NetworkVisualizationProps) {
    const [view, setView] = useState<NetworkView>('direct');
    const [selectedTF, setSelectedTF] = useState('');
    const {
        directData,
        error,
        geneMapping,
        hierarchyData,
        loading,
        pathwayMapping,
        tfOptions
    } = useNetworkData(selectedTF, pathwayData);

    const handleViewChange = (newView: NetworkView) => {
        setView(newView);
        if (onViewChange) {
            onViewChange(newView);
        }
    };

    return (
        <div className="space-y-6">
            {error && (
                <div className="p-4 bg-red-900/20 text-red-400 text-sm font-bold rounded-2xl border border-red-800">
                    {error}
                </div>
            )}

            <div className="print-panel rounded-2xl p-2 flex items-center gap-2 w-fit">
                <button
                    onClick={() => handleViewChange('direct')}
                    className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${view === 'direct'
                            ? 'print-button'
                            : 'text-slate-400 hover:bg-white/5'
                        }`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Direct Targets
                </button>

                <button
                    onClick={() => handleViewChange('hierarchical')}
                    className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${view === 'hierarchical'
                            ? 'print-button'
                            : 'text-slate-400 hover:bg-white/5'
                        }`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                    </svg>
                    Hierarchical
                </button>

                <button
                    onClick={() => handleViewChange('pathway')}
                    className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${view === 'pathway'
                            ? 'print-button'
                            : 'text-slate-400 hover:bg-white/5'
                        }`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    Pathway
                </button>
            </div>

            {view === 'pathway' && onPathwayChange && (
                <PathwaySelector
                    onPathwayChange={onPathwayChange}
                    defaultPathwayId="hormone_signaling"
                />
            )}

            {view === 'direct' && (
                <DirectTargetsView
                    data={directData}
                    pathwayMapping={pathwayMapping}
                    selectedTF={selectedTF}
                    onTFChange={setSelectedTF}
                    tfOptions={tfOptions}
                />
            )}

            {view === 'hierarchical' && (
                <HierarchicalView
                    data={hierarchyData.length > 0 ? hierarchyData : directData}
                    pathwayMapping={pathwayMapping}
                    selectedTF={selectedTF}
                    onTFChange={setSelectedTF}
                    tfOptions={tfOptions}
                />
            )}

            {view === 'pathway' && (
                pathwayData ? (
                    <PathwayVisualization
                        pathwayData={pathwayData}
                        regulatoryData={directData}
                        geneMapping={geneMapping}
                        tfOptions={tfOptions}
                    />
                ) : (
                    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl border border-slate-700 flex items-center justify-center h-[800px]">
                        <div className="text-center">
                            <div className="text-6xl mb-4">🧬</div>
                            <div className="text-xl font-bold text-slate-400">No pathway selected</div>
                            <div className="text-sm text-slate-500 mt-2">Select a pathway above to view</div>
                        </div>
                    </div>
                )
            )}

            {loading && (
                <div className="text-xs text-[var(--print-fog)]">Loading network data...</div>
            )}
        </div>
    );
}

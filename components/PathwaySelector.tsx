import React, { useState, useEffect } from 'react';
import { loadPathway, getAvailablePathways, PathwayData } from '../services/pathwayLoader';

interface PathwaySelectorProps {
    onPathwayChange: (pathway: PathwayData | null) => void;
    defaultPathwayId?: string;
}

export default function PathwaySelector({ onPathwayChange, defaultPathwayId = 'hormone_signaling' }: PathwaySelectorProps) {
    const [selectedPathway, setSelectedPathway] = useState<string>(defaultPathwayId);
    const [loading, setLoading] = useState(false);
    const availablePathways = getAvailablePathways();

    const handlePathwayChange = async (pathwayId: string) => {
        setSelectedPathway(pathwayId);

        if (!pathwayId) {
            onPathwayChange(null);
            return;
        }

        setLoading(true);
        const pathwayData = await loadPathway(pathwayId);
        setLoading(false);

        onPathwayChange(pathwayData);
    };

    useEffect(() => {
        if (defaultPathwayId) {
            void handlePathwayChange(defaultPathwayId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700 rounded-2xl p-4 mb-2">
            <h3 className="m-0 mb-2 text-white text-sm font-bold">
                Pathway View
            </h3>

            <select
                value={selectedPathway}
                onChange={(e) => handlePathwayChange(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 bg-slate-800/60 text-slate-100 border border-slate-600 rounded-lg text-sm disabled:cursor-wait"
            >
                {availablePathways.map(pathway => (
                    <option key={pathway.id} value={pathway.id}>
                        {pathway.name}
                    </option>
                ))}
            </select>

            {loading && (
                <div className="mt-2 text-slate-400 text-xs text-center">
                    Loading pathway data...
                </div>
            )}

            {selectedPathway && !loading && (
                <div className="mt-2 px-2 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-md text-[11px] text-emerald-300">
                    <div>Pathway loaded successfully</div>
                </div>
            )}
        </div>
    );
}

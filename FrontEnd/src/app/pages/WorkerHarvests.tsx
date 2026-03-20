import { useState, useEffect, useMemo } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { api } from '@/lib/api';
import { Building2, Loader2, Scale, Calendar, Search, Filter, ArrowUpDown, ChevronRight } from 'lucide-react';

interface Plantation {
    id: number;
    name: string;
    location: string;
    workerId: number;
}

interface Harvest {
    id: number;
    harvestDate: string;
    netWeight: number;
    plot?: { blockId: string };
}

export function WorkerHarvests() {
    const { user } = useUser();
    const { getToken } = useAuth();

    const [plantations, setPlantations] = useState<Plantation[]>([]);
    const [selectedPlantation, setSelectedPlantation] = useState<number | null>(null);
    const [harvests, setHarvests] = useState<Harvest[]>([]);
    const [plots, setPlots] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));
    const [blockFilter, setBlockFilter] = useState('ALL');
    const [sortBy, setSortBy] = useState('date-desc');

    useEffect(() => {
        fetchPlantations();
    }, []);

    const fetchPlantations = async () => {
        try {
            const token = await getToken();
            const clerkId = user?.id;
            if (!clerkId) return;

            const data = await api.getWorkerPlantations(clerkId, token || undefined);
            setPlantations(data);
            if (data.length > 0) {
                setSelectedPlantation(data[0].id);
            }
        } catch (error) {
            console.error('Failed to fetch plantations:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedPlantation) {
            fetchHarvestData();
        }
    }, [selectedPlantation, monthFilter]);

    const fetchHarvestData = async () => {
        if (!selectedPlantation) return;

        setLoading(true);
        try {
            const token = await getToken();
            const clerkId = user?.id;
            if (!clerkId) return;

            const [harvestData, plotData] = await Promise.all([
                api.getWorkerHarvests(selectedPlantation, clerkId, monthFilter, token || undefined),
                api.getPlots(selectedPlantation, token || undefined).catch(() => [])
            ]);
            setHarvests(harvestData);
            setPlots(plotData);
        } catch (error) {
            console.error('Failed to fetch harvest data:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredHarvests = useMemo(() => {
        let result = harvests.filter((h) => {
            const matchesSearch =
                h.harvestDate.includes(searchTerm) ||
                (h.plot?.blockId || '').toLowerCase().includes(searchTerm.toLowerCase());

            const matchesBlock = blockFilter === 'ALL' || h.plot?.blockId === blockFilter;

            return matchesSearch && matchesBlock;
        });

        result.sort((a, b) => {
            if (sortBy === 'date-desc') return new Date(b.harvestDate).getTime() - new Date(a.harvestDate).getTime();
            if (sortBy === 'date-asc') return new Date(a.harvestDate).getTime() - new Date(b.harvestDate).getTime();
            if (sortBy === 'weight-desc') return b.netWeight - a.netWeight;
            if (sortBy === 'weight-asc') return a.netWeight - b.netWeight;
            return 0;
        });

        return result;
    }, [harvests, searchTerm, blockFilter, sortBy]);

    const totalWeight = useMemo(() => {
        return filteredHarvests.reduce((sum, h) => sum + h.netWeight, 0);
    }, [filteredHarvests]);

    if (loading && plantations.length === 0) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Harvest Records</h1>
                    <p className="text-gray-600 mt-1">Track and filter your personal harvesting history</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    {plantations.length > 0 && (
                        <div className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-gray-400" />
                            <select
                                value={selectedPlantation || ''}
                                onChange={(e) => setSelectedPlantation(Number(e.target.value))}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none font-medium"
                            >
                                {plantations.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-xl border border-gray-200 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total Yield (Filtered)</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{totalWeight.toFixed(1)} kg</h3>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <Scale className="w-6 h-6 text-green-600" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Record Count</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{filteredHarvests.length} entries</h3>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative col-span-1 md:col-span-2">
                        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Find records..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <input
                            type="month"
                            value={monthFilter}
                            onChange={(e) => setMonthFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-green-500 outline-none"
                        />
                    </div>
                    <select
                        value={blockFilter}
                        onChange={(e) => setBlockFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-green-500 outline-none"
                    >
                        <option value="ALL">All Blocks</option>
                        {plots.map(p => (
                            <option key={p.id} value={p.blockId}>{p.blockId}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <ArrowUpDown className="w-4 h-4 text-gray-400" />
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="text-sm font-medium text-gray-600 bg-transparent outline-none cursor-pointer hover:text-green-600"
                            >
                                <option value="date-desc">Newest First</option>
                                <option value="date-asc">Oldest First</option>
                                <option value="weight-desc">Weight High-Low</option>
                                <option value="weight-asc">Weight Low-High</option>
                            </select>
                        </div>
                    </div>

                    {(searchTerm || blockFilter !== 'ALL') && (
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setBlockFilter('ALL');
                            }}
                            className="text-xs font-bold text-red-600 hover:text-red-700 uppercase tracking-wider"
                        >
                            Reset Filters
                        </button>
                    )}
                </div>
            </div>

            {/* Records List */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                {loading ? (
                    <div className="p-12 flex flex-col items-center justify-center text-gray-500">
                        <Loader2 className="w-8 h-8 animate-spin mb-4" />
                        <p>Updating records...</p>
                    </div>
                ) : filteredHarvests.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <Scale className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-medium">No results found</p>
                        <p className="text-sm mt-1">Try adjusting your filters or search terms</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {filteredHarvests.map((harvest) => (
                            <div key={harvest.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
                                        <Scale className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-gray-900">{harvest.netWeight.toFixed(1)} kg</span>
                                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full uppercase font-bold tracking-tight">
                                                {harvest.plot?.blockId || 'Estate'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 flex items-center gap-2">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {new Date(harvest.harvestDate).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-green-500 transition-colors" />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

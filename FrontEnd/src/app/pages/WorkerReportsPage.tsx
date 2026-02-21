import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { api } from '@/lib/api';
import { FileText, Download, Loader2, Calendar, TrendingUp } from 'lucide-react';

interface Plantation {
    id: number;
    name: string;
}

export function WorkerReportsPage() {
    const { user } = useUser();
    const { getToken } = useAuth();

    const [plantations, setPlantations] = useState<Plantation[]>([]);
    const [selectedPlantation, setSelectedPlantation] = useState<number | null>(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [isDownloading, setIsDownloading] = useState(false);
    const [loading, setLoading] = useState(true);

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

    const handleDownload = async () => {
        if (!selectedPlantation || !user?.id) return;

        setIsDownloading(true);
        try {
            const token = await getToken();
            const blob = await api.downloadWorkerPersonalReport(
                selectedPlantation,
                selectedMonth,
                user.id,
                token || undefined
            );

            // Create blob link to download
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (error) {
            console.error('Failed to generate report:', error);
            alert('Failed to generate report. Please try again.');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Personal Reports</h1>
                <p className="text-gray-600 mt-1">Generate and download your performance and earnings summaries</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Select Month
                        </label>
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Select Estate
                        </label>
                        <select
                            value={selectedPlantation || ''}
                            onChange={(e) => setSelectedPlantation(Number(e.target.value))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                        >
                            {plantations.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="group bg-green-50 rounded-2xl p-8 border border-green-100 hover:shadow-lg transition-all cursor-pointer relative overflow-hidden">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <FileText className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">Monthly Summary Report</h3>
                                <p className="text-gray-600 mt-2 max-w-xs">
                                    Includes your harvesting yields, attendance summaries, and detailed payslip breakdown.
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={handleDownload}
                            disabled={isDownloading || !selectedPlantation}
                            className="mt-8 flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                            {isDownloading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Download className="w-5 h-5" />
                            )}
                            {isDownloading ? 'Generating PDF...' : 'View Report'}
                        </button>

                        <div className="absolute -right-8 -bottom-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <FileText className="w-48 h-48" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

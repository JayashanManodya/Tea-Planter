import { useState, useEffect, useMemo } from 'react';
import { Truck, Plus, Loader2, Calendar, Weight, Building2, BarChart2, Filter } from 'lucide-react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { api } from '@/lib/api';

interface Factory {
    id: number;
    name: string;
}

interface DeliveryRecord {
    id: number;
    factory: Factory;
    weight: number;
    deliveryDate: string;
}

export function DeliveriesPage() {
    const { user } = useUser();
    const { getToken } = useAuth();
    const plantationId = user?.publicMetadata?.plantationId as string | undefined;

    const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
    const [factories, setFactories] = useState<Factory[]>([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingRecord, setEditingRecord] = useState<DeliveryRecord | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        factoryId: '',
        weight: '',
        deliveryDate: new Date().toISOString().split('T')[0]
    });
    const [factoryFilter, setFactoryFilter] = useState('ALL');
    
    // Advanced Search & Sorting State
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'weight-desc' | 'weight-asc'>('date-desc');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const filteredDeliveries = useMemo(() => {
        return deliveries
            .filter(d => {
                const matchesFactory = factoryFilter === 'ALL' || d.factory?.name === factoryFilter;
                const matchesSearch = d.factory?.name.toLowerCase().includes(searchTerm.toLowerCase());
                const deliveryDate = new Date(d.deliveryDate);
                const matchesStart = !startDate || deliveryDate >= new Date(startDate);
                const matchesEnd = !endDate || deliveryDate <= new Date(endDate);
                return matchesFactory && matchesSearch && matchesStart && matchesEnd;
            })
            .sort((a, b) => {
                if (sortBy === 'date-desc') return new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime();
                if (sortBy === 'date-asc') return new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime();
                if (sortBy === 'weight-desc') return b.weight - a.weight;
                if (sortBy === 'weight-asc') return a.weight - b.weight;
                return 0;
            });
    }, [deliveries, factoryFilter, searchTerm, sortBy, startDate, endDate]);

    const factoryStats = useMemo(() => {
        const stats: Record<string, number> = {};
        filteredDeliveries.forEach(d => {
            const factoryName = d.factory?.name || 'Unknown';
            stats[factoryName] = (stats[factoryName] || 0) + d.weight;
        });
        return Object.entries(stats).map(([name, weight]) => ({ name, weight }));
    }, [filteredDeliveries]);

    const chartColors = ['#16a34a', '#2563eb', '#d97706', '#7c3aed', '#db2777'];

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = await getToken();
            const [deliveryData, factoryData] = await Promise.all([
                api.getDeliveries(selectedMonth, plantationId, token || undefined),
                api.getFactories(plantationId, token || undefined)
            ]);
            setDeliveries(deliveryData);
            setFactories(factoryData);
        } catch (error) {
            console.error('Failed to fetch deliveries:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedMonth]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.factoryId || !formData.weight) {
            alert('Please fill in required fields');
            return;
        }

        setIsSubmitting(true);
        try {
            const token = await getToken();
            const data = {
                factory: { id: parseInt(formData.factoryId) },
                weight: parseFloat(formData.weight),
                deliveryDate: formData.deliveryDate,
                plantationId: plantationId
            };

            if (editingRecord) {
                await api.updateDelivery(editingRecord.id, data, token || undefined);
            } else {
                await api.recordDelivery(data, plantationId || '', token || undefined);
            }

            setShowModal(false);
            setEditingRecord(null);
            setFormData({ factoryId: '', weight: '', deliveryDate: new Date().toISOString().split('T')[0] });
            fetchData();
        } catch (error: any) {
            console.error('Failed to record delivery:', error);
            alert(error.message || 'Failed to record delivery.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (record: DeliveryRecord) => {
        setEditingRecord(record);
        setFormData({
            factoryId: record.factory.id.toString(),
            weight: record.weight.toString(),
            deliveryDate: record.deliveryDate
        });
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this delivery record?')) return;
        try {
            const token = await getToken();
            await api.deleteDelivery(id, token || undefined);
            fetchData();
        } catch (error) {
            console.error('Failed to delete delivery:', error);
            alert('Failed to delete delivery record.');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Tea Deliveries</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm font-medium text-gray-600">Period:</p>
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="px-2 py-0.5 border border-gray-300 rounded text-sm font-medium focus:ring-2 focus:ring-green-500 outline-none"
                        />
                    </div>
                </div>
                <button
                    onClick={() => {
                        setEditingRecord(null);
                        setFormData({ factoryId: '', weight: '', deliveryDate: new Date().toISOString().split('T')[0] });
                        setShowModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Record Delivery
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-50 rounded-lg">
                            <Truck className="w-5 h-5 text-green-600" />
                        </div>
                        <p className="text-sm font-semibold text-gray-600">Total Weight</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {filteredDeliveries.reduce((sum, d) => sum + d.weight, 0).toLocaleString()} <span className="text-sm font-normal text-gray-500">kg</span>
                    </p>
                </div>
                {factoryStats.slice(0, 2).map((stat, idx) => (
                    <div key={stat.name} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <Building2 className="w-5 h-5 text-blue-600" />
                            </div>
                            <p className="text-sm font-semibold text-gray-600">{stat.name}</p>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">
                            {stat.weight.toLocaleString()} <span className="text-sm font-normal text-gray-500">kg</span>
                        </p>
                    </div>
                ))}
            </div>

            {/* Comparison Chart */}
            {factoryStats.length > 0 && (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <BarChart2 className="w-5 h-5 text-gray-400" />
                        <h2 className="text-lg font-bold text-gray-800">Factory Delivery Comparison</h2>
                    </div>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={factoryStats} layout="vertical" margin={{ left: 40, right: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    tick={{ fontSize: 12, fontWeight: 600 }}
                                    width={100}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: number) => [`${value.toLocaleString()} kg`, 'Delivery Weight']}
                                />
                                <Bar dataKey="weight" radius={[0, 4, 4, 0]} barSize={24}>
                                    {factoryStats.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-200 bg-white flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by factory name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">From:</span>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 outline-none"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">To:</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 outline-none"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sort:</span>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as any)}
                                    className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 outline-none bg-white font-medium"
                                >
                                    <option value="date-desc">Newest First</option>
                                    <option value="date-asc">Oldest First</option>
                                    <option value="weight-desc">Weight (High-Low)</option>
                                    <option value="weight-asc">Weight (Low-High)</option>
                                </select>
                            </div>
                            <div className="h-8 w-px bg-gray-200 hidden md:block"></div>
                            {(searchTerm || factoryFilter !== 'ALL' || startDate || endDate) && (
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setFactoryFilter('ALL');
                                        setStartDate('');
                                        setEndDate('');
                                    }}
                                    className="text-xs font-bold text-green-600 hover:text-green-700"
                                >
                                    Clear All
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Factory</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Weight (kg)</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredDeliveries.map((d) => (
                                        <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm text-gray-900 font-medium">
                                                    <Calendar className="w-4 h-4 text-gray-400" />
                                                    {new Date(d.deliveryDate).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm text-gray-900">
                                                    <Building2 className="w-4 h-4 text-gray-400" />
                                                    {d.factory?.name || 'Unknown'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm text-gray-900">
                                                    <Weight className="w-4 h-4 text-gray-400" />
                                                    <span className="font-bold">{d.weight.toLocaleString()} kg</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleEdit(d)}
                                                        className="p-1 px-2 text-xs font-semibold bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(d.id)}
                                                        className="p-1 px-2 text-xs font-semibold bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                        {deliveries.length === 0 && (
                            <div className="text-center py-12">
                                <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500">No tea deliveries recorded yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-green-50">
                            <h2 className="text-xl font-bold text-green-900">
                                {editingRecord ? 'Update Tea Delivery' : 'Record Tea Delivery'}
                            </h2>
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setEditingRecord(null);
                                }}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                disabled={isSubmitting}
                            >
                                <Plus className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Select Factory *</label>
                                <select
                                    required
                                    value={formData.factoryId}
                                    onChange={(e) => setFormData({ ...formData, factoryId: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                >
                                    <option value="">Select Factory</option>
                                    {factories.map(f => (
                                        <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Weight (kg) *</label>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    value={formData.weight}
                                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                                    placeholder="0.00"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Delivery Date *</label>
                                <input
                                    required
                                    type="date"
                                    value={formData.deliveryDate}
                                    onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                />
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingRecord ? 'Update' : 'Record Delivery')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

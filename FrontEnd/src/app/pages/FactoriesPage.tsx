import { useState, useEffect, useMemo } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Building2, Plus, Loader2, Phone, User, Trash2, Edit2, ChevronRight, MapPin } from 'lucide-react';
import { api } from '@/lib/api';

interface Factory {
    id: number;
    name: string;
    registerNo: string;
    contactNumber: string;
    lorrySupervisorName: string;
    lorrySupervisorContact: string;
}

export function FactoriesPage() {
    const { user } = useUser();
    const { getToken } = useAuth();
    const plantationId = user?.publicMetadata?.plantationId as string | undefined;

    const [factories, setFactories] = useState<Factory[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedFactory, setSelectedFactory] = useState<Factory | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDetails, setShowDetails] = useState<Factory | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        registerNo: '',
        contactNumber: '',
        lorrySupervisorName: '',
        lorrySupervisorContact: ''
    });
    
    // Search and Sort State
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'newest' | 'oldest'>('name');

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = await getToken();
            const data = await api.getFactories(plantationId, token || undefined);
            setFactories(data);
        } catch (error) {
            console.error('Failed to fetch factories:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredFactories = useMemo(() => {
        return factories.filter(f => {
            const searchLower = searchTerm.toLowerCase();
            return (f.name?.toLowerCase() || '').includes(searchLower) || 
                   (f.registerNo?.toLowerCase() || '').includes(searchLower) ||
                   (f.lorrySupervisorName?.toLowerCase() || '').includes(searchLower);
        }).sort((a, b) => {
            if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
            if (sortBy === 'newest') return b.id - a.id;
            if (sortBy === 'oldest') return a.id - b.id;
            return 0;
        });
    }, [factories, searchTerm, sortBy]);

    const handleEdit = (factory: Factory) => {
        setSelectedFactory(factory);
        setFormData({
            name: factory.name,
            registerNo: factory.registerNo || '',
            contactNumber: factory.contactNumber || '',
            lorrySupervisorName: factory.lorrySupervisorName || '',
            lorrySupervisorContact: factory.lorrySupervisorContact || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this factory? This may affect linked delivery and income records.')) return;
        try {
            const token = await getToken();
            await api.deleteFactory(id, token || undefined);
            fetchData();
        } catch (error) {
            console.error('Failed to delete factory:', error);
            alert('Failed to delete factory.');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const data = {
                ...formData
            };

            const token = await getToken();
            if (selectedFactory) {
                await api.updateFactory(selectedFactory.id, data, token || undefined);
            } else {
                await api.createFactory(data, plantationId || '', token || undefined);
            }

            setShowModal(false);
            setSelectedFactory(null);
            setFormData({
                name: '',
                registerNo: '',
                contactNumber: '',
                lorrySupervisorName: '',
                lorrySupervisorContact: ''
            });
            fetchData();
        } catch (error) {
            console.error('Failed to save factory:', error);
            alert('Failed to save factory.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Tea Factories</h1>
                    <p className="text-gray-600 mt-1">
                        {searchTerm ? (
                            <span>Showing <b>{filteredFactories.length}</b> of {factories.length} factories</span>
                        ) : (
                            'Manage partner factories and contact details'
                        )}
                    </p>
                </div>
                <button
                    onClick={() => {
                        setSelectedFactory(null);
                        setFormData({
                            name: '',
                            registerNo: '',
                            contactNumber: '',
                            lorrySupervisorName: '',
                            lorrySupervisorContact: ''
                        });
                        setShowModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Add Factory
                </button>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="relative flex-1">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by factory name or registration no..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-600 whitespace-nowrap">Sort By:</span>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm font-medium transition-all cursor-pointer"
                    >
                        <option value="name">Name (A-Z)</option>
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                    </select>
                </div>
                {searchTerm && (
                    <button 
                        onClick={() => setSearchTerm('')}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                    >
                        Clear Search
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredFactories.map((factory) => (
                    <div
                        key={factory.id}
                        onClick={() => setShowDetails(factory)}
                        className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
                    >
                        <div className="p-5 space-y-4">
                            <div className="flex items-start justify-between">
                                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <Building2 className="w-6 h-6" />
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEdit(factory);
                                        }}
                                        className="p-1.5 hover:bg-gray-100 rounded-md text-gray-600"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(factory.id);
                                        }}
                                        className="p-1.5 hover:bg-red-50 rounded-md text-red-600"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-bold text-gray-900 text-lg">{factory.name}</h3>
                                <p className="text-sm text-gray-500">Reg: {factory.registerNo || 'N/A'}</p>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-50 text-sm">
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Phone className="w-4 h-4" />
                                    <span>{factory.contactNumber || 'No contact'}</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {factories.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No factories registered yet.</p>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-blue-50">
                            <h2 className="text-xl font-bold text-blue-900">
                                {selectedFactory ? 'Edit Factory' : 'Register Factory'}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <Plus className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Factory Name *</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Registration No</label>
                                    <input
                                        type="text"
                                        value={formData.registerNo}
                                        onChange={(e) => setFormData({ ...formData, registerNo: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Factory Contact Number</label>
                                <input
                                    type="text"
                                    value={formData.contactNumber}
                                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <Truck className="w-4 h-4 text-blue-600" />
                                    Lorry Supervisor Details
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Supervisor Name</label>
                                        <input
                                            type="text"
                                            value={formData.lorrySupervisorName}
                                            onChange={(e) => setFormData({ ...formData, lorrySupervisorName: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Supervisor Contact</label>
                                        <input
                                            type="text"
                                            value={formData.lorrySupervisorContact}
                                            onChange={(e) => setFormData({ ...formData, lorrySupervisorContact: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (selectedFactory ? 'Update' : 'Register')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {showDetails && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="relative h-32 bg-blue-600 p-6 flex items-end">
                            <button
                                onClick={() => setShowDetails(null)}
                                className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
                            >
                                <Plus className="w-5 h-5 rotate-45" />
                            </button>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-white rounded-xl shadow-lg flex items-center justify-center text-blue-600 text-2xl">
                                    <Building2 className="w-8 h-8" />
                                </div>
                                <div className="text-white">
                                    <h2 className="text-xl font-bold">{showDetails.name}</h2>
                                    <p className="text-blue-100 text-sm">#{showDetails.registerNo || 'No Reg ID'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Contact Information</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                        <Phone className="w-5 h-5 text-blue-500" />
                                        <div>
                                            <p className="text-xs text-gray-500">Factory Hotline</p>
                                            <p className="text-sm font-bold text-gray-900">{showDetails.contactNumber || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                        <Building2 className="w-5 h-5 text-blue-500" />
                                        <div>
                                            <p className="text-xs text-gray-500">Registration Status</p>
                                            <p className="text-sm font-bold text-gray-900">{showDetails.registerNo ? 'Registered' : 'Pending'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Lorry Supervisor</h3>
                                <div className="p-4 border border-blue-100 bg-blue-50/30 rounded-2xl space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Supervisor Name</p>
                                            <p className="text-sm font-bold text-gray-900">{showDetails.lorrySupervisorName || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                                            <Phone className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Direct Contact</p>
                                            <p className="text-sm font-bold text-gray-900">{showDetails.lorrySupervisorContact || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowDetails(null)}
                                className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
                            >
                                Close Details
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper icons
function Truck(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
            <path d="M15 18H9" />
            <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-2.035-2.544A1 1 0 0 0 19 10.18V6a2 2 0 0 0-2-2h-3" />
            <circle cx="7" cy="18" r="2" />
            <circle cx="17" cy="18" r="2" />
        </svg>
    );
}

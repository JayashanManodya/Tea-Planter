import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, MapPin, Edit2, Trash2, Loader2, X, AlertCircle } from 'lucide-react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { api } from '@/lib/api';

interface Plot {
  id: string;
  blockId: string;
  acreage: number;
  teaClone: string;
  plantingDate: string;
  status: 'Active' | 'Resting' | 'Maintenance';
  soilPh?: number;
  soilType?: string;
  latitude?: number;
  longitude?: number;
}

interface SoilTest {
  id: number;
  testDate: string;
  ph: number;
  nutrientLevels: string;
  recommendations: string;
}

export function PlotsPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const plantationId = user?.publicMetadata?.plantationId as string | undefined;

  const [plots, setPlots] = useState<Plot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlot, setEditingPlot] = useState<Plot | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    blockId: '',
    acreage: '',
    teaClone: '',
    plantingDate: new Date().toISOString().split('T')[0],
    status: 'Active' as const,
    soilPh: '',
    soilType: 'Red-Yellow Podzolic Soils (RYP)',
    latitude: '',
    longitude: ''
  });
  const [selectedPlotDetails, setSelectedPlotDetails] = useState<Plot | null>(null);
  const [soilTests, setSoilTests] = useState<SoilTest[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [plotToDelete, setPlotToDelete] = useState<Plot | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterClone, setFilterClone] = useState<string>('ALL');
  const [filterSoil, setFilterSoil] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('blockId');
  
  const fetchPlots = async () => {
    if (!plantationId) return;
    setLoading(true);
    try {
      const token = await getToken();
      const plotsData = await api.getPlots(plantationId, token || undefined);
      setPlots(plotsData);
    } catch (error) {
      console.error('Failed to fetch plots:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (plantationId) {
      fetchPlots();
    }
  }, [plantationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check validity using browser native API
    if (!e.currentTarget.reportValidity()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        acreage: parseFloat(formData.acreage),
        soilPh: formData.soilPh ? parseFloat(formData.soilPh) : null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null
      };

      const token = await getToken();
      if (editingPlot) {
        await api.updatePlot(editingPlot.id, payload, token || undefined);
      } else {
        await api.createPlot(payload, plantationId || '', token || undefined);
      }

      setShowAddModal(false);
      setEditingPlot(null);
      setFormData({
        blockId: '',
        acreage: '',
        teaClone: '',
        plantingDate: new Date().toISOString().split('T')[0],
        status: 'Active',
        soilPh: '',
        soilType: 'Red-Yellow Podzolic Soils (RYP)',
        latitude: '',
        longitude: ''
      });
      fetchPlots();
    } catch (error) {
      console.error('Failed to save plot:', error);
      alert('Failed to save plot. Please check if Block ID is unique.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (plot: Plot) => {
    setEditingPlot(plot);
    setFormData({
      blockId: plot.blockId,
      acreage: plot.acreage.toString(),
      teaClone: plot.teaClone,
      plantingDate: plot.plantingDate,
      status: plot.status,
      soilPh: plot.soilPh?.toString() || '',
      soilType: plot.soilType || 'Red-Yellow Podzolic Soils (RYP)',
      latitude: plot.latitude?.toString() || '',
      longitude: plot.longitude?.toString() || ''
    });
    setShowAddModal(true);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString()
        }));
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Could not get your location. Please check your browser permissions.');
      }
    );
  };

  const handleDelete = (plot: Plot) => {
    setPlotToDelete(plot);
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!plotToDelete) return;
    setIsSubmitting(true);
    try {
      const token = await getToken();
      await api.deletePlot(plotToDelete.id, token || undefined);
      setShowDeleteModal(false);
      setPlotToDelete(null);
      fetchPlots();
    } catch (error) {
      console.error('Failed to delete plot:', error);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (msg.includes('referenced from table "harvests"')) {
        setDeleteError('Cannot delete this plot because it has associated harvest records. Please delete the harvests first or move them to another plot.');
      } else {
        setDeleteError(`Failed to delete plot: ${msg}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewDetails = async (plot: Plot) => {
    setSelectedPlotDetails(plot);
    setLoadingDetails(true);
    try {
      const token = await getToken();
      const tests = await api.getSoilTestsByPlot(plot.id, token || undefined);
      setSoilTests(tests);
    } catch (error) {
      console.error('Failed to fetch soil tests:', error);
      setSoilTests([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredPlots = useMemo(() => {
    let result = plots.filter((plot) => {
      const searchStr = searchTerm.toLowerCase();
      const matchesSearch =
        plot.blockId.toLowerCase().includes(searchStr) ||
        plot.teaClone.toLowerCase().includes(searchStr) ||
        (plot.soilType || '').toLowerCase().includes(searchStr);

      const matchesStatus = filterStatus === 'ALL' || plot.status === filterStatus;
      const matchesClone = filterClone === 'ALL' || plot.teaClone === filterClone;
      const matchesSoil = filterSoil === 'ALL' || plot.soilType === filterSoil;

      return matchesSearch && matchesStatus && matchesClone && matchesSoil;
    });

    // Apply Sorting
    return [...result].sort((a, b) => {
      if (sortBy === 'blockId') {
        return a.blockId.localeCompare(b.blockId);
      }
      if (sortBy === 'acreage') {
        return b.acreage - a.acreage;
      }
      if (sortBy === 'plantingDate') {
        return new Date(b.plantingDate).getTime() - new Date(a.plantingDate).getTime();
      }
      return 0;
    });
  }, [plots, searchTerm, filterStatus, filterClone, filterSoil, sortBy]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-700';
      case 'Resting':
        return 'bg-yellow-100 text-yellow-700';
      case 'Maintenance':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plot & Crop Registry</h1>
          <p className="text-gray-600 mt-1">Manage your plantation blocks and crop information</p>
        </div>
        <button
          onClick={() => {
            setEditingPlot(null);
            setFormData({
              blockId: '',
              acreage: '',
              teaClone: '',
              plantingDate: new Date().toISOString().split('T')[0],
              status: 'Active',
              soilPh: '',
              soilType: 'Red-Yellow Podzolic Soils (RYP)',
              latitude: '',
              longitude: ''
            });
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Plot
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search plots by ID, clone, or soil..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="Active">Active</option>
              <option value="Resting">Resting</option>
              <option value="Maintenance">Maintenance</option>
            </select>
            <select
              value={filterClone}
              onChange={(e) => setFilterClone(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="ALL">All Clones</option>
              {Array.from(new Set(plots.map(p => p.teaClone).filter(Boolean))).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={filterSoil}
              onChange={(e) => setFilterSoil(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="ALL">All Soil Types</option>
              {Array.from(new Set(plots.map(p => p.soilType).filter(Boolean))).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <div className="flex items-center gap-2 border-l pl-2 ml-2 border-gray-200">
              <span className="text-sm text-gray-500 font-medium">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-green-500 outline-none"
              >
                <option value="blockId">Block ID</option>
                <option value="acreage">Acreage (Highest)</option>
                <option value="plantingDate">Date (Newest)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      ) : (
        <>
          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600 mb-1">Total Plots</p>
              <p className="text-2xl font-bold text-gray-900">{plots.length}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600 mb-1">Total Area</p>
              <p className="text-2xl font-bold text-gray-900">
                {plots.reduce((sum, p) => sum + p.acreage, 0).toFixed(1)} acres
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600 mb-1">Active Plots</p>
              <p className="text-2xl font-bold text-green-600">
                {plots.filter(p => p.status === 'Active').length}
              </p>
            </div>
          </div>

          {/* Plots Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlots.map((plot) => (
              <div key={plot.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-green-700" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{plot.blockId}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(plot.status)}`}>
                        {plot.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(plot)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(plot)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Area:</span>
                    <span className="font-medium text-gray-900">{plot.acreage} acres</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tea Clone:</span>
                    <span className="font-medium text-gray-900">{plot.teaClone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Planting Date:</span>
                    <span className="font-medium text-gray-900">{plot.plantingDate}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-50">
                    <span className="text-gray-600">Soil pH:</span>
                    <span className="font-medium text-blue-600">{plot.soilPh || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Soil Type:</span>
                    <span className="font-medium text-gray-900 truncate ml-4" title={plot.soilType}>
                      {plot.soilType || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-50">
                    <span className="text-gray-600">Location:</span>
                    <span className="font-medium text-orange-600 font-mono text-xs">
                      {plot.latitude != null && plot.longitude != null
                        ? `${plot.latitude.toFixed(6)}, ${plot.longitude.toFixed(6)}`
                        : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <button
                  onClick={() => handleViewDetails(plot)}
                  className="w-full mt-4 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg font-medium transition-colors"
                >
                  View Details
                </button>
              </div>
            ))}
          </div>

          {filteredPlots.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No plots found</p>
            </div>
          )}
        </>
      )}

      {/* Add Plot Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-green-50">
              <h2 className="text-xl font-bold text-green-900">
                {editingPlot ? 'Edit Plantation Plot' : 'Add New Plantation Plot'}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isSubmitting}
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Block ID *</label>
                <input
                  required
                  type="text"
                  maxLength={20}
                  pattern="[a-zA-Z0-9]+"
                  title="Only letters and numbers allowed (max 20 characters)"
                  placeholder="e.g. BlockD12"
                  value={formData.blockId}
                  onChange={(e) => setFormData({ ...formData, blockId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all outline-none"
                  disabled={editingPlot !== null}
                />
                {editingPlot && <p className="text-[10px] text-gray-400 mt-1">Block ID cannot be changed</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Acreage (Acres) *</label>
                  <input
                    required
                    type="number"
                    step="0.1"
                    min="0.1"
                    placeholder="e.g. 5.5"
                    value={formData.acreage}
                    onChange={(e) => setFormData({ ...formData, acreage: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Resting">Resting</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Soil pH</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="14"
                    placeholder="e.g. 5.5"
                    value={formData.soilPh}
                    onChange={(e) => setFormData({ ...formData, soilPh: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all outline-none font-mono"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-semibold text-gray-700">Location</label>
                    <button
                      type="button"
                      onClick={handleUseMyLocation}
                      className="text-[10px] text-green-600 font-bold hover:text-green-700 underline"
                    >
                      Use My Location
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.000001"
                      placeholder="Latitude"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all outline-none font-mono text-sm"
                    />
                    <input
                      type="number"
                      step="0.000001"
                      placeholder="Longitude"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all outline-none font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tea Clone *</label>
                <input
                  required
                  type="text"
                  maxLength={30}
                  pattern="[a-zA-Z0-9 ]+"
                  title="Only letters, numbers, and spaces allowed (max 30 characters)"
                  placeholder="e.g. TRI 2025"
                  value={formData.teaClone}
                  onChange={(e) => setFormData({ ...formData, teaClone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Soil Type</label>
                <select
                  value={formData.soilType}
                  onChange={(e) => setFormData({ ...formData, soilType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all outline-none"
                >
                  <option>Red-Yellow Podzolic Soils (RYP)</option>
                  <option>Reddish Brown Latosolic Soils (RBL)</option>
                  <option>Immature Brown Loams (IBL)</option>
                  <option>Bog and Half Bog Soils</option>
                  <option>Latosols and Regosols</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Planting Date</label>
                <input
                  type="date"
                  value={formData.plantingDate}
                  onChange={(e) => setFormData({ ...formData, plantingDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all outline-none font-mono text-sm"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingPlot ? 'Update Plot' : 'Create Plot'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Plot Details Modal */}
      {selectedPlotDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <MapPin className="w-5 h-5 text-green-700" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedPlotDetails.blockId}</h2>
                  <p className="text-xs text-gray-500">Full Registry Details & History</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPlotDetails(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[80vh] space-y-8">
              {/* Basic Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Acreage</p>
                  <p className="text-lg font-bold text-gray-800">{selectedPlotDetails.acreage} ac</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Tea Clone</p>
                  <p className="text-lg font-bold text-gray-800">{selectedPlotDetails.teaClone}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Status</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getStatusColor(selectedPlotDetails.status)}`}>
                    {selectedPlotDetails.status}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Planting Date</p>
                  <p className="text-lg font-bold text-gray-800">{selectedPlotDetails.plantingDate}</p>
                </div>
              </div>

              {/* Environmental Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-gray-700 border-b border-gray-200 pb-2">Soil Characteristics</h4>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Current pH recorded:</span>
                    <span className="font-bold text-blue-600">{selectedPlotDetails.soilPh || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Soil Type:</span>
                    <span className="font-bold text-gray-700">{selectedPlotDetails.soilType || 'N/A'}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-gray-700 border-b border-gray-200 pb-2">Geographic Location</h4>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Coordinates:</span>
                    <span className="font-bold text-orange-600 font-mono">
                      {selectedPlotDetails.latitude ? `${selectedPlotDetails.latitude.toFixed(6)}, ${selectedPlotDetails.longitude?.toFixed(6)}` : 'N/A'}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400 italic">
                    Coordinates used for localized weather forecasting and precision agricultural mapping.
                  </div>
                </div>
              </div>

              {/* Soil Test History */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Soil Test History</h3>
                  <div className="h-[2px] flex-1 bg-gray-100 mx-4"></div>
                </div>

                {loadingDetails ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <p className="text-sm">Fetching history...</p>
                  </div>
                ) : soilTests.length > 0 ? (
                  <div className="space-y-3">
                    {soilTests.map(test => (
                      <div key={test.id} className="p-4 border border-gray-200 rounded-lg hover:border-green-200 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-bold text-gray-500">{test.testDate}</span>
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-bold">pH: {test.ph}</span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2 font-medium">{test.nutrientLevels}</p>
                        <div className="bg-green-50 p-2 rounded text-xs text-green-800 border-l-4 border-green-500">
                          <strong>Rec:</strong> {test.recommendations}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <p className="text-sm text-gray-500">No soil test history found for this plot.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedPlotDetails(null)}
                className="px-6 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-bold hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60] backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-red-50">
              <h2 className="text-xl font-bold text-red-900 text-left">Confirm Deletion</h2>
              <button 
                onClick={() => setShowDeleteModal(false)} 
                className="text-gray-400 hover:text-gray-600 p-1"
                disabled={isSubmitting}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-left">
              <div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-lg border border-red-100">
                <div className="p-2 bg-red-100 rounded-full">
                  <Trash2 className="w-5 h-5" />
                </div>
                <p className="text-sm font-bold">Are you sure you want to delete plot <span className="underline decoration-2 underline-offset-2">{plotToDelete?.blockId}</span>?</p>
              </div>
              
              <p className="text-sm text-gray-500 leading-relaxed text-left">
                This action is permanent and cannot be undone. All mapping data and environmental records for this plot will be lost from the registry.
              </p>

              {deleteError && (
                <div className="p-4 bg-red-100 border-l-4 border-red-500 rounded text-red-800 text-xs font-semibold flex gap-3 items-start animate-in slide-in-from-top-2 duration-300 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-200"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Plot'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

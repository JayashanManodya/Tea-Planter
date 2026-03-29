import { useState, useEffect, useMemo } from 'react';
import { Package, AlertTriangle, Plus, Loader2, Edit2, Trash2, Info, Activity, Search, Filter, ArrowUpDown, Calendar } from 'lucide-react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { api } from '@/lib/api';

interface InventoryItem {
  id: number;
  name: string;
  category: string;
  currentStock: number;
  unit: string;
  reorderLevel: number;
  unitPrice: number;
}

interface StockLog {
  id: number;
  item: InventoryItem;
  quantity: number;
  unitPrice: number;
  type: string;
  entryDate: string;
}

export function InventoryPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const plantationId = user?.publicMetadata?.plantationId as string | undefined;

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showUseModal, setShowUseModal] = useState(false);
  const [showLogEditModal, setShowLogEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editingLog, setEditingLog] = useState<StockLog | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Fertilizer',
    unit: 'kg',
    reorderLevel: ''
  });
  const [stockFormData, setStockFormData] = useState({
    quantity: '',
    unitPrice: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStockStatus, setFilterStockStatus] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('name');

  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [logFilterType, setLogFilterType] = useState<string>('ALL');
  const [logFilterMonth, setLogFilterMonth] = useState<string>('ALL');
  const [logSortBy, setLogSortBy] = useState<string>('date-desc');

  const fetchInventory = async () => {
    setLoading(true);
    try {
      console.log('Fetching inventory and stock entries...');
      const token = await getToken();
      const [items, entries] = await Promise.all([
        api.getInventoryItems(plantationId, token || undefined).catch(err => {
          console.error('Failed to fetch items:', err);
          return [];
        }),
        api.getStockEntries(plantationId, token || undefined).catch(err => {
          console.error('Failed to fetch entries:', err);
          return [];
        })
      ]);

      console.log('Fetched items:', items);
      console.log('Fetched entries:', entries);
      setInventory(items || []);
      if (Array.isArray(entries)) {
        setLogs(entries.sort((a: StockLog, b: StockLog) =>
          new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()
        ));
      } else {
        setLogs([]);
      }
    } catch (error) {
      console.error('Critical error in fetchInventory:', error);
      alert('Data loading failed. Please check the console.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!e.currentTarget.reportValidity()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        reorderLevel: parseFloat(formData.reorderLevel),
        currentStock: editingItem ? editingItem.currentStock : 0,
        unitPrice: editingItem ? editingItem.unitPrice : 0
      };

      console.log('Saving inventory item. Payload:', payload);

      const token = await getToken();
      if (editingItem) {
        await api.updateInventoryItem(editingItem.id, payload, token || undefined);
      } else {
        await api.createInventoryItem(payload, plantationId || '', token || undefined);
      }

      console.log('Save successful. Fetching updated inventory...');
      setShowModal(false);
      setEditingItem(null);
      setFormData({
        name: '',
        category: 'Fertilizer',
        unit: 'kg',
        reorderLevel: ''
      });
      fetchInventory();
    } catch (error) {
      console.error('Failed to save inventory item:', error);
      alert('Failed to save inventory item: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestock = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!e.currentTarget.reportValidity()) return;
    if (!selectedItem) return;

    setIsSubmitting(true);
    try {
      const token = await getToken();
      await api.recordStockEntry(
        selectedItem.id,
        parseFloat(stockFormData.quantity),
        'PURCHASE',
        parseFloat(stockFormData.unitPrice),
        token || undefined
      );
      setShowRestockModal(false);
      setStockFormData({ quantity: '', unitPrice: '' });
      fetchInventory();
    } catch (error) {
      console.error('Failed to restock:', error);
      setFormError('Failed to record restock.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!e.currentTarget.reportValidity()) return;
    if (!selectedItem) return;

    setIsSubmitting(true);
    try {
      const token = await getToken();
      await api.recordStockEntry(
        selectedItem.id,
        parseFloat(stockFormData.quantity),
        'USAGE',
        undefined,
        token || undefined
      );
      setShowUseModal(false);
      setStockFormData({ quantity: '', unitPrice: '' });
      fetchInventory();
    } catch (error) {
      console.error('Failed to use stock:', error);
      setFormError('Failed to record usage.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      unit: item.unit,
      reorderLevel: item.reorderLevel.toString()
    });
    setShowModal(true);
  };

  const handleDelete = async (item: InventoryItem) => {
    if (item.currentStock > 0) {
      alert("Cant delete stock available item");
      return;
    }
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      const token = await getToken();
      await api.deleteInventoryItem(item.id, token || undefined);
      fetchInventory();
    } catch (error) {
      console.error('Failed to delete item:', error);
      alert(`Failed to delete item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleEditLog = (log: StockLog) => {
    setEditingLog(log);
    setStockFormData({
      quantity: log.quantity.toString(),
      unitPrice: (log.unitPrice || '').toString()
    });
    setShowLogEditModal(true);
  };

  const handleUpdateLog = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!e.currentTarget.reportValidity()) return;
    if (!editingLog || !stockFormData.quantity) return;

    setIsSubmitting(true);
    try {
      const token = await getToken();
      await api.updateStockEntry(
        editingLog.id,
        parseFloat(stockFormData.quantity),
        parseFloat(stockFormData.unitPrice) || 0,
        token || undefined
      );
      setShowLogEditModal(false);
      setEditingLog(null);
      fetchInventory();
    } catch (error) {
      console.error('Failed to update log:', error);
      alert(`Failed to update stock log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLog = async (id: number) => {
    if (!confirm('Are you sure you want to delete this log entry? It will reverse its effect on current stock levels.')) return;
    try {
      const token = await getToken();
      await api.deleteStockEntry(id, token || undefined);
      fetchInventory();
    } catch (error) {
      console.error('Failed to delete log:', error);
      alert(`Failed to delete log entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const filteredInventory = useMemo(() => {
    let result = inventory.filter((item) => {
      const searchStr = searchTerm.toLowerCase();
      const matchesSearch =
        item.name.toLowerCase().includes(searchStr) ||
        item.category.toLowerCase().includes(searchStr);

      const matchesCategory = filterCategory === 'ALL' || item.category === filterCategory;

      const isLowStock = item.currentStock < item.reorderLevel;
      const matchesStockStatus =
        filterStockStatus === 'ALL' ||
        (filterStockStatus === 'LOW' && isLowStock) ||
        (filterStockStatus === 'IN_STOCK' && !isLowStock);

      return matchesSearch && matchesCategory && matchesStockStatus;
    });

    // Apply Sorting
    return [...result].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'category') return a.category.localeCompare(b.category);
      if (sortBy === 'stock-level') return a.currentStock - b.currentStock;
      return 0;
    });
  }, [inventory, searchTerm, filterCategory, filterStockStatus, sortBy]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const searchStr = logSearchTerm.toLowerCase();
      const matchesSearch =
        log.item.name.toLowerCase().includes(searchStr) ||
        log.type.toLowerCase().includes(searchStr);

      const matchesType = logFilterType === 'ALL' || log.type === logFilterType;

      const matchesMonth = logFilterMonth === 'ALL' || log.entryDate.startsWith(logFilterMonth);

      return matchesSearch && matchesType && matchesMonth;
    });

    // Apply Sorting for Logs
    return [...result].sort((a, b) => {
      if (logSortBy === 'date-desc') return new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime();
      if (logSortBy === 'date-asc') return new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime();
      if (logSortBy === 'qty-desc') return b.quantity - a.quantity;
      if (logSortBy === 'qty-asc') return a.quantity - b.quantity;
      if (logSortBy === 'item-name') return a.item.name.localeCompare(b.item.name);
      return 0;
    });
  }, [logs, logSearchTerm, logFilterType, logFilterMonth, logSortBy]);

  const lowStockItems = inventory.filter(item => item.currentStock < item.reorderLevel);
  const categories = Array.from(new Set(inventory.map(item => item.category))).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory & Input Control</h1>
          <p className="text-gray-600 mt-1">Manage fertilizers, chemicals, and equipment</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setEditingItem(null);
              setFormData({
                name: '',
                category: 'Fertilizer',
                unit: 'kg',
                reorderLevel: ''
              });
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Item
          </button>
        </div>
      </div>

      {/* Item Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search items by name or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-orange-500 outline-none"
              >
                <option value="ALL">All Categories</option>
                {Array.from(new Set(inventory.map(i => i.category))).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <select
              value={filterStockStatus}
              onChange={(e) => setFilterStockStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-orange-500 outline-none"
            >
              <option value="ALL">All Stock Status</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="LOW">Low Stock</option>
            </select>

            <div className="flex items-center gap-2 border-l pl-3 ml-2 border-gray-200">
              <ArrowUpDown className="w-4 h-4 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-orange-500 outline-none"
              >
                <option value="name">Name (A-Z)</option>
                <option value="category">Category</option>
                <option value="stock-level">Stock Level (Low-High)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-sm animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-700" />
            <h3 className="font-semibold text-red-900">Low Stock Alert</h3>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-red-800 font-medium">
              The following {lowStockItems.length} item(s) are below their minimum stock thresholds:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {lowStockItems.map(item => (
                <div key={item.id} className="bg-white/50 border border-red-100 rounded-md p-2 flex items-center justify-between group hover:bg-white transition-colors">
                  <span className="text-xs font-bold text-gray-900 truncate pr-2" title={item.name}>{item.name}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                      {item.currentStock} {item.unit}
                    </span>
                    <span className="text-[9px] text-gray-400 font-medium">/ Min: {item.reorderLevel}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider pt-1">Please reorder these supplies soon to avoid operational delays.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Total Items</p>
          <p className="text-2xl font-bold text-gray-900">{inventory.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Categories</p>
          <p className="text-2xl font-bold text-gray-900">{categories}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Low Stock</p>
          <p className="text-2xl font-bold text-red-600">{lowStockItems.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Last Updated</p>
          <p className="text-sm font-medium text-gray-900">Today</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Item</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Category</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Quantity</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Min Stock</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Status</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Last Updated</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInventory.map((item) => {
              const isLowStock = item.currentStock < item.reorderLevel;
              return (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-orange-700" />
                      </div>
                      <span className="font-medium text-gray-900">{item.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{item.category}</td>
                  <td className="py-3 px-4 text-sm font-semibold text-gray-900">
                    {item.currentStock} {item.unit}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {item.reorderLevel} {item.unit}
                  </td>
                  <td className="py-3 px-4">
                    {isLowStock ? (
                      <span className="inline-flex items-center text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                        Low Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                        In Stock
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{new Date().toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          setStockFormData({ quantity: '', unitPrice: (item.unitPrice || '').toString() });
                          setShowRestockModal(true);
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg title-none font-bold text-xs flex items-center gap-1"
                        title="Restock"
                      >
                        <Plus className="w-3 h-3" /> RESTOCK
                      </button>
                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          setStockFormData({ quantity: '', unitPrice: '' });
                          setShowUseModal(true);
                        }}
                        className="p-1 text-green-600 hover:bg-green-50 rounded-lg title-none font-bold text-xs flex items-center gap-1"
                        title="Use Stock"
                      >
                        USE
                      </button>
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-1 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Edit Item Info"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-orange-50">
              <h2 className="text-xl font-bold text-orange-900">
                {editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isSubmitting}
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Item Name *</label>
                <input
                  required
                  type="text"
                  maxLength={50}
                  pattern="^[A-Za-z0-9 ]+$"
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Item Name can only contain letters, numbers, and spaces.')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  placeholder="e.g. Zinc Fertilizer"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  >
                    <option>Fertilizer</option>
                    <option>Pesticide</option>
                    <option>Tools</option>
                    <option>Seeds</option>
                    <option>Fuel</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  >
                    <option>kg</option>
                    <option>liters</option>
                    <option>units</option>
                    <option>bags</option>
                    <option>bottles</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Reorder Level *</label>
                  <input
                    required
                    type="number"
                    step="0.1"
                    min="0"
                    onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Reorder level must be a non-negative value.')}
                    onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                    placeholder="0.00"
                    value={formData.reorderLevel}
                    onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
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
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingItem ? 'Update Item' : 'Create Item'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {showRestockModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-blue-50">
              <h2 className="text-xl font-bold text-blue-900">Restock: {selectedItem.name}</h2>
              <button
                onClick={() => setShowRestockModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isSubmitting}
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleRestock} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Quantity Added *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Quantity must be greater than zero.')}
                    onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                    placeholder={`0.00 ${selectedItem.unit}`}
                    value={stockFormData.quantity}
                    onChange={(e) => setStockFormData({ ...stockFormData, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Unit Price (LKR) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Unit price cannot be negative.')}
                    onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                    placeholder="0.00"
                    value={stockFormData.unitPrice}
                    onChange={(e) => setStockFormData({ ...stockFormData, unitPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg flex gap-2">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-blue-700 uppercase font-bold tracking-tight">
                  This purchase will be recorded as a financial expense for the current month.
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowRestockModal(false)}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Restock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Use Modal */}
      {showUseModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-green-50">
              <h2 className="text-xl font-bold text-green-900">Use Stock: {selectedItem.name}</h2>
              <button
                onClick={() => setShowUseModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isSubmitting}
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleUse} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Quantity Used *</label>
                <div className="relative">
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity(`Please enter a quantity between 0.01 and ${selectedItem.currentStock}.`)}
                    onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                    placeholder={`0.00 ${selectedItem.unit}`}
                    max={selectedItem.currentStock}
                    value={stockFormData.quantity}
                    onChange={(e) => setStockFormData({ ...stockFormData, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                  <span className="absolute right-3 top-2 text-xs text-gray-400 font-bold uppercase">{selectedItem.unit}</span>
                </div>
                <p className="mt-1 text-[10px] text-gray-500">Available: {selectedItem.currentStock} {selectedItem.unit}</p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowUseModal(false)}
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
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Usage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Log Modal */}
      {showLogEditModal && editingLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-orange-50">
              <h2 className="text-xl font-bold text-orange-900">Edit {editingLog.type} Log</h2>
              <button
                onClick={() => setShowLogEditModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isSubmitting}
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleUpdateLog} className="p-6 space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 mb-2">
                <p className="text-xs font-bold text-gray-500 uppercase">Item</p>
                <p className="text-sm font-medium text-gray-900">{editingLog.item.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Quantity *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={stockFormData.quantity}
                    onChange={(e) => setStockFormData({ ...stockFormData, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                {editingLog.type === 'PURCHASE' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Unit Price (LKR) *</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={stockFormData.unitPrice}
                      onChange={(e) => setStockFormData({ ...stockFormData, unitPrice: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="bg-orange-50 p-3 rounded-lg flex gap-2">
                <Info className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-orange-700 font-bold uppercase">
                  Adjusting this log will automatically calculate and update the current stock level for this item.
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowLogEditModal(false)}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock History Section */}
      <div className="mt-12">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Activity className="w-5 h-5 text-gray-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Restock & Usage History</h2>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search logs by item name..."
                value={logSearchTerm}
                onChange={(e) => setLogSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-400 outline-none"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <input
                  type="month"
                  value={logFilterMonth === 'ALL' ? '' : logFilterMonth}
                  onChange={(e) => setLogFilterMonth(e.target.value || 'ALL')}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-gray-400 outline-none"
                />
                {logFilterMonth !== 'ALL' && (
                  <button
                    onClick={() => setLogFilterMonth('ALL')}
                    className="text-xs text-red-600 hover:text-red-700 font-bold"
                  >
                    CLEAR
                  </button>
                )}
              </div>
              <select
                value={logFilterType}
                onChange={(e) => setLogFilterType(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-gray-400 outline-none"
              >
                <option value="ALL">All Types</option>
                <option value="PURCHASE">Purchase Only</option>
                <option value="USAGE">Usage Only</option>
              </select>

              <div className="flex items-center gap-2 border-l pl-3 border-gray-200">
                <ArrowUpDown className="w-4 h-4 text-gray-400" />
                <select
                  value={logSortBy}
                  onChange={(e) => setLogSortBy(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-gray-400 outline-none"
                >
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="qty-desc">Quantity (High-Low)</option>
                  <option value="item-name">Item Name (A-Z)</option>
                </select>
              </div>
            </div>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Item</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Qty</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Value</th>
                <th className="text-right py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {new Date(log.entryDate).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${log.type === 'PURCHASE' ? 'bg-blue-100 text-blue-700' :
                      log.type === 'USAGE' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                      {log.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">{log.item.name}</td>
                  <td className="py-3 px-4 text-sm font-bold text-gray-900">
                    {log.type === 'USAGE' ? '-' : '+'}{log.quantity} {log.item.unit}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {log.type === 'PURCHASE' ? `LKR ${(log.unitPrice * log.quantity).toLocaleString()}` : '-'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEditLog(log)}
                        className="p-1 text-gray-400 hover:text-orange-600 transition-colors"
                        title="Edit Log"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteLog(log.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete Log"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-gray-500">
                    No activity logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

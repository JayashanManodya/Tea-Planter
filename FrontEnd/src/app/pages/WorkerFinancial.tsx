import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { api } from '@/lib/api';
import { Building2, Loader2, Calendar, TrendingUp, DollarSign } from 'lucide-react';

interface Plantation {
    id: number;
    name: string;
    location: string;
    workerId: number;
}

interface Payroll {
    id: number;
    month: string;
    basicWage: number;
    bonuses: number;
    deductions: number;
    netPay: number;
    status: string;
}

export function WorkerFinancial() {
    const { user } = useUser();
    const { getToken } = useAuth();

    const [plantations, setPlantations] = useState<Plantation[]>([]);
    const [selectedPlantation, setSelectedPlantation] = useState<number | null>(null);
    const [payrolls, setPayrolls] = useState<Payroll[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

    useEffect(() => {
        fetchPlantations();
    }, []);

    useEffect(() => {
        if (selectedPlantation) {
            fetchPayrollData();
        }
    }, [selectedPlantation, selectedMonth]);

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

    const fetchPayrollData = async () => {
        if (!selectedPlantation) return;

        setLoading(true);
        try {
            const token = await getToken();
            const clerkId = user?.id;
            if (!clerkId) return;

            const data = await api.getWorkerPayroll(selectedPlantation, clerkId, selectedMonth, token || undefined);
            setPayrolls(data);
        } catch (error) {
            console.error('Failed to fetch payroll data:', error);
        } finally {
            setLoading(false);
        }
    };

    const totalEarnings = payrolls.reduce((sum, p) => sum + (p.netPay || 0), 0);
    const totalBonuses = payrolls.reduce((sum, p) => sum + (p.bonuses || 0), 0);
    const totalDeductions = payrolls.reduce((sum, p) => sum + (p.deductions || 0), 0);


    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Financial</h1>
                    <p className="text-gray-600 mt-1">View your earnings and payroll history</p>
                </div>

                <div className="flex items-center gap-3">
                    {plantations.length > 0 && (
                        <>
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
                        </>
                    )}

                    <Calendar className="w-5 h-5 text-gray-400" />
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">Total Earnings</h3>
                        <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">LKR {totalEarnings.toLocaleString()}</p>
                    <p className="text-sm text-gray-500 mt-1">This month</p>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">Total Bonuses</h3>
                        <DollarSign className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">LKR {totalBonuses.toLocaleString()}</p>
                    <p className="text-sm text-gray-500 mt-1">Incentives earned</p>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-600">Total Deductions</h3>
                        <DollarSign className="w-5 h-5 text-red-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">LKR {totalDeductions.toLocaleString()}</p>
                    <p className="text-sm text-gray-500 mt-1">Deductions applied</p>
                </div>
            </div>

            {/* Payroll Records */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Payroll Records</h2>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                    </div>
                ) : payrolls.length === 0 ? (
                    <p className="text-center text-gray-500 py-12">No payroll records for this month</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Month</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Basic Wage</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Bonuses</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Deductions</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Net Pay</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payrolls.map((payroll) => (
                                    <tr key={payroll.id} className="border-b border-gray-100">
                                        <td className="py-3 px-4 text-sm text-gray-900">
                                            {new Date(payroll.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-900">
                                            LKR {(payroll.basicWage || 0).toLocaleString()}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-green-600">
                                            +LKR {(payroll.bonuses || 0).toLocaleString()}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-red-600">
                                            -LKR {(payroll.deductions || 0).toLocaleString()}
                                        </td>
                                        <td className="py-3 px-4 text-sm font-semibold text-gray-900">
                                            LKR {(payroll.netPay || 0).toLocaleString()}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`inline-flex items-center text-xs px-2 py-1 rounded-full ${payroll.status === 'PAID'
                                                ? 'bg-green-100 text-green-700'
                                                : payroll.status === 'APPROVED'
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {payroll.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

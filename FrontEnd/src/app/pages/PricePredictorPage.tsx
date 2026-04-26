import { useState } from 'react';
import { TrendingUp, Calendar, Building2, Calculator, AlertCircle, CheckCircle2, Activity, Info } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface PredictionResult {
  status: string;
  predicted_price: number;
}

export function PricePredictorPage() {
  const { t } = useLanguage();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState('January');
  const [estate, setEstate] = useState('Kendalanda');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const estates = ['Kendalanda', 'Lassakanda', 'TRI'];

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Year: year,
          Month: month,
          Estate: estate
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to get prediction');
      }

      const data = await response.json();
      setResult(data);

      // Add to history
      setHistory(prev => [{
        year,
        month,
        estate,
        price: data.predicted_price,
        date: new Date().toISOString().split('T')[0]
      }, ...prev].slice(0, 5));

    } catch (err) {
      console.error('Prediction error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred. Please ensure the ML server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50/30 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-green-600" />
            Market Price Analytics
          </h1>
          <p className="text-gray-600 mt-1">AI-driven tea price forecasting and historical analysis</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider">
          <CheckCircle2 className="w-3 h-3" />
          Model V2.1 Active
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Parameters */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-gray-400" />
              Forecast Parameters
            </h3>
            
            <form onSubmit={handlePredict} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Target Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  min="2014"
                  max="2030"
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all font-medium"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Target Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all font-medium"
                >
                  {months.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Estate Factory</label>
                <select
                  value={estate}
                  onChange={(e) => setEstate(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all font-medium"
                >
                  {estates.map((e) => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Analyzing...' : 'Generate Prediction'}
              </button>
            </form>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2 text-red-700 text-xs">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </div>

        </div>

        {/* Forecast Display */}
        <div className="lg:col-span-2 space-y-6">
          <div className={`bg-white rounded-xl border border-gray-200 p-6 min-h-[300px] flex flex-col items-center justify-center relative overflow-hidden ${result ? 'border-green-200' : ''}`}>
             <div className="absolute top-0 right-0 p-4 opacity-5">
               <TrendingUp className="w-32 h-32" />
             </div>

             {!result && !loading && (
               <div className="text-center space-y-4">
                 <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto border border-gray-100">
                    <TrendingUp className="w-8 h-8 text-gray-300" />
                 </div>
                 <div className="space-y-1">
                   <h3 className="font-bold text-gray-900">Ready for Analysis</h3>
                   <p className="text-sm text-gray-500">Configure parameters on the left to generate a market forecast.</p>
                 </div>
               </div>
             )}

             {loading && (
               <div className="text-center space-y-4">
                 <div className="w-16 h-16 border-4 border-green-100 border-t-green-600 rounded-full animate-spin mx-auto" />
                 <p className="text-sm font-medium text-gray-600">Syncing with auction data...</p>
               </div>
             )}

             {result && (
               <div className="w-full animate-fade-in space-y-8 text-center">
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest text-center">Predicted Auction Price</p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl font-bold text-green-700 mt-2">Rs.</span>
                      <span className="text-6xl font-black text-gray-900 tabular-nums">
                        {result.predicted_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">per kg of Manufactured Tea</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                    <div className="p-3 bg-gray-50 rounded-lg text-left">
                      <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Period</p>
                      <p className="text-sm font-bold text-gray-700">{month} {year}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg text-left">
                      <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Factory</p>
                      <p className="text-sm font-bold text-gray-700">{estate}</p>
                    </div>
                  </div>
               </div>
             )}
          </div>

          {/* Recent Prediction Logs */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-gray-400" />
              Recent Prediction Logs
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left font-bold text-gray-400 py-3 pb-2 uppercase text-[10px]">Target</th>
                    <th className="text-left font-bold text-gray-400 py-3 pb-2 uppercase text-[10px]">Estate</th>
                    <th className="text-right font-bold text-gray-400 py-3 pb-2 uppercase text-[10px]">Forecast</th>
                    <th className="text-right font-bold text-gray-400 py-3 pb-2 uppercase text-[10px]">Log Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {history.map((log, i) => (
                    <tr key={i} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="py-3 font-medium text-gray-700">{log.month} {log.year}</td>
                      <td className="py-3 text-gray-600">{log.estate}</td>
                      <td className="py-3 text-right font-bold text-green-700">Rs. {log.price.toLocaleString()}</td>
                      <td className="py-3 text-right text-gray-400 text-xs tabular-nums">{log.date}</td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-400 italic font-medium">No recent predictions found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

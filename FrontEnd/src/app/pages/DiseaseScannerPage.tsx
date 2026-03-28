import { useState } from 'react';
import { Upload, Scan, AlertCircle, CheckCircle2, Camera } from 'lucide-react';

interface Detection {
  disease: string;
  confidence: number;
  confidence_pct: string;
  bbox: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
}

interface Recommendation {
  disease: string;
  severity: string;
  cause: string;
  symptoms: string;
  treatment_steps: string[];
  prevention: string[];
  urgency: string;
  sri_lanka_note: string;
}

interface PredictionResponse {
  detections: Detection[];
  primary_disease: string;
  total_detections: number;
  diseases_found: string[];
  recommendation: Recommendation;
  model_info: {
    run: string;
    map50: number;
  };
}

export function DiseaseScannerPage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([
    { date: '2026-03-27', disease: 'Healthy Leaf', severity: 'Low', block: 'Block A' },
    { date: '2026-03-26', disease: 'Blister Blight', severity: 'Medium', block: 'Block C' },
    { date: '2026-03-25', disease: 'Nutrient Deficiency', severity: 'Low', block: 'Block B' },
  ]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScan = async () => {
    if (!selectedFile) return;

    setScanning(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`${import.meta.env.VITE_ML_API_URL}/predict`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to scan image. Please ensure the analysis server is running.');
      }

      const data: PredictionResponse = await response.json();
      setResult(data);
      
      // Add to history
      setHistory(prev => [{
        date: new Date().toISOString().split('T')[0],
        disease: data.primary_disease,
        severity: data.recommendation.severity,
        block: 'Unknown Block'
      }, ...prev]);
    } catch (err) {
      console.error('Scan error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Disease & Nutrient Scanner</h1>
        <p className="text-gray-600 mt-1">AI-powered disease identification and treatment recommendations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Tea Leaf Image</h3>
          
          {!selectedImage ? (
            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-12 h-12 text-gray-400 mb-3" />
                <p className="mb-2 text-sm font-medium text-gray-700">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  PNG, JPG or JPEG (MAX. 10MB)
                </p>
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
              />
            </label>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={selectedImage}
                  alt="Uploaded leaf"
                  className="w-full h-64 object-cover rounded-lg"
                />
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    setSelectedFile(null);
                    setResult(null);
                    setError(null);
                  }}
                  className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium"
                >
                  Remove
                </button>
              </div>

              <button
                onClick={handleScan}
                disabled={scanning}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {scanning ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Scan className="w-5 h-5" />
                    Scan for Diseases
                  </>
                )}
              </button>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Camera className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">Tips for Best Results</p>
                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                  <li>Take photos in good natural lighting</li>
                  <li>Focus on affected areas of the leaf</li>
                  <li>Avoid blurry or dark images</li>
                  <li>Include the entire leaf if possible</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Scan Results</h3>
          
          {!result ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Scan className="w-16 h-16 text-gray-300 mb-3" />
              <p className="text-gray-500">Upload an image and click scan to see results</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Disease Identified */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">Disease Identified</h4>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    result.recommendation.severity === 'High' ? 'bg-red-100 text-red-700' :
                    result.recommendation.severity === 'Moderate' ? 'bg-orange-100 text-orange-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {result.recommendation.severity} Severity
                  </span>
                </div>
                <p className="text-2xl font-bold text-red-600 mb-1">{result.primary_disease}</p>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span>Confidence: {result.detections[0]?.confidence_pct || 'N/A'}</span>
                </div>
                <div className="text-sm text-gray-700">
                  <span className="font-medium">Cause:</span> {result.recommendation.cause}
                </div>
                <div className="text-sm text-gray-700">
                  <span className="font-medium">Symptoms:</span> {result.recommendation.symptoms}
                </div>
              </div>

              {/* Treatment */}
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-green-700 flex-shrink-0 mt-0.5" />
                  <h4 className="font-semibold text-green-900">Recommended Treatment</h4>
                </div>
                <ul className="text-sm text-green-800 space-y-2 list-decimal list-inside">
                  {result.recommendation.treatment_steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
              </div>

              {/* Prevention */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
                  <h4 className="font-semibold text-blue-900">Prevention Measures</h4>
                </div>
                <ul className="text-sm text-blue-800 space-y-2 list-disc list-inside">
                  {result.recommendation.prevention.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* Sri Lanka Note & Urgency */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">Urgency:</span>
                  <span className="text-red-600 font-semibold uppercase text-xs">{result.recommendation.urgency}</span>
                </div>
                {result.recommendation.sri_lanka_note && (
                  <div className="p-2 bg-yellow-50 border border-yellow-100 rounded text-xs text-yellow-800 italic">
                    Note: {result.recommendation.sri_lanka_note}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium">
                  Save Report
                </button>
                <button className="flex-1 px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium">
                  Scan Another
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Scans */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Scans</h3>
        <div className="space-y-3">
          {history.map((scan, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{scan.disease}</p>
                <p className="text-xs text-gray-500">{scan.date} • {scan.block}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                scan.severity === 'High' ? 'bg-red-100 text-red-700' :
                scan.severity === 'Moderate' || scan.severity === 'Medium' ? 'bg-orange-100 text-orange-700' :
                'bg-green-100 text-green-700'
              }`}>
                {scan.severity}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { SignIn } from "@clerk/clerk-react";
import { Leaf } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function LoginPage() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            TeaPlanter AI Enterprise
          </h1>
          <p className="text-gray-600">
            Precision Plantation Management System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-xl p-8 flex flex-col items-center">
          {/* Language Selector */}
          <div className="mb-6 w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="en">English</option>
              <option value="si">සිංහල (Sinhala)</option>
              <option value="ta">தமிழ் (Tamil)</option>
            </select>
          </div>

          {/* Clerk SignIn */}
          <SignIn
            routing="hash"
            appearance={{
              elements: {
                formButtonPrimary: 'bg-green-600 hover:bg-green-700 text-sm normal-case',
                card: 'shadow-none border-none p-0 w-full',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',
              }
            }}
          />
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-600 mt-6">
          © 2026 TeaPlanter AI Enterprise
        </p>
      </div>
    </div>
  );
}

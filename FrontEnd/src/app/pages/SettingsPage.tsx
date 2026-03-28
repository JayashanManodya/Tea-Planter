import { useState, useEffect } from 'react';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { useUser, useAuth } from "@clerk/clerk-react";
import { Globe, User, Bell, Shield, Sprout, MapPin, Maximize, QrCode, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();
  const { user } = useUser();
  const { getToken } = useAuth();
  const userRole = user?.publicMetadata?.role as string || 'Member';
  const plantationId = user?.publicMetadata?.plantationId as string | undefined;

  const [plantation, setPlantation] = useState<any>(null);
  const [loadingPlantation, setLoadingPlantation] = useState(false);

  useEffect(() => {
    const fetchPlantation = async () => {
      if (plantationId && user?.id) {
        setLoadingPlantation(true);
        try {
          const token = await getToken();
          const p = await api.getPlantation(user.id, token || undefined);
          setPlantation(p);
        } catch (error) {
          console.error('Failed to fetch plantation:', error);
        } finally {
          setLoadingPlantation(false);
        }
      }
    };

    fetchPlantation();
  }, [plantationId, user?.id]);

  return (
    <div className="p-6 space-y-6 text-left">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('settings')}</h1>
        <p className="text-gray-600 mt-1">Manage your account and preferences</p>
      </div>

      {/* Language Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-blue-100">
            <Globe className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{t('select-language')}</h3>
            <p className="text-sm text-gray-600">Choose your preferred language</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {(['en', 'si', 'ta'] as Language[]).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`p-4 rounded-lg border-2 font-medium transition-all ${language === lang
                ? 'border-green-600 bg-green-50 text-green-700'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
            >
              {t(lang === 'en' ? 'english' : lang === 'si' ? 'sinhala' : 'tamil')}
            </button>
          ))}
        </div>
      </div>

      {/* Profile Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-green-100">
            <User className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Profile Information</h3>
            <p className="text-sm text-gray-600">Your account details (Managed via Clerk)</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            {user?.imageUrl && <img src={user.imageUrl} className="w-16 h-16 rounded-full border-2 border-green-500" alt="Avatar" />}
            <div>
              <p className="font-bold text-lg text-gray-900">{user?.fullName}</p>
              <p className="text-sm text-gray-500 capitalize font-medium">{userRole}</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={user?.primaryEmailAddress?.emailAddress}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-orange-100">
            <Bell className="w-5 h-5 text-orange-700" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            <p className="text-sm text-gray-600">Manage notification preferences</p>
          </div>
        </div>

        <div className="space-y-3">
          {[
            { label: 'Weather alerts', enabled: true },
            { label: 'Low inventory warnings', enabled: true },
            { label: 'Task reminders', enabled: false },
            { label: 'Disease detection alerts', enabled: true },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-900">{item.label}</span>
              <button
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${item.enabled ? 'bg-green-600' : 'bg-gray-300'
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${item.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-red-100">
            <Shield className="w-5 h-5 text-red-700" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Security</h3>
            <p className="text-sm text-gray-600">Your security settings are managed by Google & Clerk</p>
          </div>
        </div>

        <a
          href="https://accounts.clerk.com/user"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-black transition-colors"
        >
          Manage Account Security
        </a>
      </div>

      {/* Security PIN Settings */}
      <PinSettings />

      {/* Personal Profile Settings */}
      <PersonalProfile />

      {/* Worker QR Settings (Only for workers) */}
      {(userRole.toLowerCase() === 'worker' || userRole.toLowerCase() === 'clerk') && (
        <WorkerQRSettings />
      )}

      {plantation && (
        <PlantationCard plantation={plantation} loading={loadingPlantation} />
      )}

      {!plantationId && (
        <PlantationForm />
      )}

    </div>
  );
}

function PlantationCard({ plantation, loading }: { plantation: any, loading: boolean }) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: plantation.name,
    location: plantation.location,
    totalArea: plantation.totalArea,
    latitude: plantation.latitude || '',
    longitude: plantation.longitude || '',
    harvestingRate: plantation.harvestingRate || ''
  });

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    setError(null);
    try {
      const token = await getToken();
      await api.updatePlantation(
        {
          ...formData,
          totalArea: parseFloat(formData.totalArea),
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          harvestingRate: formData.harvestingRate ? parseFloat(formData.harvestingRate) : null
        },
        user?.id || '',
        token || undefined
      );

      setIsEditing(false);
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Failed to update plantation');
    } finally {
      setEditLoading(false);
    }
  };

  if (loading) return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-green-600" />
    </div>
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-100">
            <Sprout className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-left">My Plantation</h3>
            <p className="text-sm text-gray-600 text-left">Primary estate information</p>
          </div>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm font-medium text-green-600 hover:text-green-700"
          >
            Edit Details
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleUpdate} className="space-y-4">
          {error && <p className="text-sm text-red-600 text-left">{error}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 text-left">Estate Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 text-left">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 text-left">Total Acreage</label>
              <input
                type="number"
                step="0.1"
                value={formData.totalArea}
                onChange={(e) => setFormData({ ...formData, totalArea: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 text-left">Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="e.g. 6.9271"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 text-left">Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="e.g. 79.8612"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 text-left">Harvesting Rate (LKR/kg)</label>
              <input
                type="number"
                step="0.01"
                value={formData.harvestingRate}
                onChange={(e) => setFormData({ ...formData, harvestingRate: e.target.value })}
                placeholder="e.g. 50.00"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={editLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {editLoading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Estate Name</p>
            <p className="font-bold text-gray-900">{plantation.name}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Location</p>
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-gray-400" />
              <p className="font-bold text-gray-900">{plantation.location}</p>
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Total Acreage</p>
            <div className="flex items-center gap-1">
              <Maximize className="w-3 h-3 text-gray-400" />
              <p className="font-bold text-gray-900">{plantation.totalArea} Acres</p>
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Coordinates</p>
            <p className="text-xs font-bold text-gray-900">
              {plantation.latitude && plantation.longitude
                ? `${plantation.latitude.toFixed(4)}, ${plantation.longitude.toFixed(4)}`
                : 'Not set'}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Harvesting Rate</p>
            <p className="font-bold text-gray-900">
              {plantation.harvestingRate ? `LKR ${plantation.harvestingRate.toFixed(2)} / kg` : 'Not set'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function PlantationForm() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    totalArea: '',
    latitude: '',
    longitude: '',
    harvestingRate: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      await api.createPlantation(
        {
          name: formData.name,
          location: formData.location,
          totalArea: parseFloat(formData.totalArea),
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          harvestingRate: formData.harvestingRate ? parseFloat(formData.harvestingRate) : null
        },
        user?.id || '',
        token || undefined
      );

      setSuccess(true);
      // Force reload to update metadata/role
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Failed to create plantation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-green-100">
          <Sprout className="w-5 h-5 text-green-700" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 text-left">Become an Owner</h3>
          <p className="text-sm text-gray-600 text-left">Create your plantation to start managing your own tea estate</p>
        </div>
      </div>

      {success ? (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
          Plantation created successfully! Redirecting...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-left">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Plantation Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Summit Tea Estate"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Location</label>
              <input
                type="text"
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Nuwara Eliya"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Total Area (Acreage)</label>
              <input
                type="number"
                step="0.1"
                required
                value={formData.totalArea}
                onChange={(e) => setFormData({ ...formData, totalArea: e.target.value })}
                placeholder="e.g., 50.5"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="6.9271"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="79.8612"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Harvesting Rate (LKR/kg)</label>
              <input
                type="number"
                step="0.01"
                value={formData.harvestingRate}
                onChange={(e) => setFormData({ ...formData, harvestingRate: e.target.value })}
                placeholder="e.g. 50.00"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 rounded-lg font-bold text-white transition-all ${loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
              }`}
          >
            {loading ? 'Creating...' : 'Create Plantation & Become Owner'}
          </button>
        </form>
      )
      }
    </div >
  );
}

function PinSettings() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      setError('PIN must be exactly 6 digits.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const token = await getToken();
      await api.updatePin(user?.id || '', pin, token || undefined);
      setSuccess(true);
      setPin('');
    } catch (err: any) {
      setError(err.message || 'Failed to update PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:border-indigo-200 transition-colors">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-indigo-100">
          <Shield className="w-5 h-5 text-indigo-700" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Security PIN</h3>
          <p className="text-sm text-gray-600">Set a 6-digit PIN to allow owners to assign you as a worker.</p>
        </div>
      </div>

      <form onSubmit={handleUpdatePin} className="space-y-4 max-w-sm">
        {error && <p className="text-sm text-red-600 text-left">{error}</p>}
        {success && <p className="text-sm text-green-600 text-left">PIN updated successfully!</p>}

        <div className="flex gap-2">
          <input
            type="text"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="Enter 6-digit PIN"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50 hover:bg-white transition-colors"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {loading ? 'Updating...' : 'Set PIN'}
          </button>
        </div>
      </form>
    </div>
  );
}

function PersonalProfile() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [profileData, setProfileData] = useState({
    phone: '',
    gender: 'Male',
    birthday: '',
    bankName: '',
    branchName: '',
    accountNumber: '',
    accountHolderName: '',
    emergencyContact: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      try {
        const token = await getToken();
        const data = await api.getMe(user.id, token || undefined);
        if (data) {
          setProfileData({
            phone: data.phone || '',
            gender: data.gender || 'Male',
            birthday: data.birthday || '',
            bankName: data.bankName || '',
            branchName: data.branchName || '',
            accountNumber: data.accountNumber || '',
            accountHolderName: data.accountHolderName || '',
            emergencyContact: data.emergencyContact || ''
          });
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        setFetching(false);
      }
    };
    fetchProfile();
  }, [user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const token = await getToken();
      await api.updateUserProfile(user?.id || '', profileData, token || undefined);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mt-6 mb-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-blue-100">
          <User className="w-5 h-5 text-blue-700" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Personal Profile</h3>
          <p className="text-sm text-gray-600">Manage your contact and identity details. Owners will use this for workforce management.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        {error && <p className="text-sm text-red-600 text-left">{error}</p>}
        {success && <p className="text-sm text-green-600 text-left">Profile updated successfully!</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Phone Number</label>
            <input
              type="tel"
              value={profileData.phone}
              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              placeholder="e.g. 071 234 5678"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Gender</label>
            <select
              value={profileData.gender}
              onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Birthday</label>
            <input
              type="date"
              value={profileData.birthday}
              onChange={(e) => setProfileData({ ...profileData, birthday: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Bank Name</label>
            <input
              type="text"
              value={profileData.bankName}
              onChange={(e) => setProfileData({ ...profileData, bankName: e.target.value })}
              placeholder="e.g. Bank of Ceylon"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Branch Name</label>
            <input
              type="text"
              value={profileData.branchName}
              onChange={(e) => setProfileData({ ...profileData, branchName: e.target.value })}
              placeholder="e.g. Colombo Fort"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Account Number</label>
            <input
              type="text"
              value={profileData.accountNumber}
              onChange={(e) => setProfileData({ ...profileData, accountNumber: e.target.value })}
              placeholder="e.g. 123456789"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Account Holder Name</label>
            <input
              type="text"
              value={profileData.accountHolderName}
              onChange={(e) => setProfileData({ ...profileData, accountHolderName: e.target.value })}
              placeholder="e.g. J. Doe"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Emergency Contact</label>
          <input
            type="text"
            value={profileData.emergencyContact}
            onChange={(e) => setProfileData({ ...profileData, emergencyContact: e.target.value })}
            placeholder="Name / Relationship / Phone"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Saving...' : 'Save Profile Details'}
        </button>
      </form>
    </div>
  );
}

function WorkerQRSettings() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [plantations, setPlantations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const fetchWorkerData = async () => {
      if (!user?.id) return;
      try {
        const token = await getToken();
        // Fetch plantations where this user is a worker
        const data = await api.getWorkerPlantations(user.id, token || undefined);
        setPlantations(data);
      } catch (err) {
        console.error('Failed to fetch worker plantations:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkerData();
  }, [user?.id]);

  const handleGenerate = async (workerId: number) => {
    setIsGenerating(true);
    try {
      const token = await getToken();
      await api.generateWorkerQr(workerId, token || undefined);
      toast.success('QR Code generated successfully!');
      // Refresh data
      const updatedData = await api.getWorkerPlantations(user?.id || '', token || undefined);
      setPlantations(updatedData);
    } catch (err: any) {
      toast.error('Failed to generate QR code: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadQR = (qrCode: string, name: string) => {
    const svg = document.getElementById(`qr-${qrCode}`);
    if (!svg) {
      toast.error("Could not find QR code element for download");
      return;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    // Wrap in a Blob and create a URL
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      // Scale up for high resolution
      const scale = 4;
      canvas.width = (svg as any).width.baseVal.value * scale;
      canvas.height = (svg as any).height.baseVal.value * scale;
      
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `QR-Attendance-${name}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);
      toast.success("QR Code downloaded as PNG");
    };

    img.onerror = () => {
      toast.error("Failed to convert QR code to PNG");
      URL.revokeObjectURL(url);
    };

    img.src = url;
  };

  if (loading) return null;
  if (plantations.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mt-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-orange-100">
          <QrCode className="w-5 h-5 text-orange-700" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 text-left">Attendance QR Codes</h3>
          <p className="text-sm text-gray-600 text-left">Generate and download your unique QR codes for attendance marking.</p>
        </div>
      </div>

      <div className="space-y-6">
        {plantations.map((p) => (
          <div key={p.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 text-left">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Plantation / Estate</p>
              <h4 className="font-bold text-gray-900 text-lg">{p.name}</h4>
              <p className="text-sm text-gray-500">{p.location}</p>
              <div className="mt-4">
                {!p.qrCode ? (
                  <button
                    onClick={() => handleGenerate(p.workerId)}
                    disabled={isGenerating}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700 disabled:opacity-50 transition-colors"
                  >
                    {isGenerating ? 'Generating...' : 'Generate My QR Code'}
                  </button>
                ) : (
                  <button
                    onClick={() => downloadQR(p.qrCode, p.name)}
                    className="flex items-center gap-2 text-orange-600 font-bold text-sm hover:underline"
                  >
                    <Download className="w-4 h-4" />
                    Download QR Code (PNG)
                  </button>
                )}
              </div>
            </div>

            {p.qrCode && (
              <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                <QRCodeSVG
                  id={`qr-${p.qrCode}`}
                  value={p.qrCode}
                  size={120}
                  level="H"
                  includeMargin={true}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Sprout, Loader2, CheckCircle2, Circle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { submitPayHereCheckout } from '@/lib/payhere';
import {
  clearPayHerePendingFlags,
  isPayHerePendingReturn,
  PAYHERE_ORDER_ID_KEY,
  setPayHerePendingFlags,
} from '@/lib/ownerPayHere';

type Phase = 'loading' | 'confirming' | 'payment' | 'plantation';

async function createPlantationWithRetries(
  body: {
    name: string;
    location: string;
    totalArea: number;
    latitude: number | null;
    longitude: number | null;
    harvestingRate: number | null;
  },
  clerkId: string,
  getToken: () => Promise<string | null>
) {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const t = await getToken();
      await api.createPlantation(body, clerkId, t || undefined);
      return { ok: true as const };
    } catch (err: unknown) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const waitForSubscription =
        /subscription required|owner subscription|active owner subscription/i.test(msg) && attempt < 2;
      if (waitForSubscription) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      break;
    }
  }
  return { ok: false as const, error: lastErr };
}

export function OwnerOnboardingPage() {
  const { isLoaded, user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const userRole = (user?.publicMetadata?.role as string) || 'worker';

  const [phase, setPhase] = useState<Phase>('loading');
  const [payLoading, setPayLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [retryConfirmLoading, setRetryConfirmLoading] = useState(false);
  const [confirmHint, setConfirmHint] = useState(false);
  const [confirmElapsedSeconds, setConfirmElapsedSeconds] = useState(0);
  const [devSettleMode, setDevSettleMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    totalArea: '',
    latitude: '',
    longitude: '',
    harvestingRate: '',
  });

  const payhereReturnParam = searchParams.get('payhere_return');

  /** setSearchParams is stable; functional update avoids stale searchParams and effect churn. */
  const stripPayHereReturnQuery = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (next.get('payhere_return') !== '1') return prev;
        next.delete('payhere_return');
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const getTokenRef = useRef(getToken);
  const navigateRef = useRef(navigate);
  const userRef = useRef(user);
  getTokenRef.current = getToken;
  navigateRef.current = navigate;
  userRef.current = user;

  useEffect(() => {
    if (!isLoaded || !user?.id) return;

    let cancelled = false;

    const proceedAfterSubscriptionConfirmed = async () => {
      clearPayHerePendingFlags();
      localStorage.removeItem(PAYHERE_ORDER_ID_KEY);
      stripPayHereReturnQuery();
      toast.success('Payment successful. Next, save your estate details.');

      const u = userRef.current;
      const token2 = await getTokenRef.current();
      try {
        const p = await api.getPlantation(u.id, token2 || undefined);
        if (p && (p as { id?: number }).id != null) {
          try {
            await u.reload();
          } catch {
            /* optional */
          }
          navigateRef.current('/dashboard', { replace: true });
          return;
        }
      } catch {
        /* no plantation yet */
      }

      if (!cancelled) setPhase('plantation');
    };

    const fromPayHere = payhereReturnParam === '1' || isPayHerePendingReturn();

    (async () => {
      if (!fromPayHere) {
        try {
          const token = await getTokenRef.current();
          const p = await api.getPlantation(user.id, token || undefined);
          if (!cancelled && p && (p as { id?: number }).id != null) {
            navigateRef.current('/dashboard', { replace: true });
            return;
          }
        } catch {
          /* no plantation */
        }
        if (cancelled) return;
        try {
          const token = await getTokenRef.current();
          const st = await api.getOwnerSubscriptionStatus(user.id, token || undefined);
          const portal =
            st?.hasOwnerPortalAccess === true || st?.hasOwnerPortalAccess === 'true';
          if (!cancelled) setPhase(portal ? 'plantation' : 'payment');
        } catch {
          if (!cancelled) setPhase('payment');
        }
        return;
      }

      setPhase('confirming');
      try {
        toast('Confirming your subscription…');
        const maxAttempts = 20;
        const delayMs = 1500;
        const allowDevSettle =
          import.meta.env.DEV || import.meta.env.VITE_PAYHERE_DEV_SETTLE === 'true';
        setDevSettleMode(allowDevSettle);

        for (let i = 0; i < maxAttempts && !cancelled; i++) {
          try {
            const token = await getTokenRef.current();
            const status = await api.getOwnerSubscriptionStatus(user.id, token || undefined);
            const portal =
              status?.hasOwnerPortalAccess === true || status?.hasOwnerPortalAccess === 'true';
            if (portal) {
              if (!cancelled) await proceedAfterSubscriptionConfirmed();
              return;
            }
          } catch {
            /* retry */
          }

          await new Promise((r) => setTimeout(r, delayMs));
        }

        if (cancelled) return;

        clearPayHerePendingFlags();
        stripPayHereReturnQuery();
        if (!cancelled) {
          setPhase('payment');
          toast.error(
            'Could not confirm payment yet. PayHere must reach your API (use ngrok for notify_url). For local dev: set PAYHERE_MANUAL_SETTLE_ENABLED=true on the backend, then pay again or click “Retry confirmation” below.'
          );
        }
      } catch {
        if (!cancelled) setPhase('payment');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, user?.id, payhereReturnParam, stripPayHereReturnQuery]);

  useEffect(() => {
    if (phase !== 'confirming') {
      setConfirmHint(false);
      return;
    }
    const t = window.setTimeout(() => setConfirmHint(true), 10000);
    return () => window.clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'confirming') {
      setConfirmElapsedSeconds(0);
      return;
    }

    const timer = window.setInterval(() => {
      setConfirmElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [phase]);

  const handleRetryConfirmation = async () => {
    if (!user?.id) return;
    setRetryConfirmLoading(true);
    try {
      const token = await getToken();
      const oid = localStorage.getItem(PAYHERE_ORDER_ID_KEY) || undefined;
      await api.payhereManualSettleLocal(user.id, oid, token || undefined);
      const st = await api.getOwnerSubscriptionStatus(user.id, token || undefined);
      const ok =
        st?.hasOwnerPortalAccess === true || st?.hasOwnerPortalAccess === 'true';
      if (ok) {
        clearPayHerePendingFlags();
        localStorage.removeItem(PAYHERE_ORDER_ID_KEY);
        stripPayHereReturnQuery();
        toast.success('Payment confirmed.');
        try {
          const p = await api.getPlantation(user.id, token || undefined);
          if (p && (p as { id?: number }).id != null) {
            await user.reload();
            navigate('/dashboard', { replace: true });
            return;
          }
        } catch {
          /* new owner — no plantation yet */
        }
        setPhase('plantation');
        return;
      }
      toast.error(
        'Subscription still not active. Ensure the backend received the payment (webhook or manual settle).'
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not confirm payment');
    } finally {
      setRetryConfirmLoading(false);
    }
  };

  const handleStartPayment = async () => {
    if (!user?.id) return;
    setPayLoading(true);
    setError(null);
    try {
      setPayHerePendingFlags();
      const token = await getToken();
      const session = await api.createOwnerSubscriptionSession(user.id, token || undefined);
      if (session?.order_id) {
        localStorage.setItem(PAYHERE_ORDER_ID_KEY, String(session.order_id));
      }
      submitPayHereCheckout(session);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start checkout';
      setError(msg);
      setPayLoading(false);
    }
  };

  const handleCreatePlantation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    const name = formData.name.trim();
    const location = formData.location.trim();
    const totalArea = parseFloat(formData.totalArea);
    if (!name || !location || !Number.isFinite(totalArea) || totalArea <= 0) {
      setError('Please enter estate name, location, and a valid total area.');
      return;
    }
    const latRaw =
      formData.latitude.trim() !== '' ? parseFloat(formData.latitude) : NaN;
    const lonRaw =
      formData.longitude.trim() !== '' ? parseFloat(formData.longitude) : NaN;
    const hrRaw =
      formData.harvestingRate.trim() !== '' ? parseFloat(formData.harvestingRate) : NaN;
    const body = {
      name,
      location,
      totalArea,
      latitude: Number.isFinite(latRaw) ? latRaw : null,
      longitude: Number.isFinite(lonRaw) ? lonRaw : null,
      harvestingRate: Number.isFinite(hrRaw) ? hrRaw : null,
    };

    setSubmitLoading(true);
    setError(null);
    const result = await createPlantationWithRetries(body, user.id, getToken);
    setSubmitLoading(false);
    if (result.ok) {
      toast.success('Plantation created and saved.');
      try {
        await user.reload();
      } catch {
        /* optional */
      }
      navigate('/dashboard', { replace: true });
    } else {
      const msg =
        result.error instanceof Error ? result.error.message : 'Could not save plantation.';
      setError(msg);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 animate-spin text-green-600" />
      </div>
    );
  }

  if (userRole.toLowerCase() === 'clerk') {
    return (
      <div className="p-6 max-w-lg mx-auto text-left">
        <p className="text-gray-700">Clerk accounts cannot register a new estate here.</p>
        <Link to="/settings" className="text-green-700 font-medium mt-4 inline-block">
          Back to settings
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto text-left space-y-8">
      <div>
        <Link to="/settings" className="text-sm text-green-700 font-medium hover:underline">
          ← Settings
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Owner setup</h1>
        <p className="text-gray-600 mt-1">
          Complete payment first, then enter your estate details. Your plantation is only created after both steps.
        </p>
      </div>

      <ol className="flex flex-col sm:flex-row gap-4 sm:gap-8 border border-gray-200 rounded-xl p-4 bg-white">
        <li className="flex items-start gap-3 flex-1">
          {phase === 'plantation' ? (
            <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
          ) : phase === 'confirming' ? (
            <Loader2 className="w-6 h-6 text-green-600 shrink-0 animate-spin" />
          ) : (
            <Circle className="w-6 h-6 text-gray-300 shrink-0" />
          )}
          <div>
            <p className="font-semibold text-gray-900">1. Subscription payment</p>
            <p className="text-sm text-gray-600">Get Subscribed and Activate your Owner Access.</p>
          </div>
        </li>
        <li className="flex items-start gap-3 flex-1">
          {phase === 'plantation' ? (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">
              2
            </span>
          ) : (
            <Circle className="w-6 h-6 text-gray-300 shrink-0" />
          )}
          <div>
            <p className="font-semibold text-gray-900">2. Estate details</p>
            <p className="text-sm text-gray-600">Shown after payment succeeds; creates your plantation in the database.</p>
          </div>
        </li>
      </ol>

      {phase === 'loading' || phase === 'confirming' ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 bg-white border border-gray-200 rounded-xl px-4">
          <Loader2 className="w-10 h-10 animate-spin text-green-600" />
          {phase === 'confirming' ? (
            <div className="w-full max-w-xl rounded-xl border border-green-100 bg-green-50/60 p-4 space-y-4">
              <div className="text-center space-y-1">
                <p className="text-base font-semibold text-gray-900">Finalizing your payment</p>
                <p className="text-sm text-gray-600">
                  Securely syncing PayHere confirmation with your owner account.
                </p>
                <p className="text-xs text-gray-500">Elapsed: {confirmElapsedSeconds}s</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg border border-green-200 bg-white px-3 py-2 text-sm">
                  <span className="text-gray-700">Payment returned from PayHere</span>
                  <span className="font-medium text-green-700">Done</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-green-200 bg-white px-3 py-2 text-sm">
                  <span className="text-gray-700">Checking your payment status</span>
                  <span className="font-medium text-amber-700 animate-pulse">In progress</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                  <span className="text-gray-700">Preparing estate setup step</span>
                  <span className="font-medium text-gray-500">Next</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-600 text-center">Loading…</p>
          )}
          {phase === 'confirming' && confirmHint && devSettleMode ? (
            <div className="max-w-md text-sm text-gray-600 text-center space-y-2">
              <p>
                This step waits until your <strong>backend</strong> marks the subscription paid. PayHere’s servers usually{' '}
                <strong>cannot reach localhost</strong> for <code className="text-xs bg-gray-100 px-1 rounded">notify_url</code>, so
                nothing updates until you use a public URL (e.g. ngrok) or{' '}
                <strong>manual settle</strong> in dev (
                <code className="text-xs bg-gray-100 px-1 rounded">PAYHERE_MANUAL_SETTLE_ENABLED=true</code> on the API).
              </p>
              <button
                type="button"
                disabled={retryConfirmLoading}
                onClick={handleRetryConfirmation}
                className="mt-2 px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-50"
              >
                {retryConfirmLoading ? 'Working…' : 'Retry confirmation (manual settle)'}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {phase === 'payment' ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <Sprout className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Step 1 : Pay here</h2>
              <p className="text-sm text-gray-600">You will return to this page after Paid.</p>
            </div>
          </div>
          {error && (
            <div className="bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          <button
            type="button"
            onClick={handleStartPayment}
            disabled={payLoading}
            className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black disabled:opacity-50"
          >
            {payLoading ? 'Redirecting…' : 'Proceed to payment'}
          </button>
        </div>
      ) : null}

      {phase === 'plantation' ? (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <Sprout className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Step 2 — Estate details</h2>
              <p className="text-sm text-gray-600">This creates your plantation in the database.</p>
            </div>
          </div>
          <form onSubmit={handleCreatePlantation} className="space-y-4">
            {error && (
              <div className="bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plantation name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="e.g. Summit Tea Estate"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="e.g. Nuwara Eliya"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total area (acres)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={formData.totalArea}
                  onChange={(e) => setFormData({ ...formData, totalArea: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="e.g. 50.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm"
                    placeholder="6.9271"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm"
                    placeholder="79.8612"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Harvesting rate (LKR/kg) <span className="text-gray-400 font-normal">optional</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.harvestingRate}
                onChange={(e) => setFormData({ ...formData, harvestingRate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg max-w-md"
                placeholder="e.g. 50"
              />
            </div>
            <button
              type="submit"
              disabled={submitLoading}
              className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50"
            >
              {submitLoading ? 'Saving…' : 'Create plantation'}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

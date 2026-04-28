import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import { AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';

export function OwnerSubscriptionBanner() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const role = ((user.publicMetadata?.role as string) || '').toLowerCase();
    if (role !== 'owner' && role !== 'clerk') return;

    let cancelled = false;
    (async () => {
      try {
        const t = await getToken();
        const s = await api.getOwnerSubscriptionStatus(user.id, t || undefined);
        if (cancelled) return;
        if (s?.inGracePeriod && s?.graceEndsAt) {
          const d = new Date(s.graceEndsAt as string).toLocaleString();
          setMsg(
            `Your paid period ended — you are in the grace window. Renew by ${d} to keep owner dashboard access. After grace, access pauses until payment; your plantation data is not deleted.`
          );
          return;
        }
        if (s?.phase === 'ACTIVE' && s?.validUntil) {
          const vu = new Date(s.validUntil as string).getTime();
          const daysLeft = (vu - Date.now()) / (86400 * 1000);
          if (daysLeft > 0 && daysLeft <= 5) {
            setMsg(
              `Owner subscription is active until ${new Date(s.validUntil as string).toLocaleDateString()} (~${Math.ceil(daysLeft)} day(s)). Renew from Settings (Owner subscription) or owner setup to avoid interruption.`
            );
            return;
          }
        }
        setMsg(null);
      } catch {
        if (!cancelled) setMsg(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.publicMetadata?.role, getToken]);

  if (!msg) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-950 px-4 py-3 text-sm flex items-start gap-2 shrink-0">
      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-700" />
      <div className="flex-1 min-w-0">
        <p className="text-left">{msg}</p>
        <Link to="/owner-onboarding" className="font-semibold text-amber-900 underline mt-1 inline-block">
          Open owner setup / subscription
        </Link>
      </div>
    </div>
  );
}

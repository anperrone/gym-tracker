import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/useAuth';
import { fetchHealth } from '@/lib/api';

export function HomePage() {
  const { user } = useAuth();
  const { data, isPending, isError } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
  });

  const status = isPending ? '...' : isError ? 'offline' : data.ok ? 'online' : 'errore';

  return (
    <section>
      <h2 className="text-base font-semibold text-slate-700">
        Ciao{user?.name ? `, ${user.name}` : ''} 👋
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Stato API: <span className="font-mono">{status}</span>
      </p>
    </section>
  );
}

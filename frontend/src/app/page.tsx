'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { hasRole, ROLES } from '@/lib/roles';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        if (user?.is_super_admin) {
          router.push('/admin/dashboard');
          // Redirect to specific event if assigned
          const eventRole = user?.roles?.find((r: any) => r.role === ROLES.EVENT_MANAGER && r.event_id);
          if (eventRole?.event_id) {
            router.push(`/events/${eventRole.event_id}`);
          } else {
            router.push('/events'); // Fallback
          }
        } else {
          router.push('/dashboard');
        }
      } else {
        router.push('/login');
      }
    }
  }, [isAuthenticated, isLoading, router, user]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

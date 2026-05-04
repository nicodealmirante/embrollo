import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, User } from 'lucide-react';
import { useRoleNames } from '@/hooks/useRoleNames';

import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    base44.auth.me()
      .then(me => {
        setUser(me);
        setLoading(false);
      })
      .catch(e => {
        base44.auth.redirectToLogin();
      });
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return <Navigate to="/portal" replace />;
}
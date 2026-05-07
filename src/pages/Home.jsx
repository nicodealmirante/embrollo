import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, User } from 'lucide-react';
import { useRoleNames } from '@/hooks/useRoleNames';

import { base44 } from '@/api/base44Client';
import DolphinLoader from '@/components/DolphinLoader';
import { useEffect, useState } from 'react';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    Promise.all([
      base44.auth.me(),
      new Promise(resolve => setTimeout(resolve, 1000))
    ])
      .then(([me]) => {
        setUser(me);
        setLoading(false);
      })
      .catch(e => {
        base44.auth.redirectToLogin();
      });
  }, []);

  if (loading) {
    return <DolphinLoader text="Cargando..." />;
  }

  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return <Navigate to="/portal" replace />;
}
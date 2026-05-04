import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, User } from 'lucide-react';
import { useRoleNames } from '@/hooks/useRoleNames';

export default function Home() {
  const { user, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const { adminName, userName } = useRoleNames();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/portal" replace />;
  }

  if (user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return <Navigate to="/portal" replace />;
}
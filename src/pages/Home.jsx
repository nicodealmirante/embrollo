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

  if (user.role !== 'admin') {
    return <Navigate to="/portal" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-sm w-full bg-card border border-border rounded-3xl p-8 text-center space-y-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-black mb-2">Bienvenido</h1>
          <p className="text-sm text-muted-foreground">¿Cómo querés ingresar hoy?</p>
        </div>
        
        <div className="grid gap-3">
          <Button 
            onClick={() => navigate('/admin')} 
            className="h-14 w-full rounded-2xl text-base font-bold gap-2"
          >
            <LayoutDashboard className="w-5 h-5" />
            Entrar como {adminName}
          </Button>
          
          <Button 
            onClick={() => navigate('/portal')} 
            variant="outline" 
            className="h-14 w-full rounded-2xl text-base font-bold gap-2"
          >
            <User className="w-5 h-5" />
            Entrar como {userName}
          </Button>
        </div>
      </div>
    </div>
  );
}
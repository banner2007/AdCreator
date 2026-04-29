import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { UserProfile } from '../types';
import { LayoutDashboard, PlusCircle, History, LogOut, Wallet, Zap, Settings, Menu, X as CloseIcon } from 'lucide-react';
import Generator from './Generator';
import HistoryView from './HistoryView';
import ConfigView from './ConfigView';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

type View = 'home' | 'generator' | 'history' | 'config';

export default function Dashboard({ user, profile, onLogout, refreshProfile }: { 
  user: User, 
  profile: UserProfile | null, 
  onLogout: () => void,
  refreshProfile: () => Promise<void>
}) {
  const [view, setView] = useState<View>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  const handleViewChange = (newView: View) => {
    setView(newView);
    closeSidebar();
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 md:border-8 border-slate-200 overflow-hidden relative">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSidebar}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-300 flex flex-col z-50 transition-transform duration-300 transform lg:relative lg:translate-x-0 cursor-default",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-8 pb-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-sm flex items-center justify-center text-white font-black text-xl shadow-sm">
              A
            </div>
            <span className="text-xl font-bold tracking-tight">AdGen <span className="text-indigo-600 font-medium italic">COL</span></span>
          </div>
          <button onClick={closeSidebar} className="lg:hidden p-2 text-slate-400 hover:text-slate-900">
            <CloseIcon size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <NavItem 
            icon={<Settings size={18} />} 
            label="Configuración de creativos" 
            active={view === 'config'} 
            onClick={() => handleViewChange('config')} 
          />
          <NavItem 
            icon={<LayoutDashboard size={18} />} 
            label="Panel Principal" 
            active={view === 'home'} 
            onClick={() => handleViewChange('home')} 
          />
          <NavItem 
            icon={<PlusCircle size={18} />} 
            label="Nuevo Anuncio" 
            active={view === 'generator'} 
            onClick={() => handleViewChange('generator')} 
          />
          <NavItem 
            icon={<History size={18} />} 
            label="Historial" 
            active={view === 'history'} 
            onClick={() => handleViewChange('history')} 
          />
        </nav>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm overflow-hidden bg-slate-200 shrink-0">
              <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="Avatar" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-widest text-slate-900 truncate">{user.displayName?.split(' ')[0]}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">{profile?.subscriptionPlan}</p>
            </div>
          </div>
          
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 rounded-sm text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-all"
          >
            <LogOut size={14} /> Salir
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Rail */}
        <header className="h-16 border-b border-slate-300 bg-white flex items-center justify-between px-4 lg:px-10 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={toggleSidebar} className="lg:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-sm transition-colors">
              <Menu size={20} />
            </button>
            <div className="hidden sm:flex items-center space-x-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status</span>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-2">Sistemas Operativos</span>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center bg-slate-100 px-3 py-1.5 lg:px-4 lg:py-2 rounded-full border border-slate-200 shadow-inner">
              <span className="text-[8px] lg:text-[9px] uppercase tracking-[0.2em] font-black text-slate-500 mr-2 lg:mr-3">Créditos</span>
              <span className="text-[10px] lg:text-xs font-black text-indigo-700 font-mono tracking-tighter truncate max-w-[120px]">{(profile?.credits || 0) * 1000} COP EST.</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar">
          {view === 'home' && (
            <div className="max-w-5xl mx-auto">
              <div className="mb-12 md:mb-16">
                <span className="label-micro block mb-2">Resumen de Cuenta</span>
                <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase leading-[0.9]">
                  Dashboard <span className="text-indigo-600 italic">Central</span>.
                </h1>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                <div 
                  onClick={() => handleViewChange('generator')}
                  className="group bg-white p-8 md:p-10 border border-slate-200 rounded-lg hover:border-indigo-600 transition-all cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity hidden md:block">
                    <PlusCircle size={120} />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600 mb-4 md:mb-6 flex items-center gap-2">
                    <Zap size={14} /> Crear Nuevo Creativo
                  </h3>
                  <p className="text-xl md:text-2xl font-bold text-slate-900 mb-6 md:mb-8 max-w-[240px]">Transforma tu marketing con un solo clic.</p>
                  <button className="w-full md:w-auto px-6 py-3 bg-slate-900 text-white rounded-sm text-[10px] font-black uppercase tracking-widest group-hover:bg-indigo-600 transition-colors">
                    Iniciar Motor IA
                  </button>
                </div>

                <div 
                  onClick={() => handleViewChange('history')}
                  className="group bg-white p-8 md:p-10 border border-slate-200 rounded-lg hover:border-slate-400 transition-all cursor-pointer relative overflow-hidden"
                >
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 md:mb-6">Archivo de Campañas</h3>
                  <p className="text-xl md:text-2xl font-bold text-slate-900 mb-6 md:mb-8 max-w-[240px]">Revisa tus anuncios previos y estadísticas.</p>
                  <button className="w-full md:w-auto px-6 py-3 bg-white border border-slate-200 text-slate-400 rounded-sm text-[10px] font-black uppercase tracking-widest group-hover:text-slate-900 group-hover:border-slate-900 transition-all">
                    Ver Historial
                  </button>
                </div>
              </div>
            </div>
          )}

          {view === 'generator' && (
            <Generator 
              onComplete={async () => {
                setView('history');
                await refreshProfile();
              }} 
              user={user}
              credits={profile?.credits || 0}
              config={profile?.config}
            />
          )}

          {view === 'history' && <HistoryView user={user} />}
          
          {view === 'config' && (
            <ConfigView 
              user={user} 
              profile={profile} 
              refreshProfile={refreshProfile} 
            />
          )}
        </main>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-start text-left gap-3 w-full px-6 py-4 rounded-sm text-[11px] font-black uppercase tracking-widest transition-all border-l-4",
        active 
          ? "bg-indigo-50 text-indigo-600 border-indigo-600 shadow-sm" 
          : "text-slate-400 border-transparent hover:bg-slate-50 hover:text-slate-600"
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Zap, ArrowRight, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Landing({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900 border-[12px] border-slate-200">
      <nav className="h-20 bg-white border-b border-slate-300 flex items-center justify-between px-4 md:px-10 z-10 shrink-0">
        <div className="flex items-center space-x-2 md:space-x-3">
          <div className="w-8 h-8 md:w-9 md:h-9 bg-indigo-600 rounded-sm flex items-center justify-center text-white font-black text-lg md:text-xl shadow-sm">
            A
          </div>
          <span className="font-bold tracking-tight text-xl md:text-2xl text-slate-900">
            AdCreator <span className="text-indigo-600 font-medium italic">CO</span>
          </span>
        </div>
        <div className="flex items-center">
          <button 
            onClick={onLogin}
            className="px-4 py-2 md:px-6 md:py-2 bg-slate-900 text-white rounded-sm font-bold text-[10px] md:text-xs uppercase tracking-widest hover:bg-black transition-all shadow-sm"
          >
            Iniciar Sesión
          </button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-4 md:px-6 py-12 md:py-20 relative overflow-hidden">
        {/* Geometric Background Element */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[800px] aspect-square bg-indigo-50/50 rounded-full blur-[80px] md:blur-[120px] -z-10" />

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl text-center"
        >
          <div className="inline-flex items-center space-x-2 bg-white px-4 py-2 border border-slate-200 rounded-full mb-8 md:mb-10 shadow-sm">
            <Sparkles className="text-indigo-500" size={14} />
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] text-slate-500">Inteligencia Artificial • Mercado Local</span>
          </div>
          
          <h1 className="text-4xl sm:text-6xl md:text-8xl font-black text-slate-900 leading-[0.9] tracking-tighter mb-8 md:mb-10">
            CREATIVOS <span className="text-indigo-600 italic">BALANCEADOS</span> <br/> 
            PARA RESULTADOS <span className="underline decoration-indigo-200 underline-offset-8">REALES</span>.
          </h1>
          
          <p className="text-base md:text-lg text-slate-500 max-w-2xl mx-auto mb-10 md:mb-12 font-medium leading-relaxed">
            La primera plataforma de IA diseñada exclusivamente para el comercio en Colombia. Analiza, optimiza y triunfa en Meta, TikTok y WhatsApp.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onLogin}
              className="w-full sm:w-auto px-10 py-5 bg-indigo-600 text-white rounded-sm font-black text-sm uppercase tracking-[0.15em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 hover:-translate-y-1"
            >
              Comenzar Ahora <ArrowRight className="inline-block ml-2" size={18} />
            </button>
            <div className="w-full sm:w-auto flex items-center justify-center space-x-3 px-6 py-5 bg-slate-100 rounded-sm border border-slate-200">
              <ShieldCheck className="text-slate-400" size={20} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 leading-none text-left">Datos Confiables <br/> MercadoLibre & Éxito</span>
            </div>
          </div>
        </motion.div>

        <div className="mt-20 md:mt-32 grid grid-cols-1 md:grid-cols-3 w-full max-w-6xl gap-0 border-t border-slate-200">
          <LandingFeature 
            num="01"
            title="VISIÓN"
            desc="Identificación automática de productos mediante Gemini 1.5 Flash."
            className="border-b md:border-b-0 md:border-r"
          />
          <LandingFeature 
            num="02"
            title="BIG DATA"
            desc="Scraping en tiempo real de precios locales en el mercado colombiano."
            className="border-b md:border-b-0 md:border-r"
          />
          <LandingFeature 
            num="03"
            title="CONVERSIÓN"
            desc="Hooks persuasivos y copys adaptados a la cultura local."
          />
        </div>
      </main>

      <footer className="p-8 bg-slate-900 flex flex-col md:flex-row justify-between items-center text-slate-400">
        <span className="text-[10px] uppercase font-bold tracking-widest">© 2026 ADCREATOR COLOMBIA</span>
        <div className="flex space-x-8 mt-4 md:mt-0">
          <a href="#" className="text-[10px] uppercase font-bold tracking-widest hover:text-white">Términos</a>
          <a href="#" className="text-[10px] uppercase font-bold tracking-widest hover:text-white">Privacidad</a>
          <a href="#" className="text-[10px] uppercase font-bold tracking-widest hover:text-white">Soporte</a>
        </div>
      </footer>
    </div>
  );
}

function LandingFeature({ num, title, desc, className }: { num: string, title: string, desc: string, className?: string }) {
  return (
    <div className={cn(
      "p-8 md:p-10 border-slate-200 bg-white hover:bg-indigo-50/30 transition-colors group",
      className
    )}>
      <div className="text-3xl md:text-4xl font-black text-slate-100 group-hover:text-indigo-100 transition-colors mb-4 md:mb-6">{num}</div>
      <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600 mb-2 md:mb-3">{title}</h3>
      <p className="text-sm text-slate-500 font-medium leading-relaxed">{desc}</p>
    </div>
  );
}

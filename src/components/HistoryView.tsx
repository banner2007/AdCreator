import React, { useState, useEffect } from 'react';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { CreativeData } from '../types';
import { motion } from 'motion/react';
import { Loader2, Calendar, Target, ShoppingBag, Eye, Zap } from 'lucide-react';

export default function HistoryView({ user }: { user: User }) {
  const [creatives, setCreatives] = useState<CreativeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const q = query(
          collection(db, 'users', user.uid, 'creatives'), 
          orderBy('createdAt', 'desc')
        );
        let snapshot;
        try {
          snapshot = await getDocs(q);
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/creatives`);
        }
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CreativeData));
        setCreatives(data);
      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recuperando Archivo...</p>
      </div>
    );
  }

  if (creatives.length === 0) {
    return (
      <div className="text-center py-32 px-8 bg-white border border-slate-200 rounded-sm shadow-sm max-w-2xl mx-auto">
        <div className="w-16 h-16 bg-slate-50 rounded-sm flex items-center justify-center text-slate-200 mx-auto mb-8">
          <ShoppingBag size={32} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-4">Sin Campañas Registradas</h2>
        <p className="text-sm text-slate-500 font-medium max-w-xs mx-auto leading-relaxed">Tu historial de creativos aparecerá aquí una vez que inicies el motor de IA.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <span className="label-micro block mb-2">Archivo Histórico</span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">
            Campañas <span className="text-indigo-600 italic">Guardadas</span>.
          </h2>
        </div>
        <div className="px-5 py-2 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest leading-none">
          {creatives.length} {creatives.length === 1 ? 'Ítem' : 'Ítems'}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {creatives.map((creative, index) => (
          <motion.div
            key={creative.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group bg-white border border-slate-200 rounded-sm overflow-hidden shadow-sm hover:shadow-xl hover:border-indigo-600 transition-all flex flex-col"
          >
            <div className="aspect-[4/3] relative overflow-hidden bg-slate-100 border-b border-slate-100">
              {creative.imageUrl && (
                <img src={creative.imageUrl} alt={creative.productName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              )}
              <div className="absolute top-4 right-4">
                <span className="px-3 py-1.5 bg-slate-900/90 backdrop-blur rounded-sm text-[9px] font-black uppercase tracking-widest text-white shadow-lg">
                  {creative.platform}
                </span>
              </div>
            </div>

            <div className="p-8 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className="min-w-0">
                  <h3 className="text-lg font-black text-slate-900 truncate leading-tight uppercase tracking-tight">{creative.productName}</h3>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    <Calendar size={12} className="text-indigo-400" />
                    {creative.createdAt?.toDate ? creative.createdAt.toDate().toLocaleDateString('es-CO') : 'Reciente'}
                  </div>
                </div>
                <div className="bg-indigo-50 p-2 rounded-sm text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Zap size={16} />
                </div>
              </div>
              
              <div className="flex flex-wrap gap-1.5 mb-6">
                {creative.visualTraits?.slice(0, 3).map((trait, i) => (
                  <span key={i} className="text-[9px] font-black text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-sm uppercase tracking-tighter">
                    {trait}
                  </span>
                ))}
              </div>

              <button className="mt-auto w-full py-3 border border-slate-200 rounded-sm text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover:border-slate-900 group-hover:text-slate-900 transition-all flex items-center justify-center gap-2">
                <Eye size={12} /> Ver Detalles
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

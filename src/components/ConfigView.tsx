import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Save, Upload, CheckCircle2, Loader2, Palette, Info, Smartphone, Mail, MapPin, CreditCard, Box, X } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { UserProfile, CreativeConfig } from '../types';
import { OperationType, handleFirestoreError } from '../lib/firebase';

export default function ConfigView({ user, profile, refreshProfile }: { 
  user: User, 
  profile: UserProfile | null,
  refreshProfile: () => Promise<void>
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [config, setConfig] = useState<CreativeConfig>({
    brandName: profile?.config?.brandName || '',
    brandColors: profile?.config?.brandColors || ['#4f46e5', '#ffffff', '#000000'],
    brandLogoUrl: profile?.config?.brandLogoUrl || '',
    address: profile?.config?.address || '',
    whatsapp: profile?.config?.whatsapp || '',
    contactPhone: profile?.config?.contactPhone || '',
    email: profile?.config?.email || '',
    paymentMethod: profile?.config?.paymentMethod || '',
    shippingIncluded: profile?.config?.shippingIncluded || false,
    globalDirectives: profile?.config?.globalDirectives || '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setConfig(prev => ({ ...prev, brandLogoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleColorChange = (index: number, color: string) => {
    const newColors = [...config.brandColors];
    newColors[index] = color;
    setConfig(prev => ({ ...prev, brandColors: newColors }));
  };

  const saveConfig = async () => {
    if (!user) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        config: config
      });
      await refreshProfile();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-12">
        <span className="label-micro block mb-2">Preferencias del Motor</span>
        <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase leading-[0.9] mb-4">
          Configuración <span className="text-indigo-600 italic">Creativa</span>.
        </h1>
        <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-100 rounded-sm">
          <Info className="text-amber-600" size={18} />
          <p className="text-xs font-black uppercase tracking-widest text-amber-900">
            Alimente en el formulario lo que quiera que aparezca en el creativo
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Información de Contacto */}
          <section className="bg-white p-8 border border-slate-200 rounded-sm shadow-sm space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b border-slate-100 pb-4 flex items-center gap-2">
              <Smartphone size={14} className="text-indigo-600" /> Información de Contacto
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="label-micro mb-2 block">Nombre de la Tienda / Marca</label>
                <input 
                  type="text"
                  value={config.brandName || ''}
                  onChange={e => setConfig(prev => ({ ...prev, brandName: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm text-sm outline-none focus:border-indigo-600 transition-all font-medium"
                  placeholder="Ej: Mi Tienda Online"
                />
              </div>
              <div>
                <label className="label-micro mb-2 block">WhatsApp</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">WA</span>
                  <input 
                    type="text"
                    value={config.whatsapp}
                    onChange={e => setConfig(prev => ({ ...prev, whatsapp: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-sm text-sm outline-none focus:border-indigo-600 transition-all font-medium"
                    placeholder="Ej: +57 321..."
                  />
                </div>
              </div>
              <div>
                <label className="label-micro mb-2 block">Teléfono de Contacto</label>
                <input 
                  type="text"
                  value={config.contactPhone}
                  onChange={e => setConfig(prev => ({ ...prev, contactPhone: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm text-sm outline-none focus:border-indigo-600 transition-all font-medium"
                  placeholder="Ej: 601..."
                />
              </div>
              <div>
                <label className="label-micro mb-2 block">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="email"
                    value={config.email}
                    onChange={e => setConfig(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-sm text-sm outline-none focus:border-indigo-600 transition-all font-medium"
                    placeholder="contacto@marca.com"
                  />
                </div>
              </div>
              <div>
                <label className="label-micro mb-2 block">Dirección</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="text"
                    value={config.address}
                    onChange={e => setConfig(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-sm text-sm outline-none focus:border-indigo-600 transition-all font-medium"
                    placeholder="Bogotá, Colombia..."
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Detalles de Venta */}
          <section className="bg-white p-8 border border-slate-200 rounded-sm shadow-sm space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b border-slate-100 pb-4 flex items-center gap-2">
              <CreditCard size={14} className="text-indigo-600" /> Detalles de Venta
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label-micro mb-2 block">Método de Pago</label>
                <input 
                  type="text"
                  value={config.paymentMethod}
                  onChange={e => setConfig(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm text-sm outline-none focus:border-indigo-600 transition-all font-medium"
                  placeholder="Contraentrega, Tarjeta..."
                />
              </div>
              <div className="flex flex-col justify-end">
                <label className="label-micro mb-2 block">Envío Incluido</label>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setConfig(prev => ({ ...prev, shippingIncluded: true }))}
                    className={`flex-1 py-3 px-4 border rounded-sm text-[10px] font-black uppercase tracking-widest transition-all ${config.shippingIncluded ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-400 border-slate-200'}`}
                  >
                    Sí
                  </button>
                  <button 
                    onClick={() => setConfig(prev => ({ ...prev, shippingIncluded: false }))}
                    className={`flex-1 py-3 px-4 border rounded-sm text-[10px] font-black uppercase tracking-widest transition-all ${!config.shippingIncluded ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-400 border-slate-200'}`}
                  >
                    No
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Directivas Globales */}
          <section className="bg-white p-8 border border-slate-200 rounded-sm shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
              <Box size={14} className="text-indigo-600" /> Directivas Globales
            </h3>
            <textarea 
              value={config.globalDirectives}
              onChange={e => setConfig(prev => ({ ...prev, globalDirectives: e.target.value }))}
              className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
              placeholder="Instrucciones adicionales para la IA..."
            />
          </section>
        </div>

        <div className="space-y-8">
          {/* Identidad Visual */}
          <section className="bg-white p-8 border border-slate-200 rounded-sm shadow-sm space-y-8">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b border-slate-100 pb-4 flex items-center gap-2">
              <Palette size={14} className="text-indigo-600" /> Identidad Visual
            </h3>

            {/* Colores de Marca */}
            <div>
              <label className="label-micro mb-4 block">Paleta de Colores (Top 3)</label>
              <div className="flex gap-4">
                {config.brandColors.map((color, index) => (
                  <div key={index} className="flex-1 text-center">
                    <input 
                      type="color"
                      value={color}
                      onChange={e => handleColorChange(index, e.target.value)}
                      className="w-full h-12 rounded-sm cursor-pointer border-2 border-slate-100 hover:border-indigo-300 transition-all mb-2"
                    />
                    <input 
                      type="text"
                      value={color}
                      onChange={e => handleColorChange(index, e.target.value)}
                      className="w-full text-center text-[10px] font-mono font-bold text-slate-600 uppercase bg-slate-50 border border-slate-200 py-1 rounded-sm focus:border-indigo-600 outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Logo de Marca */}
            <div>
              <label className="label-micro mb-4 block">Icono / Logo de Marca</label>
              {!config.brandLogoUrl ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-square bg-slate-50 border-2 border-dashed border-slate-300 rounded-sm flex flex-col items-center justify-center p-6 cursor-pointer hover:bg-indigo-50/30 hover:border-indigo-300 transition-all group"
                >
                  <Upload size={20} className="text-slate-400 group-hover:text-indigo-600 mb-3" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 text-center">Subir Logo</span>
                  <input type="file" ref={fileInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
                </div>
              ) : (
                <div className="relative w-full aspect-square bg-white border border-slate-200 rounded-sm overflow-hidden flex items-center justify-center p-4">
                  <img src={config.brandLogoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                  <button 
                    onClick={() => setConfig(prev => ({ ...prev, brandLogoUrl: '' }))}
                    className="absolute top-2 right-2 p-1.5 bg-slate-900/80 text-white rounded-sm hover:bg-slate-900 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Botón Guardar */}
          <button
            onClick={saveConfig}
            disabled={isSaving}
            className={`w-full py-5 rounded-sm font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-3 ${
              saveSuccess ? 'bg-emerald-600 text-white scale-[1.02]' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
            } disabled:opacity-50`}
          >
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : saveSuccess ? <CheckCircle2 size={18} /> : <Save size={18} />}
            {saveSuccess ? 'Guardado Exitosamente' : 'Guardar Configuración'}
          </button>
        </div>
      </div>
    </div>
  );
}

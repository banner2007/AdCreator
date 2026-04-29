import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Loader2, CheckCircle2, AlertCircle, Zap, ImageIcon, Sparkles, Download } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { CreativeData, CreativeConfig } from '../types';
import { cn } from '../lib/utils';
import { OperationType, handleFirestoreError } from '../lib/firebase';
// Importación corregida del servicio
import * as GeminiService from '../services/geminiService'; 

type Step = 'upload' | 'processing' | 'preview';

export default function Generator({ user, onComplete, credits, config }: { 
  user: User, 
  onComplete: () => void, 
  credits: number,
  config?: CreativeConfig
}) {
  const [step, setStep] = useState<Step>('upload');
  const [processingState, setProcessingState] = useState<'identifying' | 'market_analysis' | 'generating_content' | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [productData, setProductData] = useState<{productName: string, traits: string[]} | null>(null);
  const [marketData, setMarketData] = useState<any>(null);
  const [generatedContent, setGeneratedContent] = useState<{hooks: string[], copys: string[]} | null>(null);
  const [visualPrompt, setVisualPrompt] = useState<{prompt: string, format: string} | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [selectedSize, setSelectedSize] = useState('1024x1024');
  const [platform, setPlatform] = useState('Instagram');
  const [tone, setTone] = useState('Profesional');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startProcessing = async () => {
    if (!selectedImage) return;
    if (credits <= 0) {
      setError('Créditos insuficientes. Por favor recarga tu cuenta.');
      return;
    }

    try {
      setError(null);
      setStep('processing');
      
      // Paso 3: Identificación (Gemini Vision)
      setProcessingState('identifying');
      const pData = await GeminiService.identifyProduct(selectedImage);
      setProductData(pData);

      // Paso 4, 5 y 6: Análisis de Mercado Colombia
      setProcessingState('market_analysis');
      const mData = await GeminiService.searchMarketInfo(pData.productName);
      setMarketData(mData);

      // Paso 8 y 9: Generación de Hooks y Copys
      setProcessingState('generating_content');
      const gContent = await GeminiService.generateContent(
        pData,
        mData,
        platform,
        tone,
        config
      );
      setGeneratedContent(gContent);

      // Paso 10: Generación de Prompt para Imagen publicitaria (Usando contexto completo)
      const vPrompt = await GeminiService.generateVisualPrompt(pData, mData, gContent, platform, config, selectedImage || undefined);
      setVisualPrompt(vPrompt);

      setStep('preview');
    } catch (err: any) {
      console.error("Error en el motor IA:", err);
      let errorMessage = err.response?.data?.error || err.message || 'Error desconocido';
      let friendlyMessage = `Error al procesar con IA: ${errorMessage}.`;
      
      if (errorMessage === 'GEMINI_KEY_MANUAL_MISSING' || errorMessage === 'GEMINI_KEY_MANUAL_INVALID') {
        friendlyMessage = "¡Atención! La API Key de Gemini manualmente configurada no es válida o no está presente. Por favor, ve a Settings > Secrets, crea uno llamado 'GEMINI_KEY_MANUAL' y pega ahí tu clave real (la que empieza por AIza...).";
      } else if (errorMessage.includes('quota') || errorMessage.includes('429')) {
        friendlyMessage = "Has superado el límite de uso gratuito de Gemini. Por favor, espera un momento antes de reintentar.";
      }
      
      setError(friendlyMessage);
      setStep('upload');
    }
  };

  const handleGenerateRealImage = async () => {
    if (!visualPrompt) return;
    setIsGeneratingImage(true);
    setError(null);
    try {
      const url = await GeminiService.generateImage(visualPrompt.prompt, selectedSize);
      setGeneratedImageUrl(url);
      
      // La solicitud dice: "al dar click en este botón se guarde todo"
      // Guardamos automáticamente después de generar para cumplir con la fidelidad del "guardar todo"
      // pero esperando a tener la URL de la imagen generada.
      
      if (productData && marketData && generatedContent && user) {
        const creative: Partial<CreativeData> = {
          userId: user.uid,
          productName: productData.productName,
          visualTraits: productData.traits,
          marketData,
          hooks: generatedContent.hooks,
          copys: generatedContent.copys,
          platform,
          tone,
          imageUrl: url,
          createdAt: serverTimestamp(),
        };

        const creativePath = `users/${user.uid}/creatives`;
        await addDoc(collection(db, 'users', user.uid, 'creatives'), creative);
        
        try {
          await updateDoc(doc(db, 'users', user.uid), { 
            credits: increment(-1) 
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
        }
      }

    } catch (err: any) {
      console.error(err);
      const errorMessage = err.response?.data?.error || err.message || 'Error al generar imagen';
      setError(`Error con OpenAI: ${errorMessage}. Asegúrate de haber configurado OPENAI_API_KEY en Secrets.`);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const saveCreative = async () => {
    if (!productData || !marketData || !generatedContent || !user) return;
    setIsSaving(true);
    try {
      const creative: Partial<CreativeData> = {
        userId: user.uid,
        productName: productData.productName,
        visualTraits: productData.traits,
        marketData,
        hooks: generatedContent.hooks,
        copys: generatedContent.copys,
        platform,
        tone,
        imageUrl: generatedImageUrl || selectedImage || undefined,
        createdAt: serverTimestamp(),
      };

      const creativePath = `users/${user.uid}/creatives`;
      
      // Paso 13: Guardar en Historial (Firebase)
      try {
        await addDoc(collection(db, 'users', user.uid, 'creatives'), creative);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, creativePath);
      }

      // Descontar crédito por uso exitoso
      try {
        await updateDoc(doc(db, 'users', user.uid), { 
          credits: increment(-1) 
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      }

      onComplete();
    } catch (err) {
      console.error("Error al guardar:", err);
      setError('Error al guardar en el historial.');
    } finally {
      setIsSaving(false);
    }
  };

  const [activeTab, setActiveTab] = useState<'dashboard' | 'config'>('dashboard');

  return (
    <div className="h-full">
      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-xl mx-auto"
          >
            <div className="bg-white border border-slate-200 rounded-sm overflow-hidden flex flex-col">
              <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                <h2 className="label-micro mb-4">Paso 1: Captura de Producto</h2>
                
                {!selectedImage ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square w-full bg-white border-2 border-dashed border-slate-300 rounded-sm flex flex-col items-center justify-center p-8 cursor-pointer hover:bg-indigo-50/30 hover:border-indigo-300 transition-all group"
                  >
                    <div className="w-12 h-12 bg-slate-50 rounded-sm flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors mb-4">
                      <Upload size={24} />
                    </div>
                    <span className="text-sm font-black uppercase tracking-widest text-slate-900">Subir foto del producto</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 tracking-tighter">Formatos compatibles en Colombia: PNG, JPG</span>
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                  </div>
                ) : (
                  <div className="relative aspect-square rounded-sm overflow-hidden border border-slate-200">
                    <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setSelectedImage(null)}
                      className="absolute top-4 right-4 p-2 bg-slate-900/80 text-white rounded-sm hover:bg-slate-900 transition-colors"
                    >
                      <AlertCircle size={16} />
                    </button>
                  </div>
                )}
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label-micro mb-2 block">Red Social Destino</label>
                    <select 
                      value={platform} 
                      onChange={(e) => setPlatform(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-sm text-[11px] font-black uppercase tracking-widest outline-none focus:border-indigo-600"
                    >
                      <option>Instagram</option>
                      <option>TikTok</option>
                      <option>Facebook</option>
                      <option>WhatsApp Business</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-micro mb-2 block">Tono de Marca</label>
                    <select 
                      value={tone} 
                      onChange={(e) => setTone(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-sm text-[11px] font-black uppercase tracking-widest outline-none focus:border-indigo-600"
                    >
                      <option>Profesional</option>
                      <option>Divertido</option>
                      <option>Venta Directa</option>
                      <option>Premium</option>
                    </select>
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 text-red-900 text-[10px] font-black uppercase tracking-widest border border-red-100 flex items-center gap-2">
                    <AlertCircle size={14} /> {error}
                  </div>
                )}

                <button
                  disabled={!selectedImage}
                  onClick={startProcessing}
                  className="w-full py-4 bg-indigo-600 text-white rounded-sm font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-100"
                >
                  Generar Anuncio Publicitario
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full max-w-sm mx-auto text-center"
          >
            <div className="w-16 h-16 bg-indigo-600 rounded-sm flex items-center justify-center text-white mb-8 animate-bounce">
              <Zap size={32} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-4">
              {processingState === 'identifying' && 'Reconociendo Producto...'}
              {processingState === 'market_analysis' && 'Analizando Precios Colombia...'}
              {processingState === 'generating_content' && 'Creando Copys de Venta...'}
            </h2>
            <div className="w-full h-1 bg-slate-200 overflow-hidden rounded-full">
              <motion.div 
                className="h-full bg-indigo-600"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 10, ease: "linear" }}
              />
            </div>
            <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
              Integrando datos de MercadoLibre y Éxito vía Gemini Flash 3
            </p>
          </motion.div>
        )}

        {step === 'preview' && (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col lg:flex-row lg:h-[calc(100vh-100px)] border border-slate-200 rounded-sm overflow-hidden bg-white"
          >
            {/* Análisis y Producto */}
            <section className="w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white flex flex-col overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/30">
                <h2 className="label-micro mb-4">Análisis de Mercado</h2>
                <div className="bg-indigo-600 p-4 rounded-sm shadow-md mb-6">
                  <p className="text-[9px] font-black text-indigo-200 uppercase tracking-[0.2em] mb-1">Producto</p>
                  <p className="text-base font-black text-white leading-tight mb-2 truncate">{productData?.productName}</p>
                  <div className="flex flex-wrap gap-1">
                    {productData?.traits.map((t, i) => (
                      <span key={i} className="text-[8px] font-black text-indigo-600 bg-white px-1.5 py-0.5 rounded-sm uppercase">{t}</span>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="label-micro text-slate-400">Precios en Colombia (COP)</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {marketData?.prices && Object.entries(marketData.prices).map(([key, val]: [string, any]) => (
                      <div key={key} className="flex justify-between items-center bg-white px-3 py-2.5 border border-slate-200 rounded-sm shadow-sm">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{key}</span>
                        <span className="text-[11px] font-black text-indigo-700">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 custom-scrollbar max-h-[300px] lg:max-h-none">
                {marketData?.sentiment && (
                  <>
                    <div>
                      <h4 className="label-micro mb-3 text-emerald-600 flex items-center gap-2">
                        <div className="w-1 h-3 bg-emerald-500 rounded-full" /> Beneficios
                      </h4>
                      <div className="space-y-2">
                        {marketData.sentiment.benefits?.map((b: string, i: number) => (
                          <div key={i} className="text-[11px] font-medium text-slate-600 leading-tight p-2.5 bg-white border border-slate-100 rounded-sm shadow-sm">
                            {b}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="label-micro mb-3 text-rose-600 flex items-center gap-2">
                        <div className="w-1 h-3 bg-rose-500 rounded-full" /> Puntos de Dolor
                      </h4>
                      <div className="space-y-2">
                        {marketData.sentiment.painPoints?.map((p: string, i: number) => (
                          <div key={i} className="text-[11px] font-medium text-slate-600 leading-tight p-2.5 bg-white border border-slate-100 rounded-sm shadow-sm">
                            {p}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* Motor de Copy */}
            <section className="w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-100/30 flex flex-col">
              <div className="p-6 md:p-8 flex-1 overflow-y-auto max-h-[400px] lg:max-h-none">
                <h2 className="label-micro mb-6">Contenido Generado</h2>
                
                <div className="space-y-6">
                  {generatedContent?.hooks.map((hook, i) => (
                    <div key={i} className="bg-white p-6 border border-slate-200 rounded-sm shadow-sm relative">
                      <label className="text-[9px] font-black text-indigo-400 uppercase mb-2 block">Hook Sugerido #{i+1}</label>
                      <p className="text-sm italic font-serif text-slate-800">"{hook}"</p>
                    </div>
                  ))}

                  <div className="pt-4">
                    <h3 className="label-micro mb-4">Variaciones de Copy</h3>
                    {generatedContent?.copys.map((copy, i) => (
                      <div key={i} className="bg-white p-6 border border-slate-200 rounded-sm shadow-sm mb-4">
                         <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{copy}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="p-6 md:p-8 border-t border-slate-200 bg-white">
                <button 
                  onClick={startProcessing}
                  className="w-full py-4 bg-slate-900 text-white rounded-sm font-black text-[10px] uppercase tracking-widest hover:bg-black"
                >
                  Regenerar Textos
                </button>
              </div>
            </section>

            {/* Vista Previa Visual */}
            <section className="w-full lg:w-1/3 bg-white flex flex-col p-6 md:p-8 overflow-hidden min-h-[500px] lg:min-h-0">
               <h2 className="label-micro mb-6 text-center">Visual Studio ({platform})</h2>
               
               <div className="space-y-4 flex flex-col items-center flex-1 lg:flex-none mb-8">
                  <div className={cn(
                    "w-full max-w-[220px] md:max-w-[240px] bg-slate-900 border border-slate-700 rounded-lg relative overflow-hidden shadow-2xl transition-all flex flex-col",
                    platform === 'Instagram' ? "aspect-square" : "aspect-[9/16]"
                  )}>
                    {generatedImageUrl ? (
                      <img 
                        src={generatedImageUrl} 
                        alt="Preview" 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-4 overflow-y-auto custom-scrollbar">
                        <div className="p-3 bg-indigo-500/10 rounded-full text-indigo-400">
                          <Sparkles size={24} />
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Prompt Estratégico Generado</p>
                          <p className="text-[11px] font-medium text-slate-300 leading-relaxed italic">
                            {visualPrompt?.prompt || 'Analizando aspectos técnicos, hooks y beneficios para crear la imagen perfecta...'}
                          </p>
                        </div>
                        {!visualPrompt && <Loader2 className="animate-spin text-slate-600" size={16} />}
                      </div>
                    )}
                    
                    {isGeneratingImage && (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm z-10 transition-all">
                        <div className="relative">
                          <Loader2 className="animate-spin text-white mb-3" size={32} />
                          <div className="absolute inset-0 animate-ping opacity-20 bg-white rounded-full" />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white animate-pulse">Materializando Visión...</span>
                      </div>
                    )}
                  </div>
               </div>

               <div className="mt-auto space-y-4">
                  {!generatedImageUrl && (
                    <div className="space-y-2">
                      <label className="label-micro text-slate-400">Tamaño del Creativo</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: '1024x1024', label: '1:1', desc: 'Post' },
                          { id: '1024x1792', label: '9:16', desc: 'Story/Tik' },
                          { id: '1792x1024', label: '16:9', desc: 'Banner' }
                        ].map((s) => (
                          <button
                            key={s.id}
                            onClick={() => setSelectedSize(s.id)}
                            className={cn(
                              "flex flex-col items-center justify-center py-2 border rounded-sm transition-all",
                              selectedSize === s.id 
                                ? "bg-indigo-50 border-indigo-600 text-indigo-600" 
                                : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                            )}
                          >
                            <span className="text-[10px] font-black">{s.label}</span>
                            <span className="text-[8px] font-bold uppercase">{s.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {!generatedImageUrl ? (
                    <button 
                      onClick={handleGenerateRealImage}
                      disabled={isGeneratingImage}
                      className="w-full py-4 bg-indigo-600 text-white rounded-sm font-black text-[10px] uppercase tracking-[0.2em] shadow-lg flex items-center justify-center gap-3 hover:bg-indigo-700 disabled:opacity-50 transition-all group"
                    >
                      {isGeneratingImage ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} className="group-hover:animate-pulse" />}
                      Generar Creativo y Guardar
                    </button>
                  ) : (
                    <a 
                      href={generatedImageUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="w-full py-4 bg-emerald-600 text-white rounded-sm font-black text-[10px] uppercase tracking-[0.2em] shadow-lg flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all"
                    >
                      <Download size={16} /> Descargar Arte Final
                    </a>
                  )}
                  {generatedImageUrl ? (
                    <button 
                      onClick={onComplete}
                      className="w-full py-4 bg-slate-900 text-white rounded-sm font-black text-[10px] uppercase tracking-[0.2em] shadow-lg flex items-center justify-center gap-3 hover:bg-black transition-all"
                    >
                      <CheckCircle2 size={16} /> Finalizar y Regresar
                    </button>
                  ) : (
                    <button 
                      onClick={saveCreative}
                      disabled={isSaving}
                      className="w-full py-3 border border-slate-900 text-slate-900 rounded-sm font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="animate-spin" size={12} /> : <><CheckCircle2 size={12} /> Guardar Borrador y Salir</>}
                    </button>
                  )}
               </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// OpenAI Initialization
const getOpenAI = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('...')) return null;
  return new OpenAI({ apiKey: apiKey.trim() });
};

// Gemini Initialization
const getGenAI = () => {
  const apiKey = process.env.GEMINI_KEY_MANUAL || process.env.GEMINI_API_KEY;
  // Rigorous validation to avoid using placeholders as actual keys
  if (!apiKey || 
      apiKey.trim() === '' || 
      apiKey === 'MY_GEMINI_API_KEY' || 
      apiKey === 'YOUR_GEMINI_API_KEY' ||
      apiKey.includes('...')) {
    return null;
  }
  return new GoogleGenAI({ apiKey: apiKey.trim() });
};

// --- API Routes ---

app.get('/api/health', (req, res) => {
  const openai = getOpenAI();
  const genai = getGenAI();
  res.json({ 
    status: 'ok', 
    hasOpenAIKey: !!openai,
    hasGeminiKey: !!genai
  });
});

app.post('/api/identify', async (req, res) => {
  try {
    const { image } = req.body;
    const genai = getGenAI();
    if (!genai) return res.status(400).json({ error: 'GEMINI_KEY_MANUAL_MISSING' });

    const response = await genai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'Analiza esta imagen e identifica el nombre del producto y sus características clave. Responde únicamente en JSON: { "productName": "...", "traits": ["...", "..."] }' },
            { inlineData: { data: image.split(',')[1], mimeType: 'image/jpeg' } }
          ]
        }
      ],
      config: { responseMimeType: 'application/json' }
    });

    res.json(JSON.parse(response.text || '{}'));
  } catch (error: any) {
    console.error('Identify Error:', error);
    let errorMessage = error.message;
    if (errorMessage.includes('API key not valid') || errorMessage.includes('API_KEY_INVALID')) {
      errorMessage = 'GEMINI_KEY_MANUAL_INVALID';
    }
    res.status(500).json({ error: errorMessage });
  }
});

app.post('/api/market-info', async (req, res) => {
  try {
    const { productName } = req.body;
    const genai = getGenAI();
    if (!genai) return res.status(400).json({ error: 'GEMINI_KEY_MANUAL_MISSING' });

    const prompt = `Busca precios actuales y reseñas de "${productName}" en MercadoLibre Colombia, Falabella.com.co y Exito.com. Dame un resumen de: 
      1. Rango de precios en COP (Pesos Colombianos). 
      2. Resúmenes de reseñas positivas y negativas para identificar puntos de dolor y beneficios.
      Responde en formato JSON: { "prices": { "mercadolibre": "...", "falabella": "...", "exito": "..." }, "sentiment": { "benefits": [], "painPoints": [] } }`;

    const response = await genai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { 
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json' 
      }
    });

    res.json(JSON.parse(response.text || '{}'));
  } catch (error: any) {
    console.error('Market Error:', error);
    let errorMessage = error.message;
    if (errorMessage.includes('API key not valid') || errorMessage.includes('API_KEY_INVALID')) {
      errorMessage = 'GEMINI_KEY_MANUAL_INVALID';
    }
    res.status(500).json({ error: errorMessage });
  }
});

app.post('/api/generate-content', async (req, res) => {
  try {
    const { productData, marketData, platform, tone, config } = req.body;
    const genai = getGenAI();
    if (!genai) return res.status(400).json({ error: 'GEMINI_KEY_MANUAL_MISSING' });

    let contactInfo = '';
    if (config) {
      if (config.brandName) contactInfo += `\n- Marca/Tienda: ${config.brandName}`;
      if (config.whatsapp) contactInfo += `\n- WhatsApp: ${config.whatsapp}`;
      if (config.contactPhone) contactInfo += `\n- Teléfono: ${config.contactPhone}`;
      if (config.email) contactInfo += `\n- Email: ${config.email}`;
      if (config.address) contactInfo += `\n- Dirección: ${config.address}`;
      if (config.paymentMethod) contactInfo += `\n- Método de Pago: ${config.paymentMethod}`;
      if (config.shippingIncluded) contactInfo += `\n- ¡Envío Incluido!`;
    }

    const prompt = `Como experto en marketing digital en Colombia, genera 3 Hooks potentes y 2 variaciones de Copy de venta para "${productData.productName}" en ${platform}.
      Tono: ${tone}.
      Características: ${productData.traits.join(', ')}.
      Contexto de mercado: ${JSON.stringify(marketData)}.
      ${config?.globalDirectives ? `Directivas adicionales: ${config.globalDirectives}` : ''}
      ${contactInfo ? `INFORMACIÓN DE CONTACTO A INCLUIR (Si es relevante para el copy): ${contactInfo}` : ''}
      Asegúrate de abordar los beneficios y puntos de dolor encontrados en Colombia.
      Responde en JSON: { "hooks": ["...", "..."], "copys": ["...", "..."] }`;

    const response = await genai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json' }
    });

    res.json(JSON.parse(response.text || '{}'));
  } catch (error: any) {
    console.error('Content Error:', error);
    let errorMessage = error.message;
    if (errorMessage.includes('API key not valid') || errorMessage.includes('API_KEY_INVALID')) {
      errorMessage = 'GEMINI_KEY_MANUAL_INVALID';
    }
    res.status(500).json({ error: errorMessage });
  }
});

app.post('/api/visual-prompt', async (req, res) => {
  try {
    const { productData, marketData, generatedContent, platform, config, image } = req.body;
    const genai = getGenAI();
    if (!genai) return res.status(400).json({ error: 'GEMINI_KEY_MANUAL_MISSING' });

    const colorContext = config?.brandColors?.length ? `The following brand colors should predominate in the image (especially in the background and accents): ${config.brandColors.join(', ')}.` : '';
    const logoContext = config?.brandLogoUrl ? `A placeholder for a brand logo or icon should be integrated naturally into the scene.` : '';
    const brandNameContext = config?.brandName ? `The brand name "${config.brandName}" should be considered for any branding elements.` : '';

    // Step 1: Analyze original image if provided
    let visualDescription = productData.traits.join(', ');
    if (image) {
      try {
        const visionResponse = await genai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: [{ 
            role: 'user', 
            parts: [
              { text: "Describe the physical product in this image in extreme detail (shape, texture, colors, unique features, labels) so a graphic designer can replicate it exactly." },
              { inlineData: { mimeType: 'image/jpeg', data: image.split(',')[1] } }
            ] 
          }]
        });
        visualDescription = visionResponse.text || visualDescription;
      } catch (err) {
        console.error("Vision Analysis Error:", err);
      }
    }

    // Step 2: Generate Ad Prompt
    const userDirective = `Diseña un anuncio de PUBLICIDAD DE ÉLITE (Elite Advertising Poster).
      LA IMAGEN DEBE TENER UN IMPACTO VISUAL MASIVO COMO LOS MEJORES ANUNCIOS DE REDES SOCIALES.
      
      ESTRUCTURA VISUAL OBLIGATORIA:
      1. LAYOUT: De tipo "Product Poster". El producto (${productData.productName}) debe estar en el centro, perfectamente iluminado y con una perspectiva heroica.
      2. TEXTO (RENDERIZADO EN ESPAÑOL):
         - HEADLINE: "${generatedContent.hooks[0]}" (En la parte superior, tipografía gigante, bold y legible).
         - SUBTITLE/BENEFIT: "${marketData.sentiment?.benefits?.[0]}" (Cerca del producto).
         - PEQUEÑOS TEXTOS: Incluye "ENVÍO GRATIS", "PAGO CONTRA ENTREGA" o "${config?.brandName || 'PREMIUM'}" en esquinas o zonas estratégicas con iconos minimalistas.
      3. ATMÓSFERA: Fondo de alto contraste, degradados elegantes o escenas lifestyle desenfocadas (bokeh).
      4. RASGOS PRODUCTO: ${visualDescription}.
      5. BRANDING: Usa los colores ${config?.brandColors?.join(', ') || 'profesionales y vibrantes'}.`;

    const prompt = `Actúa como un Director Creativo Global para una marca de lujo. 
      TU MISIÓN: Escribir un prompt en INGLÉS para el motor 'ChatGPT Images 2.0' que produzca una imagen publicitaria de nivel Google/Apple/Skynbiotic.
      
      CONTENIDO DEL PROMPT PARA EL MOTOR DE IMAGEN:
      - Título en ESPAÑOL perfectamente escrito y renderizado: "${generatedContent.hooks[0]}".
      - Composición maestra: El producto en el centro sobre una base elegante o flotando sutilmente.
      - Iluminación: Cinematic, studio lights, Rembrandt lighting on the product.
      - Textura y Material: Resalta la calidad de los materiales descritos (${visualDescription}).
      - Elementos Gráficos: Añadir iconos elegantes para "Fast Shipping" y "Quality Guarantee" integrados en la composición.
      - Tipografía: Moderna, Sans-Serif, bold, de fácil lectura.
      
      ${colorContext}
      ${logoContext}
      ${brandNameContext}
      ${config?.globalDirectives ? `Restricciones específicas del cliente: ${config.globalDirectives}` : ''}
      
      Responde in JSON: { "prompt": "An extremely detailed ChatGPT Images 2.0 prompt in English that describes the final output as a full-color high-impact advertising poster with SPANISH text headlines, product-centric composition, and professional graphic design elements.", "format": "..." }`;

    const response = await genai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json' }
    });
    
    const data = JSON.parse(response.text || '{}');
    res.json({ 
      prompt: data.prompt || '', 
      format: platform === 'Instagram' ? '1024x1024' : (platform === 'TikTok' ? '1024x1792' : '1024x1024')
    });
  } catch (error: any) {
    console.error('Visual Error:', error);
    let errorMessage = error.message;
    if (errorMessage.includes('API key not valid') || errorMessage.includes('API_KEY_INVALID')) {
      errorMessage = 'GEMINI_KEY_MANUAL_INVALID';
    }
    res.status(500).json({ error: errorMessage });
  }
});

// Route to generate image with DALL-E if OpenAI key is present
app.post('/api/generate-image', async (req, res) => {
  const { prompt, size } = req.body;
  const openai = getOpenAI();
  if (!openai) {
    return res.status(400).json({ error: 'OPENAI_API_KEY is not configured in Secrets.' });
  }

  try {
    // Standard modern model identifier to ensure compatibility
    // Using HD quality to match the "ChatGPT Images 2.0" requirement
    const response = await openai.images.generate({
      model: "dall-e-3", 
      prompt: prompt,
      n: 1,
      size: (size as any) || "1024x1024",
      quality: "hd",
      style: "vivid"
    });

    if (!response.data || response.data.length === 0) {
      throw new Error("La API no devolvió ninguna imagen.");
    }

    res.json({ url: response.data[0].url });
  } catch (error: any) {
    console.error('OpenAI Error Details:', error);
    // Return the specific error message to the client for better feedback
    const errorMessage = error.response?.data?.error?.message || error.message || 'Error desconocido';
    res.status(500).json({ error: `Fallo en la generación: ${errorMessage}` });
  }
});

// --- Vite Middleware ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

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

    // Step 1: Analyze original image if provided
    let visualDescription = productData.traits.join(', ');
    if (image) {
      try {
        const visionResponse = await genai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: [{ 
            role: 'user', 
            parts: [
              { text: "Describe the physical product in this image in EXTREME DETAIL. Include: exact shape, dimensions, colors, materials, textures, surface finish, labels, packaging, unique features, any text or branding visible on the product. Be VERY SPECIFIC so a designer can recreate it exactly." },
              { inlineData: { mimeType: 'image/jpeg', data: image.split(',')[1] } }
            ] 
          }]
        });
        visualDescription = visionResponse.text || visualDescription;
        console.log('🎯 Visual Description Extracted (first 300 chars):', visualDescription.substring(0, 300));
      } catch (err) {
        console.error("❌ Vision Analysis Error:", err);
      }
    }

    // CRITICAL: Build ultra-detailed DALL-E 3 prompt
    const dallE3Prompt = `You are an elite creative director. Generate a PROFESSIONAL advertising poster image.

PRODUCT SPECIFICATION:
Product Name: ${productData.productName}
Visual Details: ${visualDescription}
Key Traits: ${productData.traits.join(', ')}

ADVERTISING TEXT (MUST APPEAR IN IMAGE IN SPANISH):
Headline: "${generatedContent.hooks[0]}"
Benefit: "${marketData?.sentiment?.benefits?.[0] || 'Premium Quality & Best Price'}"
Brand: "${config?.brandName || 'PREMIUM'}"

DESIGN REQUIREMENTS (CRITICAL):
1. PRODUCT PLACEMENT: The ${productData.productName} MUST be the DOMINANT element - centered, heroically lit, clearly visible and recognizable. The product should take up 40-50% of the image.

2. TEXT RENDERING (CRITICAL FOR SUCCESS):
   - Headline Text: "${generatedContent.hooks[0]}"
   - Render in WHITE, BOLD, SANS-SERIF font (like Helvetica or Arial Bold)
   - Font size: VERY LARGE (at least 15-20% of image height)
   - Position: Top third of image, centered or left-aligned
   - Background: Dark overlay or strong contrast to ensure text readability
   - Text MUST be CRISP, CLEAR, and LEGIBLE even at small sizes
   - CRITICAL: Do NOT blur or obscure this text - it must be primary focus after product

3. BACKGROUND & ATMOSPHERE:
   - Professional studio lighting on the product (Rembrandt or cinema lighting style)
   - Background: Elegant gradient, blurred bokeh, or minimalist solid color that contrasts with product
   - High contrast composition to make the product POP
   - Professional, luxury advertising style (think Apple, Google, or premium brands)

4. SUPPORTING ELEMENTS:
   - Small text badges: "FREE SHIPPING", "TRUSTED", "${config?.brandName || 'QUALITY'}"
   - Position in corners or bottom area, small but visible
   - Minimalist icons for shipping and quality

5. COLOR SCHEME:
   - Primary: ${config?.brandColors?.[0] || 'Professional and vibrant colors'}
   - Secondary: ${config?.brandColors?.[1] || 'Complementary colors for contrast'}
   - Use these to accent the design while keeping focus on product and headline text

6. OVERALL STYLE:
   - High-end advertising poster
   - Professional photography quality
   - Magazine or premium campaign style
   - Clean, modern, sophisticated

CRITICAL INSTRUCTIONS:
- The PRODUCT must be CLEARLY VISIBLE and RECOGNIZABLE as "${productData.productName}"
- The HEADLINE TEXT in Spanish must be LARGE, BOLD, and EXTREMELY READABLE
- Text contrast must be MAXIMUM - dark text on light or light text on dark
- Do NOT make anything small or hard to read
- This is a HIGH-IMPACT advertising poster for social media and print
- Quality: Ultra-high definition, professional photography grade
- Style: Vivid, high contrast, premium advertising aesthetic`;

    console.log('📋 Generated DALL-E 3 Prompt Length:', dallE3Prompt.length);
    console.log('📝 Prompt Preview (first 400 chars):', dallE3Prompt.substring(0, 400));

    res.json({ 
      prompt: dallE3Prompt, 
      format: platform === 'Instagram' ? '1024x1024' : (platform === 'TikTok' ? '1024x1792' : '1024x1024')
    });
  } catch (error: any) {
    console.error('❌ Visual Error:', error);
    let errorMessage = error.message;
    if (errorMessage.includes('API key not valid') || errorMessage.includes('API_KEY_INVALID')) {
      errorMessage = 'GEMINI_KEY_MANUAL_INVALID';
    }
    res.status(500).json({ error: errorMessage });
  }
});

// Route to generate image with DALL-E 3
app.post('/api/generate-image', async (req, res) => {
  const { prompt, size } = req.body;
  const openai = getOpenAI();
  if (!openai) {
    return res.status(400).json({ error: 'OPENAI_API_KEY is not configured in Secrets.' });
  }

  try {
    console.log('🚀 Sending to DALL-E 3');
    console.log('📊 Prompt length:', prompt.length);
    console.log('📐 Size:', size || '1024x1024');
    
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

    console.log('✅ Image generated successfully!');
    res.json({ url: response.data[0].url });
  } catch (error: any) {
    console.error('❌ OpenAI Error Details:', error);
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

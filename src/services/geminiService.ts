import axios from 'axios';

export const identifyProduct = async (imageBase64: string) => {
  const response = await axios.post('/api/identify', { image: imageBase64 });
  return response.data;
};

export const searchMarketInfo = async (productName: string) => {
  const response = await axios.post('/api/market-info', { productName });
  return response.data;
};

export const generateContent = async (productData: any, marketData: any, platform: string, tone: string, config?: any) => {
  const response = await axios.post('/api/generate-content', {
    productData,
    marketData,
    platform,
    tone,
    config
  });
  return response.data;
};

export const generateVisualPrompt = async (productData: any, marketData: any, generatedContent: any, platform: string, config?: any, image?: string) => {
  const response = await axios.post('/api/visual-prompt', { productData, marketData, generatedContent, platform, config, image });
  return response.data;
};

export const generateImage = async (prompt: string, size?: string) => {
  const response = await axios.post('/api/generate-image', { prompt, size });
  return response.data.url;
};

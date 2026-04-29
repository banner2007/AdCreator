export interface UserProfile {
  uid: string;
  email: string;
  credits: number;
  subscriptionPlan: 'free' | 'pro' | 'enterprise';
  config?: CreativeConfig;
}

export interface CreativeConfig {
  brandName?: string;
  brandColors: string[];
  brandLogoUrl?: string;
  address?: string;
  whatsapp?: string;
  contactPhone?: string;
  email?: string;
  paymentMethod?: string;
  shippingIncluded?: boolean;
  globalDirectives?: string;
}

export interface CreativeData {
  id?: string;
  userId: string;
  productName: string;
  visualTraits: string[];
  marketData: {
    prices: Record<string, string>;
    sentiment: {
      benefits: string[];
      painPoints: string[];
    };
  };
  hooks: string[];
  copys: string[];
  platform: string;
  tone: string;
  imageUrl?: string;
  dalleImageUrl?: string;
  createdAt: any;
}

export type DiscountType = 'percentage' | 'fixed';

export interface LocalCoupon {
  id: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  max_uses: number | null;
  expires_at: string | null;
  isNew?: boolean;
  used_count?: number;
  is_casadinha_only?: boolean;
}

export type CouponDraft = {
  code: string;
  type: DiscountType;
  value: string;
  maxUses: string;
  expires: string;
  isCasadinhaOnly: boolean;
};

export type EventFormValues = {
  title: string;
  description: string;
  eventDate: string;
  hasNoDate: boolean;
  price: string;
  isFree: boolean;
  totalSpots: string;
  hasNoSpotLimit: boolean;
};

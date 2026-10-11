'use client';

import { Plus, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CouponManager } from '../_hooks/useCouponManager';
import { CouponForm } from './CouponForm';
import { CouponListItem } from './CouponListItem';

export function CouponsCard({ manager }: { manager: CouponManager }) {
  const { editId, coupons, showCouponForm, setShowCouponForm } = manager;

  return (
    <Card className="shadow-md border-0 transition-all duration-300 rounded-3xl overflow-hidden dark:border dark:border-border">
      <CardHeader className="border-b border-gray-100 dark:border-border pb-6 flex flex-row items-center justify-between transition-colors">
        <CardTitle className="text-xl font-bold flex items-center gap-2 transition-colors">
          <Tag className="w-5 h-5 text-blue-500 dark:text-blue-400" /> Cupons de Desconto
        </CardTitle>
        {!showCouponForm && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowCouponForm(true)}
            className="rounded-xl h-9 font-medium"
          >
            <Plus className="w-4 h-4 mr-1" /> Novo Cupom
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-6">

        {coupons.length > 0 && (
          <div className="space-y-3 mb-6">
            {coupons.map(coupon => (
              <CouponListItem
                key={coupon.id}
                coupon={coupon}
                canShare={!!editId && !coupon.isNew}
                showTooltip={manager.showTooltipFor === coupon.id}
                onShare={() => manager.copyPromoLink(coupon.code)}
                onRemove={() => manager.handleRemoveCoupon(coupon.id, coupon.isNew)}
              />
            ))}
          </div>
        )}

        {showCouponForm && (
          <CouponForm
            draft={manager.draft}
            updateDraft={manager.updateDraft}
            isSaving={manager.isSavingCoupon}
            onSubmit={manager.handleAddCoupon}
            onCancel={() => setShowCouponForm(false)}
          />
        )}

        {!showCouponForm && coupons.length === 0 && (
          <div className="text-center py-6">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Nenhum cupom de desconto vinculado a este evento.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

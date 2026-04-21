import { useMutation, useQueryClient } from "@tanstack/react-query";

import { saleInventoryMovementQueryKeys } from "@/hooks/use-sale-inventory-movements";
import { checkoutCart, clearSalesProductCache, type CheckoutInput } from "@/services/sales";

export function useCheckoutCartMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CheckoutInput) => checkoutCart(input),
    onSuccess: (result, variables) => {
      clearSalesProductCache();

      void queryClient.invalidateQueries({
        queryKey: saleInventoryMovementQueryKeys.all,
      });

      void queryClient.invalidateQueries({
        queryKey: saleInventoryMovementQueryKeys.bySale(variables.orgId, result.saleId),
      });
    },
  });
}

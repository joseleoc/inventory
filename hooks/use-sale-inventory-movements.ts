import { useQuery } from "@tanstack/react-query";

import {
    listSaleInventoryMovements,
    type ListSaleInventoryMovementsInput,
} from "@/services/sale-inventory-movements";

export const saleInventoryMovementQueryKeys = {
  all: ["sale-inventory-movements"] as const,
  list: (input: ListSaleInventoryMovementsInput) =>
    [
      ...saleInventoryMovementQueryKeys.all,
      "list",
      input.orgId,
      input.saleId ?? "",
      input.saleLineId ?? "",
      input.productId ?? "",
      input.parentProductId ?? "",
      input.movementType ?? "",
      input.pageSize ?? 100,
    ] as const,
  bySale: (orgId: string, saleId: string, pageSize = 100) =>
    [...saleInventoryMovementQueryKeys.all, "sale", orgId, saleId, pageSize] as const,
};

export function useSaleInventoryMovements(input: ListSaleInventoryMovementsInput) {
  const normalizedInput = {
    ...input,
    orgId: input.orgId.trim(),
    saleId: input.saleId?.trim(),
    saleLineId: input.saleLineId?.trim(),
    productId: input.productId?.trim(),
    parentProductId: input.parentProductId?.trim(),
  };

  return useQuery({
    queryKey: saleInventoryMovementQueryKeys.list(normalizedInput),
    queryFn: () => listSaleInventoryMovements(normalizedInput),
    enabled: Boolean(normalizedInput.orgId),
  });
}

export function useSaleInventoryMovementsBySaleId(orgId: string, saleId: string, pageSize = 100) {
  const normalizedOrgId = orgId.trim();
  const normalizedSaleId = saleId.trim();

  return useQuery({
    queryKey: saleInventoryMovementQueryKeys.bySale(normalizedOrgId, normalizedSaleId, pageSize),
    queryFn: () =>
      listSaleInventoryMovements({
        orgId: normalizedOrgId,
        saleId: normalizedSaleId,
        pageSize,
      }),
    enabled: Boolean(normalizedOrgId && normalizedSaleId),
  });
}

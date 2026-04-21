import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type User } from "firebase/auth";

import {
    getCompoundRecipe,
    listCompoundRecipes,
    upsertCompoundRecipe,
    type UpsertCompoundRecipeInput,
} from "@/services/compound-recipes";

export const compoundRecipeQueryKeys = {
  all: ["compound-recipes"] as const,
  list: (orgId: string, isActive?: boolean) =>
    [...compoundRecipeQueryKeys.all, "list", orgId, isActive ?? "all"] as const,
  detail: (orgId: string, compoundProductId: string) =>
    [...compoundRecipeQueryKeys.all, "detail", orgId, compoundProductId] as const,
};

export function useCompoundRecipes(orgId: string, options?: { isActive?: boolean }) {
  const normalizedOrgId = orgId.trim();

  return useQuery({
    queryKey: compoundRecipeQueryKeys.list(normalizedOrgId, options?.isActive),
    queryFn: () => listCompoundRecipes(normalizedOrgId, { isActive: options?.isActive }),
    enabled: Boolean(normalizedOrgId),
  });
}

export function useCompoundRecipe(orgId: string, compoundProductId: string) {
  const normalizedOrgId = orgId.trim();
  const normalizedProductId = compoundProductId.trim();

  return useQuery({
    queryKey: compoundRecipeQueryKeys.detail(normalizedOrgId, normalizedProductId),
    queryFn: () => getCompoundRecipe(normalizedOrgId, normalizedProductId),
    enabled: Boolean(normalizedOrgId && normalizedProductId),
  });
}

type UpsertCompoundRecipeMutationInput = {
  input: UpsertCompoundRecipeInput;
  user: User;
};

export function useUpsertCompoundRecipeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ input, user }: UpsertCompoundRecipeMutationInput) =>
      upsertCompoundRecipe(input, user),
    onSuccess: (_result, variables) => {
      const orgId = variables.input.orgId.trim();
      const compoundProductId = variables.input.compoundProductId.trim();

      void queryClient.invalidateQueries({
        queryKey: compoundRecipeQueryKeys.list(orgId),
      });

      void queryClient.invalidateQueries({
        queryKey: compoundRecipeQueryKeys.detail(orgId, compoundProductId),
      });
    },
  });
}

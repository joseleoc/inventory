import { type User } from "firebase/auth";
import { create } from "zustand";

import {
    loadOrganizationContext,
    switchActiveOrganization,
    type OrganizationMembershipSummary,
    type OrganizationSummary,
} from "@/services/organizations";

type OrganizationState = {
  activeOrganization: OrganizationSummary | null;
  activeMembership: OrganizationMembershipSummary | null;
  memberships: OrganizationMembershipSummary[];
  isInitializing: boolean;
  organizationError: string | null;
  initializeOrganizationContext: (user: User) => Promise<void>;
  switchOrganization: (user: User, orgId: string) => Promise<void>;
  clearOrganizationContext: () => void;
};

const INITIAL_STATE = {
  activeOrganization: null,
  activeMembership: null,
  memberships: [],
  isInitializing: false,
  organizationError: null,
};

export const useOrganizationStore = create<OrganizationState>((set) => ({
  ...INITIAL_STATE,
  initializeOrganizationContext: async (user) => {
    set({ isInitializing: true, organizationError: null });

    try {
      const context = await loadOrganizationContext(user);
      set({
        activeOrganization: context.activeOrganization,
        activeMembership: context.activeMembership,
        memberships: context.memberships,
        isInitializing: false,
      });
    } catch (error) {
      set({
        ...INITIAL_STATE,
        isInitializing: false,
        organizationError:
          error instanceof Error ? error.message : "Unable to load organization context.",
      });
    }
  },
  switchOrganization: async (user, orgId) => {
    set({ isInitializing: true, organizationError: null });

    try {
      const context = await switchActiveOrganization(user, orgId);
      set({
        activeOrganization: context.activeOrganization,
        activeMembership: context.activeMembership,
        memberships: context.memberships,
        isInitializing: false,
      });
    } catch (error) {
      set({
        isInitializing: false,
        organizationError:
          error instanceof Error ? error.message : "Unable to switch organization.",
      });
      throw error;
    }
  },
  clearOrganizationContext: () => {
    set(INITIAL_STATE);
  },
}));

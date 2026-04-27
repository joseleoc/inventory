import { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";

import {
  AddProductFormTabsMolecule,
  type AddProductFormTab,
} from "@/components/molecules/add-product-form-tabs-molecule";
import { CompoundProductFormOrganism } from "@/components/organisms/compound-product-form-organism";
import { StandardProductFormOrganism } from "@/components/organisms/standard-product-form-organism";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { t } from "@/config/i18n";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/auth-store";
import { useOrganizationStore } from "@/stores/organization-store";

export default function AddProductScreen() {
  const user = useAuthStore((state) => state.user);
  const activeOrganization = useOrganizationStore((state) => state.activeOrganization);
  const activeMembership = useOrganizationStore((state) => state.activeMembership);

  const [activeFormTab, setActiveFormTab] = useState<AddProductFormTab>("stock");
  const { showToast, toastElement } = useToast({ position: "top" });

  const background = useThemeColor({}, "background");
  const muted = useMemo(() => "#7A7A7A", []);
  const cardBackground = useMemo(
    () => (background === "#fff" ? "#F4F7FA" : "#1D2227"),
    [background],
  );
  const borderColor = useMemo(() => (background === "#fff" ? "#D8E0E8" : "#2C333A"), [background]);

  if (!user) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.page}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <View style={[styles.headerCard, { backgroundColor: cardBackground, borderColor }]}>
          <ThemedText type="title" style={styles.title}>
            {t("addProduct.title")}
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: muted }]}>
            {t("addProduct.subtitle")}
          </ThemedText>
          <ThemedText selectable style={[styles.subtitle, { color: muted }]}>
            {activeOrganization
              ? t("common.activeOrgWithRole", {
                  name: activeOrganization.name,
                  role: activeMembership?.role ?? t("common.member"),
                })
              : t("common.noActiveOrgSelected")}
          </ThemedText>
        </View>

        {!activeOrganization ? (
          <View style={[styles.noticeCard, { backgroundColor: cardBackground, borderColor }]}>
            <ThemedText type="defaultSemiBold">{t("common.organizationRequiredTitle")}</ThemedText>
            <ThemedText selectable>{t("addProduct.noActiveOrganization")}</ThemedText>
          </View>
        ) : null}

        <AddProductFormTabsMolecule value={activeFormTab} onChange={setActiveFormTab} />

        {activeOrganization ? (
          activeFormTab === "stock" ? (
            <StandardProductFormOrganism
              orgId={activeOrganization.id}
              user={user}
              onSuccess={(name) => showToast(t("addProduct.productCreatedToast", { name }))}
            />
          ) : (
            <CompoundProductFormOrganism
              orgId={activeOrganization.id}
              user={user}
              onSuccess={(name) => showToast(t("addProduct.productCreatedToast", { name }))}
              onError={(message) => showToast(message, "error")}
            />
          )
        ) : null}
      </ScrollView>
      {toastElement}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 20,
    gap: 18,
  },
  headerCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 6,
  },
  title: {
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  noticeCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
});

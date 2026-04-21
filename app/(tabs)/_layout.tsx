import {
  DrawerContentScrollView,
  DrawerItemList,
  type DrawerContentComponentProps,
} from "@react-navigation/drawer";
import { Drawer } from "expo-router/drawer";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { NewCartHeaderButton } from "@/components/new-cart-button";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { t } from "@/config/i18n";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useOrganizationStore } from "@/stores/organization-store";
import { usePreferencesStore } from "@/stores/preferences-store";

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const activeOrganization = useOrganizationStore((state) => state.activeOrganization);

  const handleOpenSettings = () => {
    props.navigation.navigate("settings");
  };

  return (
    <View style={styles.drawerRoot}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.drawerContent}
        contentInsetAdjustmentBehavior="automatic">
        <View
          style={[
            styles.headerCard,
            { borderColor: colors.icon, backgroundColor: colors.background },
          ]}>
          <View style={[styles.appIdentity, { borderColor: colors.icon }]}>
            <IconSymbol size={18} name="shippingbox.fill" color={colors.text} />
            <ThemedText type="defaultSemiBold" style={styles.appName} selectable>
              {t("drawer.appName")}
            </ThemedText>
          </View>

          <ThemedText style={[styles.organizationLabel, { color: colors.icon }]} selectable>
            {t("drawer.currentOrganization")}
          </ThemedText>
          <ThemedText type="defaultSemiBold" style={styles.organizationName} selectable>
            {activeOrganization?.name?.trim() || t("drawer.noOrganization")}
          </ThemedText>
        </View>

        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      <View style={[styles.footer, { borderTopColor: colors.icon }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("drawer.settingsA11y")}
          onPress={handleOpenSettings}
          style={({ pressed }) => [
            styles.settingsButton,
            {
              borderColor: colors.icon,
              backgroundColor: colors.background,
              opacity: pressed ? 0.82 : 1,
            },
          ]}>
          <IconSymbol size={20} name="gearshape.fill" color={colors.text} />
          <ThemedText type="defaultSemiBold" style={styles.settingsLabel} selectable>
            {t("drawer.settings")}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

export default function TabLayout() {
  const language = usePreferencesStore((state) => state.language);

  return (
    <View style={styles.layoutRoot}>
      <Drawer
        key={language}
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerShown: true,
          headerRight: () => <NewCartHeaderButton />,
          headerRightContainerStyle: {
            paddingRight: 10,
          },
        }}>
        <Drawer.Screen
          name="index"
          options={{
            title: t("drawer.home"),
            drawerIcon: ({ color }: { color: string }) => (
              <IconSymbol size={24} name="house.fill" color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="add-product"
          options={{
            title: t("drawer.addProduct"),
            drawerIcon: ({ color }: { color: string }) => (
              <IconSymbol size={24} name="plus.circle.fill" color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="products"
          options={{
            title: t("drawer.products"),
            drawerIcon: ({ color }: { color: string }) => (
              <IconSymbol size={24} name="shippingbox.fill" color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="products/[productId]"
          options={{
            title: t("drawer.editProduct"),
            drawerItemStyle: { display: "none" },
          }}
        />
        <Drawer.Screen
          name="sales"
          options={{
            title: t("drawer.sales"),
            drawerIcon: ({ color }: { color: string }) => (
              <IconSymbol size={24} name="cart.fill" color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="organizations"
          options={{
            title: t("drawer.organizations"),
            drawerIcon: ({ color }: { color: string }) => (
              <IconSymbol size={24} name="building.2.fill" color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="settings"
          options={{
            title: t("drawer.settings"),
            drawerItemStyle: { display: "none" },
          }}
        />
      </Drawer>
    </View>
  );
}

const styles = StyleSheet.create({
  layoutRoot: {
    flex: 1,
  },
  drawerRoot: {
    flex: 1,
  },
  drawerContent: {
    paddingTop: 0,
    gap: 12,
  },
  headerCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginTop: 8,
    gap: 6,
  },
  appIdentity: {
    alignSelf: "flex-start",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  appName: {
    lineHeight: 20,
  },
  organizationLabel: {
    fontSize: 13,
    lineHeight: 18,
  },
  organizationName: {
    lineHeight: 22,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingBottom: 16,
    paddingTop: 10,
  },
  settingsButton: {
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  settingsLabel: {
    lineHeight: 22,
  },
});

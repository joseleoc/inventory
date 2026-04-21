import {
  DrawerContentScrollView,
  DrawerItemList,
  type DrawerContentComponentProps,
} from "@react-navigation/drawer";
import { Drawer } from "expo-router/drawer";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { NewCartFab } from "@/components/new-cart-fab";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { t } from "@/config/i18n";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const handleOpenSettings = () => {
    props.navigation.navigate("settings");
  };

  return (
    <View style={styles.drawerRoot}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.drawerContent}
        contentInsetAdjustmentBehavior="automatic">
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
  return (
    <View style={styles.layoutRoot}>
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerShown: true,
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

      <NewCartFab />
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

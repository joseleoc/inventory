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
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuthStore } from "@/stores/auth-store";

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const signOutCurrentUser = useAuthStore((state) => state.signOutCurrentUser);

  const handleLogout = async () => {
    try {
      await signOutCurrentUser();
    } catch {
      // Root auth handling manages redirect and error state.
    }
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
          accessibilityLabel="Log out"
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutButton,
            {
              borderColor: colors.icon,
              backgroundColor: colors.background,
              opacity: pressed ? 0.82 : 1,
            },
          ]}>
          <IconSymbol size={20} name="rectangle.portrait.and.arrow.right" color={colors.text} />
          <ThemedText type="defaultSemiBold" style={styles.logoutLabel} selectable>
            Log out
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
            title: "Home",
            drawerIcon: ({ color }: { color: string }) => (
              <IconSymbol size={24} name="house.fill" color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="explore"
          options={{
            title: "Explore",
            drawerIcon: ({ color }: { color: string }) => (
              <IconSymbol size={24} name="paperplane.fill" color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="add-product"
          options={{
            title: "Add Product",
            drawerIcon: ({ color }: { color: string }) => (
              <IconSymbol size={24} name="plus.circle.fill" color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="sales"
          options={{
            title: "Sales",
            drawerIcon: ({ color }: { color: string }) => (
              <IconSymbol size={24} name="cart.fill" color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="organizations"
          options={{
            title: "Organizations",
            drawerIcon: ({ color }: { color: string }) => (
              <IconSymbol size={24} name="building.2.fill" color={color} />
            ),
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
  logoutButton: {
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  logoutLabel: {
    lineHeight: 22,
  },
});

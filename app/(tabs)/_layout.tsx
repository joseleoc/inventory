import { Drawer } from "expo-router/drawer";
import React from "react";

import { IconSymbol } from "@/components/ui/icon-symbol";

export default function TabLayout() {
  return (
    <Drawer
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
    </Drawer>
  );
}

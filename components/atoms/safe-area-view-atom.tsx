import { StyleSheet, View, type ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useThemeColor } from "@/hooks/use-theme-color";

type SafeAreaEdge = "top" | "bottom" | "left" | "right";

const DEFAULT_EDGES: SafeAreaEdge[] = ["top", "bottom", "left", "right"];

type SafeAreaViewAtomProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  edges?: SafeAreaEdge[];
};

export function SafeAreaViewAtom({
  style,
  lightColor,
  darkColor,
  edges = DEFAULT_EDGES,
  ...otherProps
}: SafeAreaViewAtomProps) {
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, "background");

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor,
          paddingTop: edges.includes("top") ? insets.top : undefined,
          paddingBottom: edges.includes("bottom") ? insets.bottom : undefined,
          paddingLeft: edges.includes("left") ? insets.left : undefined,
          paddingRight: edges.includes("right") ? insets.right : undefined,
        },
        style,
      ]}
      {...otherProps}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
  },
});

import {
  KeyboardAvoidingView,
  ScrollView,
  type KeyboardAvoidingViewProps,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type KeyboardAvoidingViewAtomProps = Omit<
  KeyboardAvoidingViewProps,
  "behavior" | "keyboardVerticalOffset"
> & {
  iosBehavior?: KeyboardAvoidingViewProps["behavior"];
  androidBehavior?: KeyboardAvoidingViewProps["behavior"];
  iosKeyboardVerticalOffset?: number;
  androidKeyboardVerticalOffset?: number;
  scrollViewProps?: Omit<ScrollViewProps, "children">;
  style?: StyleProp<ViewStyle>;
};

export function KeyboardAvoidingViewAtom({
  iosBehavior = "padding",
  androidBehavior = "height",
  iosKeyboardVerticalOffset = 84,
  androidKeyboardVerticalOffset = 0,
  scrollViewProps,
  children,
  ...otherProps
}: KeyboardAvoidingViewAtomProps) {
  const behavior = process.env.EXPO_OS === "ios" ? iosBehavior : androidBehavior;
  const keyboardVerticalOffset =
    process.env.EXPO_OS === "ios" ? iosKeyboardVerticalOffset : androidKeyboardVerticalOffset;
  const {
    contentInsetAdjustmentBehavior = "automatic",
    keyboardShouldPersistTaps = "handled",
    ...otherScrollViewProps
  } = scrollViewProps ?? {};

  return (
    <KeyboardAvoidingView
      behavior={behavior}
      keyboardVerticalOffset={keyboardVerticalOffset}
      {...otherProps}>
      <ScrollView
        contentInsetAdjustmentBehavior={contentInsetAdjustmentBehavior}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        {...otherScrollViewProps}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

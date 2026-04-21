import { useMemo } from "react";
import {
    StyleSheet,
    TextInput,
    View,
    type StyleProp,
    type TextInputProps,
    type TextStyle,
    type ViewStyle,
} from "react-native";

import { FormFieldErrorAtom } from "@/components/atoms/form-field-error-atom";
import { FormFieldLabelAtom } from "@/components/atoms/form-field-label-atom";
import { useThemeColor } from "@/hooks/use-theme-color";

type LabeledInputFieldMoleculeProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  errorMessage?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  placeholderTextColor?: string;
} & Omit<TextInputProps, "value" | "onChangeText">;

export function LabeledInputFieldMolecule({
  label,
  value,
  onChangeText,
  errorMessage,
  containerStyle,
  inputStyle,
  placeholderTextColor,
  ...inputProps
}: LabeledInputFieldMoleculeProps) {
  const textColor = useThemeColor({}, "text");
  const background = useThemeColor({}, "background");
  const borderColor = useMemo(() => (background === "#fff" ? "#D8E0E8" : "#2C333A"), [background]);
  const inputBackground = useMemo(
    () => (background === "#fff" ? "#F4F7FA" : "#1D2227"),
    [background],
  );
  const defaultPlaceholderColor = useMemo(() => "#7A7A7A", []);

  return (
    <View style={containerStyle}>
      <FormFieldLabelAtom label={label} />
      <TextInput
        {...inputProps}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={placeholderTextColor ?? defaultPlaceholderColor}
        style={[
          styles.input,
          {
            color: textColor,
            backgroundColor: inputBackground,
            borderColor,
          },
          inputStyle,
        ]}
      />
      <FormFieldErrorAtom message={errorMessage} />
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginTop: 4,
  },
});

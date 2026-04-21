import { StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";

type FormFieldLabelAtomProps = {
  label: string;
};

export function FormFieldLabelAtom({ label }: FormFieldLabelAtomProps) {
  return (
    <ThemedText type="defaultSemiBold" style={styles.label}>
      {label}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    lineHeight: 18,
  },
});

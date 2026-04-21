import { StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";

type FormFieldErrorAtomProps = {
  message?: string;
};

export function FormFieldErrorAtom({ message }: FormFieldErrorAtomProps) {
  if (!message) {
    return null;
  }

  return <ThemedText style={styles.errorText}>{message}</ThemedText>;
}

const styles = StyleSheet.create({
  errorText: {
    color: "#C5283D",
    fontSize: 13,
  },
});

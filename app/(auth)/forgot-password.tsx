import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { z } from "zod";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { t } from "@/config/i18n";
import { Colors, Fonts } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuthStore } from "@/stores/auth-store";

const forgotPasswordSchema = z.object({
  email: z.email(t("auth.forgotPassword.validation.email")),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const authError = useAuthStore((state) => state.authError);
  const sendPasswordReset = useAuthStore((state) => state.sendPasswordReset);
  const clearAuthError = useAuthStore((state) => state.clearAuthError);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  useEffect(() => {
    clearAuthError();
    return () => {
      clearAuthError();
    };
  }, [clearAuthError]);

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setSuccessMessage(null);

    try {
      await sendPasswordReset(values.email.trim());
      setSuccessMessage(t("auth.forgotPassword.success"));
    } catch {
      // Store error state already contains the user-facing message.
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View
          style={[styles.card, { backgroundColor: colors.background, borderColor: colors.icon }]}>
          <ThemedText type="title" style={styles.title} selectable>
            {t("auth.forgotPassword.title")}
          </ThemedText>
          <ThemedText style={styles.subtitle} selectable>
            {t("auth.forgotPassword.subtitle")}
          </ThemedText>

          <View style={styles.fieldGroup}>
            <ThemedText type="defaultSemiBold" selectable>
              {t("common.labels.email")}
            </ThemedText>
            <Controller
              control={control}
              name="email"
              render={({ field: { onBlur, onChange, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoComplete="email"
                  accessibilityLabel={t("common.labels.email")}
                  editable={!isSubmitting}
                  placeholder={t("auth.forgotPassword.emailPlaceholder")}
                  placeholderTextColor={colors.icon}
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      borderColor: errors.email ? "#c62828" : colors.icon,
                    },
                  ]}
                />
              )}
            />
            {errors.email ? (
              <ThemedText style={styles.errorText} selectable>
                {errors.email.message}
              </ThemedText>
            ) : null}
          </View>

          {authError ? (
            <ThemedText style={styles.errorText} selectable>
              {authError}
            </ThemedText>
          ) : null}

          {successMessage ? (
            <ThemedText style={styles.successText} selectable>
              {successMessage}
            </ThemedText>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("auth.forgotPassword.submitA11y")}
            disabled={isSubmitting}
            onPress={handleSubmit(onSubmit)}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.tint, opacity: isSubmitting || pressed ? 0.85 : 1 },
            ]}>
            <ThemedText style={styles.buttonText} selectable>
              {isSubmitting ? t("auth.forgotPassword.submitting") : t("auth.forgotPassword.submit")}
            </ThemedText>
          </Pressable>

          <Link href="/(auth)/login" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("auth.forgotPassword.backToLoginA11y")}
              style={styles.linkButton}>
              <ThemedText type="link" style={styles.linkText} selectable>
                {t("auth.forgotPassword.backToLogin")}
              </ThemedText>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 20,
    gap: 14,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 30,
    lineHeight: 34,
  },
  subtitle: {
    opacity: 0.8,
  },
  fieldGroup: {
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  linkButton: {
    alignSelf: "center",
    paddingVertical: 6,
  },
  linkText: {
    lineHeight: 22,
  },
  errorText: {
    color: "#c62828",
  },
  successText: {
    color: "#1b5e20",
  },
});

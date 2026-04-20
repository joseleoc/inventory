import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "expo-router";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { z } from "zod";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { t } from "@/config/i18n";
import { Colors, Fonts } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuthStore } from "@/stores/auth-store";

const signupSchema = z
  .object({
    name: z.string().min(2, t("auth.signup.validation.name")),
    email: z.email(t("auth.signup.validation.email")),
    password: z.string().min(8, t("auth.signup.validation.password")),
    confirmPassword: z.string().min(1, t("auth.signup.validation.confirmPassword")),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: t("auth.signup.validation.passwordMismatch"),
  });

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const authError = useAuthStore((state) => state.authError);
  const signUpWithEmailPassword = useAuthStore((state) => state.signUpWithEmailPassword);
  const clearAuthError = useAuthStore((state) => state.clearAuthError);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    clearAuthError();
    return () => {
      clearAuthError();
    };
  }, [clearAuthError]);

  const onSubmit = async (values: SignupFormValues) => {
    try {
      await signUpWithEmailPassword(values.name.trim(), values.email.trim(), values.password);
      router.replace("/(tabs)");
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
            {t("auth.signup.title")}
          </ThemedText>
          <ThemedText style={styles.subtitle} selectable>
            {t("auth.signup.subtitle")}
          </ThemedText>

          <View style={styles.fieldGroup}>
            <ThemedText type="defaultSemiBold" selectable>
              {t("common.labels.name")}
            </ThemedText>
            <Controller
              control={control}
              name="name"
              render={({ field: { onBlur, onChange, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize="words"
                  autoCorrect={false}
                  textContentType="name"
                  autoComplete="name"
                  accessibilityLabel={t("common.labels.name")}
                  editable={!isSubmitting}
                  placeholder={t("auth.signup.namePlaceholder")}
                  placeholderTextColor={colors.icon}
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      borderColor: errors.name ? "#c62828" : colors.icon,
                    },
                  ]}
                />
              )}
            />
            {errors.name ? (
              <ThemedText style={styles.errorText} selectable>
                {errors.name.message}
              </ThemedText>
            ) : null}
          </View>

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
                  placeholder={t("auth.signup.emailPlaceholder")}
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

          <View style={styles.fieldGroup}>
            <ThemedText type="defaultSemiBold" selectable>
              {t("common.labels.password")}
            </ThemedText>
            <Controller
              control={control}
              name="password"
              render={({ field: { onBlur, onChange, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry
                  textContentType="newPassword"
                  autoComplete="password-new"
                  accessibilityLabel={t("common.labels.password")}
                  editable={!isSubmitting}
                  placeholder={t("auth.signup.passwordPlaceholder")}
                  placeholderTextColor={colors.icon}
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      borderColor: errors.password ? "#c62828" : colors.icon,
                    },
                  ]}
                />
              )}
            />
            {errors.password ? (
              <ThemedText style={styles.errorText} selectable>
                {errors.password.message}
              </ThemedText>
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <ThemedText type="defaultSemiBold" selectable>
              {t("auth.signup.confirmPasswordLabel")}
            </ThemedText>
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onBlur, onChange, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry
                  textContentType="password"
                  autoComplete="password-new"
                  accessibilityLabel={t("auth.signup.confirmPasswordA11y")}
                  editable={!isSubmitting}
                  placeholder={t("auth.signup.confirmPasswordPlaceholder")}
                  placeholderTextColor={colors.icon}
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      borderColor: errors.confirmPassword ? "#c62828" : colors.icon,
                    },
                  ]}
                />
              )}
            />
            {errors.confirmPassword ? (
              <ThemedText style={styles.errorText} selectable>
                {errors.confirmPassword.message}
              </ThemedText>
            ) : null}
          </View>

          {authError ? (
            <ThemedText style={styles.errorText} selectable>
              {authError}
            </ThemedText>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("auth.signup.submitA11y")}
            disabled={isSubmitting}
            onPress={handleSubmit(onSubmit)}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.tint, opacity: isSubmitting || pressed ? 0.85 : 1 },
            ]}>
            <ThemedText style={styles.buttonText} selectable>
              {isSubmitting ? t("auth.signup.submitting") : t("auth.signup.submit")}
            </ThemedText>
          </Pressable>

          <Link href="/(auth)/login" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("auth.signup.backToLoginA11y")}
              style={styles.linkButton}>
              <ThemedText type="link" style={styles.linkText} selectable>
                {t("auth.signup.backToLogin")}
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
});

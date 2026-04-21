import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { z } from "zod";

import { AuthQuickPreferences } from "@/components/auth/auth-quick-preferences";
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
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);
  const [focusedField, setFocusedField] = useState<keyof SignupFormValues | null>(null);

  const palette = {
    cardBackground: colorScheme === "dark" ? "#1b1f23" : "#f7fafc",
    cardBorder: colorScheme === "dark" ? "#2f363d" : "#d5dee6",
    subtitle: colorScheme === "dark" ? "#c4ccd2" : "#46515a",
    inputBackground: colorScheme === "dark" ? "#0f1214" : "#ffffff",
    inputBorder: colorScheme === "dark" ? "#404a52" : "#b7c3ce",
    inputPlaceholder: colorScheme === "dark" ? "#acb5bc" : "#5d6871",
    buttonText: colorScheme === "dark" ? "#11181C" : "#ffffff",
    error: colorScheme === "dark" ? "#ff8a80" : "#b3261e",
  };

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

  const submit = handleSubmit(onSubmit);

  return (
    <ThemedView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled">
          <View
            style={[
              styles.card,
              { backgroundColor: palette.cardBackground, borderColor: palette.cardBorder },
            ]}>
            <AuthQuickPreferences disabled={isSubmitting} />
            <ThemedText type="title" style={styles.title} selectable>
              {t("auth.signup.title")}
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: palette.subtitle }]} selectable>
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
                    onBlur={() => {
                      onBlur();
                      setFocusedField(null);
                    }}
                    onFocus={() => setFocusedField("name")}
                    onSubmitEditing={() => emailInputRef.current?.focus()}
                    returnKeyType="next"
                    enablesReturnKeyAutomatically
                    autoCapitalize="words"
                    autoCorrect={false}
                    textContentType="name"
                    autoComplete="name"
                    accessibilityLabel={t("common.labels.name")}
                    editable={!isSubmitting}
                    placeholder={t("auth.signup.namePlaceholder")}
                    placeholderTextColor={palette.inputPlaceholder}
                    selectionColor={colors.tint}
                    cursorColor={colors.tint}
                    style={[
                      styles.input,
                      {
                        color: colors.text,
                        backgroundColor: palette.inputBackground,
                        borderColor: errors.name
                          ? palette.error
                          : focusedField === "name"
                            ? colors.tint
                            : palette.inputBorder,
                      },
                    ]}
                  />
                )}
              />
              {errors.name ? (
                <ThemedText style={[styles.errorText, { color: palette.error }]} selectable>
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
                    ref={emailInputRef}
                    value={value}
                    onChangeText={onChange}
                    onBlur={() => {
                      onBlur();
                      setFocusedField(null);
                    }}
                    onFocus={() => setFocusedField("email")}
                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                    returnKeyType="next"
                    enablesReturnKeyAutomatically
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoComplete="email"
                    accessibilityLabel={t("common.labels.email")}
                    editable={!isSubmitting}
                    placeholder={t("auth.signup.emailPlaceholder")}
                    placeholderTextColor={palette.inputPlaceholder}
                    selectionColor={colors.tint}
                    cursorColor={colors.tint}
                    style={[
                      styles.input,
                      {
                        color: colors.text,
                        backgroundColor: palette.inputBackground,
                        borderColor: errors.email
                          ? palette.error
                          : focusedField === "email"
                            ? colors.tint
                            : palette.inputBorder,
                      },
                    ]}
                  />
                )}
              />
              {errors.email ? (
                <ThemedText style={[styles.errorText, { color: palette.error }]} selectable>
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
                    ref={passwordInputRef}
                    value={value}
                    onChangeText={onChange}
                    onBlur={() => {
                      onBlur();
                      setFocusedField(null);
                    }}
                    onFocus={() => setFocusedField("password")}
                    onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
                    returnKeyType="next"
                    enablesReturnKeyAutomatically
                    secureTextEntry
                    textContentType="newPassword"
                    autoComplete="password-new"
                    autoCapitalize="none"
                    autoCorrect={false}
                    accessibilityLabel={t("common.labels.password")}
                    editable={!isSubmitting}
                    placeholder={t("auth.signup.passwordPlaceholder")}
                    placeholderTextColor={palette.inputPlaceholder}
                    selectionColor={colors.tint}
                    cursorColor={colors.tint}
                    style={[
                      styles.input,
                      {
                        color: colors.text,
                        backgroundColor: palette.inputBackground,
                        borderColor: errors.password
                          ? palette.error
                          : focusedField === "password"
                            ? colors.tint
                            : palette.inputBorder,
                      },
                    ]}
                  />
                )}
              />
              {errors.password ? (
                <ThemedText style={[styles.errorText, { color: palette.error }]} selectable>
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
                    ref={confirmPasswordInputRef}
                    value={value}
                    onChangeText={onChange}
                    onBlur={() => {
                      onBlur();
                      setFocusedField(null);
                    }}
                    onFocus={() => setFocusedField("confirmPassword")}
                    onSubmitEditing={() => {
                      void submit();
                    }}
                    returnKeyType="done"
                    enablesReturnKeyAutomatically
                    secureTextEntry
                    textContentType="password"
                    autoComplete="password-new"
                    autoCapitalize="none"
                    autoCorrect={false}
                    accessibilityLabel={t("auth.signup.confirmPasswordA11y")}
                    editable={!isSubmitting}
                    placeholder={t("auth.signup.confirmPasswordPlaceholder")}
                    placeholderTextColor={palette.inputPlaceholder}
                    selectionColor={colors.tint}
                    cursorColor={colors.tint}
                    style={[
                      styles.input,
                      {
                        color: colors.text,
                        backgroundColor: palette.inputBackground,
                        borderColor: errors.confirmPassword
                          ? palette.error
                          : focusedField === "confirmPassword"
                            ? colors.tint
                            : palette.inputBorder,
                      },
                    ]}
                  />
                )}
              />
              {errors.confirmPassword ? (
                <ThemedText style={[styles.errorText, { color: palette.error }]} selectable>
                  {errors.confirmPassword.message}
                </ThemedText>
              ) : null}
            </View>

            {authError ? (
              <ThemedText
                style={[styles.errorText, { color: palette.error }]}
                accessibilityLiveRegion="polite"
                selectable>
                {authError}
              </ThemedText>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("auth.signup.submitA11y")}
              disabled={isSubmitting}
              onPress={submit}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: colors.tint,
                  opacity: isSubmitting || pressed ? 0.85 : 1,
                },
              ]}>
              <ThemedText style={[styles.buttonText, { color: palette.buttonText }]} selectable>
                {isSubmitting ? t("auth.signup.submitting") : t("auth.signup.submit")}
              </ThemedText>
            </Pressable>

            <Link href="/(auth)/login" asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("auth.signup.backToLoginA11y")}
                disabled={isSubmitting}
                style={styles.linkButton}>
                <ThemedText type="link" style={styles.linkText} selectable>
                  {t("auth.signup.backToLogin")}
                </ThemedText>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  card: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
    borderWidth: 1,
    borderRadius: 18,
    padding: 22,
    gap: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 30,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  fieldGroup: {
    gap: 8,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 50,
    fontSize: 16,
  },
  button: {
    borderRadius: 12,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    fontWeight: "700",
    lineHeight: 22,
  },
  linkButton: {
    alignSelf: "center",
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  linkText: {
    lineHeight: 22,
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
});

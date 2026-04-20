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

const loginSchema = z.object({
  email: z.email(t("auth.login.validation.email")),
  password: z.string().min(1, t("auth.login.validation.password")),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const authError = useAuthStore((state) => state.authError);
  const signInWithEmailPassword = useAuthStore((state) => state.signInWithEmailPassword);
  const clearAuthError = useAuthStore((state) => state.clearAuthError);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    clearAuthError();
    return () => {
      clearAuthError();
    };
  }, [clearAuthError]);

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await signInWithEmailPassword(values.email.trim(), values.password);
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
            {t("auth.login.title")}
          </ThemedText>
          <ThemedText style={styles.subtitle} selectable>
            {t("auth.login.subtitle")}
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
                  placeholder={t("auth.login.emailPlaceholder")}
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
                  textContentType="password"
                  autoComplete="password"
                  accessibilityLabel={t("common.labels.password")}
                  editable={!isSubmitting}
                  placeholder={t("auth.login.passwordPlaceholder")}
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

          {authError ? (
            <ThemedText style={styles.errorText} selectable>
              {authError}
            </ThemedText>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("auth.login.submitA11y")}
            disabled={isSubmitting}
            onPress={handleSubmit(onSubmit)}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.tint, opacity: isSubmitting || pressed ? 0.85 : 1 },
            ]}>
            <ThemedText style={styles.buttonText} selectable>
              {isSubmitting ? t("auth.login.submitting") : t("auth.login.submit")}
            </ThemedText>
          </Pressable>

          <Link href="/(auth)/forgot-password" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("auth.login.forgotA11y")}
              style={styles.linkButton}>
              <ThemedText type="link" style={styles.linkText} selectable>
                {t("auth.login.forgotPassword")}
              </ThemedText>
            </Pressable>
          </Link>

          <Link href="/(auth)/signup" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("auth.login.createA11y")}
              style={styles.linkButton}>
              <ThemedText type="link" style={styles.linkText} selectable>
                {t("auth.login.createAccount")}
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

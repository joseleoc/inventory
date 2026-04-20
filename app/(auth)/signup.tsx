import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "expo-router";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { z } from "zod";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors, Fonts } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuthStore } from "@/stores/auth-store";

const signupSchema = z
  .object({
    name: z.string().min(2, "Name must have at least 2 characters."),
    email: z.email("Enter a valid email address."),
    password: z.string().min(8, "Password must have at least 8 characters."),
    confirmPassword: z.string().min(1, "Please confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
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
            Create account
          </ThemedText>
          <ThemedText style={styles.subtitle} selectable>
            New accounts are created with the admin role. If you have no organization, you will be
            redirected to set one up.
          </ThemedText>

          <View style={styles.fieldGroup}>
            <ThemedText type="defaultSemiBold" selectable>
              Name
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
                  accessibilityLabel="Name"
                  editable={!isSubmitting}
                  placeholder="Jane Doe"
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
              Email
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
                  accessibilityLabel="Email"
                  editable={!isSubmitting}
                  placeholder="name@example.com"
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
              Password
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
                  accessibilityLabel="Password"
                  editable={!isSubmitting}
                  placeholder="Minimum 8 characters"
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
              Confirm Password
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
                  accessibilityLabel="Confirm password"
                  editable={!isSubmitting}
                  placeholder="Re-enter your password"
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
            accessibilityLabel="Create account"
            disabled={isSubmitting}
            onPress={handleSubmit(onSubmit)}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.tint, opacity: isSubmitting || pressed ? 0.85 : 1 },
            ]}>
            <ThemedText style={styles.buttonText} selectable>
              {isSubmitting ? "Creating account..." : "Create account"}
            </ThemedText>
          </Pressable>

          <Link href="/(auth)/login" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to login"
              style={styles.linkButton}>
              <ThemedText type="link" style={styles.linkText} selectable>
                Already have an account? Sign in
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

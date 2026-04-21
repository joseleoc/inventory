import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { t } from "@/config/i18n";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  ORGANIZATION_ROLE_OPTIONS,
  assignUserToOrganization,
  createOrganization,
  type OrganizationRole,
} from "@/services/organizations";
import { useAuthStore } from "@/stores/auth-store";
import { useOrganizationStore } from "@/stores/organization-store";

type OrganizationFormState = {
  name: string;
  description: string;
};

type AssignmentFormState = {
  email: string;
  organizationId: string;
  role: Exclude<OrganizationRole, "owner">;
};

type OrganizationErrors = Partial<Record<keyof OrganizationFormState, string>>;
type AssignmentErrors = Partial<Record<keyof AssignmentFormState, string>>;

const INITIAL_ORGANIZATION_STATE: OrganizationFormState = {
  name: "",
  description: "",
};

const INITIAL_ASSIGNMENT_STATE: AssignmentFormState = {
  email: "",
  organizationId: "",
  role: "manager",
};

const ASSIGNABLE_ROLES = ORGANIZATION_ROLE_OPTIONS.filter((role) => role !== "owner");

function normalizeOptionalText(value: string) {
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function validateOrganizationForm(state: OrganizationFormState) {
  const errors: OrganizationErrors = {};

  if (!state.name.trim()) {
    errors.name = t("organizations.validation.organizationName");
  }

  return errors;
}

function validateAssignmentForm(state: AssignmentFormState) {
  const errors: AssignmentErrors = {};
  const normalizedEmail = state.email.trim().toLowerCase();

  if (!normalizedEmail) {
    errors.email = t("organizations.validation.emailRequired");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    errors.email = t("organizations.validation.emailInvalid");
  }

  if (!state.organizationId.trim()) {
    errors.organizationId = t("organizations.validation.orgRequired");
  }

  return errors;
}

function FieldLabel({ label }: { label: string }) {
  return (
    <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>
      {label}
    </ThemedText>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <ThemedText style={styles.errorText}>{message}</ThemedText>;
}

export default function OrganizationsScreen() {
  const user = useAuthStore((state) => state.user);
  const activeMembership = useOrganizationStore((state) => state.activeMembership);
  const activeOrganization = useOrganizationStore((state) => state.activeOrganization);
  const memberships = useOrganizationStore((state) => state.memberships);
  const initializeOrganizationContext = useOrganizationStore(
    (state) => state.initializeOrganizationContext,
  );
  const organizationError = useOrganizationStore((state) => state.organizationError);
  const switchOrganization = useOrganizationStore((state) => state.switchOrganization);

  const [organizationForm, setOrganizationForm] = useState(INITIAL_ORGANIZATION_STATE);
  const [assignmentForm, setAssignmentForm] = useState(INITIAL_ASSIGNMENT_STATE);
  const [organizationErrors, setOrganizationErrors] = useState<OrganizationErrors>({});
  const [assignmentErrors, setAssignmentErrors] = useState<AssignmentErrors>({});
  const [isCreating, setIsCreating] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [screenMessage, setScreenMessage] = useState<string | null>(null);
  const [screenError, setScreenError] = useState<string | null>(null);

  const background = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const accentColor = useMemo(() => "#0a7ea4", []);
  const dangerColor = useMemo(() => "#C5283D", []);
  const successColor = useMemo(() => "#1E8E3E", []);
  const muted = useMemo(() => (background === "#fff" ? "#3F4D5A" : "#C6D2DE"), [background]);
  const inputBackground = useMemo(
    () => (background === "#fff" ? "#F4F7FA" : "#1D2227"),
    [background],
  );
  const sectionBackground = useMemo(
    () => (background === "#fff" ? "#F8FBFD" : "#1A2128"),
    [background],
  );
  const errorBackground = useMemo(
    () => (background === "#fff" ? "#FDECEE" : "#2A1A1D"),
    [background],
  );
  const successBackground = useMemo(
    () => (background === "#fff" ? "#EAF8EE" : "#18271E"),
    [background],
  );
  const borderColor = useMemo(() => (background === "#fff" ? "#D8E0E8" : "#2C333A"), [background]);
  const chipBackground = useMemo(
    () => (background === "#fff" ? "#EAF4F8" : "#16242C"),
    [background],
  );

  const formatRoleLabel = (role: OrganizationRole) => t(`organizations.roles.${role}`);

  const activeOrganizationId = activeOrganization?.id ?? "";

  useEffect(() => {
    if (!activeOrganizationId) {
      return;
    }

    setAssignmentForm((current) => {
      if (current.organizationId) {
        return current;
      }

      if (current.organizationId === activeOrganizationId) {
        return current;
      }

      return { ...current, organizationId: activeOrganizationId };
    });
  }, [activeOrganizationId]);

  const handleCreateOrganization = async () => {
    if (!user || isCreating) {
      return;
    }

    const nextErrors = validateOrganizationForm(organizationForm);
    setOrganizationErrors(nextErrors);
    setScreenError(null);
    setScreenMessage(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsCreating(true);

    try {
      const organizationId = await createOrganization(
        {
          name: organizationForm.name.trim(),
          description: normalizeOptionalText(organizationForm.description),
        },
        user,
      );

      await initializeOrganizationContext(user);
      setAssignmentForm((current) => ({ ...current, organizationId }));
      setOrganizationForm(INITIAL_ORGANIZATION_STATE);
      setScreenMessage(t("organizations.messages.created"));
    } catch (error) {
      setScreenError(
        error instanceof Error ? error.message : t("organizations.messages.createError"),
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleAssignUser = async () => {
    if (!user || isAssigning) {
      return;
    }

    const nextErrors = validateAssignmentForm(assignmentForm);
    setAssignmentErrors(nextErrors);
    setScreenError(null);
    setScreenMessage(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsAssigning(true);

    try {
      const result = await assignUserToOrganization(
        {
          organizationId: assignmentForm.organizationId,
          email: assignmentForm.email,
          role: assignmentForm.role,
        },
        user,
      );

      setAssignmentForm((current) => ({ ...current, email: "" }));
      setScreenMessage(
        result.mode === "membership"
          ? t("organizations.messages.assigned", { organizationName: result.organizationName })
          : t("organizations.messages.invited", { organizationName: result.organizationName }),
      );
    } catch (error) {
      setScreenError(
        error instanceof Error ? error.message : t("organizations.messages.assignError"),
      );
    } finally {
      setIsAssigning(false);
    }
  };

  if (!user) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.page}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <View style={[styles.heroCard, { backgroundColor: inputBackground, borderColor }]}>
          <ThemedText type="title" style={styles.title}>
            {t("organizations.title")}
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: muted }]}>
            {t("organizations.subtitle")}
          </ThemedText>

          <View style={styles.contextBlock}>
            <ThemedText type="defaultSemiBold">
              {t("organizations.activeOrganizationLabel")}
            </ThemedText>
            <ThemedText selectable>
              {activeOrganization
                ? activeOrganization.name
                : t("organizations.noActiveOrganization")}
            </ThemedText>
            <ThemedText selectable style={[styles.contextMetaText, { color: muted }]}>
              {activeMembership && activeOrganization
                ? `${t("common.labels.role")}: ${formatRoleLabel(activeMembership.role)}`
                : t("organizations.noContextMessage")}
            </ThemedText>
          </View>
        </View>

        {organizationError ? (
          <View
            style={[
              styles.banner,
              styles.errorBanner,
              { borderColor: dangerColor, backgroundColor: errorBackground },
            ]}>
            <ThemedText style={styles.errorText}>{organizationError}</ThemedText>
          </View>
        ) : null}
        {screenError ? (
          <View
            style={[
              styles.banner,
              styles.errorBanner,
              { borderColor: dangerColor, backgroundColor: errorBackground },
            ]}>
            <ThemedText style={styles.errorText}>{screenError}</ThemedText>
          </View>
        ) : null}
        {screenMessage ? (
          <View
            style={[
              styles.banner,
              styles.successBanner,
              { borderColor: successColor, backgroundColor: successBackground },
            ]}>
            <ThemedText style={styles.successText}>{screenMessage}</ThemedText>
          </View>
        ) : null}

        <View
          style={[
            styles.section,
            styles.sectionCard,
            { backgroundColor: sectionBackground, borderColor },
          ]}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            {t("organizations.switchTitle")}
          </ThemedText>
          {memberships.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: inputBackground, borderColor }]}>
              <ThemedText selectable>{t("organizations.membershipsEmpty")}</ThemedText>
            </View>
          ) : (
            <View style={styles.membershipList}>
              {memberships.map((membership) => {
                const selected = membership.orgId === activeOrganization?.id;
                return (
                  <Pressable
                    key={membership.id}
                    onPress={() => void switchOrganization(user, membership.orgId)}
                    style={({ pressed }) => [
                      styles.membershipCard,
                      {
                        backgroundColor: selected ? chipBackground : inputBackground,
                        borderColor: selected ? accentColor : borderColor,
                        opacity: pressed ? 0.84 : 1,
                      },
                    ]}>
                    <ThemedText type="defaultSemiBold" selectable>
                      {membership.orgName}
                    </ThemedText>
                    <ThemedText
                      selectable
                      numberOfLines={2}
                      style={[styles.cardMetaText, { color: muted }]}>
                      {formatRoleLabel(membership.role)}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <View
          style={[
            styles.section,
            styles.sectionCard,
            { backgroundColor: sectionBackground, borderColor },
          ]}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            {t("organizations.createTitle")}
          </ThemedText>

          <FieldLabel label={t("organizations.fields.organizationName")} />
          <TextInput
            value={organizationForm.name}
            onChangeText={(value) => {
              setOrganizationForm((current) => ({ ...current, name: value }));
              setOrganizationErrors((current) => ({ ...current, name: undefined }));
            }}
            placeholder={t("organizations.placeholders.organizationName")}
            placeholderTextColor={muted}
            accessibilityLabel={t("organizations.fields.organizationName")}
            style={[
              styles.input,
              { color: textColor, backgroundColor: inputBackground, borderColor },
            ]}
          />
          <FieldError message={organizationErrors.name} />

          <FieldLabel label={t("organizations.fields.description")} />
          <TextInput
            value={organizationForm.description}
            onChangeText={(value) =>
              setOrganizationForm((current) => ({ ...current, description: value }))
            }
            placeholder={t("organizations.placeholders.description")}
            placeholderTextColor={muted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            accessibilityLabel={t("organizations.fields.description")}
            style={[
              styles.input,
              styles.multiline,
              { color: textColor, backgroundColor: inputBackground, borderColor },
            ]}
          />

          <Pressable
            onPress={handleCreateOrganization}
            disabled={isCreating}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: accentColor, opacity: pressed || isCreating ? 0.82 : 1 },
            ]}>
            {isCreating ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <ThemedText style={styles.primaryButtonText}>
                {t("organizations.buttons.create")}
              </ThemedText>
            )}
          </Pressable>
        </View>

        <View
          style={[
            styles.section,
            styles.sectionCard,
            { backgroundColor: sectionBackground, borderColor },
          ]}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            {t("organizations.assignTitle")}
          </ThemedText>

          <FieldLabel label={t("organizations.fields.targetOrganization")} />
          <View style={styles.membershipList}>
            {memberships.map((membership) => {
              const selected = membership.orgId === assignmentForm.organizationId;
              return (
                <Pressable
                  key={`assignment-${membership.id}`}
                  onPress={() => {
                    setAssignmentForm((current) => ({
                      ...current,
                      organizationId: membership.orgId,
                    }));
                    setAssignmentErrors((current) => ({ ...current, organizationId: undefined }));
                  }}
                  style={({ pressed }) => [
                    styles.membershipCard,
                    {
                      backgroundColor: selected ? chipBackground : inputBackground,
                      borderColor: selected ? accentColor : borderColor,
                      opacity: pressed ? 0.84 : 1,
                    },
                  ]}>
                  <ThemedText type="defaultSemiBold" selectable>
                    {membership.orgName}
                  </ThemedText>
                  <ThemedText selectable style={[styles.cardMetaText, { color: muted }]}>
                    {formatRoleLabel(membership.role)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          <FieldError message={assignmentErrors.organizationId} />

          <FieldLabel label={t("organizations.fields.email")} />
          <TextInput
            value={assignmentForm.email}
            onChangeText={(value) => {
              setAssignmentForm((current) => ({ ...current, email: value }));
              setAssignmentErrors((current) => ({ ...current, email: undefined }));
            }}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder={t("organizations.placeholders.assigneeEmail")}
            placeholderTextColor={muted}
            accessibilityLabel={t("organizations.fields.email")}
            style={[
              styles.input,
              { color: textColor, backgroundColor: inputBackground, borderColor },
            ]}
          />
          <FieldError message={assignmentErrors.email} />

          <FieldLabel label={t("organizations.fields.role")} />
          <View style={styles.roleRow}>
            {ASSIGNABLE_ROLES.map((role) => {
              const selected = assignmentForm.role === role;
              return (
                <Pressable
                  key={role}
                  onPress={() => setAssignmentForm((current) => ({ ...current, role }))}
                  style={({ pressed }) => [
                    styles.roleChip,
                    {
                      backgroundColor: selected ? accentColor : inputBackground,
                      borderColor: selected ? accentColor : borderColor,
                      opacity: pressed ? 0.84 : 1,
                    },
                  ]}>
                  <ThemedText
                    style={[styles.roleChipText, { color: selected ? "#ffffff" : textColor }]}>
                    {formatRoleLabel(role)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={handleAssignUser}
            disabled={isAssigning || memberships.length === 0}
            style={({ pressed }) => [
              styles.secondaryButton,
              {
                borderColor: accentColor,
                backgroundColor: memberships.length === 0 ? inputBackground : chipBackground,
                opacity: pressed || isAssigning || memberships.length === 0 ? 0.82 : 1,
              },
            ]}>
            {isAssigning ? (
              <ActivityIndicator color={accentColor} />
            ) : (
              <ThemedText style={[styles.secondaryButtonText, { color: accentColor }]}>
                {t("organizations.buttons.assign")}
              </ThemedText>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 20,
    gap: 18,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    gap: 14,
  },
  title: {
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  contextBlock: {
    gap: 6,
  },
  contextMetaText: {
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    gap: 10,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 19,
    lineHeight: 26,
  },
  fieldLabel: {
    fontSize: 15,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  multiline: {
    minHeight: 88,
  },
  membershipList: {
    gap: 10,
  },
  membershipCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  cardMetaText: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  roleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  roleChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  roleChipText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
    lineHeight: 22,
  },
  secondaryButtonText: {
    fontWeight: "700",
    fontSize: 16,
    lineHeight: 22,
  },
  banner: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorBanner: {
    marginTop: -2,
  },
  successBanner: {
    marginTop: -2,
  },
  errorText: {
    color: "#8C1D2B",
    fontSize: 14,
    lineHeight: 20,
  },
  successText: {
    color: "#166A2F",
    fontSize: 14,
    lineHeight: 20,
  },
});

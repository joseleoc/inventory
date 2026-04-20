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
    errors.name = "Organization name is required.";
  }

  return errors;
}

function validateAssignmentForm(state: AssignmentFormState) {
  const errors: AssignmentErrors = {};
  const normalizedEmail = state.email.trim().toLowerCase();

  if (!normalizedEmail) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    errors.email = "Enter a valid email address.";
  }

  if (!state.organizationId.trim()) {
    errors.organizationId = "Select an organization first.";
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
  const muted = useMemo(() => "#6D7782", []);
  const inputBackground = useMemo(
    () => (background === "#fff" ? "#F4F7FA" : "#1D2227"),
    [background],
  );
  const borderColor = useMemo(() => (background === "#fff" ? "#D8E0E8" : "#2C333A"), [background]);
  const chipBackground = useMemo(
    () => (background === "#fff" ? "#EAF4F8" : "#16242C"),
    [background],
  );

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
      setScreenMessage("Organization created and set as your active context.");
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : "Unable to create organization.");
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
          ? `User assigned to ${result.organizationName}.`
          : `Invitation created for ${result.organizationName}.`,
      );
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : "Unable to assign user.");
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
            Organizations
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: muted }]}>
            Create organizations, switch active context, and assign teammates by email.
          </ThemedText>

          <View style={styles.contextBlock}>
            <ThemedText type="defaultSemiBold">Active organization</ThemedText>
            <ThemedText selectable>
              {activeOrganization ? activeOrganization.name : "No active organization selected."}
            </ThemedText>
            <ThemedText selectable style={{ color: muted }}>
              {activeMembership
                ? `Role: ${activeMembership.role} · Org ID: ${activeMembership.orgId}`
                : "Create an organization or accept an invitation to begin."}
            </ThemedText>
          </View>
        </View>

        {organizationError ? (
          <ThemedText style={styles.errorText}>{organizationError}</ThemedText>
        ) : null}
        {screenError ? <ThemedText style={styles.errorText}>{screenError}</ThemedText> : null}
        {screenMessage ? <ThemedText style={styles.successText}>{screenMessage}</ThemedText> : null}

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Switch Organization
          </ThemedText>
          {memberships.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: inputBackground, borderColor }]}>
              <ThemedText selectable>No memberships found yet.</ThemedText>
            </View>
          ) : (
            <View style={styles.membershipList}>
              {memberships.map((membership) => {
                const selected = membership.orgId === activeOrganization?.id;
                return (
                  <Pressable
                    key={membership.id}
                    onPress={() => void switchOrganization(user, membership.orgId)}
                    style={[
                      styles.membershipCard,
                      {
                        backgroundColor: selected ? chipBackground : inputBackground,
                        borderColor: selected ? accentColor : borderColor,
                      },
                    ]}>
                    <ThemedText type="defaultSemiBold" selectable>
                      {membership.orgName}
                    </ThemedText>
                    <ThemedText selectable style={{ color: muted }}>
                      {membership.role} · {membership.orgId}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Create Organization
          </ThemedText>

          <FieldLabel label="Organization Name" />
          <TextInput
            value={organizationForm.name}
            onChangeText={(value) => {
              setOrganizationForm((current) => ({ ...current, name: value }));
              setOrganizationErrors((current) => ({ ...current, name: undefined }));
            }}
            placeholder="Northwind Retail"
            placeholderTextColor={muted}
            accessibilityLabel="Organization name"
            style={[
              styles.input,
              { color: textColor, backgroundColor: inputBackground, borderColor },
            ]}
          />
          <FieldError message={organizationErrors.name} />

          <FieldLabel label="Description" />
          <TextInput
            value={organizationForm.description}
            onChangeText={(value) =>
              setOrganizationForm((current) => ({ ...current, description: value }))
            }
            placeholder="Short description for internal context"
            placeholderTextColor={muted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            accessibilityLabel="Organization description"
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
              <ThemedText style={styles.primaryButtonText}>Create Organization</ThemedText>
            )}
          </Pressable>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Assign User by Email
          </ThemedText>

          <FieldLabel label="Target Organization" />
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
                  style={[
                    styles.membershipCard,
                    {
                      backgroundColor: selected ? chipBackground : inputBackground,
                      borderColor: selected ? accentColor : borderColor,
                    },
                  ]}>
                  <ThemedText type="defaultSemiBold" selectable>
                    {membership.orgName}
                  </ThemedText>
                  <ThemedText selectable style={{ color: muted }}>
                    {membership.role}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          <FieldError message={assignmentErrors.organizationId} />

          <FieldLabel label="Email" />
          <TextInput
            value={assignmentForm.email}
            onChangeText={(value) => {
              setAssignmentForm((current) => ({ ...current, email: value }));
              setAssignmentErrors((current) => ({ ...current, email: undefined }));
            }}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="manager@northwind.example"
            placeholderTextColor={muted}
            accessibilityLabel="Assignee email"
            style={[
              styles.input,
              { color: textColor, backgroundColor: inputBackground, borderColor },
            ]}
          />
          <FieldError message={assignmentErrors.email} />

          <FieldLabel label="Role" />
          <View style={styles.roleRow}>
            {ASSIGNABLE_ROLES.map((role) => {
              const selected = assignmentForm.role === role;
              return (
                <Pressable
                  key={role}
                  onPress={() => setAssignmentForm((current) => ({ ...current, role }))}
                  style={[
                    styles.roleChip,
                    {
                      backgroundColor: selected ? accentColor : inputBackground,
                      borderColor: selected ? accentColor : borderColor,
                    },
                  ]}>
                  <ThemedText style={{ color: selected ? "#ffffff" : textColor }}>
                    {role}
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
              <ThemedText style={{ color: accentColor, fontWeight: "700" }}>Assign User</ThemedText>
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
    fontSize: 14,
    lineHeight: 20,
  },
  contextBlock: {
    gap: 6,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
  },
  fieldLabel: {
    fontSize: 14,
    lineHeight: 18,
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
    gap: 4,
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
  },
  errorText: {
    color: "#C5283D",
    fontSize: 13,
  },
  successText: {
    color: "#1E8E3E",
    fontSize: 13,
  },
});

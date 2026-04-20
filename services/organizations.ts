import { FirebaseError } from "firebase/app";
import { type User } from "firebase/auth";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
    writeBatch,
} from "firebase/firestore";

import { firebaseDb } from "@/config/firebase";

export const ORGANIZATION_ROLE_OPTIONS = [
  "owner",
  "admin",
  "manager",
  "cashier",
  "viewer",
] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLE_OPTIONS)[number];
export type MembershipStatus = "active" | "pending";

export type OrganizationCreateInput = {
  name: string;
  description?: string;
};

export type OrganizationAssignmentInput = {
  organizationId: string;
  email: string;
  role: Exclude<OrganizationRole, "owner">;
};

export type OrganizationSummary = {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdBy: string;
};

export type OrganizationMembershipSummary = {
  id: string;
  orgId: string;
  orgName: string;
  userId: string;
  email: string;
  role: OrganizationRole;
  status: MembershipStatus;
};

export type OrganizationContext = {
  activeOrganization: OrganizationSummary | null;
  activeMembership: OrganizationMembershipSummary | null;
  memberships: OrganizationMembershipSummary[];
};

type UserProfileDocument = {
  email: string;
  email_lower: string;
  display_name: string;
  role?: OrganizationRole;
  permissions?: string[];
  primary_org_id?: string;
  active_org_id?: string;
  is_active: boolean;
};

type OrganizationDocument = {
  name: string;
  description?: string;
  is_active: boolean;
  created_by: string;
  updated_by: string;
};

type OrganizationMembershipDocument = {
  org_id: string;
  user_id: string;
  email: string;
  role: OrganizationRole;
  status: MembershipStatus;
};

function normalizeOptionalText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function toUserDisplayName(user: User) {
  return user.displayName?.trim() || user.email?.split("@")[0] || "Inventory User";
}

function mapFirestoreError(error: unknown, fallbackMessage: string) {
  if (!(error instanceof FirebaseError)) {
    return fallbackMessage;
  }

  switch (error.code) {
    case "permission-denied":
      return "You do not have permission to perform this organization action.";
    case "unavailable":
      return "Firestore is temporarily unavailable. Please try again.";
    default:
      return fallbackMessage;
  }
}

export async function upsertUserProfile(user: User, options?: { defaultRole?: OrganizationRole }) {
  const userRef = doc(firebaseDb, "users", user.uid);
  const snapshot = await getDoc(userRef);
  const existing = snapshot.exists() ? (snapshot.data() as UserProfileDocument) : null;
  const defaultRole = options?.defaultRole ?? "viewer";

  const profileBase = {
    email: user.email ?? "",
    email_lower: normalizeEmail(user.email ?? ""),
    display_name: toUserDisplayName(user),
    role: existing?.role ?? defaultRole,
    permissions: existing?.permissions ?? [],
    is_active: true,
    last_login_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };

  if (!snapshot.exists()) {
    await setDoc(userRef, {
      ...profileBase,
      created_at: serverTimestamp(),
    });
    return;
  }

  await setDoc(userRef, profileBase, { merge: true });
}

async function getUserProfile(userId: string) {
  const snapshot = await getDoc(doc(firebaseDb, "users", userId));
  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as UserProfileDocument;
}

async function getOrganizationById(orgId: string) {
  const snapshot = await getDoc(doc(firebaseDb, "organizations", orgId));
  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data() as OrganizationDocument;

  return {
    id: snapshot.id,
    name: data.name,
    description: data.description,
    isActive: data.is_active,
    createdBy: data.created_by,
  } satisfies OrganizationSummary;
}

async function loadMemberships(userId: string) {
  const membershipsQuery = query(
    collection(firebaseDb, "organization_members"),
    where("user_id", "==", userId),
    where("status", "==", "active"),
  );

  const snapshot = await getDocs(membershipsQuery);
  const records = snapshot.docs.map((documentSnapshot) => ({
    id: documentSnapshot.id,
    ...(documentSnapshot.data() as OrganizationMembershipDocument),
  }));

  const organizations = await Promise.all(
    records.map((record) => getOrganizationById(record.org_id)),
  );

  return records
    .map((record, index) => {
      const organization = organizations[index];
      if (!organization) {
        return null;
      }

      return {
        id: record.id,
        orgId: record.org_id,
        orgName: organization.name,
        userId: record.user_id,
        email: record.email,
        role: record.role,
        status: record.status,
      } satisfies OrganizationMembershipSummary;
    })
    .filter((record): record is OrganizationMembershipSummary => record !== null);
}

async function persistActiveOrganization(userId: string, orgId: string) {
  await setDoc(
    doc(firebaseDb, "users", userId),
    {
      active_org_id: orgId,
      updated_at: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function loadOrganizationContext(user: User): Promise<OrganizationContext> {
  await upsertUserProfile(user);

  const [profile, memberships] = await Promise.all([
    getUserProfile(user.uid),
    loadMemberships(user.uid),
  ]);

  if (memberships.length === 0) {
    return {
      activeOrganization: null,
      activeMembership: null,
      memberships: [],
    };
  }

  const availableOrgIds = new Set(memberships.map((membership) => membership.orgId));
  const selectedOrgId = [
    profile?.active_org_id,
    profile?.primary_org_id,
    memberships[0]?.orgId,
  ].find((orgId) => typeof orgId === "string" && availableOrgIds.has(orgId));

  const activeMembership =
    memberships.find((membership) => membership.orgId === selectedOrgId) ?? memberships[0];
  const activeOrganization = await getOrganizationById(activeMembership.orgId);

  if (activeOrganization && profile?.active_org_id !== activeOrganization.id) {
    await persistActiveOrganization(user.uid, activeOrganization.id);
  }

  return {
    activeOrganization,
    activeMembership,
    memberships,
  };
}

export async function switchActiveOrganization(user: User, orgId: string) {
  const memberships = await loadMemberships(user.uid);
  const membership = memberships.find((item) => item.orgId === orgId);

  if (!membership) {
    throw new Error("You do not have access to that organization.");
  }

  await persistActiveOrganization(user.uid, orgId);
  return loadOrganizationContext(user);
}

export async function createOrganization(input: OrganizationCreateInput, user: User) {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Organization name is required.");
  }

  await upsertUserProfile(user);

  const profile = await getUserProfile(user.uid);
  const organizationRef = doc(collection(firebaseDb, "organizations"));
  const membershipRef = doc(
    firebaseDb,
    "organization_members",
    `${organizationRef.id}_${user.uid}`,
  );
  const userRef = doc(firebaseDb, "users", user.uid);
  const batch = writeBatch(firebaseDb);

  batch.set(organizationRef, {
    name,
    description: normalizeOptionalText(input.description),
    is_active: true,
    created_by: user.uid,
    updated_by: user.uid,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  batch.set(membershipRef, {
    org_id: organizationRef.id,
    user_id: user.uid,
    email: normalizeEmail(user.email ?? ""),
    role: "owner",
    status: "active",
    invited_by: user.uid,
    joined_at: serverTimestamp(),
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  batch.set(
    userRef,
    {
      email: user.email ?? "",
      email_lower: normalizeEmail(user.email ?? ""),
      display_name: toUserDisplayName(user),
      is_active: true,
      primary_org_id: profile?.primary_org_id ?? organizationRef.id,
      active_org_id: organizationRef.id,
      last_login_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      created_at: serverTimestamp(),
    },
    { merge: true },
  );

  try {
    await batch.commit();
    return organizationRef.id;
  } catch (error) {
    throw new Error(mapFirestoreError(error, "Unable to create organization right now."));
  }
}

export async function assignUserToOrganization(input: OrganizationAssignmentInput, user: User) {
  const organizationId = input.organizationId.trim();
  const email = normalizeEmail(input.email);

  if (!organizationId) {
    throw new Error("Select an organization before assigning a user.");
  }

  if (!email) {
    throw new Error("Email is required.");
  }

  const organization = await getOrganizationById(organizationId);
  if (!organization) {
    throw new Error("The selected organization was not found.");
  }

  const usersQuery = query(
    collection(firebaseDb, "users"),
    where("email_lower", "==", email),
    limit(1),
  );
  const usersSnapshot = await getDocs(usersQuery);

  try {
    if (!usersSnapshot.empty) {
      const existingUser = usersSnapshot.docs[0];
      const targetUserId = existingUser.id;
      const membershipRef = doc(
        firebaseDb,
        "organization_members",
        `${organizationId}_${targetUserId}`,
      );
      const membershipSnapshot = await getDoc(membershipRef);

      if (membershipSnapshot.exists()) {
        await updateDoc(membershipRef, {
          email,
          role: input.role,
          status: "active",
          updated_at: serverTimestamp(),
        });
      } else {
        await setDoc(membershipRef, {
          org_id: organizationId,
          user_id: targetUserId,
          email,
          role: input.role,
          status: "active",
          invited_by: user.uid,
          joined_at: serverTimestamp(),
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
      }

      const existingProfile = existingUser.data() as UserProfileDocument;
      if (!existingProfile.primary_org_id || !existingProfile.active_org_id) {
        await setDoc(
          doc(firebaseDb, "users", targetUserId),
          {
            primary_org_id: existingProfile.primary_org_id ?? organizationId,
            active_org_id: existingProfile.active_org_id ?? organizationId,
            updated_at: serverTimestamp(),
          },
          { merge: true },
        );
      }

      return {
        mode: "membership" as const,
        organizationName: organization.name,
      };
    }

    const invitationRef = doc(firebaseDb, "organization_invitations", `${organizationId}_${email}`);
    await setDoc(
      invitationRef,
      {
        org_id: organizationId,
        email,
        email_lower: email,
        role: input.role,
        status: "pending",
        invited_by: user.uid,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      },
      { merge: true },
    );

    return {
      mode: "invitation" as const,
      organizationName: organization.name,
    };
  } catch (error) {
    throw new Error(mapFirestoreError(error, "Unable to assign user to organization right now."));
  }
}

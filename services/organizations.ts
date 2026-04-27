import { FirebaseError } from "firebase/app";
import { type User } from "firebase/auth";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    setDoc,
  Timestamp,
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
  "member",
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
};

export type OrganizationInvitationStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "revoked"
  | "expired";

export type PendingOrganizationInvitationSummary = {
  id: string;
  orgId: string;
  orgName: string;
  email: string;
  expiresAt: Date | null;
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
  pendingInvitations: PendingOrganizationInvitationSummary[];
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
  email_lower?: string;
  role: OrganizationRole;
  status: MembershipStatus;
};

type OrganizationInvitationDocument = {
  org_id: string;
  email: string;
  email_lower: string;
  role: OrganizationRole;
  status: OrganizationInvitationStatus;
  invited_by: string;
  invited_user_id?: string;
  expires_at?: Timestamp;
  created_at?: Timestamp;
};

const INVITATION_EXPIRY_MONTHS = 1;
const ACCEPTED_INVITATION_ROLE: OrganizationRole = "member";

function normalizeOptionalText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function nextMonthDate(baseDate = new Date()) {
  const next = new Date(baseDate);
  next.setMonth(next.getMonth() + INVITATION_EXPIRY_MONTHS);
  return next;
}

function timestampToDate(value: unknown) {
  return value instanceof Timestamp ? value.toDate() : null;
}

function isInvitationExpired(invitation: OrganizationInvitationDocument, nowMs = Date.now()) {
  const expiresAt = timestampToDate(invitation.expires_at);
  if (expiresAt) {
    return expiresAt.getTime() <= nowMs;
  }

  const createdAt = timestampToDate(invitation.created_at);
  if (!createdAt) {
    return false;
  }

  return nextMonthDate(createdAt).getTime() <= nowMs;
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

async function loadPendingOrganizationInvitations(user: User) {
  const normalizedEmail = normalizeEmail(user.email ?? "");
  if (!normalizedEmail) {
    return [] as PendingOrganizationInvitationSummary[];
  }

  const invitationsQuery = query(
    collection(firebaseDb, "organization_invitations"),
    where("email_lower", "==", normalizedEmail),
    where("status", "==", "pending"),
  );

  const snapshot = await getDocs(invitationsQuery);
  if (snapshot.empty) {
    return [] as PendingOrganizationInvitationSummary[];
  }

  const nowMs = Date.now();
  const expiredIds: string[] = [];
  const pendingRecords = snapshot.docs
    .map((documentSnapshot) => ({
      id: documentSnapshot.id,
      ...(documentSnapshot.data() as OrganizationInvitationDocument),
    }))
    .filter((invitation) => {
      if (isInvitationExpired(invitation, nowMs)) {
        expiredIds.push(invitation.id);
        return false;
      }

      return true;
    });

  if (expiredIds.length > 0) {
    const expireBatch = writeBatch(firebaseDb);

    for (const invitationId of expiredIds) {
      expireBatch.update(doc(firebaseDb, "organization_invitations", invitationId), {
        status: "expired",
        responded_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    }

    await expireBatch.commit();
  }

  const organizations = await Promise.all(
    pendingRecords.map((invitation) => getOrganizationById(invitation.org_id)),
  );

  return pendingRecords
    .map((invitation, index) => {
      const organization = organizations[index];
      if (!organization) {
        return null;
      }

      return {
        id: invitation.id,
        orgId: invitation.org_id,
        orgName: organization.name,
        email: invitation.email,
        expiresAt: timestampToDate(invitation.expires_at),
      } satisfies PendingOrganizationInvitationSummary;
    })
    .filter((invitation): invitation is PendingOrganizationInvitationSummary => invitation !== null);
}

export async function loadOrganizationContext(user: User): Promise<OrganizationContext> {
  await upsertUserProfile(user);

  const [profile, memberships, pendingInvitations] = await Promise.all([
    getUserProfile(user.uid),
    loadMemberships(user.uid),
    loadPendingOrganizationInvitations(user),
  ]);

  if (memberships.length === 0) {
    return {
      activeOrganization: null,
      activeMembership: null,
      memberships: [],
      pendingInvitations,
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
    pendingInvitations,
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
    email_lower: normalizeEmail(user.email ?? ""),
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
  const invitationRef = doc(firebaseDb, "organization_invitations", `${organizationId}_${email}`);
  const invitationSnapshot = await getDoc(invitationRef);

  try {
    if (invitationSnapshot.exists()) {
      const existingInvitation = invitationSnapshot.data() as OrganizationInvitationDocument;

      if (existingInvitation.status === "pending" && !isInvitationExpired(existingInvitation)) {
        throw new Error("A pending invitation already exists for this user in the organization.");
      }

      if (existingInvitation.status === "pending" && isInvitationExpired(existingInvitation)) {
        await updateDoc(invitationRef, {
          status: "expired",
          responded_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
      }
    }

    await setDoc(
      invitationRef,
      {
        org_id: organizationId,
        email,
        email_lower: email,
        role: ACCEPTED_INVITATION_ROLE,
        status: "pending",
        invited_by: user.uid,
        invited_user_id: null,
        expires_at: Timestamp.fromDate(nextMonthDate()),
        responded_at: null,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      },
    );

    return {
      mode: "invitation" as const,
      organizationName: organization.name,
    };
  } catch (error) {
    throw new Error(mapFirestoreError(error, "Unable to assign user to organization right now."));
  }
}

export async function acceptOrganizationInvitation(invitationId: string, user: User) {
  const normalizedInvitationId = invitationId.trim();
  if (!normalizedInvitationId) {
    throw new Error("Invitation id is required.");
  }

  const normalizedEmail = normalizeEmail(user.email ?? "");
  if (!normalizedEmail) {
    throw new Error("Your account does not have a valid email address.");
  }

  const invitationRef = doc(firebaseDb, "organization_invitations", normalizedInvitationId);
  const invitationSnapshot = await getDoc(invitationRef);

  if (!invitationSnapshot.exists()) {
    throw new Error("Invitation not found.");
  }

  const invitation = invitationSnapshot.data() as OrganizationInvitationDocument;

  if (invitation.email_lower !== normalizedEmail) {
    throw new Error("You do not have access to this invitation.");
  }

  if (invitation.status !== "pending") {
    throw new Error("This invitation is no longer pending.");
  }

  if (isInvitationExpired(invitation)) {
    await updateDoc(invitationRef, {
      status: "expired",
      responded_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    throw new Error("This invitation has expired.");
  }

  const organization = await getOrganizationById(invitation.org_id);
  if (!organization) {
    throw new Error("The invitation organization no longer exists.");
  }

  const profile = await getUserProfile(user.uid);
  const membershipRef = doc(firebaseDb, "organization_members", `${invitation.org_id}_${user.uid}`);
  const membershipSnapshot = await getDoc(membershipRef);
  const batch = writeBatch(firebaseDb);

  if (!membershipSnapshot.exists()) {
    batch.set(membershipRef, {
      org_id: invitation.org_id,
      user_id: user.uid,
      email: normalizedEmail,
      email_lower: normalizedEmail,
      role: ACCEPTED_INVITATION_ROLE,
      status: "active",
      invited_by: invitation.invited_by,
      joined_at: serverTimestamp(),
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  }

  batch.set(
    doc(firebaseDb, "users", user.uid),
    {
      primary_org_id: profile?.primary_org_id ?? invitation.org_id,
      active_org_id: invitation.org_id,
      updated_at: serverTimestamp(),
    },
    { merge: true },
  );

  batch.update(invitationRef, {
    status: "accepted",
    invited_user_id: user.uid,
    responded_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  try {
    await batch.commit();
    return loadOrganizationContext(user);
  } catch (error) {
    throw new Error(mapFirestoreError(error, "Unable to accept invitation right now."));
  }
}

export async function rejectOrganizationInvitation(invitationId: string, user: User) {
  const normalizedInvitationId = invitationId.trim();
  if (!normalizedInvitationId) {
    throw new Error("Invitation id is required.");
  }

  const normalizedEmail = normalizeEmail(user.email ?? "");
  if (!normalizedEmail) {
    throw new Error("Your account does not have a valid email address.");
  }

  const invitationRef = doc(firebaseDb, "organization_invitations", normalizedInvitationId);
  const invitationSnapshot = await getDoc(invitationRef);

  if (!invitationSnapshot.exists()) {
    throw new Error("Invitation not found.");
  }

  const invitation = invitationSnapshot.data() as OrganizationInvitationDocument;

  if (invitation.email_lower !== normalizedEmail) {
    throw new Error("You do not have access to this invitation.");
  }

  if (invitation.status !== "pending") {
    throw new Error("This invitation is no longer pending.");
  }

  if (isInvitationExpired(invitation)) {
    await updateDoc(invitationRef, {
      status: "expired",
      responded_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    throw new Error("This invitation has expired.");
  }

  try {
    await updateDoc(invitationRef, {
      status: "rejected",
      invited_user_id: user.uid,
      responded_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    return loadOrganizationContext(user);
  } catch (error) {
    throw new Error(mapFirestoreError(error, "Unable to reject invitation right now."));
  }
}

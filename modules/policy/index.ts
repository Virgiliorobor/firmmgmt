import { and, eq, isNull } from "drizzle-orm";
import type { AppDb } from "@/modules/db";
import { personSpecificRestrictions } from "@/modules/db/schema";
import type { UserRole } from "@/modules/db/ids";
import { isManagementRole } from "@/modules/db/ids";

export type PolicyPerson = {
  id: string;
  role: UserRole;
  isActive: boolean;
};

export type PolicyProject = {
  id: string;
  title: string;
  assigneeId: string | null;
};

export type Capabilities = {
  discover: boolean;
  seeTitle: boolean;
  assign: boolean;
  claim: boolean;
  createClient: boolean;
  createProject: boolean;
  configureFirm: boolean;
  revokeAnySession: boolean;
};

export type PolicyDecision = {
  discover: boolean;
  capabilities: Capabilities;
};

const NONE: Capabilities = {
  discover: false,
  seeTitle: false,
  assign: false,
  claim: false,
  createClient: false,
  createProject: false,
  configureFirm: false,
  revokeAnySession: false,
};

export function createPolicy(getDb: () => AppDb) {
  async function isExcluded(personId: string, projectId: string): Promise<boolean> {
    const rows = await getDb()
      .select()
      .from(personSpecificRestrictions)
      .where(
        and(
          eq(personSpecificRestrictions.projectId, projectId),
          eq(personSpecificRestrictions.excludedUserId, personId),
          isNull(personSpecificRestrictions.liftedAt),
        ),
      );
    return rows.length > 0;
  }

  async function evaluate(person: PolicyPerson, project: PolicyProject | null): Promise<PolicyDecision> {
    if (!person.isActive) {
      return { discover: false, capabilities: NONE };
    }

    if (person.role === "integration_operator") {
      return {
        discover: false,
        capabilities: {
          ...NONE,
          revokeAnySession: true,
        },
      };
    }

    if (project && (await isExcluded(person.id, project.id))) {
      return { discover: false, capabilities: NONE };
    }

    const management = isManagementRole(person.role);
    const staff = person.role === "lawyer_or_analyst";

    return {
      discover: true,
      capabilities: {
        discover: true,
        seeTitle: true,
        assign: management,
        claim: staff,
        createClient: management,
        createProject: management,
        configureFirm: management,
        revokeAnySession: management,
      },
    };
  }

  return { evaluate };
}

export type Policy = ReturnType<typeof createPolicy>;

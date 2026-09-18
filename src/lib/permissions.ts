// Role-Based Access Control (RBAC) & Security Policies
import type { Role } from "./types";

export const ROLE_BADGE_STYLE: Record<Role, { color: string; label: string }> = {
  ADMIN: { color: "#f59e0b", label: "ADMINISTRATOR" },
  INVESTIGATOR: { color: "#38bdf8", label: "LEAD INVESTIGATOR" },
  ANALYST: { color: "#a855f7", label: "INTELLIGENCE ANALYST" },
  VIEWER: { color: "#94a3b8", label: "AUDIT VIEWER" },
};

export const PERMISSIONS = {
  updateStatus: (role: Role): boolean => role === "ADMIN" || role === "INVESTIGATOR",
  addNotes: (role: Role): boolean => role !== "VIEWER",
  createCase: (role: Role): boolean => role === "ADMIN" || role === "INVESTIGATOR",
  view: (_role: Role): boolean => true,
  runInvestigation: (role: Role): boolean => role !== "VIEWER",
  acknowledgeAlert: (role: Role): boolean => role === "ADMIN" || role === "INVESTIGATOR",
  exportReport: (_role: Role): boolean => true,
  manageUsers: (role: Role): boolean => role === "ADMIN",
};

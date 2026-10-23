const ADMIN_ASSIGNABLE_ROLES = new Set(["admin", "client", "partner", "partnership", "user"]);

function registrationRole(requestedRole, isAdminRequest) {
  if (!isAdminRequest) return "user";

  const role = typeof requestedRole === "string" ? requestedRole.trim().toLowerCase() : "";
  return ADMIN_ASSIGNABLE_ROLES.has(role) ? role : "user";
}

module.exports = registrationRole;

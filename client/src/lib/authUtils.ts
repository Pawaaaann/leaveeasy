export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

export function getAuthHeaders(user: any): Record<string, string> {
  if (!user || !user.id || !user.role) return {};
  
  return {
    "x-user-id": user.id,
    "x-user-role": user.role,
  };
}

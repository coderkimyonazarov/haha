import type { User } from "../api";

export function getPostAuthPath(user: User | null | undefined): string {
  if (!user) {
    return "/login";
  }

  if (!user.username) {
    return "/set-username";
  }

  if (user.needsOnboarding) {
    return "/onboarding";
  }

  return "/dashboard";
}


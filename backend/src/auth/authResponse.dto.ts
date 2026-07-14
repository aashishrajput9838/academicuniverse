export interface AuthResponseUser {
  id: string;
  name: string;
  email: string;
  organizationId: string;
  organization: string;
  role: string;
  permissions: string[];
  isSuperAdmin: boolean;
  isSectionRep: boolean;
}

export interface AuthenticationResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthResponseUser;
}

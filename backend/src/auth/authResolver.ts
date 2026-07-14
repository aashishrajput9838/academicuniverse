import { IAuthProvider, AuthPayload } from './provider';
import { AuthenticationRequest } from './authRequest.dto';
import { AuthenticationResponse } from './authResponse.dto';
import { AuthMethod } from '../models/AuthMethod';
import { generateToken, generateRefreshToken } from '../utils/jwt';
import { eventBus } from '../services/eventBus';
import { UserService, CanonicalUserDTO } from '../services/userService';
import { AuthenticationError } from '../utils/errors';
import { ProviderMap } from './providerRegistry';

/**
 * AuthenticationResolver orchestrates the authentication flow.
 * It receives a typed AuthenticationRequest, selects the appropriate provider,
 * upserts AuthMethod, ensures a canonical user via UserService, generates tokens,
 * and publishes business‑oriented events.
 */
export class AuthenticationResolver {
  constructor(
    private readonly providers: ProviderMap,
    private readonly userService: typeof UserService,
  ) {}

  async resolve(request: AuthenticationRequest): Promise<AuthenticationResponse> {
    const provider = this.providers[request.provider];
    if (!provider) {
      throw new AuthenticationError(`Unknown auth provider: ${request.provider}`);
    }

    // 1️⃣ Provider authentication
    const authPayload: AuthPayload = await provider.authenticate(request.payload);

    // 2️⃣ Upsert AuthMethod (business outcome)
    const authMethod = await AuthMethod.findOneAndUpdate(
      { provider: authPayload.provider, providerUserId: authPayload.providerUserId },
      {
        provider: authPayload.provider,
        providerUserId: authPayload.providerUserId,
        email: authPayload.email,
        emailVerified: authPayload.emailVerified,
        isPrimary: true,
        isActive: true,
        lastLoginAt: new Date(),
        linkedAt: new Date(),
      },
      { upsert: true, new: true },
    );

    // 3️⃣ Ensure canonical user (fully populated DTO)
    const userDto: CanonicalUserDTO = await this.userService.findOrCreateCanonicalUser(authPayload);

    // 4️⃣ Token generation
    const accessToken = generateToken({
      userId: userDto._id,
      email: userDto.email,
      organizationId: userDto.organizationId,
      roleId: userDto.roleId,
      permissions: userDto.permissions,
      isSuperAdmin: userDto.isSuperAdmin,
    });

    const refreshToken = generateRefreshToken({
      userId: userDto._id,
      email: userDto.email,
    });

    // 5️⃣ Emit business events
    eventBus.publish('AuthenticationSucceeded', {
      userId: userDto._id,
      provider: authPayload.provider,
    });
    eventBus.publish('UserLinked', {
      userId: userDto._id,
      authMethodId: authMethod._id,
    });

    // 6️⃣ Build typed response
    const responseUser = {
      id: userDto._id,
      name: userDto.name,
      email: userDto.email,
      organizationId: userDto.organizationId,
      organization: userDto.organizationName,
      role: userDto.roleName,
      permissions: userDto.permissions,
      isSuperAdmin: userDto.isSuperAdmin,
      isSectionRep: userDto.isSectionRep,
    };

    return {
      accessToken,
      refreshToken,
      user: responseUser,
    };
  }
}

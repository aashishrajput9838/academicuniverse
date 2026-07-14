import { AuthenticationResolver } from './authResolver';
import { ProviderMap } from './providerRegistry';
import { EmailPasswordProvider } from './emailProvider';
import { GoogleOAuthProvider } from './googleProvider';
import { UserService } from '../services/userService';

// Provider registry – extensible without changing resolver signature
const providers: ProviderMap = {
  password: new EmailPasswordProvider(),
  google: new GoogleOAuthProvider(),
};

/**
 * Export a ready‑to‑use AuthenticationResolver instance.
 * This avoids circular imports between routes and controllers.
 */
export const authResolver = new AuthenticationResolver(providers, UserService);

import { IAuthProvider } from './provider';
import { AuthProviderKey } from './authRequest.dto';

/**
 * Mapping from provider key to its implementation.
 * Extensible without changing the resolver signature.
 */
export type ProviderMap = Record<AuthProviderKey, IAuthProvider>;

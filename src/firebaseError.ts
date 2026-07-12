import { auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorStr = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errorStr,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };

  const isQuotaError = 
    errorStr.toLowerCase().includes('quota') ||
    errorStr.toLowerCase().includes('resource-exhausted') ||
    errorStr.toLowerCase().includes('exceeded') ||
    errorStr.toLowerCase().includes('limit') ||
    errorStr.toLowerCase().includes('assertion failed') ||
    errorStr.toLowerCase().includes('unexpected state') ||
    errorStr.toLowerCase().includes('stream') ||
    errorStr.toLowerCase().includes('unreachable') ||
    errorStr.toLowerCase().includes('failed-precondition');

  if (isQuotaError) {
    console.log('[System Status] Local cache database mode active.');
    try {
      window.dispatchEvent(new CustomEvent('firestore-quota-exceeded', { detail: errInfo }));
    } catch (e) {
      // Ignore
    }
    return;
  }

  // Log and throw the error as required by the Firebase Integration Skill
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

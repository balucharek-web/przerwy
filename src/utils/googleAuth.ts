import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/drive.appdata',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

let isSigningIn = false;
let cachedAccessToken: string | null = null;

/**
 * Initializes Firebase Auth state listener and keeps access token in memory
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // If user is logged into Firebase but token expired/missing, prompt or silent re-fetch if possible
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Signs in with Google popup and acquires OAuth Access Token for Google Drive AppData
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Nie udało się uzyskać tokenu dostępu z konta Google.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Błąd logowania przez Google:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

export const getAuthErrorDescription = (error: any): string => {
  const code = error?.code || '';
  if (code === 'auth/popup-blocked') {
    return 'Przeglądarka (lub profil służbowy telefonu) zablokowała wyskakujące okienko logowania. W profilu służbowym administrator może blokować wyskakujące okna i zewnętrzne konta. Zezwól na pop-upy w ustawieniach witryn w Chrome lub zaloguj się w profilu prywatnym.';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Okno logowania zostało zamknięte przed ukończeniem autoryzacji.';
  }
  if (code === 'auth/cancelled-popup-request') {
    return 'Poprzednie żądanie logowania zostało przerwane.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'Domena aplikacji nie została jeszcze dodana w Firebase (Autoryzowane domeny).';
  }
  if (code === 'auth/admin-restricted-operation' || code === 'auth/operation-not-allowed') {
    return 'Polityka administratora profilu służbowego (MDM) blokuje logowanie do tej aplikacji.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Brak połączenia z siecią internet podczas próby logowania.';
  }
  return error?.message || 'Wystąpił błąd podczas autoryzacji konta Google.';
};

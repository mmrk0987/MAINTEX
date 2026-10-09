import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleAuthProvider = new GoogleAuthProvider();

// Always show the Google account selector so users on phone/desktop can pick from multiple Gmail accounts
googleAuthProvider.setCustomParameters({
  prompt: 'select_account',
});

let inMemoryAccessToken: string | null = null;
let inMemoryAccessTokenUserEmail: string | null = null;

export function setInMemoryAccessToken(token: string | null, email?: string | null) {
  inMemoryAccessToken = token;
  inMemoryAccessTokenUserEmail = email || null;
}

export function getInMemoryAccessToken(): { token: string | null; email: string | null } {
  return {
    token: inMemoryAccessToken,
    email: inMemoryAccessTokenUserEmail,
  };
}

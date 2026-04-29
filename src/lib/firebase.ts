import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
// Importación del config manteniendo tu estructura actual
import firebaseConfig from '../../firebase-applet-config.json';

// Inicialización estándar para evitar el error de "Cannot set property fetch"
const app = initializeApp(firebaseConfig);

// Exportamos las instancias necesarias para la base de datos y autenticación
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Configuración de persistencia para Colombia (opcional pero recomendado)
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logOut = () => signOut(auth);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

// Mantenemos tu gestor de errores intacto para no romper Generador.tsx
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Prueba de conexión optimizada.
 * Se eliminó el uso innecesario de parámetros en getFirestore que causaban conflictos
 * en algunos entornos de desarrollo como AI Studio.
 */
async function testConnection() {
  try {
    // Intentamos una lectura ligera para validar la API Key y el acceso
    await getDocFromServer(doc(db, 'test_connection', 'status'));
    console.log("Firebase conectado correctamente para AdGen COL");
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.warn("El cliente parece estar offline o la configuración es inválida.");
    }
  }
}

testConnection();
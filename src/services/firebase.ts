import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { initializeFirestore, Firestore, getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, Auth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Database ID configured for this project
const databaseId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;

let db: Firestore;
try {
  if (databaseId && databaseId !== '(default)') {
    db = initializeFirestore(app, {
      ignoreUndefinedProperties: true
    }, databaseId);
  } else {
    db = initializeFirestore(app, {
      ignoreUndefinedProperties: true
    });
  }
} catch {
  // If already initialized
  db = (databaseId && databaseId !== '(default)')
    ? getFirestore(app, databaseId)
    : getFirestore(app);
}

const auth: Auth = getAuth(app);

// Authenticate anonymously in the background so queries have auth context
signInAnonymously(auth).catch((err) => {
  console.warn('Firebase anonymous auth notice:', err);
});

export { app, db, auth, firebaseConfig };

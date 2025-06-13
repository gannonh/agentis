import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { logger } from '../../../../config/index.js';

let i = 0;
let firebaseApp = null;

const initializeFirebase = () => {
  // Return existing instance if already initialized
  if (firebaseApp) {
    return firebaseApp;
  }

  const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
  };

  if (Object.values(firebaseConfig).some((value) => !value)) {
    i === 0 && logger.info('[Optional] CDN not initialized.');
    i++;
    return null;
  }

  firebaseApp = initializeApp(firebaseConfig);
  logger.info('Firebase CDN initialized');
  return firebaseApp;
};

const getFirebaseStorage = () => {
  const app = initializeFirebase();
  return app ? getStorage(app) : null;
};

export { initializeFirebase, getFirebaseStorage };

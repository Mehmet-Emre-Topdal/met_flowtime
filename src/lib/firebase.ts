import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Next.js static evaluation check
console.log("Firebase Connectivity Check:");
if (!firebaseConfig.apiKey) console.error("-> API_KEY: MISSING");
else console.log("-> API_KEY: OK");

if (!firebaseConfig.projectId) console.error("-> PROJECT_ID: MISSING");
else console.log("-> PROJECT_ID: OK");

function getSafeApp(): FirebaseApp {
    try {
        if (getApps().length > 0) {
            return getApp();
        }
        return initializeApp(firebaseConfig);
    } catch (error) {
        console.error("Firebase Initialization Failed:", error);
        throw error;
    }
}

const app = getSafeApp();

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
    prompt: 'select_account'
});

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCF3K093Mwg7Tn6Hqc758YAYYotZcCcz54",
  authDomain: "tudent-os.firebaseapp.com",
  projectId: "tudent-os",
  storageBucket: "tudent-os.firebasestorage.app",
  messagingSenderId: "57856693471",
  appId: "1:57856693471:web:91273d5ac5337d6c24056a",
  measurementId: "G-B3JM94MC62",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
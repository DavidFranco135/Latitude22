
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDkDU2P7aBid3Zi8eQgRKsDGl04HyFkN34",
  authDomain: "latitude22-97e80.firebaseapp.com",
  projectId: "latitude22-97e80",
  storageBucket: "latitude22-97e80.firebasestorage.app",
  messagingSenderId: "834345625624",
  appId: "1:834345625624:web:afa5f52b78c82f76c87b6d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;

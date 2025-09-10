import { auth, googleProvider } from "./firebase";
import {
  signInWithPopup
} from "firebase/auth";
import {doc, setDoc, getDoc} from "firebase/firestore";
import {db} from "./firebase";
import { serverTimestamp } from "firebase/firestore";
import { createDefaultSimulationSessions } from "./simulationSessionUtils";

export const loginWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  const token = await result.user.getIdToken();
  
  // Check if user already exists in Firestore
  const userRef = doc(db, "users", result.user.uid);
  const userSnap = await getDoc(userRef);
  
  const isNewUser = !userSnap.exists();
  
  // Save user to Firestore (merge: true to not overwrite existing xp)
  await setDoc(
    userRef,
    {
      id: result.user.uid,
      username: result.user.displayName || "",
      email: result.user.email,
      xp: 0,
      joined_at: serverTimestamp(),
    },
    { merge: true }
  );

  // If this is a new user, create default simulation sessions
  if (isNewUser) {
    await createDefaultSimulationSessions(result.user.uid, 2);
  }

  return { user: result.user, token, isNewUser };
};

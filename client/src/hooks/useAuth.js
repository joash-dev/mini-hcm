import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../services/firebase.js";
import { apiRequest } from "../services/api.js";

/**
 * Custom hook that manages Firebase authentication state.
 * Listens for auth changes, fetches the user's profile (including role)
 * from the server, and exposes login state for route protection.
 *
 * @returns {{ user, userProfile, loading, error, logout }}
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setError(null);
      setLoading(true);

      if (firebaseUser) {
        setUser(firebaseUser);

        try {
          const data = await apiRequest("/users/me");
          setUserProfile(data.user);
        } catch (err) {
          /* Profile may not exist yet (just registered, doc not created yet) */
          setUserProfile(null);
          setError(err.message);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  /** Sign out and clear local state */
  async function logout() {
    await signOut(auth);
    setUser(null);
    setUserProfile(null);
  }

  return { user, userProfile, setUserProfile, loading, error, logout };
}

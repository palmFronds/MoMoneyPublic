import { doc, setDoc, getDocs, query, where, collection } from "firebase/firestore";
import { db } from "./firebase";
import { serverTimestamp } from "firebase/firestore";

/**
 * Create default simulation sessions for a user
 * @param {string} userId - The Firebase UID of the user
 * @param {number} sessionCount - Number of sessions to create (default: 2)
 * @returns {Promise<Array>} Array of created session IDs
 * Each session will have an 'unlocked' field: true for the first, false for others.
 */
export const createDefaultSimulationSessions = async (userId, sessionCount = 2) => {
  try {
    const sessionIds = [];
    
    for (let i = 1; i <= sessionCount; i++) {
      const sessionId = `session_${userId}_${i}`;
      
      await setDoc(doc(db, "simulation_sessions", sessionId), {
        id: sessionId,
        user_id: userId,
        current_tick: 0,
        cash: 100000.0,
        is_active: false, // Start inactive, user can activate when ready
        label: `Trading Round #${i}`,
        start_time: serverTimestamp(),
        duration_seconds: 300000,
        pnl: 0.0,
        created_at: serverTimestamp(),
        unlocked: i === 1 // Only the first session is unlocked by default
      });
      
      sessionIds.push(sessionId);
    }

    console.log(`Created ${sessionCount} default simulation sessions for user ${userId}`);
    return sessionIds;
  } catch (error) {
    console.error("Error creating default simulation sessions:", error);
    throw error;
  }
};

/**
 * Get all simulation sessions for a user
 * @param {string} userId - The Firebase UID of the user
 * @returns {Promise<Array>} Array of session documents
 */
export const getUserSimulationSessions = async (userId) => {
  try {
    const sessionsQuery = query(
      collection(db, "simulation_sessions"),
      where("user_id", "==", userId)
    );
    
    const querySnapshot = await getDocs(sessionsQuery);
    const sessions = [];
    
    querySnapshot.forEach((doc) => {
      sessions.push({ id: doc.id, ...doc.data() });
    });
    
    return sessions;
  } catch (error) {
    console.error("Error getting user simulation sessions:", error);
    throw error;
  }
};

/**
 * Check if a user has any simulation sessions
 * @param {string} userId - The Firebase UID of the user
 * @returns {Promise<boolean>} True if user has sessions, false otherwise
 */
export const userHasSimulationSessions = async (userId) => {
  try {
    const sessions = await getUserSimulationSessions(userId);
    return sessions.length > 0;
  } catch (error) {
    console.error("Error checking if user has simulation sessions:", error);
    return false;
  }
};

/**
 * Create simulation sessions for a user if they don't have any
 * @param {string} userId - The Firebase UID of the user
 * @param {number} sessionCount - Number of sessions to create if none exist
 * @returns {Promise<boolean>} True if sessions were created, false if user already had sessions
 */
export const ensureUserHasSimulationSessions = async (userId, sessionCount = 2) => {
  try {
    const hasSessions = await userHasSimulationSessions(userId);
    
    if (!hasSessions) {
      await createDefaultSimulationSessions(userId, sessionCount);
      return true; // Sessions were created
    }
    
    return false; // User already had sessions
  } catch (error) {
    console.error("Error ensuring user has simulation sessions:", error);
    throw error;
  }
}; 
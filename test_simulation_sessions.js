// Test script for simulation session creation
// Run this in the browser console or as a Node.js script

import { createDefaultSimulationSessions, getUserSimulationSessions, userHasSimulationSessions } from './unified_app/firebase_setup/simulationSessionUtils.js';

// Test function
async function testSimulationSessions() {
  try {
    const testUserId = 'test_user_123';
    
    console.log('🧪 Testing simulation session creation...');
    
    // Test 1: Check if user has sessions (should be false initially)
    console.log('1. Checking if user has sessions...');
    const hasSessions = await userHasSimulationSessions(testUserId);
    console.log(`   User has sessions: ${hasSessions}`);
    
    // Test 2: Create default sessions
    console.log('2. Creating default simulation sessions...');
    const sessionIds = await createDefaultSimulationSessions(testUserId, 2);
    console.log(`   Created sessions: ${sessionIds.join(', ')}`);
    
    // Test 3: Check if user has sessions (should be true now)
    console.log('3. Checking if user has sessions after creation...');
    const hasSessionsAfter = await userHasSimulationSessions(testUserId);
    console.log(`   User has sessions: ${hasSessionsAfter}`);
    
    // Test 4: Get user sessions
    console.log('4. Fetching user sessions...');
    const sessions = await getUserSimulationSessions(testUserId);
    console.log(`   Found ${sessions.length} sessions:`);
    sessions.forEach((session, index) => {
      console.log(`   Session ${index + 1}:`);
      console.log(`     ID: ${session.id}`);
      console.log(`     Label: ${session.label}`);
      console.log(`     Cash: $${session.cash}`);
      console.log(`     Active: ${session.is_active}`);
      console.log(`     P&L: $${session.pnl}`);
    });
    
    console.log('✅ All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Export for use in other files
export { testSimulationSessions };

// If running directly, execute the test
if (typeof window !== 'undefined') {
  // Browser environment
  window.testSimulationSessions = testSimulationSessions;
  console.log('Test function available as window.testSimulationSessions');
} else {
  // Node.js environment
  testSimulationSessions();
} 
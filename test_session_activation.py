#!/usr/bin/env python3
"""
Test script for simulation session activation functionality.
Run this script to test the new session activation features.
"""

import sys
import os
import asyncio
from datetime import datetime, timezone

# Add the parent directory to the path so we can import the simulation engine
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sim_services.simulation_engine import sim_engine

def test_session_activation():
    """Test the session activation functionality."""
    
    # Test session ID (you can replace this with an actual session ID from your Firestore)
    test_session_id = "session_test_user_123_1"
    
    print("🧪 Testing Simulation Session Activation...")
    print("=" * 50)
    
    # Test 1: Get session status before activation
    print("\n1. Getting session status before activation...")
    status_before = sim_engine.get_firestore_session_status(test_session_id)
    if status_before:
        print(f"   ✅ Session found: {status_before['label']}")
        print(f"   - Active: {status_before['is_active']}")
        print(f"   - Cash: ${status_before['cash']:,.2f}")
        print(f"   - P&L: ${status_before['pnl']:,.2f}")
    else:
        print(f"   ❌ Session {test_session_id} not found")
        print("   Creating a test session first...")
        
        # You might want to create a test session here if it doesn't exist
        # For now, we'll just return
        return
    
    # Test 2: Activate session
    print("\n2. Activating session...")
    activation_success = sim_engine.activate_firestore_session(test_session_id)
    
    if activation_success:
        print("   ✅ Session activated successfully!")
    else:
        print("   ❌ Failed to activate session")
        return
    
    # Test 3: Get session status after activation
    print("\n3. Getting session status after activation...")
    status_after = sim_engine.get_firestore_session_status(test_session_id)
    if status_after:
        print(f"   ✅ Session status updated:")
        print(f"   - Active: {status_after['is_active']}")
        print(f"   - Current Tick: {status_after['current_tick']}")
        print(f"   - Start Time: {status_after['start_time']}")
    else:
        print("   ❌ Failed to get session status after activation")
    
    # Test 4: Deactivate session
    print("\n4. Deactivating session...")
    deactivation_success = sim_engine.deactivate_firestore_session(test_session_id)
    
    if deactivation_success:
        print("   ✅ Session deactivated successfully!")
    else:
        print("   ❌ Failed to deactivate session")
    
    # Test 5: Get final session status
    print("\n5. Getting final session status...")
    status_final = sim_engine.get_firestore_session_status(test_session_id)
    if status_final:
        print(f"   ✅ Final session status:")
        print(f"   - Active: {status_final['is_active']}")
        print(f"   - Final P&L: ${status_final['pnl']:,.2f}")
    else:
        print("   ❌ Failed to get final session status")
    
    print("\n" + "=" * 50)
    print("🎉 Session activation test completed!")

def test_multiple_sessions():
    """Test activation of multiple sessions."""
    
    print("\n🧪 Testing Multiple Session Activation...")
    print("=" * 50)
    
    # Test session IDs
    test_sessions = [
        "session_test_user_123_1",
        "session_test_user_123_2"
    ]
    
    for i, session_id in enumerate(test_sessions, 1):
        print(f"\n{i}. Testing session: {session_id}")
        
        # Try to activate
        success = sim_engine.activate_firestore_session(session_id)
        if success:
            print(f"   ✅ Session {session_id} activated")
        else:
            print(f"   ❌ Failed to activate session {session_id}")
    
    print("\n" + "=" * 50)
    print("🎉 Multiple session test completed!")

if __name__ == "__main__":
    print("🚀 Starting Simulation Session Activation Tests")
    print("Make sure your backend server is running and Firestore is configured.")
    
    try:
        # Test single session activation
        test_session_activation()
        
        # Test multiple sessions
        test_multiple_sessions()
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n✨ All tests completed!") 
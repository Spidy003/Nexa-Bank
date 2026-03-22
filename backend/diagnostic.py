import sys, os
from main import AuraAI

print("=== STARTING NATIVE INTENT TRACE ===")
try:
    print(f"TEST 1: {AuraAI.detect_intent('I would like to open an account for me')}")
    print(f"TEST 2: {AuraAI.detect_intent('you can assist me in Marathi I will prefer Marathi')}")
except Exception as e:
    print(f"NATIVE CRASH: {e}")
print("=== DONE ===")

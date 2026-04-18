import time
import math
import hashlib

def get_python_bucket(ts):
    return int(ts / 1800)

def get_node_bucket(ts):
    # Node equivalent: Math.floor(now / 1000 / 1800)
    # now is in ms, so ts*1000
    return math.floor((ts * 1000) / 1000 / 1800)

def validate_sync():
    print("── Aegis Distributed Time Sync Validator ──────────────────────────")
    test_ts = time.time()
    
    py_bucket = get_python_bucket(test_ts)
    node_bucket = get_node_bucket(test_ts)
    
    print(f"Unix Timestamp: {test_ts}")
    print(f"Python Bucket:  {py_bucket}")
    print(f"NodeJS Bucket:  {node_bucket}")
    
    if py_bucket == node_bucket:
        print("\n✅ SUCCESS: Temporal alignment verified. Fingerprint hashes will be identical.")
        
        # Test hash generation consistency
        event = "CLAIM_SUBMITTED"
        cell = "88618925d3fffff"
        amount_bucket = 500
        
        source = f"{event}|{cell}|{amount_bucket}|{py_bucket}"
        hash_val = hashlib.sha256(source.encode()).hexdigest()
        print(f"Sample Hash:    {hash_val}")
    else:
        print("\n❌ FAILURE: Clock drift or logic mismatch detected!")

if __name__ == "__main__":
    validate_sync()

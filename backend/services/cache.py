import time
import functools
import threading

class SimpleCache:
    def __init__(self):
        self.store = {}
        self.lock = threading.Lock()

    def get(self, key):
        with self.lock:
            item = self.store.get(key)
            if not item:
                return None
            
            val, expiry = item
            if time.time() > expiry:
                del self.store[key]
                return None
            
            return val

    def set(self, key, value, ttl_seconds):
        with self.lock:
            expiry = time.time() + ttl_seconds
            self.store[key] = (value, expiry)

    def clear(self):
        with self.lock:
            self.store = {}

# Global instance
_cache = SimpleCache()

def cached(ttl_seconds=300):
    """
    Decorator to cache function results.
    TTL default: 5 minutes (300s).
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Create a key based on function name and arguments
            # Note: args/kwargs must be hashable or stringifiable
            key_parts = [func.__module__, func.__name__]
            key_parts.extend([str(a) for a in args])
            key_parts.extend([f"{k}={v}" for k, v in sorted(kwargs.items())])
            key = ":".join(key_parts)
            
            result = _cache.get(key)
            if result is not None:
                # print(f"Cache HIT: {key}")
                return result
            
            # print(f"Cache MISS: {key}")
            result = func(*args, **kwargs)
            
            # Only cache if result is valid (not None or empty list if strict?)
            # For now, cache everything except None
            if result is not None:
                _cache.set(key, result, ttl_seconds)
                
            return result
        return wrapper
    return decorator

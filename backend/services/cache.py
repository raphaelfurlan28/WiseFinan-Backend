import time
import functools
import threading
import json
import os

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


# ============ PERSISTENT VALUE CACHE ============
# Cache that stores last valid values for volatile fields
# (FALTA, MENOR VALOR, MAIOR VALOR, VOL ANO)
# These values can intermittently return #N/A from Google Sheets

class PersistentValueCache:
    """
    Stores last known valid values for volatile fields.
    No expiry - values persist until updated with a new valid value.
    Optionally saves to disk for persistence across restarts.
    """
    
    # Invalid value patterns from Google Sheets
    INVALID_PATTERNS = [
        '#N/A', '#REF!', '#VALUE!', '#ERROR!', '#DIV/0!', '#NAME?',
        'Loading...', 'Carregando...', '', None, 'N/A', 'n/a', 'NA'
    ]
    
    def __init__(self, persist_file=None):
        self.store = {}
        self.lock = threading.Lock()
        self.persist_file = persist_file
        
        # Load from disk if file exists
        if persist_file and os.path.exists(persist_file):
            try:
                with open(persist_file, 'r', encoding='utf-8') as f:
                    self.store = json.load(f)
            except Exception as e:
                print(f"Warning: Could not load persistent cache: {e}")
    
    def _is_valid(self, value):
        """Check if a value is valid (not #N/A or similar)"""
        if value is None:
            return False
        
        # Check string patterns
        if isinstance(value, str):
            val_stripped = value.strip()
            if val_stripped in self.INVALID_PATTERNS:
                return False
            # Check if starts with #
            if val_stripped.startswith('#'):
                return False
            # Empty string
            if not val_stripped:
                return False
        
        return True
    
    def _save_to_disk(self):
        """Save current store to disk"""
        if self.persist_file:
            try:
                with open(self.persist_file, 'w', encoding='utf-8') as f:
                    json.dump(self.store, f, ensure_ascii=False, indent=2)
            except Exception as e:
                print(f"Warning: Could not save persistent cache: {e}")
    
    def get_or_update(self, ticker: str, field: str, current_value):
        """
        If current_value is valid, update cache and return it.
        If current_value is invalid, return last cached value (or None if no cache).
        """
        key = f"{ticker}:{field}"
        
        with self.lock:
            if self._is_valid(current_value):
                # Valid value - update cache and return
                self.store[key] = current_value
                self._save_to_disk()
                return current_value
            else:
                # Invalid value - return cached value if exists
                cached = self.store.get(key)
                if cached is not None:
                    # print(f"[CACHE] Using cached value for {key}: {cached}")
                    return cached
                # No cache available
                return current_value


# Global instance for volatile field caching
# Persist to disk in backend directory
_current_dir = os.path.dirname(os.path.abspath(__file__))
_cache_file = os.path.join(_current_dir, 'volatile_values_cache.json')
volatile_cache = PersistentValueCache(persist_file=_cache_file)


def get_cached_value(ticker: str, field: str, current_value):
    """
    Helper function to get a value with fallback to cache.
    Use for volatile fields: falta, min_val, max_val, vol_ano
    """
    return volatile_cache.get_or_update(ticker, field, current_value)


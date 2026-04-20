import redis
import json
import os
from functools import wraps

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

try:
    rc = redis.StrictRedis.from_url(REDIS_URL, decode_responses=True)
    rc.ping()  # Test connection
except Exception:
    rc = None

def cache_response(expiration=60):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if not rc:
                return func(*args, **kwargs)
                
            key = f"cache:{func.__name__}"
            cached = rc.get(key)
            if cached:
                return json.loads(cached)
            
            result = func(*args, **kwargs)
            rc.setex(key, expiration, json.dumps(result))
            return result
        return wrapper
    return decorator

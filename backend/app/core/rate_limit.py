from slowapi import Limiter
from slowapi.util import get_remote_address

# Module-level singleton: construction does no I/O, so this doesn't violate
# coding-standards.md's "no module-level side effects" rule. Not applied to
# any route yet — /query and /search don't exist until M8/M10 — but main.py
# needs one shared instance to wire into the app now.
limiter = Limiter(key_func=get_remote_address)

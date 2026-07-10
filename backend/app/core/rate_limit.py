from slowapi import Limiter
from slowapi.util import get_remote_address

# Module-level singleton: construction does no I/O, so this doesn't violate
# coding-standards.md's "no module-level side effects" rule. Applied to
# both /query endpoints (M7/M8) and both /search endpoints (M10).
limiter = Limiter(key_func=get_remote_address)

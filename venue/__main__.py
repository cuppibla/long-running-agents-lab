# Vendored verbatim from https://github.com/gca-americas/monstertix (3b2febe) — venue/__main__.py.
# The source lab is unchanged; this copy is what the page runs.
"""python -m venue"""

from __future__ import annotations

import os

import uvicorn

if __name__ == "__main__":
    # Cloud Run injects PORT and requires binding 0.0.0.0. Locally we stay on
    # loopback so nothing is exposed to the network by accident.
    on_cloud_run = bool(os.environ.get("K_SERVICE"))
    uvicorn.run(
        "venue.app:app",
        host=os.environ.get("VENUE_HOST", "0.0.0.0" if on_cloud_run else "127.0.0.1"),
        port=int(os.environ.get("PORT") or os.environ.get("VENUE_PORT", "8080")),
        reload=os.environ.get("VENUE_RELOAD") == "1",
        log_level="warning",
    )

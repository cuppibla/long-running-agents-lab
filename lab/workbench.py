"""adk web, mounted in the same process — the workbench.

`agents_dir` is agent/, which holds the one package adk web lists: `concert`.
Same lab.db and the same artifacts folder as the stage's Runner, so a run made
on the stage is a session in the dev UI and a session made in the dev UI sits
beside it. Not with adk's own file watcher (it evicts modules from a thread of
its own and races our imports); a save in the page evicts the workbench's copy
of the agent instead, on the request that made the save (`forget`).
"""
from __future__ import annotations

import contextlib

from fastapi import FastAPI

from lab import runner

URL_PREFIX = "/workbench"
APP = runner.APP

_server = None
_app: FastAPI | None = None


def _build() -> FastAPI:
    from google.adk.cli import fast_api as adk_fast_api

    try:
        from google.adk.cli import dev_server as _home
        base = _home.DevServer
    except (ImportError, AttributeError):
        _home = adk_fast_api
        base = getattr(adk_fast_api, "ApiServer", None) or adk_fast_api.DevServer
    name = base.__name__

    class _Capturing(base):  # type: ignore[misc, valid-type]
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            global _server
            _server = self

    setattr(_home, name, _Capturing)
    return adk_fast_api.get_fast_api_app(
        agents_dir=str(runner.AGENTS_DIR), session_service_uri=runner.SESSION_URI,
        artifact_service_uri=runner.ARTIFACT_URI,
        allow_origins=["*"], web=True, url_prefix=URL_PREFIX, reload_agents=False)


def app() -> FastAPI:
    global _app
    if _app is None:
        _app = _build()
    return _app


async def forget(app_name: str = APP) -> None:
    """After a save: the workbench's next run imports the files as they are now."""
    srv = _server
    if srv is not None:
        rd = getattr(srv, "runner_dict", {}).pop(app_name, None)
        if rd is not None:
            with contextlib.suppress(Exception):
                from google.adk.cli.utils import cleanup
                await cleanup.close_runners([rd])
        with contextlib.suppress(Exception):
            srv.agent_loader.remove_agent_from_cache(app_name)
    runner.forget_modules()

"""WasmBox Compiler API.

Week 2 Monday deliverable: "Build API endpoint accepting raw Python code."

A tenant POSTs plugin source as JSON; we validate + package it
(src/compiler.py) and hand back a `.wasmboxpkg` artifact plus its manifest.
This replaces Week 1's CLI-only workflow (`python3 src/compiler.py <file>
<out> <name>`) with something a real developer portal (R5's React/Monaco
frontend) can actually call over HTTP.

Run locally:
    uvicorn src.api:app --reload

Endpoints:
    POST /plugins            compile + package a new plugin
    GET  /plugins/{name}/artifact  download a compiled artifact
    GET  /healthz            health check
"""

from __future__ import annotations

import shutil
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from compile_cache import (
    CachedCompilation,
    CompileCache,
    compilation_key,
    materialize,
    snapshot,
)
from compiler import (
    ARTIFACT_SUFFIX,
    PLUGIN_NAME_PATTERN,
    CompilerWarning,
    PluginValidationError,
    compile_source,
    package_artifact,
)

PLUGINS_DIR = Path(__file__).resolve().parent.parent / "plugins"
ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "artifacts"

app = FastAPI(title="WasmBox Compiler API", version="2.0")

# Week 4 (Tue): repeated submissions of identical source are served from here.
compile_cache = CompileCache()


class CompileRequest(BaseModel):
    # The name rule lives in the compiler (single source of truth); this model
    # reuses it so the API rejects unsafe names before they reach the pipeline.
    name: str = Field(..., pattern=f"^{PLUGIN_NAME_PATTERN}$")
    source: str = Field(..., min_length=1)
    # Week 3: optional per-plugin resource-limit overrides. Semantics (keys,
    # bounds) are validated by the compiler; defaults apply when omitted.
    resource_limits: dict[str, int] | None = Field(default=None)


class CompileResponse(BaseModel):
    name: str
    source_sha256: str
    format_version: str
    artifact_filename: str
    resource_limits: dict[str, int]
    # Week 3 (Wed): non-fatal compile warnings, e.g. source nearing the size cap.
    warnings: list[CompilerWarning] = Field(default_factory=list)


@app.post("/plugins", response_model=CompileResponse, status_code=201)
def compile_plugin_endpoint(req: CompileRequest) -> CompileResponse:
    request_key = compilation_key(req.source.encode("utf-8"), req.name, req.resource_limits)
    entry = compile_cache.get(request_key)
    if entry is None:
        entry = _compile_and_package(req)
        compile_cache.put(request_key, entry)

    artifact_path = materialize(entry, PLUGINS_DIR, ARTIFACTS_DIR)
    return _to_response(entry, artifact_path)


def _compile_and_package(req: CompileRequest) -> CachedCompilation:
    """Compile and package one request, translating validation failures to 422s."""
    # Wipe any previous compile of the same name so re-submitting a fixed
    # plugin doesn't leave a stale directory behind.
    existing_plugin_dir = PLUGINS_DIR / req.name
    if existing_plugin_dir.exists():
        shutil.rmtree(existing_plugin_dir)

    try:
        plugin = compile_source(
            req.source.encode("utf-8"),
            PLUGINS_DIR,
            req.name,
            resource_limits=req.resource_limits,
        )
    except PluginValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail={"error_code": exc.error_code, "message": str(exc)},
        ) from exc

    artifact_path = package_artifact(plugin.plugin_dir, ARTIFACTS_DIR)
    return snapshot(plugin, artifact_path)


def _to_response(entry: CachedCompilation, artifact_path: Path) -> CompileResponse:
    """Build the API response from a (fresh or cached) compilation entry."""
    manifest = entry.manifest
    return CompileResponse(
        name=str(manifest["name"]),
        source_sha256=str(manifest["source_sha256"]),
        format_version=str(manifest["format_version"]),
        artifact_filename=artifact_path.name,
        resource_limits=dict(manifest["resource_limits"]),
        warnings=list(entry.warnings),
    )


@app.get("/plugins/{name}/artifact")
def download_artifact(name: str) -> FileResponse:
    artifact_path = ARTIFACTS_DIR / f"{name}{ARTIFACT_SUFFIX}"
    if not artifact_path.exists():
        raise HTTPException(status_code=404, detail=f"No compiled artifact for plugin '{name}'")
    return FileResponse(artifact_path, filename=artifact_path.name)


@app.get("/healthz")
def healthz() -> dict:
    return {"status": "ok"}

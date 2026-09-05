"""
WasmBox Compiler API
=====================
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
    GET  /plugins/{name}     fetch a previously compiled plugin's manifest
"""

from __future__ import annotations

import shutil
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from compiler import (
    ARTIFACT_SUFFIX,
    PluginValidationError,
    compile_source,
    package_artifact,
)

PLUGINS_DIR = Path(__file__).resolve().parent.parent / "plugins"
ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "artifacts"

app = FastAPI(title="WasmBox Compiler API", version="2.0")


class CompileRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=64, pattern=r"^[a-zA-Z0-9_-]+$")
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


@app.post("/plugins", response_model=CompileResponse, status_code=201)
def compile_plugin_endpoint(req: CompileRequest) -> CompileResponse:
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

    return CompileResponse(
        name=plugin.name,
        source_sha256=plugin.source_sha256,
        format_version=plugin.format_version,
        artifact_filename=artifact_path.name,
        resource_limits=plugin.resource_limits,
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

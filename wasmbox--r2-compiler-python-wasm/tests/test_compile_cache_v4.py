"""
Week 4 tests (Tuesday: "Add caching for repeated compilations").

Covers the content-addressed compile cache end to end:

  - `compilation_key` is deterministic and changes with each input
  - `CompileCache` hit/miss/LRU-eviction/disable semantics
  - a repeated identical POST is served from cache (the compiler runs once)
  - a cache hit still materializes the artifact and the plugin directory
  - the cached artifact downloads normally
  - resource-limit overrides are part of the key (different limits -> recompile)
  - validation failures are never cached
"""

import shutil
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

import api as api_module  # noqa: E402
from compile_cache import (  # noqa: E402
    CachedCompilation,
    CompileCache,
    compilation_key,
    materialize,
    snapshot,
)
from compiler import compile_source, package_artifact  # noqa: E402

SOURCE = "print('hi')\n"


@pytest.fixture()
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setattr(api_module, "PLUGINS_DIR", tmp_path / "plugins")
    monkeypatch.setattr(api_module, "ARTIFACTS_DIR", tmp_path / "artifacts")
    api_module.compile_cache.clear()
    return TestClient(api_module.app)


def _entry(name: str) -> CachedCompilation:
    """A minimal cache entry for exercising `CompileCache` in isolation."""
    return CachedCompilation(manifest={"name": name}, warnings=(), artifact_bytes=b"")


# ------------------------------------------------------------------ cache key --


def test_key_is_order_independent_for_limits() -> None:
    first = compilation_key(b"x", "n", {"max_fuel": 1, "timeout_ms": 2})
    second = compilation_key(b"x", "n", {"timeout_ms": 2, "max_fuel": 1})

    assert first == second


def test_key_changes_with_each_input() -> None:
    base = compilation_key(b"x", "n")

    assert base != compilation_key(b"y", "n")  # source
    assert base != compilation_key(b"x", "m")  # name
    assert base != compilation_key(b"x", "n", {"max_fuel": 1})  # limits
    assert len(base) == 64


# ---------------------------------------------------------------- cache class --


def test_get_on_empty_cache_misses() -> None:
    cache = CompileCache()

    assert cache.get("absent") is None
    assert cache.stats.misses == 1


def test_put_then_get_hits() -> None:
    cache = CompileCache()
    cache.put("k", _entry("k"))

    assert cache.get("k").name == "k"  # type: ignore[union-attr]
    assert (cache.stats.stores, cache.stats.hits) == (1, 1)


def test_lru_evicts_least_recently_used() -> None:
    cache = CompileCache(max_entries=2)
    for name in ("a", "b", "c"):
        cache.put(name, _entry(name))

    assert len(cache) == 2
    assert cache.get("a") is None
    assert cache.stats.evictions == 1


def test_lru_refresh_keeps_recently_used_entry() -> None:
    cache = CompileCache(max_entries=2)
    cache.put("a", _entry("a"))
    cache.put("b", _entry("b"))
    cache.get("a")  # refresh "a" so "b" becomes the eviction candidate
    cache.put("c", _entry("c"))

    assert cache.get("a") is not None
    assert cache.get("b") is None


def test_disabled_cache_never_stores() -> None:
    cache = CompileCache(max_entries=0)
    cache.put("k", _entry("k"))

    assert cache.enabled is False
    assert len(cache) == 0
    assert cache.get("k") is None


# ------------------------------------------------------- snapshot/materialize --


def test_snapshot_and_materialize_round_trip(tmp_path: Path) -> None:
    plugin = compile_source(b"print('x')\n", tmp_path / "plugins", "snap")
    artifact = package_artifact(plugin.plugin_dir, tmp_path / "artifacts")
    entry = snapshot(plugin, artifact)

    restored_artifact = materialize(
        entry, tmp_path / "new_plugins", tmp_path / "new_artifacts"
    )

    assert restored_artifact.read_bytes() == artifact.read_bytes()
    assert (tmp_path / "new_plugins" / "snap" / "main.py").read_text() == "print('x')\n"


# ----------------------------------------------------------------- agency API --


def test_second_identical_request_is_served_from_cache(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    compile_calls = {"count": 0}
    real_compile = api_module.compile_source

    def counting_compile(*args: object, **kwargs: object):
        compile_calls["count"] += 1
        return real_compile(*args, **kwargs)

    monkeypatch.setattr(api_module, "compile_source", counting_compile)
    payload = {"name": "greet", "source": SOURCE}

    first = client.post("/plugins", json=payload)
    second = client.post("/plugins", json=payload)

    assert first.status_code == second.status_code == 201
    assert first.json() == second.json()
    assert compile_calls["count"] == 1  # the second request never recompiled
    assert api_module.compile_cache.stats.hits == 1


def test_different_source_is_not_served_from_cache(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    compile_calls = {"count": 0}
    real_compile = api_module.compile_source

    def counting_compile(*args: object, **kwargs: object):
        compile_calls["count"] += 1
        return real_compile(*args, **kwargs)

    monkeypatch.setattr(api_module, "compile_source", counting_compile)

    client.post("/plugins", json={"name": "greet", "source": SOURCE})
    second = client.post("/plugins", json={"name": "greet", "source": "print(2)\n"})

    assert second.status_code == 201
    assert compile_calls["count"] == 2
    assert api_module.compile_cache.stats.hits == 0


def test_resource_limits_are_part_of_the_key(client: TestClient) -> None:
    client.post("/plugins", json={"name": "greet", "source": SOURCE})
    second = client.post(
        "/plugins",
        json={"name": "greet", "source": SOURCE, "resource_limits": {"max_fuel": 5_000_000_000}},
    )

    assert second.status_code == 201
    assert second.json()["resource_limits"]["max_fuel"] == 5_000_000_000
    assert api_module.compile_cache.stats.hits == 0


def test_cache_hit_rebuilds_artifact_and_plugin_dir(client: TestClient) -> None:
    payload = {"name": "greet", "source": SOURCE}
    client.post("/plugins", json=payload)

    artifact = api_module.ARTIFACTS_DIR / "greet.wasmboxpkg"
    plugin_main = api_module.PLUGINS_DIR / "greet" / "main.py"
    # Simulate a cache-only state: on-disk output is gone, but the cache survives.
    shutil.rmtree(api_module.PLUGINS_DIR / "greet")
    artifact.unlink()

    response = client.post("/plugins", json=payload)

    assert response.status_code == 201
    assert artifact.exists()
    assert plugin_main.read_text(encoding="utf-8") == SOURCE


def test_cached_artifact_is_downloadable(client: TestClient) -> None:
    payload = {"name": "greet", "source": SOURCE}
    client.post("/plugins", json=payload)
    first_download = client.get("/plugins/greet/artifact")

    client.post("/plugins", json=payload)  # cache hit
    second_download = client.get("/plugins/greet/artifact")

    assert first_download.status_code == second_download.status_code == 200
    assert first_download.content == second_download.content


def test_validation_failures_are_never_cached(client: TestClient) -> None:
    payload = {"name": "broken", "source": "def f(:\n"}

    for _ in range(2):
        assert client.post("/plugins", json=payload).status_code == 422

    assert api_module.compile_cache.stats.misses == 2
    assert len(api_module.compile_cache) == 0

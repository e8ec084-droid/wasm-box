from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from wasmtime import Engine, Store, Module, Linker, WasiConfig, Config
import time, tempfile, pathlib, json, os

app=FastAPI(title="WasmBox", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_methods=["*"], allow_headers=["*"])

class RunRequest(BaseModel):
    tenant_id: str = Field(min_length=1, max_length=80)
    plugin_id: str = Field(min_length=1, max_length=80)
    wasm_wat: str = Field(min_length=1)
    input: dict = {}
    timeout_ms: int = Field(default=50, ge=1, le=5000)
    memory_mb: int = Field(default=10, ge=1, le=64)

class Host:
    def __init__(self, tenant, payload): self.tenant=tenant; self.payload=payload; self.logs=[]; self.writes=[]
    def log(self, value): self.logs.append(str(value)); return 0
    def write_row(self, tenant_num, key, value):
        # In production tenant_num must be derived server-side, never trusted from WASM.
        if str(tenant_num) != str(abs(hash(self.tenant)) % 2147483647): return -1
        self.writes.append({"key":key,"value":value}); return 0

def run_wasm(req):
    cfg=Config(); cfg.consume_fuel=True
    engine=Engine(cfg); module=Module(engine, req.wasm_wat)
    store=Store(engine); store.set_fuel(max(10_000, req.timeout_ms*100_000))
    host=Host(req.tenant_id, req.input)
    linker=Linker(engine)
    linker.define_func("env","host_log", [__import__('wasmtime').ValType.i32()], [])
    # Only explicitly linked functions are available. No WASI is installed.
    linker.define_func("env","host_write_row", [__import__('wasmtime').ValType.i32(),__import__('wasmtime').ValType.i32(),__import__('wasmtime').ValType.i32()], [__import__('wasmtime').ValType.i32()])
    start=time.perf_counter()
    try:
        instance=linker.instantiate(store,module)
        fn=instance.exports(store).get("run")
        if fn is None: raise ValueError("module must export run")
        result=fn(store)
        elapsed=round((time.perf_counter()-start)*1000,3)
        return {"ok":True,"result":result,"stdout":host.logs,"writes":host.writes,"execution_ms":elapsed,"memory_bytes":0}
    except Exception as e:
        elapsed=round((time.perf_counter()-start)*1000,3)
        return {"ok":False,"error":str(e),"stdout":host.logs,"writes":host.writes,"execution_ms":elapsed,"memory_bytes":0}

@app.get('/health')
def health(): return {"status":"ok","sandbox":"wasmtime","wasi_enabled":False}
@app.post('/run')
def run(req:RunRequest):
    if not req.wasm_wat.lstrip().startswith('(module'): raise HTTPException(400,'Only WAT modules are accepted by this reference compiler adapter')
    return run_wasm(req)
@app.post('/webhook/{tenant_id}/{plugin_id}')
def webhook(tenant_id:str,plugin_id:str,req:RunRequest):
    if req.tenant_id!=tenant_id or req.plugin_id!=plugin_id: raise HTTPException(403,'tenant/plugin mismatch')
    return run_wasm(req)

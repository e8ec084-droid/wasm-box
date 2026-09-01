from fastapi.testclient import TestClient
from main import app
client=TestClient(app)
def test_benign():
 r=client.post('/run',json={'tenant_id':'a','plugin_id':'p','wasm_wat':'(module (func (export "run") (result i32) i32.const 42))'})
 assert r.status_code==200 and r.json()['ok'] and r.json()['result']==42
def test_no_wasi_filesystem():
 wat="""
(module (import "wasi_snapshot_preview1" "fd_read" (func)) (func (export "run")))
"""
 r=client.post('/run',json={'tenant_id':'a','plugin_id':'p','wasm_wat':wat})
 assert r.status_code==200 and not r.json()['ok']

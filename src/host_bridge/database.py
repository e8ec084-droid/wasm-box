"""Database bridge with Role-Based Access Control (RBAC)."""

import sqlite3
from typing import Dict, Set
from src.host_bridge.validator import HostFunctionValidator


class DatabaseBridge:
    """Manages authorized database modifications from guest plugins."""

    APPROVED_TABLES: Set[str] = {"logs", "analytics", "plugin_cache"}
    ROLE_PERMISSIONS: Dict[str, Set[str]] = {
        "admin": {"WRITE:logs", "WRITE:analytics", "WRITE:plugin_cache"},
        "data_collector": {"WRITE:logs", "WRITE:analytics"},
        "untrusted_plugin": set(),
    }

    def __init__(self, db_path: str = ":memory:") -> None:
        """Initializes storage and schemas."""
        self._conn = sqlite3.connect(db_path)
        self._initialize_schema()

    def _initialize_schema(self) -> None:
        """Sets up approved tables."""
        cursor = self._conn.cursor()
        for table in self.APPROVED_TABLES:
            cursor.execute(
                f"""
                CREATE TABLE IF NOT EXISTS {table} (
                    id INTEGER PRIMARY KEY,
                    payload TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        self._conn.commit()

    def write_row(self, table: str, row_id: int, payload: str, caller_role: str) -> int:
        """Executes an authorized row write operation under strict RBAC checks.

        Args:
            table: Target database table name.
            row_id: Primary key identifier.
            payload: String data payload.
            caller_role: RBAC security role claimed by the execution context.

        Returns:
            Integer status code (0 for success).

        Raises:
            PermissionError: If caller lacks write authority for the table.
            ValueError: If target table is not in the whitelist.
        """
        clean_table = HostFunctionValidator.validate_string(table, max_length=64, param_name="table")
        clean_id = HostFunctionValidator.validate_integer(row_id, min_val=1, max_val=10_000_000, param_name="row_id")
        clean_payload = HostFunctionValidator.validate_string(payload, max_length=4096, param_name="payload")
        clean_role = HostFunctionValidator.validate_string(caller_role, max_length=32, param_name="caller_role")

        if clean_table not in self.APPROVED_TABLES:
            raise ValueError(f"Table '{clean_table}' is not in approved storage whitelist")

        required_perm = f"WRITE:{clean_table}"
        granted = self.ROLE_PERMISSIONS.get(clean_role, set())
        if required_perm not in granted:
            raise PermissionError(f"RBAC Violation: Role '{clean_role}' denied '{required_perm}'")

        cursor = self._conn.cursor()
        cursor.execute(
            f"INSERT OR REPLACE INTO {clean_table} (id, payload) VALUES (?, ?)",
            (clean_id, clean_payload),
        )
        self._conn.commit()
        return 0

    def close(self) -> None:
        """Terminates database handle."""
        self._conn.close()
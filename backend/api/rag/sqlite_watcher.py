"""
SQLite Change Watcher for Clinic RAG System
Monitors SQLite database for changes and triggers incremental indexing
"""

import sqlite3
import json
import time
import threading
from typing import Callable, Dict, List, Optional, Any
from datetime import datetime
from dataclasses import dataclass, asdict
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class ChangeType(Enum):
    INSERT = "INSERT"
    UPDATE = "UPDATE"
    DELETE = "DELETE"


@dataclass
class DatabaseChange:
    """Represents a change in the SQLite database"""
    change_id: int
    table: str
    change_type: ChangeType
    record_id: int
    old_data: Optional[Dict[str, Any]]
    new_data: Optional[Dict[str, Any]]
    timestamp: datetime

    def to_dict(self) -> Dict[str, Any]:
        return {
            'change_id': self.change_id,
            'table': self.table,
            'change_type': self.change_type.value,
            'record_id': self.record_id,
            'old_data': self.old_data,
            'new_data': self.new_data,
            'timestamp': self.timestamp.isoformat()
        }


class SQLiteChangeWatcher:
    """
    Watches SQLite database for changes and triggers RAG pipeline updates.
    Implements hybrid processing: real-time for critical updates + batch for non-critical.
    """

    def __init__(self, db_path: str, tables: List[str]):
        self.db_path = db_path
        self.tables = tables
        self._change_handlers: List[Callable[[DatabaseChange], None]] = []
        self._running = False
        self._watch_thread: Optional[threading.Thread] = None
        self._last_change_id = 0
        self._batch_queue: List[DatabaseChange] = []
        self._batch_interval = 600  # 10 minutes
        self._critical_tables = ['patient', 'medical_history', 'active_medications', 'prescription_medications']

    def register_handler(self, handler: Callable[[DatabaseChange], None]) -> None:
        """Register a handler to be called when database changes are detected"""
        self._change_handlers.append(handler)

    def start(self) -> None:
        """Start watching for database changes"""
        if self._running:
            logger.warning("Change watcher already running")
            return

        self._running = True
        self._watch_thread = threading.Thread(target=self._watch_loop, daemon=True)
        self._watch_thread.start()
        logger.info(f"SQLite change watcher started for tables: {self.tables}")

    def stop(self) -> None:
        """Stop watching for database changes"""
        self._running = False
        if self._watch_thread:
            self._watch_thread.join(timeout=5)
        logger.info("SQLite change watcher stopped")

    def _watch_loop(self) -> None:
        """Main watch loop - polls for changes"""
        while self._running:
            try:
                self._poll_changes()
                time.sleep(1)  # Poll every second for real-time detection
            except Exception as e:
                logger.error(f"Error in change watcher: {e}")
                time.sleep(5)

    def _poll_changes(self) -> None:
        """Poll for new changes in the database"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        try:
            # Query change tracking table
            cursor.execute("""
                SELECT * FROM rag_change_log 
                WHERE change_id > ? 
                ORDER BY change_id ASC
            """, (self._last_change_id,))

            changes = []
            for row in cursor.fetchall():
                change = DatabaseChange(
                    change_id=row['change_id'],
                    table=row['table'],
                    change_type=ChangeType(row['change_type']),
                    record_id=row['record_id'],
                    old_data=json.loads(row['old_data']) if row['old_data'] else None,
                    new_data=json.loads(row['new_data']) if row['new_data'] else None,
                    timestamp=datetime.fromisoformat(row['timestamp'])
                )
                changes.append(change)
                self._last_change_id = max(self._last_change_id, change.change_id)

            # Process changes
            for change in changes:
                self._process_change(change)

        except sqlite3.Error as e:
            logger.error(f"Database error polling changes: {e}")
        finally:
            conn.close()

    def _process_change(self, change: DatabaseChange) -> None:
        """Process a detected change - hybrid real-time + batch approach"""
        is_critical = change.table in self._critical_tables

        if is_critical:
            # Real-time processing for critical tables (<2s delay)
            self._trigger_realtime_processing(change)
        else:
            # Batch processing for non-critical tables
            self._batch_queue.append(change)
            if len(self._batch_queue) >= 100:
                self._trigger_batch_processing()

    def _trigger_realtime_processing(self, change: DatabaseChange) -> None:
        """Trigger immediate processing for critical changes"""
        logger.info(f"Real-time processing triggered for {change.table}#{change.record_id}")
        for handler in self._change_handlers:
            try:
                handler(change)
            except Exception as e:
                logger.error(f"Error in change handler: {e}")

    def _trigger_batch_processing(self) -> None:
        """Trigger batch processing for queued changes"""
        if not self._batch_queue:
            return

        logger.info(f"Batch processing triggered for {len(self._batch_queue)} changes")
        batch = self._batch_queue.copy()
        self._batch_queue.clear()

        for handler in self._change_handlers:
            try:
                # Pass batch to handler
                if hasattr(handler, 'process_batch'):
                    handler.process_batch(batch)
                else:
                    for change in batch:
                        handler(change)
            except Exception as e:
                logger.error(f"Error in batch handler: {e}")

    def manual_trigger(self, table: str, record_id: int, change_type: ChangeType = ChangeType.UPDATE) -> None:
        """Manually trigger processing for a specific record"""
        change = DatabaseChange(
            change_id=self._last_change_id + 1,
            table=table,
            change_type=change_type,
            record_id=record_id,
            old_data=None,
            new_data=None,
            timestamp=datetime.now()
        )
        self._process_change(change)


class ChangeLogManager:
    """Manages the rag_change_log table for tracking database changes"""

    def __init__(self, db_path: str):
        self.db_path = db_path
        self._ensure_table()

    def _ensure_table(self) -> None:
        """Ensure the change log table exists"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS rag_change_log (
                change_id INTEGER PRIMARY KEY AUTOINCREMENT,
                table_name TEXT NOT NULL,
                change_type TEXT NOT NULL,
                record_id INTEGER NOT NULL,
                old_data TEXT,
                new_data TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        conn.close()

    def log_change(self, table: str, change_type: ChangeType, record_id: int,
                   old_data: Optional[Dict] = None, new_data: Optional[Dict] = None) -> None:
        """Log a database change"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO rag_change_log 
            (table_name, change_type, record_id, old_data, new_data)
            VALUES (?, ?, ?, ?, ?)
        """, (
            table,
            change_type.value,
            record_id,
            json.dumps(old_data) if old_data else None,
            json.dumps(new_data) if new_data else None
        ))
        conn.commit()
        conn.close()


def create_change_watcher(db_path: str, tables: List[str]) -> SQLiteChangeWatcher:
    """Factory function to create and configure a change watcher"""
    watcher = SQLiteChangeWatcher(db_path, tables)
    return watcher
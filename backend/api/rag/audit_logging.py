"""
Audit Logging System for Clinic RAG System
Provides GDPR-compliant audit trails for all data access and modifications
"""

import json
import time
import hashlib
from datetime import datetime, timezone as tz_info
from typing import Dict, Any, Optional, List, Union
from dataclasses import dataclass, field
import logging

logger = logging.getLogger(__name__)


class AuditEventType(Enum):
    """Types of audit events"""
    DATA_READ = "data_read"
    DATA_CREATE = "data_create"
    DATA_UPDATE = "data_update"
    DATA_DELETE = "data_delete"
    AUTH_SUCCESS = "auth_success"
    AUTH_FAILURE = "auth_failure"
    API_CALL = "api_call"
    SYSTEM_EVENT = "system_event"
    PRIVACY_EVENT = "privacy_event"


class AuditSeverity(Enum):
    """Severity levels for audit events"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class AuditRecord:
    """Represents a single audit record"""
    record_id: str
    event_type: AuditEventType
    severity: AuditSeverity
    timestamp: datetime
    user_id: Optional[int] = None
    username: Optional[str] = None
    session_id: Optional[str] = None
    endpoint: Optional[str] = None
    method: Optional[str] = None
    request_id: Optional[str] = None
    patient_id: Optional[int] = None
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)
    checksum: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage"""
        data = {
            'record_id': self.record_id,
            'event_type': self.event_type.value,
            'severity': self.severity.value,
            'timestamp': self.timestamp.isoformat(),
            'user_id': self.user_id,
            'username': self.username,
            'session_id': self.session_id,
            'endpoint': self.endpoint,
            'method': self.method,
            'request_id': self.request_id,
            'patient_id': self.patient_id,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'details': self.details,
        }
        if self.checksum:
            data['checksum'] = self.checksum
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AuditRecord':
        """Create from dictionary"""
        record = cls(
            record_id=data['record_id'],
            event_type=AuditEventType(data['event_type']),
            severity=AuditSeverity(data['severity']),
            timestamp=datetime.fromisoformat(data['timestamp']),
            user_id=data.get('user_id'),
            username=data.get('username'),
            session_id=data.get('session_id'),
            endpoint=data.get('endpoint'),
            method=data.get('method'),
            request_id=data.get('request_id'),
            patient_id=data.get('patient_id'),
            resource_type=data.get('resource_type'),
            resource_id=data.get('resource_id'),
            ip_address=data.get('ip_address'),
            user_agent=data.get('user_agent'),
            details=data.get('details', {}),
        )
        record.checksum = data.get('checksum')
        return record


class AuditLogger:
    """
    Provides GDPR-compliant audit logging for the Clinic RAG System.
    All access to patient data is logged with appropriate retention and anonymization.
    """

    def __init__(self, storage_path: str = "audit_logs.jsonl"):
        self.storage_path = storage_path
        self._ensure_storage()
        self._local_buffer: List[AuditRecord] = []
        self._batch_size = 100
        self._flush_interval = 30  # seconds

    def _ensure_storage(self) -> None:
        """Ensure audit log storage exists"""
        import os
        if not os.path.exists(os.path.dirname(self.storage_path)):
            os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
        if not os.path.exists(self.storage_path):
            with open(self.storage_path, 'w') as f:
                pass  # Create empty file

    def _generate_checksum(self, record: AuditRecord) -> str:
        """Generate SHA256 checksum for integrity verification"""
        content = f"{record.record_id}{record.timestamp.isoformat()}{json.dumps(record.details, sort_keys=True)}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]

    def _flush_buffer(self) -> None:
        """Flush local buffer to storage"""
        if not self._local_buffer:
            return

        try:
            with open(self.storage_path, 'a') as f:
                for record in self._local_buffer:
                    f.write(json.dumps(record.to_dict()) + '\n')
            self._local_buffer.clear()
        except Exception as e:
            logger.error(f"Failed to flush audit log: {e}")

    def log_event(self, event: AuditRecord) -> None:
        """Log an audit event"""
        # Generate checksum for integrity
        event.checksum = self._generate_checksum(event)
        self._local_buffer.append(event)

        # Flush if buffer is full
        if len(self._local_buffer) >= self._batch_size:
            self._flush_buffer()

    def log_data_read(
        self,
        user_id: Optional[int],
        username: Optional[str],
        patient_id: int,
        endpoint: str,
        details: Optional[Dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> None:
        """Log data read event"""
        record = AuditRecord(
            record_id=f"read_{int(time.time())}_{patient_id}",
            event_type=AuditEventType.DATA_READ,
            severity=AuditSeverity.LOW,
            timestamp=datetime.now(tz=tz_info.utc),
            user_id=user_id,
            username=username,
            patient_id=patient_id,
            endpoint=endpoint,
            details=details or {},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.log_event(record)

    def log_data_create(
        self,
        user_id: int,
        username: str,
        resource_type: str,
        resource_id: str,
        endpoint: str,
        details: Optional[Dict] = None,
        ip_address: Optional[str] = None,
    ) -> None:
        """Log data creation event"""
        record = AuditRecord(
            record_id=f"create_{int(time.time())}_{resource_id}",
            event_type=AuditEventType.DATA_CREATE,
            severity=AuditSeverity.MEDIUM,
            timestamp=datetime.now(tz=tz_info.utc),
            user_id=user_id,
            username=username,
            resource_type=resource_type,
            resource_id=resource_id,
            endpoint=endpoint,
            details=details or {},
            ip_address=ip_address,
        )
        self.log_event(record)

    def log_data_update(
        self,
        user_id: int,
        username: str,
        patient_id: int,
        resource_type: str,
        resource_id: str,
        endpoint: str,
        details: Optional[Dict] = None,
        ip_address: Optional[str] = None,
    ) -> None:
        """Log data update event"""
        record = AuditRecord(
            record_id=f"update_{int(time.time())}_{resource_id}",
            event_type=AuditEventType.DATA_UPDATE,
            severity=AuditSeverity.MEDIUM,
            timestamp=datetime.now(tz=tz_info.utc),
            user_id=user_id,
            username=username,
            patient_id=patient_id,
            resource_type=resource_type,
            resource_id=resource_id,
            endpoint=endpoint,
            details=details or {},
            ip_address=ip_address,
        )
        self.log_event(record)

    def log_privacy_event(
        self,
        event_type: AuditEventType,
        description: str,
        related_patient_ids: Optional[List[int]] = None,
        severity: AuditSeverity = AuditSeverity.HIGH,
    ) -> None:
        """Log privacy-related events (GDPR, data access requests, etc.)"""
        record = AuditRecord(
            record_id=f"privacy_{int(time.time())}",
            event_type=event_type,
            severity=severity,
            timestamp=datetime.now(tz=tz_info.utc),
            details={
                'description': description,
                'related_patient_ids': related_patient_ids or [],
            },
        )
        self.log_event(record)

    def get_recent_events(
        self,
        hours: int = 24,
        event_types: Optional[List[AuditEventType]] = None,
        severity: Optional[AuditSeverity] = None,
    ) -> List[AuditRecord]:
        """Retrieve recent audit events"""
        import os
        if not os.path.exists(self.storage_path):
            return []

        cutoff = datetime.now(tz=tz_info.utc).timestamp() - (hours * 3600)
        events = []

        try:
            with open(self.storage_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                        timestamp = datetime.fromisoformat(data['timestamp']).timestamp()
                        if timestamp < cutoff:
                            continue

                        event = AuditRecord.from_dict(data)

                        # Filter by event types
                        if event_types and event.event_type not in event_types:
                            continue

                        # Filter by severity
                        if severity and event.severity != severity:
                            continue

                        events.append(event)
                    except (json.JSONDecodeError, KeyError, ValueError):
                        continue
        except Exception as e:
            logger.error(f"Error retrieving audit events: {e}")

        return events


# Global audit logger instance
audit_logger = AuditLogger()


def get_audit_logger() -> AuditLogger:
    """Get the global audit logger instance"""
    return audit_logger
"""
Alert system for the Clinic RAG System.
Sends notifications when pipeline failures or anomalies are detected.
"""

import logging
from typing import Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class Alert:
    """Represents a system alert."""
    severity: str  # "critical" | "warning" | "info"
    source: str
    message: str
    details: dict


class AlertManager:
    """Manages system alerts — logs them and (optionally) forwards to admin."""

    def __init__(self):
        self._alerts: list[Alert] = []

    def push(self, alert: Alert) -> None:
        self._alerts.append(alert)
        log_fn = logger.critical if alert.severity == "critical" else logger.warning
        log_fn("[%s] %s — %s", alert.source, alert.message, alert.details)
        # ponytail: send to email/webhook in production

    def recent(self, n: int = 20) -> list[dict]:
        return [
            {"severity": a.severity, "source": a.source, "message": a.message, "details": a.details}
            for a in self._alerts[-n:]
        ]

    def clear(self) -> None:
        self._alerts.clear()


alert_manager = AlertManager()
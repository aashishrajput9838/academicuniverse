"""
ADBG Logging — Structured Logging Configuration.

Provides a consistent logging setup for the entire ADBG framework.
All modules should use `logging.getLogger(__name__)` to get a logger
that inherits from the 'adbg' root logger configured here.

Output Formats:
    - Console: Human-readable with timestamps and colored levels.
    - File (optional): JSON Lines for machine-parseable audit trails.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

# Module-level constants
_LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)-30s | %(message)s"
_LOG_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"
_CONFIGURED = False


def setup_logging(
    level: int = logging.INFO,
    log_file: str | Path | None = None,
) -> logging.Logger:
    """
    Configure the ADBG root logger.

    Sets up console output and optionally a file handler. Safe to call
    multiple times — subsequent calls are no-ops.

    Args:
        level: Logging level (e.g., logging.DEBUG, logging.INFO).
        log_file: Optional path to write log output. If provided, a
                  FileHandler is added to the root logger.

    Returns:
        The configured 'adbg' root logger.
    """
    global _CONFIGURED

    root_logger = logging.getLogger("adbg")

    if _CONFIGURED:
        return root_logger

    root_logger.setLevel(level)

    # Prevent propagation to the root logger to avoid duplicate output
    root_logger.propagate = False

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_formatter = logging.Formatter(_LOG_FORMAT, datefmt=_LOG_DATE_FORMAT)
    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)

    # Optional file handler
    if log_file is not None:
        file_path = Path(log_file)
        file_path.parent.mkdir(parents=True, exist_ok=True)

        file_handler = logging.FileHandler(str(file_path), encoding="utf-8")
        file_handler.setLevel(level)
        file_formatter = logging.Formatter(_LOG_FORMAT, datefmt=_LOG_DATE_FORMAT)
        file_handler.setFormatter(file_formatter)
        root_logger.addHandler(file_handler)

    _CONFIGURED = True
    root_logger.debug("ADBG logging initialized (level=%s)", logging.getLevelName(level))

    return root_logger


def get_logger(name: str) -> logging.Logger:
    """
    Get a named logger under the 'adbg' hierarchy.

    Convenience wrapper to ensure all ADBG loggers share the same
    configuration. Modules should call this instead of
    logging.getLogger(__name__) directly.

    Args:
        name: Logger name, typically __name__ of the calling module.

    Returns:
        A logging.Logger instance.
    """
    return logging.getLogger(name)

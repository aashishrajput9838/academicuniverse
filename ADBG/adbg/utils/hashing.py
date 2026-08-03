"""
ADBG Hashing Utilities — SHA-256 Checksums for Integrity Verification.

Provides deterministic hashing for files and byte buffers. Used by the
manifest builder to record checksums and by the validation CLI to verify
dataset integrity post-generation.
"""

from __future__ import annotations

import hashlib
from pathlib import Path


def sha256_bytes(data: bytes) -> str:
    """
    Compute the SHA-256 hex digest of a byte buffer.

    Args:
        data: Raw bytes to hash.

    Returns:
        Lowercase hex string of the SHA-256 digest (64 characters).
    """
    return hashlib.sha256(data).hexdigest()


def sha256_file(file_path: str | Path, chunk_size: int = 8192) -> str:
    """
    Compute the SHA-256 hex digest of a file by streaming.

    Reads the file in chunks to avoid loading large files into memory.

    Args:
        file_path: Path to the file to hash.
        chunk_size: Read buffer size in bytes. Default 8192.

    Returns:
        Lowercase hex string of the SHA-256 digest.

    Raises:
        FileNotFoundError: If the file does not exist.
        PermissionError: If the file cannot be read.
    """
    hasher = hashlib.sha256()
    path = Path(file_path)

    with path.open("rb") as f:
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            hasher.update(chunk)

    return hasher.hexdigest()


def sha256_string(text: str, encoding: str = "utf-8") -> str:
    """
    Compute the SHA-256 hex digest of a string.

    Args:
        text: String to hash.
        encoding: String encoding. Default 'utf-8'.

    Returns:
        Lowercase hex string of the SHA-256 digest.
    """
    return sha256_bytes(text.encode(encoding))

"""
Local file storage for API keys.

API keys are stored in a JSON file on the local filesystem,
separate from the database. This file should NOT be committed to git.
"""

import json
import os
import logging
from pathlib import Path
from typing import Optional, Dict
from threading import Lock

logger = logging.getLogger(__name__)

# Default storage path - use /app/data in Docker (volume mounted) or local path for dev
def get_storage_path_default() -> Path:
    # In Docker, use /app/data which is a persistent volume
    data_dir = Path("/app/data")
    if data_dir.exists():
        return data_dir / "api_keys.json"
    # For local development, use path relative to project
    return Path(__file__).parent.parent.parent / "api_keys.json"


DEFAULT_STORAGE_PATH = get_storage_path_default()

# Thread lock for file operations
_file_lock = Lock()


def _get_storage_path() -> Path:
    """Get the API keys storage file path."""
    path = Path(os.environ.get("API_KEYS_FILE", str(DEFAULT_STORAGE_PATH)))
    # Ensure parent directory exists
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def _load_all_keys() -> Dict[str, Dict[str, str]]:
    """Load all API keys from file."""
    path = _get_storage_path()
    if not path.exists():
        return {}

    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        logger.error(f"Failed to load API keys file: {e}")
        return {}


def _save_all_keys(data: Dict[str, Dict[str, str]]) -> bool:
    """Save all API keys to file."""
    path = _get_storage_path()
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        # Set restrictive permissions (owner read/write only)
        os.chmod(path, 0o600)
        return True
    except IOError as e:
        logger.error(f"Failed to save API keys file: {e}")
        return False


def get_user_api_keys(user_id: str) -> Dict[str, Optional[str]]:
    """
    Get API keys for a user.

    Returns dict with keys: openai, anthropic, google, deepseek, dashscope, serper
    Values are the decrypted API keys or None if not set.

    Note: For single-user local deployment, falls back to "default" keys if user-specific keys not found.
    """
    with _file_lock:
        all_keys = _load_all_keys()

        # Try user-specific keys first
        user_keys = all_keys.get(user_id, {})

        # If no user-specific keys, try "default" keys (for single-user local deployment)
        if not any(user_keys.values()):
            user_keys = all_keys.get("default", {})

        # Also check any other user's keys as fallback (for local single-user scenarios)
        if not any(user_keys.values()):
            for uid, keys in all_keys.items():
                if uid != "test-user-123" and any(keys.values()):
                    user_keys = keys
                    break

        return {
            "openai": user_keys.get("openai"),
            "anthropic": user_keys.get("anthropic"),
            "google": user_keys.get("google"),
            "deepseek": user_keys.get("deepseek"),
            "dashscope": user_keys.get("dashscope"),
            "serper": user_keys.get("serper"),
        }


def set_user_api_key(user_id: str, provider: str, api_key: Optional[str]) -> bool:
    """
    Set or update an API key for a user.

    Args:
        user_id: User ID
        provider: Provider name (openai, anthropic, google, deepseek, dashscope, serper)
        api_key: The API key to store, or None to remove

    Returns:
        True if successful, False otherwise
    """
    valid_providers = {"openai", "anthropic", "google", "deepseek", "dashscope", "serper"}
    if provider not in valid_providers:
        logger.error(f"Invalid provider: {provider}")
        return False

    with _file_lock:
        all_keys = _load_all_keys()

        if user_id not in all_keys:
            all_keys[user_id] = {}

        if api_key:
            all_keys[user_id][provider] = api_key
        elif provider in all_keys[user_id]:
            del all_keys[user_id][provider]

        return _save_all_keys(all_keys)


def set_user_api_keys(user_id: str, keys: Dict[str, Optional[str]]) -> bool:
    """
    Set multiple API keys for a user at once.

    Args:
        user_id: User ID
        keys: Dict of provider -> api_key mappings

    Returns:
        True if successful, False otherwise
    """
    with _file_lock:
        all_keys = _load_all_keys()

        if user_id not in all_keys:
            all_keys[user_id] = {}

        for provider, api_key in keys.items():
            if api_key:
                all_keys[user_id][provider] = api_key
            elif provider in all_keys[user_id]:
                del all_keys[user_id][provider]

        return _save_all_keys(all_keys)


def delete_user_api_keys(user_id: str) -> bool:
    """
    Delete all API keys for a user.

    Args:
        user_id: User ID

    Returns:
        True if successful, False otherwise
    """
    with _file_lock:
        all_keys = _load_all_keys()

        if user_id in all_keys:
            del all_keys[user_id]
            return _save_all_keys(all_keys)

        return True


def has_api_key(user_id: str, provider: str) -> bool:
    """Check if a user has an API key for a provider."""
    keys = get_user_api_keys(user_id)
    return bool(keys.get(provider))

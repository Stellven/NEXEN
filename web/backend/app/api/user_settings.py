"""
User settings API endpoints.

API keys are stored in a local file (not in database) for security.
Other settings (default_model, theme, language) are stored in database.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import User, UserSettings
from app.auth.deps import get_current_active_user
from app.services.api_key_storage import (
    get_user_api_keys as get_file_api_keys,
    set_user_api_key,
    has_api_key,
)

router = APIRouter()


# ============================================================================
# Request/Response Models
# ============================================================================

class SettingsResponse(BaseModel):
    """User settings with masked API keys."""
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    google_api_key: Optional[str] = None
    deepseek_api_key: Optional[str] = None
    dashscope_api_key: Optional[str] = None
    serper_api_key: Optional[str] = None
    default_model: str
    theme: str
    language: str
    has_openai: bool
    has_anthropic: bool
    has_google: bool
    has_deepseek: bool
    has_dashscope: bool
    has_serper: bool


class UpdateSettingsRequest(BaseModel):
    """Request to update settings."""
    openai_api_key: Optional[str] = Field(None, description="OpenAI API key (empty to clear)")
    anthropic_api_key: Optional[str] = Field(None, description="Anthropic API key")
    google_api_key: Optional[str] = Field(None, description="Google API key")
    deepseek_api_key: Optional[str] = Field(None, description="DeepSeek API key")
    dashscope_api_key: Optional[str] = Field(None, description="DashScope (Qwen) API key")
    serper_api_key: Optional[str] = Field(None, description="Serper API key for web search")
    default_model: Optional[str] = Field(None, description="Default model to use")
    theme: Optional[str] = Field(None, description="UI theme (dark/light)")
    language: Optional[str] = Field(None, description="Language preference")


class APIKeyTestRequest(BaseModel):
    """Request to test an API key."""
    provider: str = Field(..., description="Provider: openai, anthropic, or google")
    api_key: str = Field(..., description="API key to test")


class APIKeyTestResponse(BaseModel):
    """Result of API key test."""
    provider: str
    valid: bool
    error: Optional[str] = None


# ============================================================================
# Endpoints
# ============================================================================

@router.get("", response_model=SettingsResponse)
async def get_settings(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get current user settings."""
    # Get non-sensitive settings from database
    settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()

    if not settings:
        # Create default settings if not exists
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)

    # Get API keys from file storage
    api_keys = get_file_api_keys(current_user.id)

    return SettingsResponse(
        openai_api_key=mask_key(api_keys.get("openai")),
        anthropic_api_key=mask_key(api_keys.get("anthropic")),
        google_api_key=mask_key(api_keys.get("google")),
        deepseek_api_key=mask_key(api_keys.get("deepseek")),
        dashscope_api_key=mask_key(api_keys.get("dashscope")),
        serper_api_key=mask_key(api_keys.get("serper")),
        default_model=settings.default_model,
        theme=settings.theme,
        language=settings.language,
        has_openai=bool(api_keys.get("openai")),
        has_anthropic=bool(api_keys.get("anthropic")),
        has_google=bool(api_keys.get("google")),
        has_deepseek=bool(api_keys.get("deepseek")),
        has_dashscope=bool(api_keys.get("dashscope")),
        has_serper=bool(api_keys.get("serper")),
    )


@router.put("", response_model=SettingsResponse)
async def update_settings(
    request: UpdateSettingsRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Update user settings."""
    settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()

    if not settings:
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)

    # Update API keys in file storage (not database)
    if request.openai_api_key is not None:
        set_user_api_key(current_user.id, "openai", request.openai_api_key or None)

    if request.anthropic_api_key is not None:
        set_user_api_key(current_user.id, "anthropic", request.anthropic_api_key or None)

    if request.google_api_key is not None:
        set_user_api_key(current_user.id, "google", request.google_api_key or None)

    if request.deepseek_api_key is not None:
        set_user_api_key(current_user.id, "deepseek", request.deepseek_api_key or None)

    if request.dashscope_api_key is not None:
        set_user_api_key(current_user.id, "dashscope", request.dashscope_api_key or None)

    if request.serper_api_key is not None:
        set_user_api_key(current_user.id, "serper", request.serper_api_key or None)

    # Update non-sensitive preferences in database
    if request.default_model is not None:
        settings.default_model = request.default_model

    if request.theme is not None:
        settings.theme = request.theme

    if request.language is not None:
        settings.language = request.language

    db.commit()
    db.refresh(settings)

    # Get updated API keys from file storage
    api_keys = get_file_api_keys(current_user.id)

    return SettingsResponse(
        openai_api_key=mask_key(api_keys.get("openai")),
        anthropic_api_key=mask_key(api_keys.get("anthropic")),
        google_api_key=mask_key(api_keys.get("google")),
        deepseek_api_key=mask_key(api_keys.get("deepseek")),
        dashscope_api_key=mask_key(api_keys.get("dashscope")),
        serper_api_key=mask_key(api_keys.get("serper")),
        default_model=settings.default_model,
        theme=settings.theme,
        language=settings.language,
        has_openai=bool(api_keys.get("openai")),
        has_anthropic=bool(api_keys.get("anthropic")),
        has_google=bool(api_keys.get("google")),
        has_deepseek=bool(api_keys.get("deepseek")),
        has_dashscope=bool(api_keys.get("dashscope")),
        has_serper=bool(api_keys.get("serper")),
    )


@router.post("/test-key", response_model=APIKeyTestResponse)
async def test_api_key(
    request: APIKeyTestRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Test if an API key is valid."""
    import litellm

    provider = request.provider.lower()

    # Map provider to model for testing
    test_models = {
        "openai": "openai/gpt-4o-mini",
        "anthropic": "anthropic/claude-3-5-haiku-20241022",
        "google": "google/gemini-2.0-flash",
        "deepseek": "deepseek/deepseek-chat",
        "dashscope": "qwen/qwen-turbo",
    }

    if provider not in test_models:
        return APIKeyTestResponse(
            provider=provider,
            valid=False,
            error=f"Unknown provider: {provider}",
        )

    try:
        # Set API key temporarily
        if provider == "openai":
            litellm.api_key = request.api_key
        elif provider == "anthropic":
            litellm.anthropic_key = request.api_key
        elif provider == "google":
            litellm.google_key = request.api_key

        # Make a minimal test call
        response = await litellm.acompletion(
            model=test_models[provider],
            messages=[{"role": "user", "content": "Hi"}],
            max_tokens=5,
        )

        return APIKeyTestResponse(provider=provider, valid=True)

    except Exception as e:
        return APIKeyTestResponse(
            provider=provider,
            valid=False,
            error=str(e),
        )


def mask_key(key: Optional[str]) -> Optional[str]:
    """Mask API key for display."""
    if not key:
        return None
    if len(key) <= 8:
        return "****"
    return key[:4] + "****" + key[-4:]


def get_user_api_keys(user_id: str, db: Session = None) -> dict[str, str]:
    """
    Get API keys for a user from file storage.

    Note: db parameter is kept for backward compatibility but not used.
    """
    api_keys = get_file_api_keys(user_id)
    return {k: v for k, v in api_keys.items() if v}

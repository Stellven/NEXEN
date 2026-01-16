"""
User settings API endpoints.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import User, UserSettings
from app.auth.deps import get_current_active_user
from app.auth.security import encrypt_api_key, decrypt_api_key

router = APIRouter()


# ============================================================================
# Request/Response Models
# ============================================================================

class SettingsResponse(BaseModel):
    """User settings with masked API keys."""
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    google_api_key: Optional[str] = None
    default_model: str
    theme: str
    language: str
    has_openai: bool
    has_anthropic: bool
    has_google: bool


class UpdateSettingsRequest(BaseModel):
    """Request to update settings."""
    openai_api_key: Optional[str] = Field(None, description="OpenAI API key (empty to clear)")
    anthropic_api_key: Optional[str] = Field(None, description="Anthropic API key")
    google_api_key: Optional[str] = Field(None, description="Google API key")
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
    settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    
    if not settings:
        # Create default settings if not exists
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    return SettingsResponse(
        openai_api_key=mask_key(decrypt_api_key(settings.openai_api_key or "")),
        anthropic_api_key=mask_key(decrypt_api_key(settings.anthropic_api_key or "")),
        google_api_key=mask_key(decrypt_api_key(settings.google_api_key or "")),
        default_model=settings.default_model,
        theme=settings.theme,
        language=settings.language,
        has_openai=bool(settings.openai_api_key),
        has_anthropic=bool(settings.anthropic_api_key),
        has_google=bool(settings.google_api_key),
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
    
    # Update API keys (encrypt before storing)
    if request.openai_api_key is not None:
        settings.openai_api_key = encrypt_api_key(request.openai_api_key) if request.openai_api_key else None
    
    if request.anthropic_api_key is not None:
        settings.anthropic_api_key = encrypt_api_key(request.anthropic_api_key) if request.anthropic_api_key else None
    
    if request.google_api_key is not None:
        settings.google_api_key = encrypt_api_key(request.google_api_key) if request.google_api_key else None
    
    # Update preferences
    if request.default_model is not None:
        settings.default_model = request.default_model
    
    if request.theme is not None:
        settings.theme = request.theme
    
    if request.language is not None:
        settings.language = request.language
    
    db.commit()
    db.refresh(settings)
    
    return SettingsResponse(
        openai_api_key=mask_key(decrypt_api_key(settings.openai_api_key or "")),
        anthropic_api_key=mask_key(decrypt_api_key(settings.anthropic_api_key or "")),
        google_api_key=mask_key(decrypt_api_key(settings.google_api_key or "")),
        default_model=settings.default_model,
        theme=settings.theme,
        language=settings.language,
        has_openai=bool(settings.openai_api_key),
        has_anthropic=bool(settings.anthropic_api_key),
        has_google=bool(settings.google_api_key),
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
        "anthropic": "anthropic/claude-3-haiku-20240307",
        "google": "google/gemini-2.0-flash",
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


def get_user_api_keys(user_id: str, db: Session) -> dict[str, str]:
    """Get decrypted API keys for a user."""
    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    
    if not settings:
        return {}
    
    keys = {}
    if settings.openai_api_key:
        keys["openai"] = decrypt_api_key(settings.openai_api_key)
    if settings.anthropic_api_key:
        keys["anthropic"] = decrypt_api_key(settings.anthropic_api_key)
    if settings.google_api_key:
        keys["google"] = decrypt_api_key(settings.google_api_key)
    
    return keys

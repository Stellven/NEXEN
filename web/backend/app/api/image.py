"""
AI Image API - Image Generation (DALL-E) and Analysis (GPT-4 Vision)
"""

import json
import base64
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import User, ImageGeneration, UserSettings
from app.auth.deps import get_current_active_user
from app.auth.security import decrypt_api_key

router = APIRouter()


# =============================================================================
# Pydantic Models
# =============================================================================

class ImageGenerateRequest(BaseModel):
    """Request model for image generation."""
    prompt: str = Field(..., min_length=1, max_length=4000)
    negative_prompt: Optional[str] = Field(None, max_length=1000)
    model: str = Field(default="dall-e-3")
    size: str = Field(default="1024x1024")  # 1024x1024, 1024x1792, 1792x1024
    style: str = Field(default="vivid")  # vivid, natural
    quality: str = Field(default="standard")  # standard, hd


class ImageAnalyzeRequest(BaseModel):
    """Request model for image analysis."""
    image_url: Optional[str] = None
    image_data: Optional[str] = None  # Base64 encoded
    prompt: str = Field(default="Describe this image in detail")
    model: str = Field(default="gpt-4o")


class ImageGenerationResponse(BaseModel):
    """Response model for image generation."""
    id: str
    prompt: str
    negative_prompt: Optional[str]
    model: str
    image_url: Optional[str]
    width: int
    height: int
    style: Optional[str]
    quality: Optional[str]
    status: str
    error_message: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ImageGenerationListResponse(BaseModel):
    """Response model for listing generations."""
    generations: List[ImageGenerationResponse]
    total: int


class ImageModel(BaseModel):
    """Image model info."""
    id: str
    name: str
    provider: str
    type: str  # generation, analysis
    sizes: Optional[List[str]] = None


class ImageModelsResponse(BaseModel):
    """Response model for available models."""
    generation_models: List[ImageModel]
    analysis_models: List[ImageModel]


# =============================================================================
# Constants
# =============================================================================

GENERATION_MODELS = [
    ImageModel(
        id="dall-e-3",
        name="DALL-E 3",
        provider="OpenAI",
        type="generation",
        sizes=["1024x1024", "1024x1792", "1792x1024"]
    ),
    ImageModel(
        id="dall-e-2",
        name="DALL-E 2",
        provider="OpenAI",
        type="generation",
        sizes=["256x256", "512x512", "1024x1024"]
    ),
]

ANALYSIS_MODELS = [
    ImageModel(id="gpt-4o", name="GPT-4o", provider="OpenAI", type="analysis"),
    ImageModel(id="gpt-4o-mini", name="GPT-4o Mini", provider="OpenAI", type="analysis"),
    ImageModel(id="claude-3-5-sonnet-20241022", name="Claude 3.5 Sonnet", provider="Anthropic", type="analysis"),
]


# =============================================================================
# Helper Functions
# =============================================================================

def get_user_openai_key(user_id: str, db: Session) -> Optional[str]:
    """Get user's OpenAI API key."""
    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    if settings and settings.openai_api_key:
        return decrypt_api_key(settings.openai_api_key)
    return None


def get_user_anthropic_key(user_id: str, db: Session) -> Optional[str]:
    """Get user's Anthropic API key."""
    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    if settings and settings.anthropic_api_key:
        return decrypt_api_key(settings.anthropic_api_key)
    return None


def parse_size(size: str) -> tuple[int, int]:
    """Parse size string to width and height."""
    parts = size.split("x")
    if len(parts) == 2:
        return int(parts[0]), int(parts[1])
    return 1024, 1024


# =============================================================================
# Endpoints
# =============================================================================

@router.get("/models", response_model=ImageModelsResponse)
async def get_models():
    """Get available image models."""
    return ImageModelsResponse(
        generation_models=GENERATION_MODELS,
        analysis_models=ANALYSIS_MODELS
    )


@router.post("/generate", response_model=ImageGenerationResponse)
async def generate_image(
    request: ImageGenerateRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Generate an image using DALL-E."""

    # Get API key
    api_key = get_user_openai_key(current_user.id, db)
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="OpenAI API key not configured. Please add your API key in settings."
        )

    # Parse size
    width, height = parse_size(request.size)

    # Create generation record
    generation = ImageGeneration(
        user_id=current_user.id,
        prompt=request.prompt,
        negative_prompt=request.negative_prompt,
        model=request.model,
        width=width,
        height=height,
        style=request.style,
        quality=request.quality,
        status="generating",
    )
    db.add(generation)
    db.commit()
    db.refresh(generation)

    try:
        import openai
        client = openai.OpenAI(api_key=api_key)

        # Call DALL-E API
        response = client.images.generate(
            model=request.model,
            prompt=request.prompt,
            size=request.size,
            style=request.style,
            quality=request.quality,
            n=1,
        )

        # Update generation record
        generation.image_url = response.data[0].url
        generation.status = "completed"
        db.commit()
        db.refresh(generation)

    except openai.BadRequestError as e:
        generation.status = "failed"
        generation.error_message = str(e)
        db.commit()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        generation.status = "failed"
        generation.error_message = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")

    return ImageGenerationResponse.model_validate(generation)


@router.post("/analyze")
async def analyze_image(
    request: ImageAnalyzeRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Analyze an image using GPT-4 Vision (streaming response)."""

    # Validate input
    if not request.image_url and not request.image_data:
        raise HTTPException(
            status_code=400,
            detail="Either image_url or image_data must be provided"
        )

    # Determine which API to use based on model
    if request.model.startswith("claude"):
        api_key = get_user_anthropic_key(current_user.id, db)
        if not api_key:
            raise HTTPException(
                status_code=400,
                detail="Anthropic API key not configured. Please add your API key in settings."
            )
    else:
        api_key = get_user_openai_key(current_user.id, db)
        if not api_key:
            raise HTTPException(
                status_code=400,
                detail="OpenAI API key not configured. Please add your API key in settings."
            )

    # Prepare image content
    if request.image_url:
        image_content = {"type": "image_url", "image_url": {"url": request.image_url}}
    else:
        image_content = {
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{request.image_data}"}
        }

    async def generate_analysis():
        try:
            if request.model.startswith("claude"):
                # Use Anthropic API
                import anthropic
                client = anthropic.Anthropic(api_key=api_key)

                # Prepare message for Claude
                if request.image_url:
                    image_source = {
                        "type": "url",
                        "url": request.image_url
                    }
                else:
                    image_source = {
                        "type": "base64",
                        "media_type": "image/jpeg",
                        "data": request.image_data
                    }

                with client.messages.stream(
                    model=request.model,
                    max_tokens=2000,
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "image", "source": image_source},
                                {"type": "text", "text": request.prompt}
                            ]
                        }
                    ]
                ) as stream:
                    for text in stream.text_stream:
                        yield f"data: {json.dumps({'content': text})}\n\n"
            else:
                # Use OpenAI API
                import openai
                client = openai.OpenAI(api_key=api_key)

                messages = [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": request.prompt},
                            image_content
                        ]
                    }
                ]

                stream = client.chat.completions.create(
                    model=request.model,
                    messages=messages,
                    max_tokens=2000,
                    stream=True,
                )

                for chunk in stream:
                    if chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        yield f"data: {json.dumps({'content': content})}\n\n"

            yield f"data: {json.dumps({'done': True})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        generate_analysis(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@router.post("/analyze-upload")
async def analyze_uploaded_image(
    file: UploadFile = File(...),
    prompt: str = Form(default="Describe this image in detail"),
    model: str = Form(default="gpt-4o"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Analyze an uploaded image using GPT-4 Vision (streaming response)."""

    # Read and encode file
    content = await file.read()
    image_data = base64.b64encode(content).decode("utf-8")

    # Determine media type
    media_type = file.content_type or "image/jpeg"

    # Get API key
    if model.startswith("claude"):
        api_key = get_user_anthropic_key(current_user.id, db)
        if not api_key:
            raise HTTPException(
                status_code=400,
                detail="Anthropic API key not configured."
            )
    else:
        api_key = get_user_openai_key(current_user.id, db)
        if not api_key:
            raise HTTPException(
                status_code=400,
                detail="OpenAI API key not configured."
            )

    async def generate_analysis():
        try:
            if model.startswith("claude"):
                import anthropic
                client = anthropic.Anthropic(api_key=api_key)

                with client.messages.stream(
                    model=model,
                    max_tokens=2000,
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "image",
                                    "source": {
                                        "type": "base64",
                                        "media_type": media_type,
                                        "data": image_data
                                    }
                                },
                                {"type": "text", "text": prompt}
                            ]
                        }
                    ]
                ) as stream:
                    for text in stream.text_stream:
                        yield f"data: {json.dumps({'content': text})}\n\n"
            else:
                import openai
                client = openai.OpenAI(api_key=api_key)

                stream = client.chat.completions.create(
                    model=model,
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:{media_type};base64,{image_data}"
                                    }
                                }
                            ]
                        }
                    ],
                    max_tokens=2000,
                    stream=True,
                )

                for chunk in stream:
                    if chunk.choices[0].delta.content:
                        yield f"data: {json.dumps({'content': chunk.choices[0].delta.content})}\n\n"

            yield f"data: {json.dumps({'done': True})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        generate_analysis(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@router.get("/generations", response_model=ImageGenerationListResponse)
async def get_generations(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get user's image generations."""

    query = db.query(ImageGeneration).filter(
        ImageGeneration.user_id == current_user.id
    ).order_by(ImageGeneration.created_at.desc())

    total = query.count()
    generations = query.offset(skip).limit(limit).all()

    return ImageGenerationListResponse(
        generations=[ImageGenerationResponse.model_validate(g) for g in generations],
        total=total
    )


@router.get("/generations/{generation_id}", response_model=ImageGenerationResponse)
async def get_generation(
    generation_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get a specific image generation."""

    generation = db.query(ImageGeneration).filter(
        ImageGeneration.id == generation_id,
        ImageGeneration.user_id == current_user.id
    ).first()

    if not generation:
        raise HTTPException(status_code=404, detail="Generation not found")

    return ImageGenerationResponse.model_validate(generation)


@router.delete("/generations/{generation_id}")
async def delete_generation(
    generation_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Delete an image generation."""

    generation = db.query(ImageGeneration).filter(
        ImageGeneration.id == generation_id,
        ImageGeneration.user_id == current_user.id
    ).first()

    if not generation:
        raise HTTPException(status_code=404, detail="Generation not found")

    db.delete(generation)
    db.commit()

    return {"message": "Generation deleted successfully"}

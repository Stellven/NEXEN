FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir \
    fastapi>=0.115.0 \
    uvicorn[standard]>=0.32.0 \
    python-multipart>=0.0.12 \
    websockets>=13.0 \
    sqlalchemy>=2.0.0 \
    pydantic>=2.9.0 \
    pydantic-settings>=2.6.0 \
    python-jose[cryptography]>=3.3.0 \
    passlib[bcrypt]>=1.7.4 \
    litellm>=1.50.0 \
    pyyaml>=6.0 \
    email-validator>=2.0.0 \
    openai>=1.0.0 \
    qdrant-client>=1.12.0 \
    PyMuPDF>=1.23.0 \
    python-docx>=1.1.0 \
    trafilatura>=1.6.0 \
    tiktoken>=0.5.0 \
    aiofiles>=23.0.0

# Copy NEXEN core library
COPY nexen /app/nexen

# Copy application code
COPY web/backend/app /app/app

# Create directories
RUN mkdir -p /app/research_workspace /app/data

# Set Python path
ENV PYTHONPATH=/app

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

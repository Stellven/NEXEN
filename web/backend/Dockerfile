FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY pyproject.toml .

# Install Python dependencies
RUN pip install --no-cache-dir build && \
    pip install --no-cache-dir .

# Copy application code
COPY app/ ./app/

# Copy NEXEN core (mounted as volume in docker-compose)
# COPY ../../nexen ./nexen

# Create workspace directory
RUN mkdir -p /app/research_workspace

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

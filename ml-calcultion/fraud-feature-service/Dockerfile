# Use Python 3.10
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system deps (important for some ML libs)
RUN apt-get update && apt-get install -y \
    gcc \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (for caching)
COPY requirements.txt .

# Install Python deps
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

# Expose correct port (change per service)
EXPOSE 8002

# Run FastAPI
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"]

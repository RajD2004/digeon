# Dockerfile.app
FROM python:3.11-slim

WORKDIR /app

# System deps (optional but handy for timezones, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    tzdata && \
    rm -rf /var/lib/apt/lists/*

# Copy and install deps first (better layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

# Gunicorn for production
ENV PORT=5000
EXPOSE 5000

# Default: run the WSGI app
CMD ["gunicorn", "-w", "2", "-b", "0.0.0.0:5000", "wsgi:app"]


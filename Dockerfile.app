# Dockerfile.app  (production-ready)
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

WORKDIR /app
COPY requirements.txt /tmp/requirements.txt
RUN pip install --upgrade pip && pip install -r /tmp/requirements.txt && rm -rf /root/.cache/pip

# Copy entire project (expects folder "digeon/" containing app.py, templates/, static/)
COPY . /app

# Ensure a wsgi entrypoint that imports from the subfolder
RUN python - <<'PY'
import pathlib
p = pathlib.Path('wsgi.py')
if not p.exists():
    p.write_text('from digeon.app import app as app\n')
print('wsgi.py ensured')
PY

EXPOSE 8000
CMD ["gunicorn", "-b", "0.0.0.0:8000", "wsgi:app"]

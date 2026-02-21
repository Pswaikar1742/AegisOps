FROM python:3.10-slim

EXPOSE 8000

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/

ENTRYPOINT ["gunicorn", "--bind", "0.0.0.0:8000", "src.app:app"]

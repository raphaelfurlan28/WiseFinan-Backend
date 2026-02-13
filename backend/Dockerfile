# Use official Python image
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Copy requirements file (if exists in backend folder, adjust relative path)
# We assume context is 'backend' folder
COPY requirements.txt .

# Install dependencies  
# Add gunicorn explicitly here since it might not be in requirements.txt yet
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy application code
COPY . .

# Copy service account json (Important: Handle this securely in prod, but for direct deploy it works)
# We need to go up one level to find it usually, but in Docker context 'backend' is root.
# Expecting service_account.json to be COPIED in if it is essential.
# If it is in root, we need to handle context correctly.

# Expose port
EXPOSE 8080

# Environment variables
ENV PORT=8080
ENV PYTHONUNBUFFERED=1

# Command to run the application using Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "1", "--threads", "4", "--timeout", "120", "app:app"]

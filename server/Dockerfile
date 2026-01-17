# Use official Python image
FROM python:3.9-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install necessary system packages (minimal set)
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    portaudio19-dev \
    ffmpeg \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Update setuptools and pkg_resources
RUN pip install --upgrade setuptools 

# Copy the rest of the application code
COPY . /app/

# Expose the backend port
EXPOSE 5002

# Command to run the backend
#CMD ["gunicorn", "--bind", "0.0.0.0:5002", "app:app"]
ENV FLASK_APP=app.py
ENV FLASK_RUN_PORT=5002
ENV FLASK_ENV=development  
CMD ["python", "app.py"]


# CMD ["flask", "run", "--host=0.0.0.0", "--port=5002","--debug"]
# CMD ["gunicorn", "--bind", "0.0.0.0:5002", "app:app", "-k", "eventlet", "--log-level=debug"]
# CMD ["gunicorn", "--worker-class", "eventlet", "--bind", "0.0.0.0:5002", "app:app"]
# Update the CMD to use multiple workers
# CMD ["gunicorn", \
#     "--worker-class", "eventlet", \
#     "--workers", "2", \       
#     "--threads", "1", \       
#     "--bind", "0.0.0.0:5002", \
#     "--log-level", "info", \   
#     "app:app"]

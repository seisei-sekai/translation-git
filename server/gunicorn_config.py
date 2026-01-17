import multiprocessing
import os

# Bind address
bind = "0.0.0.0:5002"

# Worker configuration
worker_class = "eventlet"
workers = multiprocessing.cpu_count() * 2 + 1
threads = 1000  # Number of threads per worker

# For handling 10,000 users with WebSocket connections
worker_connections = 10000

# Timeout configuration
timeout = 300
keepalive = 2

# Logging
accesslog = "/var/log/gunicorn/access.log"
errorlog = "/var/log/gunicorn/error.log"
loglevel = "info"

# Process naming
proc_name = "gunicorn_realtime_transcription"

# SSL configuration (if needed)
# keyfile = "192.168.50.202-key.pem"
# certfile = "192.168.50.202.pem"

# Performance tuning
worker_tmp_dir = "/dev/shm"  # Use RAM for temporary files
max_requests = 1000  # Restart workers after this many requests
max_requests_jitter = 100  # Add randomness to max_requests

# Debug configuration
reload = os.getenv("FLASK_ENV") == "development"
preload_app = True

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None

def post_fork(server, worker):
    server.log.info("Worker spawned (pid: %s)", worker.pid)

def pre_fork(server, worker):
    pass

def pre_exec(server):
    server.log.info("Forked child, re-executing.")

def when_ready(server):
    server.log.info("Server is ready. Spawning workers")

def worker_int(worker):
    worker.log.info("worker received INT or QUIT signal")

def worker_abort(worker):
    worker.log.info("worker received SIGABRT signal")
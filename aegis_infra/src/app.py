from flask import Flask, jsonify
import threading
import time
import uuid
import requests
import psutil
from datetime import datetime, timezone
import math

app = Flask(__name__)

# Global list to accumulate memory
memory_hog = []

# Flag to control daemon thread
memory_monitor_running = True


def calculate_factorial_infinite():
    """Infinite loop calculating factorials to max out CPU."""
    n = 0
    while True:
        math.factorial(n)
        n += 1


def memory_monitor():
    """Daemon thread that monitors memory and sends webhook alerts."""
    while memory_monitor_running:
        try:
            memory_percent = psutil.virtual_memory().percent
            if memory_percent > 85:
                payload = {
                    "incident_id": str(uuid.uuid4()),
                    "container_name": "buggy-app-v2",
                    "alert_type": "Memory Leak",
                    "severity": "CRITICAL",
                    "logs": f"Memory usage at {memory_percent}%. Potential OOM imminent.",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                try:
                    requests.post("http://aegis-agent:8001/webhook", json=payload, timeout=5)
                except Exception as e:
                    print(f"Webhook send failed: {e}")
        except Exception as e:
            print(f"Memory monitor error: {e}")
        
        time.sleep(2)


@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"}), 200


@app.route('/trigger_memory', methods=['GET'])
def trigger_memory():
    """Appends 10MB of random strings to memory_hog list."""
    try:
        # Create 10MB of random string data
        random_data = 'x' * (10 * 1024 * 1024)
        memory_hog.append(random_data)
        return jsonify({"message": "Memory trigger activated", "current_memory_usage_mb": len(memory_hog) * 10}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/trigger_cpu', methods=['GET'])
def trigger_cpu():
    """Starts a background thread that infinite loop calculates factorials."""
    try:
        cpu_thread = threading.Thread(target=calculate_factorial_infinite, daemon=True)
        cpu_thread.start()
        return jsonify({"message": "CPU trigger activated - factorial thread started"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/trigger_db_latency', methods=['GET'])
def trigger_db_latency():
    """Forces a 5 second sleep to simulate DB lock."""
    try:
        time.sleep(5)
        return jsonify({"message": "DB latency simulation completed"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.before_request
def start_memory_monitor():
    """Start memory monitor daemon thread on first request."""
    if not hasattr(app, 'memory_monitor_started'):
        monitor_thread = threading.Thread(target=memory_monitor, daemon=True)
        monitor_thread.start()
        app.memory_monitor_started = True


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=False)

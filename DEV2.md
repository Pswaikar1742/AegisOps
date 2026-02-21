🧱 Master Prompt for A (Dev 2 - Infrastructure & Triggers)

Instruct A to paste this into his AI Studio:

    "Act as a Senior DevOps Engineer. I am building the Infrastructure Layer for a hackathon project called 'AegisOps'. I am working on a Windows machine with an RTX 4060.

    My Role: Build a 'Buggy App' simulation and the Docker orchestration.
    The Goal: Create a containerized Python app that I can intentionally crash via API endpoints to test an AI Agent.

    Strict Technical Requirements (Do not deviate):

        The App: Create a Flask app (buggy_app_v2/app.py) running on Port 8000.

        The Triggers: Implement exactly these 3 GET endpoints:

            /trigger_memory: Appends 10MB strings to a global list every time it's hit until memory maxes out.

            /trigger_cpu: Starts a background thread calculating factorials in an infinite loop.

            /trigger_db_latency: Forces the next request to sleep for 5 seconds (simulating DB lock).

        The Health Check: A /health endpoint that returns JSON {"status": "ok"} (Critical for the Agent's verification loop).

        Docker: Generate a Dockerfile for this app and a docker-compose.yaml.

            Container Name: Must be exactly buggy-app-v2.

            Network: Use a bridge network called aegis-network.

        OpenTelemetry (Mock): Since setting up a full Collector is hard on Windows in 1 hour, write a simple Python function inside the app that monitors psutil.virtual_memory(). If memory > 85%, send a HTTP POST webhook payload to http://aegis-agent:8001/webhook.

    The Webhook Payload Schema (Must match the Backend):
    code JSON

    {
      "incident_id": "uuid-v4",
      "container_name": "buggy-app-v2",
      "alert_type": "Memory Leak",
      "severity": "CRITICAL",
      "logs": "Memory usage at 95%. Potential OOM imminent.",
      "timestamp": "ISO-8601-String"
    }

    Generate the code for app.py, Dockerfile, requirements.txt, and docker-compose.yaml now."
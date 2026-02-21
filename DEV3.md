🎨 Master Prompt for S (Dev 3 - UI/Dashboard)

Instruct S to paste this into his AI Studio:

    "Act as a Senior Frontend Developer. I am building the Mission Control Dashboard for a hackathon project called 'AegisOps'.

    My Role: Build a real-time Streamlit dashboard that visualizes an AI Agent fixing server crashes.
    The Goal: A dark-mode, sci-fi style interface that polls the backend API for status updates.

    Strict Technical Requirements (Do not deviate):

        Tech Stack: Python Streamlit.

        Visual Flow: I need a main dashboard that updates every 2 seconds. It should show:

            System Status: Big Green 'ONLINE' or Big Red 'CRITICAL'.

            Live Feed: A list of recent incidents.

        Data Source (The Switch):

            Create a variable USE_MOCK_DATA = True.

            If True: Display a fake hardcoded incident (Memory Leak -> AI Diagnosing -> Restarting -> Resolved).

            If False: Make a GET request to http://localhost:8001/incidents.

        The JSON Schema: The backend will return this list:

    code JSON

    [
      {
        "id": "123",
        "timestamp": "12:00:01",
        "issue": "Memory Leak",
        "status": "RESOLVED",
        "ai_action": "Restarted Container",
        "downtime": "8s"
      }
    ]

        Bonus Feature: Add a Sidebar called 'Aegis Knowledge Base' that displays a static JSON list of 'Learned Fixes'.

    Generate the dashboard.py and requirements.txt code now. Make it look professional (Dark theme, emojis for status)."
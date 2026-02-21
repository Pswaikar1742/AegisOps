📋 Step 3: Phase-Wise Task List (Your 4-Hour Sprint)

Do not try to build everything at once. Execute in these phases:
Phase 1: The Skeleton & Dependencies (1:30 PM - 2:00 PM)

    Fill aegis_core/requirements.txt:
    code Text

    fastapi
    uvicorn
    pydantic
    google-generativeai
    python-dotenv
    docker
    requests
    httpx

    Install: pip install -r aegis_core/requirements.txt.

    Setup .env: Add GEMINI_API_KEY=....

    Build main.py: Create the basic FastAPI app with a /health endpoint and a dummy /webhook that just prints the received JSON.

Phase 2: The Brain Integration (2:00 PM - 3:00 PM)

    Open ai_brain.py: Use Copilot.

        Prompt: "Write a function analyze_logs(logs: str) using google.generativeai. Configure the model to output JSON mode. System prompt: 'You are an SRE. Analyze logs. Return JSON with root_cause, action, justification.'"

    Test it: Write a small script to send a fake log string to this function and ensure Gemini returns valid JSON.

Phase 3: The Hands (Docker Control) (3:00 PM - 3:45 PM)

    Open docker_ops.py: Use Copilot.

        Prompt: "Write a function restart_container(container_name: str). Use the python docker library. It must connect to the local Docker socket. Add a safety check: only allow restarting if name == 'buggy-app-v2'."

    Test it: Spin up a dummy nginx container named buggy-app-v2 and see if your script can restart it.

Phase 4: The Verification Loop (3:45 PM - 4:30 PM)

    Open verification.py:

        Prompt: "Write an async function verify_recovery(container_url: str). Sleep for 5 seconds. Try GET request. Return True if 200 OK, else False."

    Wire it all together in main.py:

        Update /webhook: Receive JSON -> Call Brain -> If Restart -> Call Hands -> Call Verification -> Return Result.

Phase 5: The Bonus (Runbook) (4:30 PM - 5:00 PM)

    Open main.py:

        Add logic: if verification_success: append_to_runbook(diagnosis).

    Update ai_brain.py:

        Load runbook.json at the start. Add it to the Gemini system prompt: "Here are past resolved incidents to help you decide..."
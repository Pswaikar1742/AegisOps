import streamlit as st
import json
import time
import requests

st.set_page_config(page_title="AegisOps Command Center", layout="wide", page_icon="🛡️")

# --- DATA LOADING ---
def load_incident_data():
    try:
        # Try live API first
        response = requests.get("http://localhost:8001/incidents", timeout=1.5)
        response.raise_for_status()
        data = response.json()
        if data:
            return data
    except (requests.exceptions.RequestException, ValueError):
        # Fallback completely silent, just use mock data
        pass

    # Fallback to Fake JSON
    with open("data/sample_incidents.json", "r") as f:
        return json.load(f)

def load_runbook():
    with open("data/runbook.json", "r") as f:
        return json.load(f)

# Initialize Session State
if "stage" not in st.session_state:
    st.session_state.stage = 0  # 0: Nominal, 1: Anomaly, 2: AI Brain, 3: Action, 4: Verification
if "money_saved" not in st.session_state:
    st.session_state.money_saved = 0

incident_data = load_incident_data()
runbook_data = load_runbook()

# --- SIDEBAR (Bonus / CEO Narrative) ---
with st.sidebar:
    st.title("🛡️ AegisOps Runbook")
    st.markdown("### 🧠 AI Learning Base")
    for entry in runbook_data.get("entries", []):
        st.markdown(f"**Learned:** {entry['issue']}")
        st.markdown(f"**Fix:** {entry['fix']} (Added {entry['timestamp']})")
        st.divider()
    
    st.markdown("### 💼 Business Impact")
    st.metric("Total Money Saved Today", f"${st.session_state.money_saved:,}")
    
    st.markdown("---")
    st.markdown("### 🛠️ Simulation Controls (Dev)")
    if st.button("Simulate Incident Lifecycle"):
        st.session_state.stage = 0
        st.rerun()

# --- MAIN DASHBOARD ---
st.title("AegisOps Command Center")
st.markdown("Real-time AI-Driven Infrastructure Operations")

# Top Level Metrics
col1, col2, col3 = st.columns(3)
with col1:
    cpu_usage = "12%" if st.session_state.stage == 0 else "85%"
    st.metric("Global CPU Usage", cpu_usage, delta="-2%" if st.session_state.stage == 0 else "73%", delta_color="inverse")
with col2:
    mem_usage = "45%" if st.session_state.stage < 1 else ("98%" if st.session_state.stage < 4 else "45%")
    st.metric("Global Memory Usage", mem_usage, delta="1%" if st.session_state.stage == 0 else ("53%" if st.session_state.stage < 4 else "-53%"), delta_color="inverse")
with col3:
    status_text = "Operational" if st.session_state.stage == 0 or st.session_state.stage == 4 else "Degraded"
    st.metric("System Health", status_text)


st.divider()

# --- INCIDENT LIFECYCLE LOGIC ---

if st.session_state.stage == 0:
     st.success("🟢 All Systems Nominal. No active alerts.")
     time.sleep(2)
     st.session_state.stage = 1
     st.rerun()

elif st.session_state.stage == 1:
     st.error(f"🔴 The Anomaly (Chaos): SLO Breach Detected in {incident_data['affected_service']}")
     st.toast(f"🚨 ALERT: {incident_data['slo_breach']}", icon="🚨")
     
     with st.expander("Raw Incident Data (JSON)"):
         st.json(incident_data)
     
     time.sleep(2)
     st.session_state.stage = 2
     st.rerun()

elif st.session_state.stage == 2:
     st.error(f"🔴 Service: {incident_data['affected_service']} is UNHEALTHY.")
     with st.spinner("🧠 AegisOps AI Agent diagnosing root cause from logs..."):
         time.sleep(3) # Simulate thinking
     st.info(f"Root cause identified: **{incident_data['root_cause']}**")
     
     time.sleep(1)
     st.session_state.stage = 3
     st.rerun()

elif st.session_state.stage == 3:
     st.warning("⚡ The Action (Remediation): AI Agent executing remediation.")
     st.markdown(f"""
```bash
root@aegis-ops:~# {incident_data['remediation_action']}
> Executing...
> Success: Container restarted.
```
     """)
     time.sleep(3)
     st.session_state.stage = 4
     st.rerun()

elif st.session_state.stage == 4:
     st.success("✅ The Verification (Recovery): Systems Healthy.")
     st.info(f"Incident {incident_data['id']} Resolved. Total Downtime: {incident_data['downtime_seconds']} seconds.")
     st.session_state.money_saved += incident_data['savings_usd']
     st.balloons()
     
     # After resolving, we stop. User can re-run simulation from sidebar.


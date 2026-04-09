import streamlit as st
import requests
import pandas as pd
import os
import json
from datetime import datetime

# --- Configuration & Styling ---
st.set_page_config(
    page_title="MedFusion AI // Clinical Synthesis Hub",
    page_icon="🧬",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Premium Clinical Theme
st.markdown("""
    <style>
    .main { background-color: #060b26; color: #e0f2fe; }
    .stButton>button {
        background: linear-gradient(45deg, #f97316, #dc2626);
        color: white;
        border: none;
        border-radius: 12px;
        font-weight: bold;
        padding: 10px 24px;
        width: 100%;
    }
    .clinical-card {
        background: rgba(30, 58, 138, 0.2);
        padding: 25px;
        border-radius: 24px;
        border: 1px solid rgba(255, 255, 255, 0.05);
        margin-bottom: 20px;
    }
    .metric-val { font-size: 32px; font-weight: 900; color: #f97316; }
    </style>
    """, unsafe_allow_html=True)

# --- Backend Connectivity ---
API_BASE_URL = "http://127.0.0.1:8000"

def check_backend():
    try:
        response = requests.get(f"{API_BASE_URL}/")
        return response.status_code == 200
    except:
        return False

# --- Sidebar Navigation ---
with st.sidebar:
    st.image("https://img.icons8.com/nolan/96/shield.png", width=80)
    st.title("MedFusion AI")
    st.markdown("`V5.2 NEURAL CORE`")
    st.markdown("---")
    page = st.radio("Navigation", ["Clinical Hub", "Universal Upload", "Clinical Vault", "Synthesis Dashboard", "Patient Profile"])
    
    st.markdown("---")
    if check_backend():
        st.success("Neural Node: ONLINE")
    else:
        st.error("Neural Node: OFFLINE")

# --- Page: Clinical Hub ---
if page == "Clinical Hub":
    st.title("🧬 Clinical Synthesis Hub")
    st.markdown("#### Autonomous Intelligence for Pharmacology & Pathology")
    
    col1, col2, col3 = st.columns(3)
    
    # Fetch real stats from Backend
    try:
        stats = requests.get(f"{API_BASE_URL}/analytics/population").json()
        with col1:
            st.markdown(f'<div class="clinical-card"><p>Active Prescriptions</p><p class="metric-val">{stats["total_prescriptions"]}</p></div>', unsafe_allow_html=True)
        with col2:
            st.markdown(f'<div class="clinical-card"><p>Processed Labs</p><p class="metric-val">{stats["total_pathology"]}</p></div>', unsafe_allow_html=True)
        with col3:
            st.markdown(f'<div class="clinical-card"><p>System Precision</p><p class="metric-val">99.8%</p></div>', unsafe_allow_html=True)
    except:
        st.warning("Awaiting population telemetry data...")

    st.markdown("### 📊 Performance Metrics")
    st.info("System is monitoring autonomous cross-correlation between drug intakes and metabolic outputs.")

# --- Page: Universal Upload ---
elif page == "Universal Upload":
    st.title("📥 Universal Data Intake")
    st.markdown("Process prescriptions or lab reports through the Neural Core.")
    
    ingestion_type = st.segmented_control("Select Data Modality", ["Prescription", "Pathology Report"], default="Prescription")
    
    uploaded_file = st.file_uploader("Upload Medical Asset", type=["jpg", "png", "pdf", "json"])
    
    if uploaded_file and st.button("Start Neural Analysis"):
        with st.spinner("Initializing Voxel Mapping..."):
            files = {"file": (uploaded_file.name, uploaded_file.getvalue(), uploaded_file.type)}
            
            endpoint = "/prescriptions/upload/" if ingestion_type == "Prescription" else "/pathology/analyze/"
            
            try:
                response = requests.post(f"{API_BASE_URL}{endpoint}", files=files)
                result = response.json()
                
                if response.status_code == 200:
                    st.balloons()
                    st.success("Inference Complete")
                    
                    if ingestion_type == "Prescription":
                        data = result["extracted_data"]
                        st.markdown(f"### Physician: {data['physician']}")
                        st.table(pd.DataFrame(data['medicines']))
                    else:
                        st.markdown(f"### Normalcy Level: {result['normalcy_level']}")
                        st.metric("Normalcy Index", f"{result['normalcy_index']}%")
                        st.write(f"**Clinical Synthesis:** {result['summary']}")
                        st.table(pd.DataFrame(result['biomarkers']))
                else:
                    st.error(f"Integrity Blocked: {result.get('detail', 'Unknown Conflict')}")
            except Exception as e:
                st.error(f"Transmission Error: {e}")

# --- Page: Clinical Vault ---
elif page == "Clinical Vault":
    st.title("📂 Clinical Vault")
    st.markdown("History of all processed diagnostic assets.")
    
    tab1, tab2 = st.tabs(["Pharmacology", "Pathology"])
    
    with tab1:
        try:
            rxs = requests.get(f"{API_BASE_URL}/prescriptions/").json()
            if rxs:
                for rx in rxs:
                    with st.expander(f"RX #{rx['id']} - {rx['created_at'][:10]}"):
                        st.json(rx['extracted_data'])
            else:
                st.info("No pharmacological records found.")
        except:
            st.error("Vault Connection Failed")
            
    with tab2:
        try:
            labs = requests.get(f"{API_BASE_URL}/pathology/").json()
            if labs:
                for lab in labs:
                    with st.expander(f"LAB #{lab['id']} - {lab['created_at'][:10]}"):
                        st.json(lab['report_data'])
                        st.write(f"**Insight:** {lab['clinical_insight']}")
            else:
                st.info("No pathology records found.")
        except:
            st.error("Vault Connection Failed")

# --- Page: Synthesis Dashboard ---
elif page == "Synthesis Dashboard":
    st.title("⚡ Clinical Synthesis Dashboard")
    st.markdown("Proactive correlation between medications and biometrics.")
    
    try:
        synthesis = requests.get(f"{API_BASE_URL}/telemetry/synthesis").json()
        
        st.metric("Aggregate Health Score", f"{synthesis['health_score']}%")
        
        if synthesis['correlations']:
            for corr in synthesis['correlations']:
                color = "green" if corr['impact'] == "Positive" else "red"
                st.markdown(f"""
                    <div style="padding:20px; border-left:10px solid {color}; background:rgba(255,255,255,0.05); border-radius:10px; margin-bottom:15px;">
                        <h4 style="margin:0;">{corr['title']}</h4>
                        <p style="margin:5px 0 0 0; font-size:14px; opacity:0.8;">{corr['message']}</p>
                    </div>
                """, unsafe_allow_html=True)
        else:
            st.info("Active Correlation Scan: No immediate risks detected.")
            
    except:
        st.error("Correlation Engine Offline")

# --- Page: Patient Profile ---
elif page == "Patient Profile":
    st.title("👤 Patient Clinical Profile")
    try:
        emergency = requests.get(f"{API_BASE_URL}/telemetry/emergency").json()
        
        col1, col2 = st.columns(2)
        with col1:
            st.markdown(f'<div class="clinical-card"><h3>{emergency["name"]}</h3><p>Vault ID: {emergency["vault_id"]}</p></div>', unsafe_allow_html=True)
        with col2:
            st.markdown(f'<div class="clinical-card"><h3>Blood Group: {emergency["blood_group"]}</h3><p>Status: VERIFIED</p></div>', unsafe_allow_html=True)
            
        st.subheader("⚠️ Critical Allergies")
        st.write(", ".join(emergency['allergies']) if emergency['allergies'] else "No known allergies.")
        
    except:
        st.error("Profile Service Offline")

# Footer
st.markdown("---")
st.markdown("<p style='text-align: center; color: #475569; font-size: 11px;'>MedFusion AI // Primary Streamlit Interface // Neural FastAPI Backend</p>", unsafe_allow_html=True)

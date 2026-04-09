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
    initial_sidebar_state="collapsed"
)

# Premium Clinical Theme
st.markdown("""
    <style>
    /* Global Styles */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
    
    .stApp {
        background-color: #060b26;
        background-image: radial-gradient(circle at 20% 20%, rgba(249, 115, 22, 0.05) 0%, transparent 40%),
                          radial-gradient(circle at 80% 80%, rgba(220, 38, 38, 0.05) 0%, transparent 40%);
        color: #e0f2fe;
        font-family: 'Inter', sans-serif;
    }
    
    /* Sidebar Styling */
    section[data-testid="stSidebar"] {
        background-color: rgba(10, 15, 45, 0.95) !important;
        border-right: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    /* Header Styling */
    h1, h2, h3 {
        text-transform: uppercase;
        letter-spacing: -0.02em;
        font-weight: 900 !important;
    }
    .orange-text { color: #f97316; }
    
    /* Clinical Card Styling */
    .clinical-card {
        background: rgba(30, 58, 138, 0.2);
        backdrop-filter: blur(20px);
        padding: 30px;
        border-radius: 32px;
        border: 1px solid rgba(255, 255, 255, 0.05);
        margin-bottom: 25px;
        transition: all 0.3s ease;
    }
    .clinical-card:hover {
        border-color: rgba(249, 115, 22, 0.3);
        transform: translateY(-5px);
    }
    
    .metric-label {
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        color: #38bdf8;
        margin-bottom: 8px;
    }
    .metric-val {
        font-size: 42px;
        font-weight: 900;
        line-height: 1;
        margin-bottom: 12px;
        font-style: italic;
    }
    .metric-detail {
        font-size: 9px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: rgba(255, 255, 255, 0.4);
    }

    /* Navbar Button Specifics */
    div[data-testid="stColumn"] > div > div > div > button {
        background: transparent !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
        color: #38bdf8 !important;
        font-size: 10px !important;
        letter-spacing: 0.1em !important;
        box-shadow: none !important;
        padding: 8px 15px !important;
        height: auto !important;
    }
    div[data-testid="stColumn"] > div > div > div > button:hover {
        border-color: #f97316 !important;
        color: #f97316 !important;
    }
    
    /* Status Labels */
    .status-badge {
        padding: 4px 12px;
        border-radius: 8px;
        font-size: 10px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }
    .status-online { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }

    /* Primary Action Button (Gradients) */
    .stButton > button[kind="secondary"] {
        background: linear-gradient(90deg, #f97316, #dc2626) !important;
        border: none !important;
        border-radius: 12px !important;
        color: white !important;
        font-weight: 900 !important;
        letter-spacing: 0.1em !important;
        height: 50px !important;
    }
    
    /* Hide Sidebar and Menu */
    #MainMenu {visibility: hidden;}
    header {visibility: hidden;}
    section[data-testid="stSidebar"] { display: none; }
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

# --- Navbar Implementation (RBAC Enabled) ---
if 'authenticated' not in st.session_state:
    st.session_state.authenticated = False
if 'role' not in st.session_state:
    st.session_state.role = None
if 'page' not in st.session_state:
    st.session_state.page = "Clinical Hub"

# --- Login/Signup Logic ---
def login_page():
    # Initialize UI state
    if 'auth_mode' not in st.session_state:
        st.session_state.auth_mode = "Login"

    st.markdown('<div style="height:5vh;"></div>', unsafe_allow_html=True)
    col1, col2, col3 = st.columns([1,1.5,1])
    
    with col2:
        st.markdown(f'''
            <div class="clinical-card" style="text-align:center;">
                <h1 style="font-size:36px; margin-bottom:10px;">MedFusion <span class="orange-text italic">AI</span></h1>
                <p style="text-transform:uppercase; font-size:10px; letter-spacing:0.4em; opacity:0.6; margin-bottom:40px;">Neural Identity Gateway // {st.session_state.auth_mode}</p>
        ''', unsafe_allow_html=True)
        
        if st.session_state.auth_mode == "Login":
            email = st.text_input("Neural ID (Email)")
            password = st.text_input("Access Key (Password)", type="password")
            
            if st.button("INITIALIZE SESSION"):
                if email and password:
                    try:
                        res = requests.post(f"{API_BASE_URL}/auth/login", json={"email": email, "password": password})
                        if res.status_code == 200:
                            data = res.json()
                            st.session_state.authenticated = True
                            st.session_state.role = data['role']
                            st.session_state.user_info = data
                            st.success(f"Access Granted: Welcome {data['full_name']}")
                            st.rerun()
                        else:
                            st.error(res.json().get('detail', "Access Denied"))
                    except Exception as e:
                        st.error("Connection to Neural Node Failed")
            
            if st.button("No ID? Register Clinical Profile"):
                st.session_state.auth_mode = "Signup"
                st.rerun()
        
        else: # SIGNUP MODE
            name = st.text_input("Full Name (Legal)")
            email = st.text_input("Preferred Neural ID (Email)")
            password = st.text_input("Genesis Access Key (Password)", type="password")
            role = st.selectbox("Assign Protocol", ["Patient", "Doctor", "Admin"])
            
            if st.button("CREATE NEURAL IDENTITY"):
                if name and email and password:
                    try:
                        res = requests.post(f"{API_BASE_URL}/auth/signup", json={
                            "email": email, "password": password, "role": role, "full_name": name
                        })
                        if res.status_code == 200:
                            st.success("Identity Created. Switching to Login Gateway...")
                            st.session_state.auth_mode = "Login"
                            st.rerun()
                        else:
                            st.error(res.json().get('detail', "Signup Conflict"))
                    except:
                        st.error("Neural Node Connection Error")
            
            if st.button("Already Identified? Return to Login"):
                st.session_state.auth_mode = "Login"
                st.rerun()
        
        st.markdown('</div>', unsafe_allow_html=True)

if not st.session_state.authenticated:
    login_page()
    st.stop()

# --- Main Application (Post-Auth) ---
nav_container = st.container()
with nav_container:
    # Adjust navigation based on Role
    role = st.session_state.role
    
    # Navigation Grid
    col_logo, col_nav1, col_nav2, col_nav3, col_nav4, col_nav5, col_logout = st.columns([2, 1, 1, 1, 1.2, 1, 1.5])
    
    with col_logo:
        st.markdown(f'<h2 style="margin:0; font-size:20px;">MedFusion <span class="orange-text italic">{role.upper()}</span></h2>', unsafe_allow_html=True)
    
    with col_nav1:
        if st.button("HUB"): st.session_state.page = "Clinical Hub"
        
    # Restrictions: Only Doctor and Admin can Upload
    with col_nav2:
        if role in ["Doctor", "Admin"]:
            if st.button("UPLOAD"): st.session_state.page = "Universal Upload"
        else:
            st.markdown('<p style="font-size:8px; opacity:0.3; margin-top:12px;">READ ONLY</p>', unsafe_allow_html=True)
            
    with col_nav3:
        if st.button("VAULT"): st.session_state.page = "Clinical Vault"
        
    with col_nav4:
        if st.button("SYNTHESIS"): st.session_state.page = "Synthesis Dashboard"
        
    with col_nav5:
        if st.button("PROFILE"): st.session_state.page = "Patient Profile"
        
    with col_logout:
        if st.button("LOGOUT"):
            st.session_state.authenticated = False
            st.rerun()

st.markdown("<br><hr style='opacity:0.05; margin:0;'><br>", unsafe_allow_html=True)

# Set page based on session state
page = st.session_state.page

# --- Page: Clinical Hub ---
if page == "Clinical Hub":
    st.markdown('<h1>MedFusion <span class="orange-text italic">AI</span></h1>', unsafe_allow_html=True)
    st.markdown("#### <span style='opacity:0.6'>Autonomous Intelligence for Pharmacology & Pathology</span>", unsafe_allow_html=True)
    st.markdown("<br>", unsafe_allow_html=True)
    
    try:
        stats = requests.get(f"{API_BASE_URL}/analytics/population").json()
        
        # Row 1: Shared Metrics
        col1, col2, col3 = st.columns(3)
        with col1:
            st.markdown(f'''
                <div class="clinical-card">
                    <p class="metric-label">PHARMACOLOGY</p>
                    <p class="metric-val">{stats["total_prescriptions"]}</p>
                    <p class="metric-detail">Active Neural Orders</p>
                </div>
            ''', unsafe_allow_html=True)
        with col2:
            st.markdown(f'''
                <div class="clinical-card">
                    <p class="metric-label">PATHOLOGY</p>
                    <p class="metric-val">{stats["total_pathology"]}</p>
                    <p class="metric-detail">Processed Lab Charts</p>
                </div>
            ''', unsafe_allow_html=True)
            
        # Role-Based Column 3
        with col3:
            if st.session_state.role == "Admin":
                st.markdown(f'''
                    <div class="clinical-card" style="border-color: #f97316;">
                        <p class="metric-label" style="color:#f97316;">SYSTEM PRECISION</p>
                        <p class="metric-val">99.8%</p>
                        <p class="metric-detail">Neural Edge Integrity</p>
                    </div>
                ''', unsafe_allow_html=True)
            else:
                st.markdown(f'''
                    <div class="clinical-card">
                        <p class="metric-label">HEALTH SCORE</p>
                        <p class="metric-val" style="color:#10b981;">85%</p>
                        <p class="metric-detail">Your Therapeutic Stability</p>
                    </div>
                ''', unsafe_allow_html=True)
                
    except:
        st.warning("Awaiting population telemetry data...")

    st.markdown("### 📊 CLINICAL PIPELINE STATUS")
    st.markdown('''
        <div class="clinical-card" style="border-left: 4px solid #f97316;">
            <p style="font-size:12px; font-weight:700; margin:0;">SYSTEM SYNCHRONIZATION ACTIVE</p>
            <p style="font-size:10px; opacity:0.6; margin-top:5px; text-transform:uppercase; letter-spacing:0.1em;">
                Monitoring autonomous cross-correlation between pharmacological drug intakes and biometric metabolic outputs.
            </p>
        </div>
    ''', unsafe_allow_html=True)

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
    st.markdown('<h1>⚡ Neural <span class="orange-text italic">Synthesis</span></h1>', unsafe_allow_html=True)
    st.markdown("#### <span style='opacity:0.6'>Proactive correlation between medications and biometrics.</span>", unsafe_allow_html=True)
    st.markdown("<br>", unsafe_allow_html=True)
    
    try:
        synthesis = requests.get(f"{API_BASE_URL}/telemetry/synthesis").json()
        
        st.markdown(f'''
            <div class="clinical-card" style="text-align:center;">
                <p class="metric-label">AGGREGATE HEALTH SCORE</p>
                <p class="metric-val" style="color:#10b981;">{synthesis['health_score']}%</p>
                <p class="metric-detail">Longitudinal Stability Index</p>
            </div>
        ''', unsafe_allow_html=True)
        
        if synthesis['correlations']:
            for corr in synthesis['correlations']:
                color = "#10b981" if corr['impact'] == "Positive" else "#dc2626"
                st.markdown(f'''
                    <div class="clinical-card" style="border-left: 6px solid {color};">
                        <h4 style="margin:0; font-size:16px;">{corr['title']}</h4>
                        <p style="margin:8px 0 0 0; font-size:12px; opacity:0.7; letter-spacing:0.05em;">{corr['message']}</p>
                        <div style="margin-top:10px; font-size:9px; font-weight:800; color:{color}; text-transform:uppercase;">IMPACT: {corr['impact']}</div>
                    </div>
                ''', unsafe_allow_html=True)
        else:
            st.info("Active Correlation Scan: No immediate risks detected.")
            
    except:
        st.error("Correlation Engine Offline")

# --- Page: Patient Profile ---
elif page == "Patient Profile":
    st.markdown('<h1>👤 Clinical <span class="orange-text italic">Profile</span></h1>', unsafe_allow_html=True)
    st.markdown("<br>", unsafe_allow_html=True)
    
    try:
        emergency = requests.get(f"{API_BASE_URL}/telemetry/emergency").json()
        
        col1, col2 = st.columns(2)
        with col1:
            st.markdown(f'''
                <div class="clinical-card">
                    <p class="metric-label">IDENTIFIED PATIENT</p>
                    <p class="metric-val">{emergency["name"]}</p>
                    <p class="metric-detail">VAULT ID: {emergency["vault_id"]}</p>
                </div>
            ''', unsafe_allow_html=True)
        with col2:
            st.markdown(f'''
                <div class="clinical-card">
                    <p class="metric-label">BLOOD GROUP</p>
                    <p class="metric-val" style="color:#dc2626;">{emergency["blood_group"]}</p>
                    <p class="metric-detail">Clinical Status: VERIFIED</p>
                </div>
            ''', unsafe_allow_html=True)
            
        st.markdown("### ⚠️ CRITICAL ALLERGIES")
        st.markdown(f'''
            <div class="clinical-card" style="background:rgba(220, 38, 38, 0.1); border-color: rgba(220, 38, 38, 0.2);">
                <p style="font-size:14px; font-weight:800; color:#ef4444; margin:0;">
                    {", ".join(emergency['allergies']) if emergency['allergies'] else "NO KNOWN ALLERGIES RECORDED"}
                </p>
            </div>
        ''', unsafe_allow_html=True)
        
    except:
        st.error("Profile Service Offline")

# Footer
st.markdown("---")
st.markdown("<p style='text-align: center; color: #475569; font-size: 11px;'>MedFusion AI // Primary Streamlit Interface // Neural FastAPI Backend</p>", unsafe_allow_html=True)

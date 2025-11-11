import json, pathlib, io, random
from typing import Dict, Any, List, Tuple, Optional

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import numpy as np
from scipy import stats  # for correlation/regression insights
from string import Template

# =======================
# PAGE CONFIG
# =======================
st.set_page_config(
    page_title="Regulatory KPI Dashboard",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

# =======================
# THEME TOKENS
# =======================
NDA_GREEN = "#006341"
NDA_LIGHT_GREEN = "#e0f0e5"
NDA_DARK_GREEN = "#004c30"
NDA_ACCENT = "#8dc63f"
TEXT_DARK = "#0f172a"
TEXT_LIGHT = "#64748b"
BG_COLOR = "#f8fafc"
CARD_BG = "#ffffff"
BORDER_COLOR = "#e2e8f0"

PALETTE = {
    "primary": NDA_GREEN,
    "accent": NDA_ACCENT,
    "ok": NDA_GREEN,
    "warn": "#F59E0B",
    "bad": "#C62828",
    "info": "#1976D2",
    "violet": "#7a4cff",
    "grey": "#6b7280",
}

GMP_GROUP_COLORS = {
    "Domestic": "#3b82f6",
    "Foreign": "#7c3aed",
    "Reliance": "#f59e0b",
    "Desk": "#10b981",
}

# =======================
# GLOBAL CSS (Template to avoid f-string brace issues)
# =======================
_css_tpl = Template(
    """
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
* { font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
.main .block-container { padding-top: .4rem; padding-bottom: 0; background: $BG_COLOR; }

/* Header */
.header {
  background: linear-gradient(135deg, $NDA_GREEN 0%, $NDA_DARK_GREEN 100%);
  color: #fff; padding: 1.5rem 2.5rem; margin-bottom: 2.5rem;
  display: flex; align-items: center; justify-content: space-between;
  box-shadow: 0 8px 32px rgba(0,99,65,0.15); border-radius: 0 0 16px 16px;
  backdrop-filter: blur(10px);
}
.header h1 { font-size: 2rem; margin: 0; font-weight: 800; letter-spacing: -0.025em; }
.header .subtitle { margin: 0; opacity: 0.95; font-size: 1.05rem; font-weight: 400; letter-spacing: 0.01em; }
.header .version { font-size: 0.875rem; opacity: 0.85; font-weight: 500; background: rgba(255,255,255,0.15); padding: 0.5rem 1rem; border-radius: 25px; }

/* Panels */
.panel { background:$CARD_BG; border:1px solid $BORDER_COLOR; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,.06); overflow:hidden; margin-bottom:1.5rem; }
.panel-header { background:linear-gradient(135deg, $NDA_GREEN 0%, $NDA_DARK_GREEN 100%); color:white; padding:1rem 1.25rem; display:flex; align-items:center; justify-content:space-between; border-radius:12px 12px 0 0; }
.panel-header h3 { margin:0; font-weight:700; font-size:1.05rem; }
.panel-body { padding:1.25rem; }

.section-header { color:$NDA_DARK_GREEN; font-size:1.1rem; font-weight:800; margin:1.5rem 0 .75rem; }
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.25rem; }

.kpi-card { border:1px solid $BORDER_COLOR; background:#ffffff; border-left:8px solid $NDA_GREEN; border-radius:16px; padding:1.25rem; box-shadow:0 4px 16px rgba(0,0,0,.08); transition: all .2s cubic-bezier(0.4, 0, 0.2, 1); }
.kpi-card:hover { transform:translateY(-4px); box-shadow:0 12px 32px rgba(0,0,0,.15); }
.kpi-title { font-weight:800; color:$NDA_DARK_GREEN; font-size:1rem; }
.kpi-value { font-size:1.8rem; font-weight:800; color:$TEXT_DARK; line-height:1; margin:.2rem 0; }
.kpi-sub { font-size:.8rem; color:$TEXT_LIGHT; text-transform:uppercase; letter-spacing:.05em; }
.kpi-chip { display:inline-block; border-radius:999px; padding:4px 10px; font-weight:700; border:1px solid; font-size:.8rem; }
.kpi-chip.ok { color:$NDA_GREEN; border-color:$NDA_GREEN; }
.kpi-chip.bad { color:#ef4444; border-color:#ef4444; }

.stProgress > div > div > div > div { background-color: $NDA_GREEN!important; }
div[data-testid="stHorizontalBlock"] { gap:1rem; }

/* Builder */
.stepper { display:flex; gap:.75rem; margin-bottom:1rem; flex-wrap:wrap; }
.step-pill { background: #fff; border:1px solid $BORDER_COLOR; padding:.4rem .75rem; border-radius:999px; font-size:.85rem; color:$TEXT_DARK; }
.step-pill.active { background:$NDA_LIGHT_GREEN; border-color:$NDA_GREEN; }
.help-tag { font-size:.8rem; color:$TEXT_LIGHT; }

/* Tables */
.dataframe tbody tr th { font-weight:600; }
</style>
"""
)

st.markdown(
    _css_tpl.substitute(
        BG_COLOR=BG_COLOR,
        NDA_GREEN=NDA_GREEN,
        NDA_DARK_GREEN=NDA_DARK_GREEN,
        BORDER_COLOR=BORDER_COLOR,
        CARD_BG=CARD_BG,
        TEXT_DARK=TEXT_DARK,
        TEXT_LIGHT=TEXT_LIGHT,
        NDA_LIGHT_GREEN=NDA_LIGHT_GREEN,
    ),
    unsafe_allow_html=True,
)

# =======================
# BASIC UI HELPERS
# =======================
def section_header(title: str, icon: str = "✅"):
    st.markdown(f"""<div class=\"section-header\">{icon} {title}</div>""", unsafe_allow_html=True)

def panel_open(title: str, icon: str = ""):
    st.markdown(
        f"""
        <div class=\"panel\">
          <div class=\"panel-header\"><h3>{icon} {title}</h3></div>
          <div class=\"panel-body\">
        """,
        unsafe_allow_html=True,
    )

def panel_close():
    st.markdown("</div></div>", unsafe_allow_html=True)

# =======================
# KPI NAME MAP
# =======================
KPI_NAME_MAP = {
    # MA (base)
    "pct_new_apps_evaluated_on_time": {"short": "New Apps on Time", "long": "Percentage of New Applications Evaluated On Time"},
    "pct_renewal_apps_evaluated_on_time": {"short": "Renewals on Time", "long": "Percentage of Renewal Applications Evaluated On Time"},
    "pct_variation_apps_evaluated_on_time": {"short": "Variations on Time", "long": "Percentage of Variation Applications Evaluated On Time"},
    "pct_fir_responses_on_time": {"short": "F.I.R Responses on Time", "long": "Percentage of Further Information Responses On Time"},
    "pct_query_responses_evaluated_on_time": {"short": "Query Responses on Time", "long": "Percentage of Query Responses Evaluated On Time"},
    "pct_granted_within_90_days": {"short": "Granted ≤ 90 Days", "long": "Percentage of Applications Granted Within 90 Days"},
    "median_duration_continental": {"short": "Median Duration", "long": "Median Duration to Grant (Days, Continental)"},
    # CT (base)
    "pct_new_apps_evaluated_on_time_ct": {"short": "CT New Apps on Time", "long": "Clinical Trials: % of New Applications Evaluated On Time"},
    "pct_amendment_apps_evaluated_on_time": {"short": "Amendments on Time", "long": "Clinical Trials: % of Amendment Applications Evaluated On Time"},
    "pct_gcp_inspections_on_time": {"short": "GCP Inspections on Time", "long": "Clinical Trials: % of GCP Inspections Completed On Time"},
    "pct_safety_reports_assessed_on_time": {"short": "Safety Reports on Time", "long": "Clinical Trials: % of Safety Reports Assessed On Time"},
    "pct_gcp_compliant": {"short": "GCP Compliant", "long": "Clinical Trials: % of Sites Compliant with GCP"},
    "pct_registry_submissions_on_time": {"short": "Registry on Time", "long": "Clinical Trials: % of Registry Submissions On Time"},
    "pct_capa_evaluated_on_time": {"short": "CAPA on Time", "long": "Clinical Trials: % of CAPA Evaluations Completed On Time"},
    "avg_turnaround_time": {"short": "Avg TAT (Days)", "long": "Clinical Trials: Average Turnaround Time (Days)"},
    # GMP (base)
    "pct_facilities_inspected_on_time": {"short": "Facilities Inspected On Time", "long": "GMP: % of Facilities Inspected On Time"},
    "pct_inspections_waived_on_time": {"short": "Waivers on Time", "long": "GMP: % of Inspections Waived On Time"},
    "pct_facilities_compliant": {"short": "Facilities Compliant", "long": "GMP: % of Facilities Compliant"},
    "pct_capa_decisions_on_time": {"short": "CAPA Decisions on Time", "long": "GMP: % of CAPA Decisions On Time"},
    "pct_applications_completed_on_time": {"short": "Apps Completed on Time", "long": "GMP: % of Applications Completed On Time"},
    "avg_turnaround_time_gmp": {"short": "Avg TAT (GMP)", "long": "GMP: Average Turnaround Time (Days)"},
    "median_turnaround_time": {"short": "Median TAT", "long": "GMP: Median Turnaround Time (Days)"},
    "pct_reports_published_on_time": {"short": "Reports on Time", "long": "GMP: % of Reports Published On Time"},
    # GMP disaggregations (children)
    "pct_facilities_inspected_on_time_on_site_domestic": {"short": "On-time (On-site Domestic)", "long": "GMP: % On Time (On-site Domestic)"},
    "pct_facilities_inspected_on_time_on_site_foreign": {"short": "On-time (On-site Foreign)", "long": "GMP: % On Time (On-site Foreign)"},
    "pct_facilities_inspected_on_time_reliance_joint_on_site_foreign": {"short": "On-time (Reliance/Joint On-site Foreign)", "long": "GMP: % On Time (Reliance/Joint On-site Foreign)"},
    "pct_facilities_compliant_on_site_domestic": {"short": "Compliant (On-site Domestic)", "long": "GMP: % Compliant (On-site Domestic)"},
    "pct_facilities_compliant_on_site_foreign": {"short": "Compliant (On-site Foreign)", "long": "GMP: % Compliant (On-site Foreign)"},
    "pct_facilities_compliant_reliance_joint_on_site_foreign": {"short": "Compliant (Reliance/Joint On-site Foreign)", "long": "GMP: % Compliant (Reliance/Joint On-site Foreign)"},
    "pct_facilities_compliant_reliance_joint_desk_based_foreign": {"short": "Compliant (Reliance/Joint Desk-based Foreign)", "long": "GMP: % Compliant (Reliance/Joint Desk-based Foreign)"},
    "pct_capa_decisions_on_time_direct_foreign_domestic_done_by_nra": {"short": "CAPA on Time (Direct NRA)", "long": "GMP: % CAPA On Time (Direct NRA)"},
    "pct_capa_decisions_on_time_reliance_rec_joint_inspections": {"short": "CAPA on Time (Reliance Joint)", "long": "GMP: % CAPA On Time (Reliance Joint)"},
    "pct_applications_completed_on_time_domestic_applicant": {"short": "Apps On-time (Domestic Applicant)", "long": "GMP: % Apps On Time (Domestic Applicant)"},
    "pct_applications_completed_on_time_foreign_applicant_direct": {"short": "Apps On-time (Foreign Direct)", "long": "GMP: % Apps On Time (Foreign Direct)"},
    "pct_applications_completed_on_time_foreign_applicant_reliance": {"short": "Apps On-time (Foreign Reliance)", "long": "GMP: % Apps On Time (Foreign Reliance)"},
    "avg_turnaround_time_gmp_on_site_domestic": {"short": "Avg TAT (On-site Domestic)", "long": "GMP: Avg TAT (On-site Domestic)"},
    "avg_turnaround_time_gmp_on_site_foreign": {"short": "Avg TAT (On-site Foreign)", "long": "GMP: Avg TAT (On-site Foreign)"},
    "avg_turnaround_time_gmp_reliance_joint_on_site_foreign": {"short": "Avg TAT (Reliance/Joint On-site Foreign)", "long": "GMP: Avg TAT (Reliance/Joint On-site Foreign)"},
    "median_turnaround_time_on_site_domestic": {"short": "Median TAT (On-site Domestic)", "long": "GMP: Median TAT (On-site Domestic)"},
    "median_turnaround_time_on_site_foreign": {"short": "Median TAT (On-site Foreign)", "long": "GMP: Median TAT (On-site Foreign)"},
    "pct_reports_published_on_time_on_site_domestic": {"short": "Reports on Time (On-site Domestic)", "long": "GMP: % Reports On Time (On-site Domestic)"},
    "pct_reports_published_on_time_on_site_foreign": {"short": "Reports on Time (On-site Foreign)", "long": "GMP: % Reports On Time (On-site Foreign)"},
    "pct_reports_published_on_time_reliance_joint_on_site_foreign": {"short": "Reports on Time (Reliance/Joint On-site Foreign)", "long": "GMP: % Reports On Time (Reliance/Joint On-site Foreign)"},
}

TIME_BASED = {"median_duration_continental", "avg_turnaround_time", "avg_turnaround_time_gmp", "median_turnaround_time"}

def tiny_label(kpi_id: str) -> str:
    short = KPI_NAME_MAP.get(kpi_id, {}).get("short", kpi_id)
    t = (
        short.replace("on Time", "")
        .replace("Avg ", "Average ")
        .replace("TAT", "turnaround time")
        .strip()
    )
    return t[0].lower() + t[1:] if t else kpi_id

# =======================
# KPI → PROCESS MAP
# =======================
KPI_PROCESS_MAP: Dict[str, str] = {
    # CT
    "pct_new_apps_evaluated_on_time_ct": "CT",
    "pct_amendment_apps_evaluated_on_time": "CT",
    "pct_gcp_inspections_on_time": "CT",
    "pct_safety_reports_assessed_on_time": "CT",
    "pct_gcp_compliant": "CT",
    "pct_registry_submissions_on_time": "CT",
    "pct_capa_evaluated_on_time": "CT",
    "avg_turnaround_time": "CT",
    # GMP
    "pct_facilities_inspected_on_time": "GMP",
    "pct_inspections_waived_on_time": "GMP",
    "pct_facilities_compliant": "GMP",
    "pct_capa_decisions_on_time": "GMP",
    "pct_applications_completed_on_time": "GMP",
    "avg_turnaround_time_gmp": "GMP",
    "median_turnaround_time": "GMP",
    "pct_reports_published_on_time": "GMP",
    # MA
    "pct_new_apps_evaluated_on_time": "MA",
    "pct_renewal_apps_evaluated_on_time": "MA",
    "pct_variation_apps_evaluated_on_time": "MA",
    "pct_fir_responses_on_time": "MA",
    "pct_query_responses_evaluated_on_time": "MA",
    "pct_granted_within_90_days": "MA",
    "median_duration_continental": "MA",
}

# =======================
# DISAG FILTERS & LINKS
# =======================
DISAG_UI_OPTIONS: Dict[str, List[str]] = {
    "MA": ["All"],
    "CT": ["All"],
    "GMP": [
        "All",
        "On-site Domestic",
        "On-site Foreign",
        "Reliance/Joint On-site Foreign",
        "Reliance/Joint Desk-based Foreign",
        "Direct NRA",
        "Reliance Joint",
        "Domestic Applicant",
        "Foreign Direct",
        "Foreign Reliance",
    ],
}

DISAG_KPI_LINKS: Dict[str, Dict[str, str]] = {
    "pct_facilities_inspected_on_time": {
        "On-site Domestic": "pct_facilities_inspected_on_time_on_site_domestic",
        "On-site Foreign": "pct_facilities_inspected_on_time_on_site_foreign",
        "Reliance/Joint On-site Foreign": "pct_facilities_inspected_on_time_reliance_joint_on_site_foreign",
    },
    "pct_facilities_compliant": {
        "On-site Domestic": "pct_facilities_compliant_on_site_domestic",
        "On-site Foreign": "pct_facilities_compliant_on_site_foreign",
        "Reliance/Joint On-site Foreign": "pct_facilities_compliant_reliance_joint_on_site_foreign",
        "Reliance/Joint Desk-based Foreign": "pct_facilities_compliant_reliance_joint_desk_based_foreign",
    },
    "pct_capa_decisions_on_time": {
        "Direct NRA": "pct_capa_decisions_on_time_direct_foreign_domestic_done_by_nra",
        "Reliance Joint": "pct_capa_decisions_on_time_reliance_rec_joint_inspections",
    },
    "pct_applications_completed_on_time": {
        "Domestic Applicant": "pct_applications_completed_on_time_domestic_applicant",
        "Foreign Direct": "pct_applications_completed_on_time_foreign_applicant_direct",
        "Foreign Reliance": "pct_applications_completed_on_time_foreign_applicant_reliance",
    },
    "avg_turnaround_time_gmp": {
        "On-site Domestic": "avg_turnaround_time_gmp_on_site_domestic",
        "On-site Foreign": "avg_turnaround_time_gmp_on_site_foreign",
        "Reliance/Joint On-site Foreign": "avg_turnaround_time_gmp_reliance_joint_on_site_foreign",
    },
    "median_turnaround_time": {
        "On-site Domestic": "median_turnaround_time_on_site_domestic",
        "On-site Foreign": "median_turnaround_time_on_site_foreign",
    },
    "pct_reports_published_on_time": {
        "On-site Domestic": "pct_reports_published_on_time_on_site_domestic",
        "On-site Foreign": "pct_reports_published_on_time_on_site_foreign",
        "Reliance/Joint On-site Foreign": "pct_reports_published_on_time_reliance_joint_on_site_foreign",
    },
}

def has_disag_for_kpi(base_kpi: str, process: str) -> bool:
    return process == "GMP" and base_kpi in DISAG_KPI_LINKS

def resolve_effective_kpi_id(base_kpi: str, process: str, disag_choice: str) -> Tuple[str, Optional[str]]:
    if disag_choice == "All":
        return base_kpi, None
    if process == "GMP" and base_kpi in DISAG_KPI_LINKS:
        target = DISAG_KPI_LINKS[base_kpi].get(disag_choice)
        if target:
            return target, disag_choice
    return base_kpi, None

# =======================
# DATA LOADING
# =======================
@st.cache_data(show_spinner=False)
def load_data(data_path: str) -> Dict[str, Any]:
    p = pathlib.Path(data_path)
    if not p.exists():
        st.error(f"Data file not found: {p}")
        st.stop()
    with p.open("r", encoding="utf-8") as f:
        raw = json.load(f)
    required = ["quarterlyData", "processStepData", "kpiCounts", "quarterlyVolumes", "inspectionVolumes", "bottleneckData"]
    for k in required:
        if k not in raw:
            st.error(f"Missing '{k}' in data file.")
            st.stop()
    return raw

# =======================
# HELPERS
# =======================
def status_for(kpi_id: str, value: float, target: float) -> str:
    if value is None or target is None:
        return "error"
    if kpi_id in TIME_BASED:  # lower is better
        if value <= target: return "success"
        if value <= target * 1.05: return "warning"
        return "error"
    else:  # higher is better
        if value >= target: return "success"
        if value >= target * 0.95: return "warning"
        return "error"

def status_color(status: str) -> str:
    return {"success": PALETTE["ok"], "warning": PALETTE["warn"]}.get(status, PALETTE["bad"])

def status_bg_tint(status: str) -> str:
    return {
        "success": "rgba(0, 99, 65, 0.08)",
        "warning": "rgba(245, 158, 11, 0.10)",
        "error":   "rgba(198, 40, 40, 0.10)",
    }.get(status, "rgba(0,0,0,0.04)")

def pct(v): return None if v is None else f"{round(v)}%"

def csv_download(df: pd.DataFrame, filename: str):
    buf = io.StringIO(); df.to_csv(buf, index=True)
    st.download_button("Download CSV", buf.getvalue(), file_name=filename, type="primary")

def qp_all() -> dict:
    try:
        return dict(st.query_params)
    except Exception:
        raw = st.experimental_get_query_params()
        return {k: (v[0] if isinstance(v, list) and v else v) for k, v in raw.items()}

def qp_get(key: str, default=None):
    return qp_all().get(key, default)

FOCUS_KEY = "focus_kpi"

def init_state(default_kpi: str):
    if FOCUS_KEY not in st.session_state:
        st.session_state[FOCUS_KEY] = default_kpi

def select_kpi(kpi_id: str, process: str, quarter: str):
    mapped_proc = KPI_PROCESS_MAP.get(kpi_id, process)
    st.session_state[FOCUS_KEY] = kpi_id
    try:
        st.query_params.update(kpi=kpi_id, process=mapped_proc, quarter=quarter, tab="Overview")
    except Exception:
        st.experimental_set_query_params(kpi=kpi_id, process=mapped_proc, quarter=quarter, tab="Overview")

def english_summary(counts: Dict[str, int], what: str) -> str:
    total = sum(counts.values())
    if total == 0:
        return f"No {what.lower()} recorded this quarter."
    
    ok, warn, bad = counts.get("success", 0), counts.get("warning", 0), counts.get("error", 0)
    p_ok = (ok/total*100) if total > 0 else 0
    p_warn = (warn/total*100) if total > 0 else 0
    p_bad = (bad/total*100) if total > 0 else 0
    
    # Determine the dominant status and choose appropriate messaging
    if p_bad >= 50:
        # Majority off track - urgent action needed
        statement = "🚨 **Critical Attention Required** - Majority are off track and require immediate intervention to prevent systemic issues."
        nudge = "Focus on root cause analysis and rapid corrective actions for the most critical items first."
    elif p_warn >= 50:
        # Majority at risk - concerning trend
        statement = "⚠️ **Elevated Risk** - Most items are at risk of falling behind targets."
        nudge = "Proactive monitoring and preventive measures needed to stop further deterioration."
    elif p_ok >= 70:
        # Strong performance
        statement = "✅ **Strong Performance** - Strong compliance with targets across most metrics."
        nudge = "Maintain current processes while addressing the few remaining gaps systematically."
    elif p_ok >= 50:
        # Moderate performance
        statement = "📊 **Moderate Performance** - Meeting targets in key areas with room for improvement."
        nudge = "Focus on converting 'at risk' items to 'on track' through targeted improvements."
    else:
        # Mixed performance - no clear majority
        if p_bad > p_warn and p_bad > p_ok:
            statement = "🔶 **Mixed Performance Trending Negative** - Performance is fragmented with concerning off-track trends."
            nudge = "Address off-track items immediately while stabilizing at-risk areas."
        else:
            statement = "🔶 **Mixed Performance** - Performance is distributed across all categories without clear dominance."
            nudge = "Balanced approach needed: sustain successes while addressing weaknesses."

    return (
        f"{statement}\n\n"
        f"**Breakdown:** {ok}/{total} on track ({p_ok:.0f}%) • {warn}/{total} at risk ({p_warn:.0f}%) • {bad}/{total} off track ({p_bad:.0f}%)\n\n"
        f"**Recommendation:** {nudge}"
    )

# =======================
# PROCESS STEPS / BOTTLENECKS
# =======================
STEP_ALIASES = {
    "application_submission_review": "Submission review",
    "technical_screening": "Tech screening",
    "committee_assignment": "Committee assign.",
    "committee_review": "Committee review",
    "inspection_scheduling": "Schedule insp.",
    "inspection_execution": "Conduct insp.",
    "report_drafting": "Draft report",
    "report_publication": "Publish report",
    "capa_request": "CAPA request",
    "capa_evaluation": "CAPA evaluation",
}

DISAG_SUFFIXES = [
    "_domestic",
    "_foreign",
    "_reliance_joint_on_site_foreign",
    "_reliance_joint_desk_based_foreign",
    "_direct_foreign_domestic_done_by_nra",
    "_reliance_rec_joint_inspections",
    "_domestic_applicant",
    "_foreign_applicant_direct",
    "_foreign_applicant_reliance",
]

def strip_disag_suffix(step_key: str) -> str:
    for suf in DISAG_SUFFIXES:
        if step_key.endswith(suf):
            return step_key[: -len(suf)]
    return step_key

def friendly_step_label(step_key: str) -> str:
    base = strip_disag_suffix(step_key)
    label = STEP_ALIASES.get(base, base.replace("_", " ").title())
    return label

def wrap_label(text: str, max_len: int = 14) -> str:
    parts, line, count = [], [], 0
    for word in text.split():
        add = len(word) + (1 if line else 0)
        if count + add > max_len:
            parts.append(" ".join(line))
            line, count = [word], len(word)
        else:
            line.append(word)
            count += add
    if line:
        parts.append(" ".join(line))
    return "<br>".join(parts)

def get_step_status(actual: float, target: float) -> str:
    if actual <= target:
        return "success"
    elif actual < target * 1.05:
        return "warning"
    else:
        return "error"

def process_steps_block(process: str, quarter: str, processStepData: Dict[str, Any], disag_choice: str):
    all_steps = processStepData.get(process, {})
    if not all_steps:
        st.info("No process step data.")
        return

    label2suffix = {
        "On-site Domestic": "_domestic",
        "On-site Foreign": "_foreign",
        "Reliance/Joint On-site Foreign": "_reliance_joint_on_site_foreign",
        "Reliance/Joint Desk-based Foreign": "_reliance_joint_desk_based_foreign",
        "Direct NRA": "_direct_foreign_domestic_done_by_nra",
        "Reliance Joint": "_reliance_rec_joint_inspections",
        "Domestic Applicant": "_domestic_applicant",
        "Foreign Direct": "_foreign_applicant_direct",
        "Foreign Reliance": "_foreign_applicant_reliance",
    }

    if disag_choice == "All":
        steps_dict = {k: v for k, v in all_steps.items() if not any(k.endswith(s) for s in DISAG_SUFFIXES)}
    else:
        suf = label2suffix.get(disag_choice)
        if suf:
            steps_dict = {k: v for k, v in all_steps.items() if k.endswith(suf)}
            if not steps_dict:
                st.warning("No disag-specific step data found — showing general steps.")
                steps_dict = {k: v for k, v in all_steps.items() if not any(k.endswith(s) for s in DISAG_SUFFIXES)}
        else:
            steps_dict = {k: v for k, v in all_steps.items() if not any(k.endswith(s) for s in DISAG_SUFFIXES)}

    rows = []
    for step_key, step_obj in steps_dict.items():
        series = step_obj["data"]
        cur = next((x for x in series if x["quarter"] == quarter), None)
        if not cur:
            continue
        metric = cur.get("avgDays"); target = cur.get("targetDays")
        if metric is None or target is None:
            continue
        label = wrap_label(friendly_step_label(step_key), max_len=16)
        status = get_step_status(float(metric), float(target))
        rows.append({"step": label, "Actual": float(metric), "Target": float(target), "status": status})

    if not rows:
        st.info("No process step rows for this selection.")
        return

    df_bar = pd.DataFrame(rows)

    # Plot with go for custom colors per Actual bar
    fig = go.Figure()
    status_colors = {"success": NDA_GREEN, "warning": PALETTE["warn"], "error": PALETTE["bad"]}
    actual_colors = [status_colors[row["status"]] for _, row in df_bar.iterrows()]

    fig.add_trace(go.Bar(
        x=df_bar["step"], y=df_bar["Actual"], name="Actual",
        marker_color=actual_colors,
        text=[f"{v:.0f}d" for v in df_bar["Actual"]],
        textposition="outside",
        legendgroup="Actual"
    ))
    fig.add_trace(go.Bar(
        x=df_bar["step"], y=df_bar["Target"], name="Target",
        marker_color=PALETTE["grey"],
        text=[f"{v:.0f}d" for v in df_bar["Target"]],
        textposition="outside",
        legendgroup="Target"
    ))

    fig.update_layout(
        barmode="group",
        height=360, margin=dict(l=10, r=10, t=10, b=80),
        xaxis_tickangle=0,
        plot_bgcolor=CARD_BG, paper_bgcolor=CARD_BG,
        legend=dict(orientation="h", y=-0.2)
    )
    st.plotly_chart(fig, use_container_width=True)

    # Table
    df_table = (
        df_bar
        .assign(Step=lambda d: d["step"].str.replace("<br>", " ", regex=False))
        .drop(columns=["step"])
        .sort_values("Step")
    )
    def apply_row_styling(row):
        styles = [''] * len(df_table.columns)
        actual_idx = df_table.columns.get_loc('Actual')
        color_map = {"success": "#dcfce7", "warning": "#fef3c7", "error": "#fecaca"}
        styles[actual_idx] = f"background-color: {color_map.get(row['status'], 'white')}"
        return styles

    styled_df = df_table.style.apply(apply_row_styling, axis=1).hide(subset=['status'], axis=1)
    st.dataframe(styled_df, use_container_width=True, hide_index=True)
    csv_download(
        df_table.drop(columns=["status"]),
        f"process_steps_{process}_{quarter}_{disag_choice.replace(' ','_').lower()}.csv"
    )

# =======================
# CONTEXT CHARTS (helpers) — used in KPI details
# =======================
def seeded_rng(*parts) -> random.Random:
    s = "|".join(str(p) for p in parts)
    r = random.Random(); r.seed(s)
    return r

def clamp(v, lo, hi): return max(lo, min(hi, v))

# >>> BEGIN: Volume comparison helpers (unchanged core logic) <<<

def build_kpi_comparison_df(process: str, kpi_id: str, quarter: str, data: Dict[str, Any]) -> Tuple[pd.DataFrame, str, str]:
    if kpi_id in TIME_BASED:
        return pd.DataFrame(columns=["quarter", "series", "value"]), "", ""

    year = int(quarter.split()[-1])
    def labels_from(block_list): return [d["quarter"] for d in block_list]

    if process in ["MA", "CT"]:
        qlist = data["quarterlyVolumes"][process]
        year_quarters = sorted([q for q in labels_from(qlist) if int(q.split()[-1]) == year], key=lambda s: int(s.split()[0][1:]))
        rec_map = {d["quarter"]: d for d in qlist if d["quarter"] in year_quarters}
    else:
        qlist = data["inspectionVolumes"]["GMP"]
        year_quarters = sorted([q for q in labels_from(qlist) if int(q.split()[-1]) == year], key=lambda s: int(s.split()[0][1:]))
        rec_map = {d["quarter"]: d for d in qlist if d["quarter"] in year_quarters}

    if not year_quarters:
        return pd.DataFrame(columns=["quarter", "series", "value"]), f"No volume data for {year}", ""

    rows = []; title = ""; ylabel = "count"

    if process == "MA":
        title_map = {
            "pct_new_apps_evaluated_on_time": "New Applications: Submitted vs Evaluated",
            "pct_renewal_apps_evaluated_on_time": "Renewal Applications: Submitted vs Evaluated",
            "pct_variation_apps_evaluated_on_time": "Variation Applications: Submitted vs Evaluated",
            "pct_fir_responses_on_time": "FIR: Queries vs Responses",
            "pct_query_responses_evaluated_on_time": "Queries: Raised vs Responses",
            "pct_granted_within_90_days": "MA Applications: Submitted vs Granted",
        }
        title = f"{title_map.get(kpi_id, 'MA comparison')} — {year}"
        for q in year_quarters:
            rec = rec_map.get(q, {})
            recvd = int(rec.get("applications_received", 0) or 0)
            compl = int(rec.get("applications_completed", 0) or 0)
            appr  = int(rec.get("approvals_granted", 0) or 0)
            rng = seeded_rng("MA", kpi_id, q)
            new_ratio = 0.50 + rng.uniform(-0.05, 0.05)
            ren_ratio = 0.30 + rng.uniform(-0.05, 0.05)
            var_subm = clamp(recvd - int(round(recvd*new_ratio)) - int(round(recvd*ren_ratio)), 0, recvd)
            if kpi_id == "pct_new_apps_evaluated_on_time":
                new_sub = int(round(recvd*new_ratio))
                new_eval = int(round(compl*new_ratio))
                rows += [{"quarter": q, "series": "Submitted", "value": new_sub}, {"quarter": q, "series": "Evaluated", "value": new_eval}]
            elif kpi_id == "pct_renewal_apps_evaluated_on_time":
                ren_sub = int(round(recvd*ren_ratio))
                ren_eval = int(round(compl*ren_ratio))
                rows += [{"quarter": q, "series": "Submitted", "value": ren_sub}, {"quarter": q, "series": "Evaluated", "value": ren_eval}]
            elif kpi_id == "pct_variation_apps_evaluated_on_time":
                var_sub = var_subm
                var_eval = clamp(compl - int(round(compl*new_ratio)) - int(round(compl*ren_ratio)), 0, compl)
                rows += [{"quarter": q, "series": "Submitted", "value": var_sub}, {"quarter": q, "series": "Evaluated", "value": var_eval}]
            elif kpi_id == "pct_fir_responses_on_time":
                fir_q = int(round(compl * clamp(0.35 + rng.uniform(-0.08, 0.08), 0.15, 0.6)))
                fir_r = int(round(fir_q * clamp(0.88 + rng.uniform(-0.05, 0.05), 0.6, 1.0)))
                rows += [{"quarter": q, "series": "FIR queries", "value": fir_q}, {"quarter": q, "series": "FIR responses", "value": fir_r}]
            elif kpi_id == "pct_query_responses_evaluated_on_time":
                queries = int(round(compl * clamp(0.55 + rng.uniform(-0.1, 0.1), 0.3, 0.8)))
                q_resps = int(round(queries * clamp(0.82 + rng.uniform(-0.08, 0.08), 0.5, 0.98)))
                rows += [{"quarter": q, "series": "Queries", "value": queries}, {"quarter": q, "series": "Query responses", "value": q_resps}]
            elif kpi_id == "pct_granted_within_90_days":
                rows += [{"quarter": q, "series": "Submitted", "value": recvd}, {"quarter": q, "series": "Granted", "value": appr}]

    elif process == "CT":
        title_map = {
            "pct_new_apps_evaluated_on_time_ct": "CT New Applications: Submitted vs Evaluated",
            "pct_amendment_apps_evaluated_on_time": "CT Amendments: Submitted vs Evaluated",
            "pct_gcp_inspections_on_time": "GCP Inspections: Planned vs Conducted",
            "pct_safety_reports_assessed_on_time": "Safety Reports: Submitted vs Assessed",
            "pct_gcp_compliant": "GCP Sites: Assessed vs Compliant",
            "pct_registry_submissions_on_time": "Registry: Total reports vs Published",
            "pct_capa_evaluated_on_time": "CAPA: Raised vs Evaluated",
        }
        title = f"{title_map.get(kpi_id, 'CT comparison')} — {year}"
        for q in year_quarters:
            rec = rec_map.get(q, {})
            recvd = int(rec.get("applications_received", 0) or 0)
            compl = int(rec.get("applications_completed", 0) or 0)
            req_insp = int(rec.get("gcp_inspections_requested", 0) or 0)
            cond_insp = int(rec.get("gcp_inspections_conducted", 0) or 0)
            rng = seeded_rng("CT", kpi_id, q)
            new_ratio = 0.65 + rng.uniform(-0.07, 0.07)
            new_subm = int(round(recvd * new_ratio))
            amd_subm = max(recvd - new_subm, 0)
            new_eval = int(round(compl * max(min(new_ratio + rng.uniform(-0.03, 0.03), 0.85), 0.4)))
            amd_eval = max(compl - new_eval, 0)
            safety_reports = int(round(compl * max(min(0.60 + rng.uniform(-0.1, 0.1), 0.9), 0.3)))
            safety_assessed = int(round(safety_reports * max(min(0.9 + rng.uniform(-0.08, 0.05), 1.0), 0.5)))
            sites_assessed = int(round(cond_insp * max(min(1.2 + rng.uniform(-0.2, 0.2), 2.0), 0.5)))
            sites_compliant = int(round(sites_assessed * max(min(0.9 + rng.uniform(-0.05, 0.05), 1.0), 0.6)))
            registry_sub = int(round(recvd * max(min(0.5 + rng.uniform(-0.1, 0.1), 0.9), 0.3)))
            registry_proc = int(round(registry_sub * max(min(0.9 + rng.uniform(-0.05, 0.05), 1.0), 0.6)))
            capa_raised = int(round(compl * max(min(0.25 + rng.uniform(-0.08, 0.08), 0.6), 0.1)))
            capa_eval = int(round(capa_raised * max(min(0.9 + rng.uniform(-0.08, 0.05), 1.0), 0.5)))

            if kpi_id == "pct_new_apps_evaluated_on_time_ct":
                rows += [{"quarter": q, "series": "Submitted", "value": new_subm}, {"quarter": q, "series": "Evaluated", "value": new_eval}]
            elif kpi_id == "pct_amendment_apps_evaluated_on_time":
                rows += [{"quarter": q, "series": "Submitted", "value": amd_subm}, {"quarter": q, "series": "Evaluated", "value": amd_eval}]
            elif kpi_id == "pct_gcp_inspections_on_time":
                rows += [{"quarter": q, "series": "Planned", "value": req_insp}, {"quarter": q, "series": "Conducted", "value": cond_insp}]
            elif kpi_id == "pct_safety_reports_assessed_on_time":
                rows += [{"quarter": q, "series": "Safety reports", "value": safety_reports}, {"quarter": q, "series": "Assessed", "value": safety_assessed}]
            elif kpi_id == "pct_gcp_compliant":
                rows += [{"quarter": q, "series": "Sites assessed", "value": sites_assessed}, {"quarter": q, "series": "Compliant", "value": sites_compliant}]
            elif kpi_id == "pct_registry_submissions_on_time":
                rows += [{"quarter": q, "series": "Total reports", "value": registry_sub}, {"quarter": q, "series": "Published", "value": registry_proc}]
            elif kpi_id == "pct_capa_evaluated_on_time":
                rows += [{"quarter": q, "series": "CAPA raised", "value": capa_raised}, {"quarter": q, "series": "Evaluated", "value": capa_eval}]

    elif process == "GMP":
        title_map = {
            "pct_facilities_inspected_on_time": "GMP: Submitted vs Inspected by Inspection Type",
            "pct_inspections_waived_on_time": "GMP: Total Inspections vs Waived (Desk/Remote)",
            "pct_facilities_compliant": "GMP: Conducted vs Compliant by Inspection Type",
            "pct_capa_decisions_on_time": "GMP: CAPA Decisions by Inspection Source",
            "pct_applications_completed_on_time": "GMP: Applications by Source",
            "pct_reports_published_on_time": "GMP: Reports Published by Inspection Type",
        }
        title = f"{title_map.get(kpi_id, 'GMP comparison')} — {year}"
        for q in year_quarters:
            rec = rec_map.get(q, {})
            rng = seeded_rng("GMP", kpi_id, q)
            req = {
                "Domestic": int(rec.get("requested_domestic", 0) or 0),
                "Foreign": int(rec.get("requested_foreign", 0) or 0),
                "Reliance": int(rec.get("requested_reliance", 0) or 0),
                "Desk": int(rec.get("requested_desk", 0) or 0),
            }
            cond = {
                "Domestic": int(rec.get("conducted_domestic", 0) or 0),
                "Foreign": int(rec.get("conducted_foreign", 0) or 0),
                "Reliance": int(rec.get("conducted_reliance", 0) or 0),
                "Desk": int(rec.get("conducted_desk", 0) or 0),
            }
            types = ["Domestic", "Foreign", "Reliance", "Desk"]
            waived = {t: int(round(req[t] * clamp(0.12 + rng.uniform(-0.05, 0.05), 0, 0.3))) for t in types}
            compliant = {t: int(round(cond[t] * clamp(0.88 + rng.uniform(-0.06, 0.05), 0.5, 1.0))) for t in types}
            capa = {t: int(round(cond[t] * clamp(0.30 + rng.uniform(-0.1, 0.1), 0.05, 0.7))) for t in types}
            apps_by_src = {t: int(round(req[t] * clamp(1.10 + rng.uniform(-0.2, 0.2), 0.4, 2.0))) for t in types}
            reports = {t: int(round(cond[t] * clamp(0.95 + rng.uniform(-0.05, 0.05), 0.5, 1.2))) for t in types}

            if kpi_id == "pct_facilities_inspected_on_time":
                for t in types:
                    rows += [{"quarter": q, "series": f"{t} — Submitted", "value": req[t]}, {"quarter": q, "series": f"{t} — Inspected", "value": cond[t]}]
            elif kpi_id == "pct_inspections_waived_on_time":
                total_inspections = sum(req.values())
                total_waived = waived["Desk"]
                rows += [{"quarter": q, "series": "Total Inspections", "value": total_inspections}, {"quarter": q, "series": "Waived (Desk/Remote)", "value": total_waived}]
            elif kpi_id == "pct_facilities_compliant":
                for t in types:
                    rows += [{"quarter": q, "series": f"{t} — Conducted", "value": cond[t]}, {"quarter": q, "series": f"{t} — Compliant", "value": compliant[t]}]
            elif kpi_id == "pct_capa_decisions_on_time":
                for t in ["Domestic", "Foreign", "Reliance"]:
                    rows += [{"quarter": q, "series": f"{t} — CAPA decisions", "value": capa[t]}]
            elif kpi_id == "pct_applications_completed_on_time":
                for t in ["Domestic", "Foreign", "Reliance"]:
                    rows += [{"quarter": q, "series": f"{t} — Applications", "value": apps_by_src[t]}]
            elif kpi_id == "pct_reports_published_on_time":
                for t in types:
                    rows += [{"quarter": q, "series": f"{t} — Reports published", "value": reports[t]}]

    df = pd.DataFrame(rows)
    return df, title, ylabel


def _pair_spec_for_kpi(process: str, kpi_id: str) -> Optional[Tuple[Optional[str], str, List[str]]]:
    if process == "MA":
        pairs = {
            "pct_new_apps_evaluated_on_time": ("Submitted", "Evaluated", ["All"]),
            "pct_renewal_apps_evaluated_on_time": ("Submitted", "Evaluated", ["All"]),
            "pct_variation_apps_evaluated_on_time": ("Submitted", "Evaluated", ["All"]),
            "pct_fir_responses_on_time": ("FIR queries", "FIR responses", ["All"]),
            "pct_query_responses_evaluated_on_time": ("Queries", "Query responses", ["All"]),
            "pct_granted_within_90_days": ("Submitted", "Granted", ["All"]),
        }
        return pairs.get(kpi_id)
    if process == "CT":
        pairs = {
            "pct_new_apps_evaluated_on_time_ct": ("Submitted", "Evaluated", ["All"]),
            "pct_amendment_apps_evaluated_on_time": ("Submitted", "Evaluated", ["All"]),
            "pct_gcp_inspections_on_time": ("Planned", "Conducted", ["All"]),
            "pct_safety_reports_assessed_on_time": ("Safety reports", "Assessed", ["All"]),
            "pct_gcp_compliant": ("Sites assessed", "Compliant", ["All"]),
            "pct_registry_submissions_on_time": ("Total reports", "Published", ["All"]),
            "pct_capa_evaluated_on_time": ("CAPA raised", "Evaluated", ["All"]),
        }
        return pairs.get(kpi_id)
    if process == "GMP":
        pairs = {
            "pct_facilities_inspected_on_time": ("Submitted", "Inspected", ["Domestic", "Foreign", "Reliance", "Desk"]),
            "pct_facilities_compliant": ("Conducted", "Compliant", ["Domestic", "Foreign", "Reliance", "Desk"]),
            "pct_inspections_waived_on_time": ("Total Inspections", "Waived (Desk/Remote)", ["All"]),
            "pct_capa_decisions_on_time": (None, "CAPA decisions", ["Domestic", "Foreign", "Reliance"]),
            "pct_applications_completed_on_time": (None, "Applications", ["Domestic", "Foreign", "Reliance"]),
            "pct_reports_published_on_time": ("Conducted", "Reports published", ["Domestic", "Foreign", "Reliance", "Desk"]),
        }
        return pairs.get(kpi_id)
    return None


def _prepare_category_first_df(process: str, kpi_id: str, quarter: str, data: Dict[str, Any]) -> Tuple[pd.DataFrame, str, List[str], List[str]]:
    spec = _pair_spec_for_kpi(process, kpi_id)
    if not spec:
        return pd.DataFrame(), "", [], []

    base_label, compare_label, group_levels = spec

    df_raw, title, _ = build_kpi_comparison_df(process, kpi_id, quarter, data)
    if df_raw.empty:
        return pd.DataFrame(), title, [], []

    rows = []
    for _, r in df_raw.iterrows():
        series = str(r["series"])
        if "—" in series:
            group, category = [s.strip() for s in series.split("—", 1)]
        else:
            group, category = "All", series
        rows.append({"quarter": r["quarter"], "group": group, "category": category, "value": int(r["value"] or 0)})
    d = pd.DataFrame(rows)

    categories = [c for c in [base_label, compare_label] if c is not None] if base_label else [compare_label]
    d = d[d["category"].isin(categories)].copy()

    if base_label is not None and len(group_levels) == 1:
        pair_tot = d.groupby("quarter")["value"].sum().rename("pair_total")
        d = d.merge(pair_tot.reset_index(), on="quarter", how="left")
        d["pct"] = (d["value"] / d["pair_total"]) * 100.0
        if kpi_id == "pct_inspections_waived_on_time":
            total_vals = d[d["category"] == "Total Inspections"].set_index("quarter")["value"]
            waived_rows = d["category"] == "Waived (Desk/Remote)"
            d.loc[waived_rows, "pct"] = (d.loc[waived_rows, "value"] / total_vals[d.loc[waived_rows, "quarter"]].values) * 100
            d.loc[d["category"] == "Total Inspections", "pct"] = 100.0
    else:
        cat_tot = (
            d.groupby(["quarter", "category"], as_index=False)["value"].sum()
             .rename(columns={"value": "cat_total"})
        )
        d = d.merge(cat_tot, on=["quarter", "category"], how="left")
        d["pct"] = np.where(d["cat_total"] > 0, (d["value"] / d["cat_total"]) * 100.0, np.nan)

    if process == "GMP":
        d["group"] = pd.Categorical(d["group"], categories=group_levels, ordered=True)
    else:
        d["group"] = pd.Categorical(d["group"], categories=["All"], ordered=True)

    return d, title, categories, group_levels


def render_kpi_comparison(process: str, kpi_id: str, quarter: str, data: Dict[str, Any]):
    d, title, categories, group_levels = _prepare_category_first_df(process, kpi_id, quarter, data)
    if d.empty or not title:
        st.info("No per-quarter comparison chart for this KPI.")
        return

    fig = go.Figure()

    if process in ("MA", "CT"):
        qorder = sorted(d["quarter"].unique(), key=lambda s: (int(s.split()[1]), int(s.split()[0][1:])))
        for i, cat in enumerate(categories):
            dd = d[d["category"] == cat].groupby("quarter", as_index=False).agg({"value": "sum", "pct": "mean"})
            dd["quarter"] = pd.Categorical(dd["quarter"], categories=qorder, ordered=True)
            color = NDA_GREEN if i == 0 else NDA_ACCENT
            fig.add_bar(
                x=dd["quarter"], y=dd["value"], name=cat,
                marker=dict(color=color),
                text=[f"{int(v):,} ({p:.0f}%)" if not np.isnan(p) else f"{int(v):,} (—)" for v, p in zip(dd["value"], dd["pct"])],
                textposition="outside",
            )
        fig.update_layout(
            title=title,
            barmode="group",
            bargap=0.25,
            bargroupgap=0.15,
            margin=dict(l=10, r=10, t=50, b=10),
            plot_bgcolor=CARD_BG, paper_bgcolor=CARD_BG, font=dict(color=TEXT_DARK),
            legend=dict(orientation="h", y=-0.2),
            xaxis=dict(title=""),
            yaxis=dict(title="count", rangemode="tozero"),
        )
        st.plotly_chart(fig, use_container_width=True)
        return

    def _color_for_group(g: str) -> str:
        return GMP_GROUP_COLORS.get(g, NDA_GREEN)

    qorder = sorted(d["quarter"].unique(), key=lambda s: (int(s.split()[1]), int(s.split()[0][1:])))
    x_axis = []
    for q in qorder:
        for cat in categories:
            x_axis.append((q, cat))

    look = {}
    for _, r in d.iterrows():
        look[(str(r["group"]), r["quarter"], r["category"])] = (int(r["value"]), float(r["pct"]) if not pd.isna(r["pct"]) else np.nan)

    for g in group_levels:
        xs, ys, texts = [], [], []
        for (q, cat) in x_axis:
            v, p = look.get((g, q, cat), (0, np.nan))
            xs.append((q, cat)); ys.append(v)
            texts.append(f"{int(v):,} ({p:.0f}%)" if not np.isnan(p) else f"{int(v):,} (—)")
        fig.add_bar(x=xs, y=ys, name=g, marker=dict(color=_color_for_group(g)), text=texts, textposition="outside")

    fig.update_layout(
        title=title,
        barmode="group",
        bargap=0.25,
        bargroupgap=0.15,
        margin=dict(l=10, r=10, t=50, b=10),
        plot_bgcolor=CARD_BG, paper_bgcolor=CARD_BG, font=dict(color=TEXT_DARK),
        legend=dict(orientation="h", y=-0.2),
        xaxis=dict(title="", type="category"),
        yaxis=dict(title="count", rangemode="tozero"),
    )
    st.plotly_chart(fig, use_container_width=True)

# >>> END: Volume comparison helpers <<<

# =======================
# KPI TREND (respects disaggregation)
# =======================
def kpi_trend(process: str, base_kpi_id: str, kpis_block: Dict[str, Any], quarter: str, disag_choice: str):
    if process == "GMP" and base_kpi_id in [
        "pct_facilities_inspected_on_time", "pct_facilities_compliant", "pct_capa_decisions_on_time",
        "pct_applications_completed_on_time", "pct_reports_published_on_time"
    ] and disag_choice == "All":
        fig = go.Figure()
        child_map = DISAG_KPI_LINKS.get(base_kpi_id, {})
        ref_quarters = None
        for label, kid in child_map.items():
            k = kpis_block.get(kid)
            if not k:
                continue
            series = pd.DataFrame(k["data"])
            if ref_quarters is None:
                ref_quarters = series["quarter"].tolist()
            fig.add_trace(go.Scatter(x=series["quarter"], y=series["value"], name=label, mode="lines+markers"))

        k_base = kpis_block.get(base_kpi_id)
        if k_base:
            series_base = pd.DataFrame(k_base["data"])
            if ref_quarters is None:
                ref_quarters = series_base["quarter"].tolist()
            fig.add_trace(go.Scatter(x=series_base["quarter"], y=series_base["value"], name="Overall", mode="lines+markers", line=dict(width=4, color=NDA_GREEN)))
            target = k_base.get("target"); baseline = k_base.get("baseline")
            if target is not None:
                fig.add_trace(go.Scatter(x=ref_quarters, y=[target]*len(ref_quarters), name="Target", mode="lines", line=dict(dash="dash", color=NDA_ACCENT)))
            if baseline is not None:
                fig.add_trace(go.Scatter(x=ref_quarters, y=[baseline]*len(ref_quarters), name="Baseline", mode="lines", line=dict(dash="dot", color="#94a3b8")))
        y_max = 100 if base_kpi_id.startswith("pct_") else None
        fig.update_layout(
            title=f"Trend vs Target — All disaggregations",
            height=500, margin=dict(l=10, r=10, t=40, b=0),
            yaxis_range=[0, y_max] if y_max else None,
            plot_bgcolor=CARD_BG, paper_bgcolor=CARD_BG, font=dict(color=TEXT_DARK),
            legend=dict(orientation="h", y=-0.2)
        )
        st.plotly_chart(fig, use_container_width=True)
        return

    effective_kpi_id, applied = resolve_effective_kpi_id(base_kpi_id, process, disag_choice)
    k = kpis_block.get(effective_kpi_id) or kpis_block.get(base_kpi_id)
    if not k:
        st.warning("No KPI series found.")
        return

    series = pd.DataFrame(k["data"])
    target = k.get("target"); baseline = k.get("baseline")
    y_max = 100 if effective_kpi_id.startswith("pct_") else None

    fig = go.Figure()
    fig.add_trace(go.Scatter(x=series["quarter"], y=series["value"], name="Performance", mode="lines+markers", line=dict(width=3, color=NDA_GREEN)))
    if target is not None:
        fig.add_trace(go.Scatter(x=series["quarter"], y=[target]*len(series), name="Target", mode="lines", line=dict(dash="dash", color=NDA_ACCENT)))
    if baseline is not None:
        fig.add_trace(go.Scatter(x=series["quarter"], y=[baseline]*len(series), name="Baseline", mode="lines", line=dict(dash="dot", color="#94a3b8")))
    title_suffix = f" — {applied}" if applied else ""
    fig.update_layout(
        title=f"Trend vs Target{title_suffix}",
        height=500, margin=dict(l=10, r=10, t=40, b=0),
        yaxis_range=[0, y_max] if y_max else None,
        plot_bgcolor=CARD_BG, paper_bgcolor=CARD_BG, font=dict(color=TEXT_DARK),
        legend=dict(orientation="h", y=-0.2)
    )
    st.plotly_chart(fig, use_container_width=True)

# =======================
# KPI CARD
# =======================

def kpi_card(kpi_id: str, kpi_obj: Dict[str, Any], quarter: str, *, process: str):
    series = kpi_obj["data"]
    cur = next((x for x in series if x["quarter"] == quarter), None)
    prev_val = None
    if cur:
        idx = series.index(cur)
        if idx > 0: prev_val = series[idx - 1]["value"]

    is_time = kpi_id in TIME_BASED
    is_pct = kpi_id.startswith("pct_")
    delta = None if (not cur or prev_val is None) else (cur["value"] - prev_val)
    vdisp = pct(cur["value"]) if (cur and is_pct) else (f"{cur['value']:.2f}" if cur else "—")
    ddisp = None if delta is None else (f"{'+' if delta>0 else ''}{delta:.1f}" + ("%" if is_pct else ""))
    good_vs_prev = (delta is not None) and ((delta < 0) if is_time else (delta > 0))
    status = status_for(kpi_id, None if not cur else cur["value"], kpi_obj.get("target"))
    bleft = status_color(status)
    btint = status_bg_tint(status)
    status_label = {"success": "On target", "warning": "Near target", "error": "Below target"}.get(status, "—")
    short = KPI_NAME_MAP.get(kpi_id, {}).get("short", kpi_id)

    st.markdown(
        f"""
        <div class='kpi-card' style="border-left: 8px solid {bleft}; background: linear-gradient(180deg, {btint} 0%, rgba(0,0,0,0) 100%);">
        """,
        unsafe_allow_html=True,
    )
    st.markdown(f"<div class='kpi-title'>{short}</div>", unsafe_allow_html=True)
    st.markdown(f"<div class='kpi-value'>{vdisp}</div>", unsafe_allow_html=True)

    chips = []
    if ddisp:
        chips.append(f"<span class='kpi-chip {'ok' if good_vs_prev else 'bad'}'>{ddisp} vs prev</span>")
    chips.append(f"<span class='kpi-chip' style='border-color:{bleft}; color:{bleft};'>{status_label}</span>")
    st.markdown(" ".join(chips), unsafe_allow_html=True)

    st.markdown(f"<div class='kpi-sub'>{tiny_label(kpi_id)}</div>", unsafe_allow_html=True)
    clicked = st.button("View details", key=f"kbtn_{process}_{kpi_id}_{quarter}", use_container_width=True, type="secondary")
    st.markdown("</div>", unsafe_allow_html=True)
    return clicked

# =======================
# HEADER
# =======================
st.markdown(
    """
<div class="header">
  <div>
    <h1>National Drug Authority</h1>
    <p class="subtitle">Regulatory KPI Dashboard</p>
  </div>
  <div class="version">v4.2 — Question-Driven + Enhanced GMP Disaggregations</div>
</div>
""",
    unsafe_allow_html=True,
)

# =======================
# SIDEBAR
# =======================
st.sidebar.image("logo.jpg", use_container_width=True)
data_path = st.sidebar.text_input("Path to data (JSON exported from kpiData.js)", value="data/kpiData.json")
data = load_data(data_path)

tab = st.sidebar.radio("View", ["Overview", "Reports"], index=0, horizontal=False)

# All quarters
all_quarters = sorted(
    {
        q
        for proc in data["quarterlyData"].values()
        for k in proc.values()
        for q in [d["quarter"] for d in k["data"]]
    },
    key=lambda s: (int(s.split()[1]), int(s.split()[0][1:])),
)

# =======================
# SELF-SERVICE PREP & RENDER (IMPROVED) — MOVED UP TO FIX NameError
# =======================
def prep_analysis(
    df: pd.DataFrame,
    analysis_type: str,
    processes: List[str],
    metrics: List[str],
    group_by: str,
    agg: str,
    compare_by_category: bool,
    show_pct_change: bool,
    x_metric: Optional[str] = None,
    y_metric: Optional[str] = None
):
    if df.empty: 
        return pd.DataFrame(), None, None, None, None

    filtered = df[df["process"].isin(processes)].copy()
    is_time_series = group_by in ["quarter", "year"]
    pt = None
    meta = {"color_var": None, "x_col": None, "y_col": None}

    if analysis_type == "Correlation":
        if not (x_metric and y_metric):
            return pd.DataFrame(), None, None, None, None
        filtered = filtered[filtered["metric_name"].isin([x_metric, y_metric])]
        if filtered.empty:
            return pd.DataFrame(), None, None, None, None
        if group_by not in ["quarter", "year"]:
            group_by = "quarter"
        pt_x = pd.pivot_table(filtered[filtered["metric_name"] == x_metric], values="value", index=group_by, aggfunc=agg, fill_value=0)
        pt_x.columns = [metric_display_name(x_metric)]
        pt_y = pd.pivot_table(filtered[filtered["metric_name"] == y_metric], values="value", index=group_by, aggfunc=agg, fill_value=0)
        pt_y.columns = [metric_display_name(y_metric)]
        pt = pt_x.join(pt_y, how="inner").sort_index()
        meta = {"x_col": pt.columns[0], "y_col": pt.columns[1], "color_var": None}
        return pt, agg, meta, "Correlation", None

    if metrics:
        filtered = filtered[filtered["metric_name"].isin(metrics)]
    if filtered.empty:
        return pd.DataFrame(), None, None, None, None

    if compare_by_category and "category" in filtered.columns and filtered["category"].notna().any():
        pt = pd.pivot_table(filtered, values="value", index=group_by, columns="category", aggfunc=agg, fill_value=0)
        pt.columns = [category_display_name(c) for c in pt.columns]
        meta["color_var"] = "category"
    else:
        pt = pd.pivot_table(filtered, values="value", index=group_by, columns="metric_name", aggfunc=agg, fill_value=0)
        pt.columns = [metric_display_name(c) for c in pt.columns]
        meta["color_var"] = "metric_name"

    pct_change_df = None
    if show_pct_change and is_time_series and analysis_type == "Trend" and len(pt) > 1:
        pct_change_df = pt.pct_change(axis=0) * 100
        pct_change_df = pct_change_df.round(1).dropna(how='all')
        pct_change_df.index.name = group_by  # Ensure index name for plotting

    return pt.sort_index(), agg, meta, analysis_type, pct_change_df

def render_analysis_table_and_chart(
    pt: pd.DataFrame,
    pct_change_df: Optional[pd.DataFrame],
    group_by: str,
    display_metrics: List[str],
    agg: str,
    metadata: Any,
    analysis_type: str,
    show_pct_change: bool
):
    if pt is None or pt.empty:
        st.info("No data for the selected filters. Try adjusting your selections above.")
        return

    # Intuitive table with % changes if applicable
    col1, col2 = st.columns([2, 1])
    with col1:
        df_to_show = pct_change_df if show_pct_change and pct_change_df is not None else pt
        st.markdown("**Data Table**")
        # Format: add % for pct_change, otherwise .2f
        if show_pct_change and pct_change_df is not None:
            fmt_dict = {col: "{:.1f}%" for col in df_to_show.columns}
        else:
            fmt_dict = {col: "{:.2f}" for col in df_to_show.columns}
        styled = df_to_show.style.format(fmt_dict)
        st.dataframe(styled, use_container_width=True)
        if show_pct_change and pct_change_df is not None:
            st.caption("*% Change is period-over-period (e.g., Q2 vs Q1). First period shows N/A.*")
    with col2:
        st.markdown("**Quick Actions**")
        csv_download(df_to_show, f"analysis_{analysis_type.lower()}_{agg}{'_pct_change' if show_pct_change else ''}.csv")
        if st.button("🔄 Reset All Filters"):
            st.rerun()

    # Improved chart selection with better defaults and annotations
    chart_options = {
        "Auto (Recommended)": "auto",
        "Line Chart (Trends)": "line",
        "Bar Chart (Comparisons)": "bar",
        "Grouped Bar": "group",
        "Stacked Bar": "stack",
        "Pie Chart (Proportions)": "pie",
        "Scatter Plot": "scatter",
        "Scatter with Trendline & R²": "scatter_reg",
        "Heatmap (Correlations)": "heatmap"
    }
    chart_type = st.selectbox("Chart Type", list(chart_options.keys()), index=0, 
                              help="Auto picks based on analysis: Line for trends, Bar for comparisons, Scatter for correlations, Pie for proportions.")

    selected_chart = chart_options[chart_type]

    if analysis_type == "Correlation" and metadata:
        df_plot = pt.reset_index()
        x_col = metadata.get('x_col'); y_col = metadata.get('y_col'); color_var = metadata.get('color_var')
    else:
        if show_pct_change and pct_change_df is not None:
            melt_df = pct_change_df.reset_index().melt(id_vars=[group_by], var_name=metadata.get('color_var', 'variable'), value_name="value")
        else:
            melt_df = pt.reset_index().melt(id_vars=[group_by], var_name=metadata.get('color_var', 'variable'), value_name="value")
        df_plot = melt_df
        x_col, y_col = group_by, "value"
        color_var = metadata.get('color_var', 'variable')

    if selected_chart == "auto":
        if analysis_type == "Trend" and group_by in ['year', 'quarter']:
            selected_chart = "line"
        elif analysis_type == "Correlation":
            selected_chart = "scatter_reg"
        elif analysis_type == "Comparison":
            selected_chart = "group"
        elif analysis_type == "Proportions":
            selected_chart = "pie"
        else:
            selected_chart = "bar"

    colors = [NDA_GREEN, NDA_ACCENT, PALETTE["info"], PALETTE["violet"], PALETTE["warn"], PALETTE["ok"]]
    fig = go.Figure()
    y_label = "% Change" if show_pct_change and pct_change_df is not None else "Value"
    title = f"{analysis_type} Analysis: {y_label} by {group_by.title()} ({agg.upper()})"
    if show_pct_change:
        title += " — Period-over-Period % Change"

    annotations = []

    if selected_chart == "line":
        fig = px.line(df_plot, x=x_col, y=y_col, color=color_var, markers=True, color_discrete_sequence=colors)
        fig.update_traces(texttemplate='%{y:.1f}' + ('%' if show_pct_change else ''), textposition="top center")
    elif selected_chart in ["bar", "group", "stack"]:
        barmode = "stack" if selected_chart == "stack" else "group"
        fig = px.bar(df_plot, x=x_col, y=y_col, color=color_var, barmode=barmode, color_discrete_sequence=colors)
        fig.update_traces(texttemplate='%{y:.1f}' + ('%' if show_pct_change else ''), textposition="outside")
        title += f" ({'Stacked' if barmode=='stack' else 'Grouped'})"
    elif selected_chart == "pie":
        if len(pt.index) > 1:
            st.warning("Pie charts work best for single periods (proportions). Using Bar chart instead.")
            fig = px.bar(df_plot, x=x_col, y=y_col, color=color_var, barmode="group", color_discrete_sequence=colors)
            fig.update_traces(texttemplate='%{y:.1f}', textposition="outside")
        else:
            fig = px.pie(df_plot, values=y_col, names=color_var, hole=0.4, color_discrete_sequence=colors)
            fig.update_traces(textinfo='label+percent+value', textposition='inside')
            title = f"Proportions by {color_var.title()} ({agg.upper()})"
    elif selected_chart in ["scatter", "scatter_reg"]:
        trendline = "ols" if selected_chart == "scatter_reg" else None
        fig = px.scatter(df_plot, x=x_col, y=y_col, color=color_var if color_var and color_var in df_plot.columns else None,
                         trendline=trendline, color_discrete_sequence=colors)
        fig.update_traces(texttemplate='%{y:.2f}', mode='markers+text', textposition="top center")
        if trendline and len(df_plot) > 1:
            try:
                slope, intercept, r_value, p_value, std_err = stats.linregress(df_plot[x_col].fillna(0), df_plot[y_col].fillna(0))
                r2 = r_value**2
                annotations.append(
                    dict(text=f"R² = {r2:.3f}<br>p = {p_value:.3g}", 
                         xref="paper", yref="paper", x=0.02, y=0.98, showarrow=False,
                         bgcolor="white", bordercolor="grey", borderwidth=1)
                )
                st.caption(f"**Correlation Insights:** Slope = {slope:.3f}, R² = {r2:.3f} ({'Strong' if abs(r_value)>0.7 else 'Moderate' if abs(r_value)>0.3 else 'Weak' if abs(r_value)>0.1 else 'None'} positive/negative correlation), p-value = {p_value:.3g} ({'significant' if p_value<0.05 else 'not significant'})")
            except Exception as e:
                st.caption(f"Could not compute regression: {e}")
    elif selected_chart == "heatmap" and pt.shape[1] >= 2:
        if analysis_type != "Correlation":
            corr_matrix = pt.corr(numeric_only=True)
            fig = px.imshow(corr_matrix, aspect="auto", color_continuous_scale="RdBu_r", text_auto=True)
            title = f"Correlation Heatmap: {y_label} Across {color_var.title()}"
            for i in range(len(corr_matrix.index)):
                for j in range(len(corr_matrix.columns)):
                    val = corr_matrix.iloc[i, j]
                    color = "green" if val > 0.5 else "orange" if val > 0.3 else "red" if val < -0.3 else "grey"
                    annotations.append(dict(x=j, y=i, xref='x', yref='y', text=f"{val:.2f}",
                                            showarrow=False, font=dict(color=color, size=12)))
        else:
            selected_chart = "scatter_reg"  # Fallback for correlation
            # Re-run scatter logic above

    # Update layout with intuitive elements
    fig.update_layout(
        height=450,
        title=dict(text=title, x=0.5, font=dict(size=14, color=TEXT_DARK)),
        xaxis_title=f"{x_col.replace('_', ' ').title()}",
        yaxis_title=f"{y_label} ({'Count' if agg=='sum' else agg.title()})",
        plot_bgcolor=CARD_BG, 
        paper_bgcolor=CARD_BG, 
        font=dict(color=TEXT_DARK),
        legend=dict(orientation="h", yanchor="bottom", y=-0.25, xanchor="center", x=0.5),
        annotations=annotations
    )
    st.plotly_chart(fig, use_container_width=True)

# =======================
# REPORTS DATA FLATTENERS (Volumes + Steps)
# =======================
@st.cache_data(show_spinner=False)
def flatten_volumes(data: Dict[str, Any]) -> pd.DataFrame:
    rows = []
    for proc in ["MA", "CT"]:
        for qd in data.get("quarterlyVolumes", {}).get(proc, []):
            quarter = qd["quarter"]; year = int(quarter.split()[-1])
            for metric, value in qd.items():
                if metric == "quarter": continue
                cat = metric.split('_')[-1] if '_' in metric else None
                rows.append({
                    "source": "volumes",
                    "process": proc,
                    "quarter": quarter,
                    "year": year,
                    "metric_name": metric,
                    "category": cat,
                    "value": (value if isinstance(value, (int, float)) else 0)
                })
    for qd in data.get("inspectionVolumes", {}).get("GMP", []):
        quarter = qd["quarter"]; year = int(quarter.split()[-1])
        for metric, value in qd.items():
            if metric == "quarter": continue
            cat = metric.split('_')[-1] if '_' in metric else None
            rows.append({
                "source": "volumes",
                "process": "GMP",
                "quarter": quarter,
                "year": year,
                "metric_name": metric,
                "category": cat,
                "value": (value if isinstance(value, (int, float)) else 0)
            })
    return pd.DataFrame(rows)

@st.cache_data(show_spinner=False)
def flatten_steps_for_analytics(data: Dict[str, Any]) -> pd.DataFrame:
    """
    Include actual step delays & bottlenecks for analytics:
    - avgDays (actual), targetDays
    - opening_backlog, cycle_time_median, ext_median_days, carry_over_rate, avg_query_cycles, fpy_pct, wait_share_pct
    - plus process & quarter
    """
    rows = []
    # 1) Process steps avgDays/targetDays (from processStepData)
    for proc, steps in data.get("processStepData", {}).items():
        for step_key, obj in steps.items():
            for rec in obj.get("data", []):
                quarter = rec.get("quarter"); 
                if not quarter: continue
                year = int(quarter.split()[-1])
                if "avgDays" in rec:
                    rows.append({"source":"steps","process":proc,"quarter":quarter,"year":year,"metric_name":"step_avg_days","category":strip_disag_suffix(step_key),"value":rec["avgDays"]})
                if "targetDays" in rec:
                    rows.append({"source":"steps","process":proc,"quarter":quarter,"year":year,"metric_name":"step_target_days","category":strip_disag_suffix(step_key),"value":rec["targetDays"]})
    # 2) Bottleneck metrics (from bottleneckData)
    for proc, steps in data.get("bottleneckData", {}).items():
        for step, series in steps.items():
            for rec in series:
                quarter = rec.get("quarter"); 
                if not quarter: continue
                year = int(quarter.split()[-1])
                for m in ["cycle_time_median","ext_median_days","opening_backlog","carry_over_rate","avg_query_cycles","fpy_pct","wait_share_pct","work_to_staff_ratio","sched_median_days"]:
                    if rec.get(m) is not None:
                        rows.append({"source":"bottlenecks","process":proc,"quarter":quarter,"year":year,"metric_name":m,"category":step,"value":rec[m]})
    return pd.DataFrame(rows)

@st.cache_data(show_spinner=False)
def metric_display_name(metric: str) -> str:
    m = {
        # existing volume labels
        "applications_received": "Applications Received",
        "applications_completed": "Applications Completed",
        "approvals_granted": "Approvals Granted",
        "gcp_inspections_requested": "GCP Inspections Requested",
        "gcp_inspections_conducted": "GCP Inspections Conducted",
        "requested_domestic": "Requested - Domestic",
        "requested_foreign": "Requested - Foreign",
        "requested_reliance": "Requested - Reliance",
        "requested_desk": "Requested - Desk/Remote",
        "conducted_domestic": "Conducted - Domestic",
        "conducted_foreign": "Conducted - Foreign",
        "conducted_reliance": "Conducted - Reliance",
        "conducted_desk": "Conducted - Desk/Remote",
        "compliant_domestic": "Compliant - Domestic",
        "compliant_foreign": "Compliant - Foreign",
        "compliant_reliance": "Compliant - Reliance",
        "compliant_desk": "Compliant - Desk/Remote",
        "reports_published": "Reports Published",
        "fir_queries": "FIR Queries",
        "fir_responses": "FIR Responses",
        "queries": "Queries",
        "query_responses": "Query Responses",
        "amendments_received": "Amendments Received",
        "sites_assessed": "Sites Assessed",
        "registry_submissions": "Registry Submissions",
        # steps/bottlenecks
        "step_avg_days": "Step Actual Days",
        "step_target_days": "Step Target Days",
        "opening_backlog": "Opening Backlog",
        "cycle_time_median": "Median Cycle Time (Days)",
        "ext_median_days": "Median External Response (Days)",
        "carry_over_rate": "Carry-Over Rate (%)",
        "avg_query_cycles": "Average Query Cycles",
        "fpy_pct": "First Pass Yield (%)",
        "wait_share_pct": "Wait Time Share (%)",
        "work_to_staff_ratio": "Work-to-Staff Ratio",
        "sched_median_days": "Median Scheduling (Days)",
    }
    return m.get(metric, metric.replace("_", " ").title())

def category_display_name(cat: str) -> str:
    return cat if cat is None else str(cat)

# =======================
# PERIOD FILTER UTILS (Self-Service)
# =======================
def quarter_order_key(q: str):  # "Qx YYYY"
    qn, yr = q.split()
    return (int(yr), int(qn[1:]))

def filter_period(df: pd.DataFrame, mode: str, q_all: List[str], q_single: Optional[str], q_from: Optional[str], q_to: Optional[str], y_from: Optional[int], y_to: Optional[int]) -> pd.DataFrame:
    if df.empty: return df
    if mode == "Single Quarter" and q_single:
        return df[df["quarter"] == q_single]
    if mode == "Quarter Range" and q_from and q_to:
        q_sorted = sorted(q_all, key=quarter_order_key)
        start_idx, end_idx = q_sorted.index(q_from), q_sorted.index(q_to)
        keep = set(q_sorted[start_idx:end_idx+1])
        return df[df["quarter"].isin(keep)]
    if mode == "Year Range" and y_from and y_to:
        return df[(df["year"] >= y_from) & (df["year"] <= y_to)]
    return df

# =======================
# OVERVIEW TAB
# =======================
if tab == "Overview":
    process_default = qp_get("process", None)
    quarter_default = qp_get("quarter", None)

    process = st.sidebar.radio(
        "Process", ["MA", "CT", "GMP"],
        index=(["MA", "CT", "GMP"].index(process_default) if process_default in ["MA", "CT", "GMP"] else 0),
        horizontal=True,
    )
    try:
        st.query_params.update(process=process)
    except Exception:
        st.experimental_set_query_params(process=process)

    quarter = st.sidebar.selectbox(
        "Quarter", all_quarters,
        index=(all_quarters.index(quarter_default) if quarter_default in all_quarters else len(all_quarters) - 1),
    )
    try:
        st.query_params.update(quarter=quarter)
    except Exception:
        st.experimental_set_query_params(quarter=quarter)

    disag_choice = st.sidebar.selectbox(
        "Disaggregation (applies on drill-down & steps)",
        DISAG_UI_OPTIONS.get(process, ["All"]),
        index=0,
        help="KPIs show general view by default. Choose a disaggregation to view disag-specific trend and steps.",
    )

    kpis_block = data["quarterlyData"][process]
    disagg_variants = {v for mapping in DISAG_KPI_LINKS.values() for v in mapping.values()}
    ordered_ids = [k for k in kpis_block.keys() if k not in disagg_variants]

    default_kpi = qp_get("kpi", ordered_ids[0] if ordered_ids else None)
    if default_kpi not in ordered_ids:
        default_kpi = ordered_ids[0] if ordered_ids else None
    if default_kpi:
        init_state(default_kpi)

    # DETAILS VIEW
    if st.session_state.get(FOCUS_KEY):
        kpi_id = st.session_state[FOCUS_KEY]
        if kpi_id not in kpis_block:
            st.session_state[FOCUS_KEY] = default_kpi
            st.rerun()

        effective_kpi_id, applied = resolve_effective_kpi_id(kpi_id, process, disag_choice)
        k = kpis_block.get(effective_kpi_id) or kpis_block[kpi_id]
        cur = next((x for x in k["data"] if x["quarter"] == quarter), None)
        s = status_for(effective_kpi_id, None if not cur else cur["value"], k.get("target"))
        curr_disp = pct(cur['value']) if (effective_kpi_id.startswith('pct_') and cur) else (f"{cur['value']:.2f}" if cur else '—')
        curr_label = f" — {applied}" if applied else ""
        status_label = {"success": "On Target", "warning": "Near Target", "error": "Below Target"}.get(s, "—")
        applied_badge = f"<span class='kpi-chip' style='margin-left:.5rem;border-color:{NDA_DARK_GREEN}; color:{NDA_DARK_GREEN};'>Filter: {applied}</span>" if applied else ""
        if disag_choice != "All" and applied is None:
            st.warning(f"No disaggregated data available for '{disag_choice}' on this KPI. Showing general view.")

        st.markdown(
            f"""
            <div style="border-radius:16px; padding:1.5rem; margin-bottom:2rem; background:#ffffff; border:1px solid {BORDER_COLOR}; box-shadow:0 6px 24px rgba(0,0,0,.08); border-left:12px solid {status_color(s)};">
              <div style="font-size:1.2rem; font-weight:800; color:{TEXT_DARK}; margin-bottom:.75rem;">How is {KPI_NAME_MAP.get(effective_kpi_id, {}).get('long', kpi_id)} tracking against targets?</div>
              <div style="font-size:1rem; opacity:.9;"><b>Current{curr_label} ({quarter})</b>: {curr_disp}{applied_badge} • <b>Target</b>: {pct(k.get('target')) if effective_kpi_id.startswith('pct_') else (k.get('target','—'))} • <b>Baseline</b>: {pct(k.get('baseline')) if effective_kpi_id.startswith('pct_') else (k.get('baseline','—'))} • <b>Status</b>: {status_label}</div>
            </div>
            """,
            unsafe_allow_html=True,
        )

        if st.button("⬅️ Back to Overview", type="primary", use_container_width=True):
            st.session_state[FOCUS_KEY] = None
            try:
                st.query_params.pop("kpi")
            except Exception:
                pass
            st.rerun()

        chart_col1, chart_col2 = st.columns([1.2, 1])
        with chart_col1:
            st.markdown("**What's the volume breakdown for this KPI?**")
            render_kpi_comparison(process, kpi_id, quarter, data)
        with chart_col2:
            st.markdown("**How has this KPI trended over time?**")
            kpi_trend(process, kpi_id, kpis_block, quarter, disag_choice)

        with st.expander(f"🧭 Where are bottlenecks in this process?", expanded=(disag_choice != "All")):
            process_steps_block(process, quarter, data["processStepData"], disag_choice)

        st.stop()

    # ===== Executive row =====
    stat_counts = {"success": 0, "warning": 0, "error": 0}
    for kid in ordered_ids:
        series = kpis_block[kid]["data"]
        cur = next((x for x in series if x["quarter"] == quarter), None)
        s = status_for(kid, None if not cur else cur["value"], kpis_block[kid].get("target"))
        stat_counts[s] += 1
    total_kpis = sum(stat_counts.values())

    def process_step_status_counts(process: str, quarter: str, processStepData: Dict[str, Any]) -> Dict[str, int]:
        all_steps = processStepData.get(process, {})
        counts = {"success": 0, "warning": 0, "error": 0}
        general_steps = {k: v for k, v in all_steps.items() if not any(k.endswith(s) for s in DISAG_SUFFIXES)}
        for step_name, step_obj in general_steps.items():
            series = step_obj["data"]
            cur = next((x for x in series if x["quarter"] == quarter), None)
            if not cur: continue
            metric = cur.get("avgDays"); target = cur.get("targetDays")
            if metric is None or target is None: continue
            status = get_step_status(float(metric), float(target))
            counts[status] += 1
        return counts

    step_counts = process_step_status_counts(process, quarter, data["processStepData"])
    total_steps = sum(step_counts.values())

    panel_open("How are our KPIs performing this quarter?", icon="👀")
    left, right = st.columns(2)
    with left:
        st.markdown("**Are our KPIs meeting targets?**")
        labels = ["On track", "At risk", "Off track"]
        vals = [stat_counts["success"], stat_counts["warning"], stat_counts["error"]]
        fig = px.pie(values=vals, names=labels, hole=0.7, color=labels,
                     color_discrete_map={"On track": NDA_GREEN, "At risk": NDA_ACCENT, "Off track": "#ef4444"})
        fig.update_traces(textinfo="none")
        fig.update_layout(margin=dict(l=0, r=0, t=0, b=0), height=240, showlegend=True, plot_bgcolor=CARD_BG, paper_bgcolor=CARD_BG)
        st.plotly_chart(fig, use_container_width=True, config={"displaylogo": False})
        st.caption(f"{stat_counts['success']} / {total_kpis} KPIs are on track.")
        st.markdown(english_summary(stat_counts, "KPIs"))

    with right:
        st.markdown(f"**Where are delays showing up in {process} steps?**")
        labels = ["On track", "At risk", "Off track"]
        vals = [step_counts["success"], step_counts["warning"], step_counts["error"]]
        fig = px.pie(values=vals, names=labels, hole=0.7, color=labels,
                     color_discrete_map={"On track": NDA_GREEN, "At risk": NDA_ACCENT, "Off track": "#ef4444"})
        fig.update_traces(textinfo="none")
        fig.update_layout(margin=dict(l=0, r=0, t=0, b=0), height=240, showlegend=True, plot_bgcolor=CARD_BG, paper_bgcolor=CARD_BG)
        st.plotly_chart(fig, use_container_width=True, config={"displaylogo": False})
        st.caption(f"{step_counts['success']} / {total_steps} steps are on track.")
        st.markdown(english_summary(step_counts, "process steps"))

    st.info(
        "KPIs reflect **outcome/target** performance (general view). Process steps track **workflow speed** (actual days vs target). Use the sidebar disaggregation to drill down in KPI **details** & **steps**."
    )
    panel_close()

    # KPI grid (general only)
    panel_open(
        f"How is {process} performing on key metrics?",
        icon="📊",
    )
    st.markdown('<div class="kpi-grid">', unsafe_allow_html=True)
    cols_per_row = 4
    for i in range(0, len(ordered_ids), cols_per_row):
        row_cols = st.columns(cols_per_row)
        for j, kpi_id in enumerate(ordered_ids[i:i + cols_per_row]):
            with row_cols[j]:
                if kpi_card(kpi_id, kpis_block[kpi_id], quarter, process=process):
                    select_kpi(kpi_id, process, quarter)
                    st.rerun()
    st.markdown("</div>", unsafe_allow_html=True)
    panel_close()

# =======================
# REPORTS TAB — Self-Service + Bottlenecks (no duplication of steps A vs T chart)
# =======================
else:
    process_reports = st.sidebar.selectbox("Process (Reports)", ["MA", "CT", "GMP"])
    quarter_reports = st.sidebar.selectbox("Quarter (Reports)", all_quarters, index=len(all_quarters) - 1)
    view = st.sidebar.radio("Reports View", ["Quarterly Volumes & Self-Service Analytics", "Bottleneck Analysis"], horizontal=False)

    if view == "Quarterly Volumes & Self-Service Analytics":
        panel_open("What custom insights do you want to uncover?", icon="🧮")
        st.markdown("**Welcome to Self-Service Analytics!** Build custom views of your regulatory data. Start with Period & Scope, then choose an Analysis Type. Use % Change for trends to spot improvements/declines.")

        # Build sources
        df_vol = flatten_volumes(data)
        df_steps = flatten_steps_for_analytics(data)

        # Step 1: Period (guided)
        with st.expander("📅 Over what time frame should we analyze?", expanded=True):
            st.info("Choose a single quarter, range, or year span for your analysis.")
            period_mode = st.radio("Period Mode", ["Single Quarter", "Quarter Range", "Year Range"], horizontal=True, label_visibility="collapsed")
            q_single = q_from = q_to = None
            y_from = y_to = None
            if period_mode == "Single Quarter":
                q_single = st.selectbox("Select Quarter", all_quarters, index=len(all_quarters)-1)
            elif period_mode == "Quarter Range":
                c1, c2 = st.columns(2)
                with c1:
                    q_from = st.selectbox("From Quarter", all_quarters, index=max(0, len(all_quarters)-4))
                with c2:
                    q_to = st.selectbox("To Quarter", all_quarters, index=len(all_quarters)-1)
                if quarter_order_key(q_from) > quarter_order_key(q_to):
                    st.warning("From > To: Auto-swapping.")
                    q_from, q_to = q_to, q_from
            else:  # Year Range
                years = sorted({int(q.split()[1]) for q in all_quarters})
                c1, c2 = st.columns(2)
                with c1:
                    y_from = st.selectbox("From Year", years, index=max(0, len(years)-2))
                with c2:
                    y_to = st.selectbox("To Year", years, index=len(years)-1)
                if y_from > y_to:
                    y_from, y_to = y_to, y_from

        # Step 2: Scope
        with st.expander("🔍 Which processes and metrics matter most?", expanded=True):
            processes_available = sorted(["MA", "CT", "GMP"])
            processes_selected = st.multiselect("Select Processes", processes_available, default=[process_reports],
                                                help="Filter to specific regulatory processes. Leave all for cross-process views.")
            
            include_steps = st.checkbox("Include Workflow Metrics (steps, backlogs, cycle times, etc.)", value=True,
                                        help="Adds process step delays, bottlenecks like carry-over rates, and medians for deeper insights.")

        # Prepare data pool
        pool = pd.concat([df_vol, df_steps if include_steps else pd.DataFrame(columns=df_vol.columns)], ignore_index=True)
        pool = pool[pool["process"].isin(processes_selected)] if processes_selected else pool
        pool = filter_period(pool, period_mode, all_quarters, q_single, q_from, q_to, y_from, y_to)

        if pool.empty:
            st.warning("No data matches your scope & period. Try broadening selections.")
        else:
            # Preview
            st.metric("How much data matches your filters?", len(pool), delta=f"{len(pool['metric_name'].unique())} unique metrics")

        # Step 3: Analytics Builder (intuitive)
        with st.expander("📈 What kind of analysis do you need—trends, comparisons, or correlations?", expanded=True):
            col1, col2, col3 = st.columns(3)
            with col1:
                analysis_type = st.selectbox("Analysis Type", ["Trend", "Comparison", "Correlation", "Proportions"],
                                             index=0, help="Trend: Over time. Comparison: Side-by-side. Correlation: Relationships. Proportions: Shares/Pies.")
            with col2:
                group_by = st.selectbox("Group By", ["quarter", "year"], index=0 if analysis_type=="Trend" else 1,
                                        help="Quarter for detail, Year for overview.")
            with col3:
                agg = st.selectbox("Aggregate", ["sum", "mean", "median"], index=1,
                                   help="Sum for volumes, Mean/Median for averages/rates.")

            # Conditional options
            show_pct_change = False
            if analysis_type == "Trend" and group_by in ["quarter", "year"]:
                show_pct_change = st.checkbox("Show % Change (vs previous period)", value=True,
                                              help="Highlights growth/decline—great for spotting trends!")

            compare_by_category = st.checkbox("Breakdown by Category (e.g., Domestic vs Foreign)", value=False,
                                              help="Splits bars/lines by sub-groups like inspection types.")

            # Metrics selection (intuitive, with search-like multiselect)
            metrics_in_scope = sorted(pool["metric_name"].unique())
            display_metrics_all = [metric_display_name(m) for m in metrics_in_scope]
            name2key = {d: k for d, k in zip(display_metrics_all, metrics_in_scope)}

            x_metric = y_metric = None
            selected_display_metrics = []
            if analysis_type == "Correlation":
                st.info("For correlations, pick exactly 2 metrics to compare (e.g., Applications vs Approvals).")
                two = st.multiselect("Select Two Metrics", display_metrics_all, max_selections=2, default=display_metrics_all[:2])
                if len(two) == 2:
                    x_metric = name2key[two[0]]
                    y_metric = name2key[two[1]]
                    selected_display_metrics = two
            else:
                default_metrics = display_metrics_all[:3] if len(display_metrics_all) > 3 else display_metrics_all
                selected_display_metrics = st.multiselect("Select Metrics (or all for overview)", display_metrics_all, 
                                                          default=default_metrics,
                                                          help="Choose what to analyze. Fewer = clearer charts.")
            selected_metric_keys = [name2key[d] for d in selected_display_metrics] if selected_display_metrics else []

        # Run & Render
        if not pool.empty and selected_metric_keys:
            pt, agg_used, meta, name, pct_df = prep_analysis(
                pool, analysis_type, processes_selected or ["MA", "CT", "GMP"],
                selected_metric_keys, group_by, agg, compare_by_category, show_pct_change, x_metric, y_metric
            )
            display_mets = selected_display_metrics or [metric_display_name(x_metric), metric_display_name(y_metric)] if analysis_type=="Correlation" else []
            render_analysis_table_and_chart(pt, pct_df, group_by, display_mets, agg_used, meta, name, show_pct_change)
        else:
            st.info("👆 Select metrics above to generate your analysis. Example: For trends, pick 'Applications Received' and group by quarter.")

        panel_close()

    else:
        # ---- Bottleneck Analysis (no duplication of Step Actual vs Target from Overview) ----
        @st.cache_data(show_spinner=False)
        def reports_prepare_bottleneck_df(process: str, quarter: str, bottleneck_data: Dict[str, Any]) -> pd.DataFrame:
            steps_data = bottleneck_data.get(process, {})
            if not steps_data:
                default_steps = {
                    "MA": ["Preliminary Screening", "Technical Dossier Review", "Quality Review", "Safety & Efficacy Review", "Queries to Applicant", "Applicant Response Review", "Decision Issued", "License Publication"],
                    "CT": ["Administrative Screening", "Ethics Review", "Technical Review", "GCP Inspection", "Applicant Response Review", "Decision Issued", "Trial Registration"],
                    "GMP": ["Application Screening", "Inspection Planning", "Inspection Conducted", "Inspection Report Drafted", "CAPA Requested", "CAPA Review", "Final Decision Issued", "Report Publication"],
                }
                steps_data = {step: [] for step in default_steps.get(process, ["Generic Step 1", "Generic Step 2"])}

            rows = []
            for step, series in steps_data.items():
                qrec = next((x for x in series if x.get("quarter") == quarter), None) or {}
                random.seed(f"{process}_{quarter}_{step}")
                row = {"step": step}
                row["cycle_time_median"] = qrec.get("cycle_time_median") or random.uniform(10, 60)
                row["ext_median_days"] = qrec.get("ext_median_days") or random.uniform(5, 30)
                row["opening_backlog"] = qrec.get("opening_backlog") or random.randint(5, 50)
                row["carry_over_rate"] = (qrec.get("carry_over_rate") or random.uniform(0.1, 0.4)) * 100
                row["avg_query_cycles"] = qrec.get("avg_query_cycles") or random.uniform(1, 4)
                row["fpy_pct"] = qrec.get("fpy_pct") or random.uniform(70, 95)
                row["wait_share_pct"] = qrec.get("wait_share_pct") or random.uniform(20, 60)
                if process == "MA":
                    row["work_to_staff_ratio"] = qrec.get("work_to_staff_ratio") or random.uniform(1.5, 4.0)
                else:
                    row["sched_median_days"] = qrec.get("sched_median_days") or random.uniform(7, 21)
                rows.append(row)

            df = pd.DataFrame(rows).sort_values("step")
            if df["cycle_time_median"].isna().any():
                np.random.seed(42)
                df.loc[df["cycle_time_median"].isna(), "cycle_time_median"] = np.random.uniform(10, 60, size=df["cycle_time_median"].isna().sum())
            return df

        panel_open(f"Where are the biggest bottlenecks in {process_reports}?", icon="🔬")
        df_b = reports_prepare_bottleneck_df(process_reports, quarter_reports, data.get("bottleneckData", {}))

        c1, c2 = st.columns(2)
        with c1:
            if df_b.empty or "opening_backlog" not in df_b.columns:
                st.info("No backlog data available for this selection.")
            else:
                st.markdown("**Which steps carry the heaviest backlogs?**")
                backlog_df = df_b[["step", "opening_backlog"]].dropna()
                fig = px.bar(backlog_df, y="step", x="opening_backlog", orientation="h",
                             title=f"Backlog Carried Forward in Process Step ({quarter_reports}, {process_reports})",
                             labels={"opening_backlog": "Backlog Items", "step": "Process Steps"}, color_discrete_sequence=[NDA_GREEN])
                fig.update_layout(height=400, plot_bgcolor=CARD_BG, paper_bgcolor=CARD_BG, font=dict(color=TEXT_DARK))
                st.plotly_chart(fig, use_container_width=True)
        with c2:
            if df_b.empty or "cycle_time_median" not in df_b.columns:
                st.info("No cycle time data.")
            else:
                st.markdown("**How long are steps taking to complete?**")
                cycle_df = df_b[["step", "cycle_time_median"]].dropna()
                fig = px.bar(cycle_df, x="step", y="cycle_time_median",
                             title=f"Median Time to Complete This Step (Days, {quarter_reports}, {process_reports})",
                             labels={"cycle_time_median": "Median Days", "step": "Process Steps"}, color_discrete_sequence=[NDA_ACCENT])
                fig.update_layout(height=400, xaxis_tickangle=45, plot_bgcolor=CARD_BG, paper_bgcolor=CARD_BG, font=dict(color=TEXT_DARK))
                st.plotly_chart(fig, use_container_width=True)

        st.divider()
        section_header("What are the key metrics driving bottlenecks?", "📋")
        if df_b.empty:
            st.warning("No bottleneck data for this process and quarter.")
        else:
            core_cols = [
                ("cycle_time_median", "Median Cycle Time (Days)"),
                ("ext_median_days", "Median External Response Time (Days)"),
                ("opening_backlog", "Opening Backlog (Items)"),
                ("carry_over_rate", "Carry-Over Rate (%)"),
                ("avg_query_cycles", "Average Query Cycles"),
                ("fpy_pct", "First Pass Yield (%)"),
                ("wait_share_pct", "Wait Time Share (%)"),
            ]
            spec_col = ("work_to_staff_ratio", "Work-to-Staff Ratio") if process_reports == "MA" else ("sched_median_days", "Median Scheduling Time (Days)")
            display_cols = core_cols + [spec_col]
            raw_cols = [c[0] for c in display_cols]
            display_names = [c[1] for c in display_cols]
            df_display = df_b[raw_cols + ["step"]].set_index("step")
            df_display.columns = display_names
            st.dataframe(df_display.style.format({
                "Median Cycle Time (Days)": "{:.1f}",
                "Median External Response Time (Days)": "{:.1f}",
                "Opening Backlog (Items)": "{:.0f}",
                "Carry-Over Rate (%)": "{:.1f}%",
                "Average Query Cycles": "{:.1f}",
                "First Pass Yield (%)": "{:.1f}%",
                "Wait Time Share (%)": "{:.1f}%",
                "Work-to-Staff Ratio": "{:.1f}",
                "Median Scheduling Time (Days)": "{:.1f}",
            }, na_rep='—'), use_container_width=True)
            st.caption("*Some values may be simulated for visualization if missing in source data.*")
            csv_download(df_display.reset_index(), f"bottleneck_metrics_{process_reports}_{quarter_reports}.csv")

        panel_close()
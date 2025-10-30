import json, pathlib, io
from typing import Dict, Any, List, Tuple

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

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
BG_COLOR = "#f5f9f7"
CARD_BG = "#ffffff"
BORDER_COLOR = "#E5E7EB"

PALETTE = {
    "primary": NDA_GREEN,
    "accent": NDA_ACCENT,
    "ok": NDA_GREEN,
    "warn": "#F59E0B",
    "bad": "#C62828",
    "info": "#1976D2",
    "violet": "#7a4cff",
}

# =======================
# GLOBAL CSS (no top gap)
# =======================
st.markdown(
    f"""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
* {{ font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }}

/* Kill top padding/gap */
html, body, [data-testid="stAppViewContainer"] > .main {{
  padding-top: 0 !important;
}}
.main .block-container {{
  padding-top: .1rem !important;
  padding-bottom: 0 !important;
  background: {BG_COLOR};
}}
.main .block-container > div:first-child {{ margin-top: 0 !important; }}

/* Header */
.header {{
  background:{NDA_GREEN}; color:#fff; padding:.9rem 1.1rem; border-radius:12px; margin-bottom:1rem;
  display:flex; align-items:center; justify-content:space-between;
}}
.header h1 {{ font-size:1.05rem; margin:0; font-weight:900; letter-spacing:.2px; }}
.header p {{ margin:0; opacity:.95; font-size:.85rem; }}

/* Panels */
.panel {{ background:{CARD_BG}; border:1px solid {BORDER_COLOR}; border-radius:12px; box-shadow:0 2px 12px rgba(0,0,0,.04); overflow:hidden; margin-bottom:1rem; }}
.panel-header {{ background:{NDA_GREEN}; color:white; padding:.8rem 1rem; display:flex; align-items:center; justify-content:space-between; }}
.panel-header h3 {{ margin:0; font-weight:700; font-size:1rem; }}
.panel-body {{ padding:1rem; }}

/* Section header */
.section-header {{ color:{NDA_DARK_GREEN}; font-size:1.05rem; font-weight:900; margin:.2rem 0 .6rem; }}

/* KPI card */
.kpi-card {{
  border:1px solid {BORDER_COLOR};
  background: linear-gradient(180deg, rgba(141,198,63,0.10) 0%, rgba(0,99,65,0.04) 100%);
  border-left:6px solid {NDA_GREEN};
  border-radius:12px; padding:1rem;
  box-shadow:0 2px 10px rgba(0,0,0,.05);
  transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease;
}}
.kpi-card:hover {{ transform:translateY(-2px); box-shadow:0 6px 18px rgba(0,0,0,.12); }}

.kpi-title {{ font-weight:900; color:{NDA_DARK_GREEN}; }}
.kpi-value {{ font-size:1.6rem; font-weight:900; color:{TEXT_DARK}; line-height:1; margin:.15rem 0; }}
.kpi-sub {{ font-size:.78rem; color:{TEXT_LIGHT}; text-transform:uppercase; letter-spacing:.04em; }}
.kpi-chip {{ display:inline-block; border-radius:999px; padding:2px 8px; font-weight:800; border:1px solid; font-size:.78rem; }}
.kpi-chip.ok {{ color:{NDA_GREEN}; border-color:{NDA_GREEN}; }}
.kpi-chip.bad {{ color:#ef4444; border-color:#ef4444; }}

/* Click surface subtle */
.kpi-btn > button {{
  border-radius:10px; border:1px dashed {NDA_LIGHT_GREEN}; background:transparent; height:34px;
  width:100%; color:transparent; box-shadow:none;
}}
.kpi-btn > button:hover {{ background:rgba(0,0,0,0.02); }}

/* Inline details panel under card */
.card-details {{
  margin-top:.6rem; border:1px solid {BORDER_COLOR}; border-left:6px solid {NDA_GREEN};
  background:#ffffff; border-radius:10px; padding: .8rem .9rem;
}}
.card-details-header {{ display:flex; gap:1rem; flex-wrap:wrap; align-items:center; }}
.card-details-actions > div > button {{
  border:1px solid {NDA_GREEN}; background:#fff; color:{NDA_GREEN};
}}
.card-details-actions > div > button:hover {{
  background:{NDA_LIGHT_GREEN}; color:{NDA_DARK_GREEN};
}}

/* Drawer toggle */
.drawer-btn > button {{
  border:1px solid {NDA_GREEN}; background:#fff; color:{NDA_GREEN};
}}
.drawer-btn > button:hover {{
  background:{NDA_LIGHT_GREEN}; color:{NDA_DARK_GREEN};
}}

.stProgress > div > div > div > div {{ background-color:{NDA_GREEN}!important; }}
</style>
""",
    unsafe_allow_html=True,
)

# =======================
# KPI NAME MAP
# =======================
KPI_NAME_MAP = {
    "pct_new_apps_evaluated_on_time": {"short": "New Apps on Time", "long": "Percentage of New Applications Evaluated On Time"},
    "pct_renewal_apps_evaluated_on_time": {"short": "Renewals on Time", "long": "Percentage of Renewal Applications Evaluated On Time"},
    "pct_variation_apps_evaluated_on_time": {"short": "Variations on Time", "long": "Percentage of Variation Applications Evaluated On Time"},
    "pct_fir_responses_on_time": {"short": "F.I.R Responses on Time", "long": "Percentage of Further Information Responses On Time"},
    "pct_query_responses_evaluated_on_time": {"short": "Query Responses on Time", "long": "Percentage of Query Responses Evaluated On Time"},
    "pct_granted_within_90_days": {"short": "Granted ≤ 90 Days", "long": "Percentage of Applications Granted Within 90 Days"},
    "median_duration_continental": {"short": "Median Duration", "long": "Median Duration to Grant (Days, Continental)"},
    "pct_new_apps_evaluated_on_time_ct": {"short": "CT New Apps on Time", "long": "Clinical Trials: Percentage of New Applications Evaluated On Time"},
    "pct_amendment_apps_evaluated_on_time": {"short": "Amendments on Time", "long": "Clinical Trials: % of Amendment Applications Evaluated On Time"},
    "pct_gcp_inspections_on_time": {"short": "GCP Inspections on Time", "long": "Clinical Trials: % of GCP Inspections Completed On Time"},
    "pct_safety_reports_assessed_on_time": {"short": "Safety Reports on Time", "long": "Clinical Trials: % of Safety Reports Assessed On Time"},
    "pct_gcp_compliant": {"short": "GCP Compliant", "long": "Clinical Trials: % of Sites Compliant with GCP"},
    "pct_registry_submissions_on_time": {"short": "Registry on Time", "long": "Clinical Trials: % of Registry Submissions On Time"},
    "pct_capa_evaluated_on_time": {"short": "CAPA on Time", "long": "Clinical Trials: % of CAPA Evaluations Completed On Time"},
    "avg_turnaround_time": {"short": "Avg TAT (Days)", "long": "Clinical Trials: Average Turnaround Time (Days)"},
    "pct_facilities_inspected_on_time": {"short": "Facilities Inspected on Time", "long": "GMP: % of Facilities Inspected On Time"},
    "pct_inspections_waived_on_time": {"short": "Waivers on Time", "long": "GMP: % of Inspections Waived On Time"},
    "pct_facilities_compliant": {"short": "Facilities Compliant", "long": "GMP: % of Facilities Compliant"},
    "pct_capa_decisions_on_time": {"short": "CAPA Decisions on Time", "long": "GMP: % of CAPA Decisions on Time"},
    "pct_applications_completed_on_time": {"short": "Apps Completed on Time", "long": "GMP: % of Applications Completed On Time"},
    "avg_turnaround_time_gmp": {"short": "Avg TAT (GMP)", "long": "GMP: Average Turnaround Time (Days)"},
    "median_turnaround_time": {"short": "Median TAT", "long": "GMP: Median Turnaround Time (Days)"},
    "pct_reports_published_on_time": {"short": "Reports on Time", "long": "GMP: % of Reports Published On Time"},
}
TIME_BASED = {"median_duration_continental", "avg_turnaround_time", "avg_turnaround_time_gmp", "median_turnaround_time"}

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
CT_INSPECTIONS_SET = {"pct_gcp_inspections_on_time", "pct_gcp_compliant", "pct_safety_reports_assessed_on_time"}
CT_APPS_SET = {"pct_new_apps_evaluated_on_time_ct", "pct_amendment_apps_evaluated_on_time", "pct_registry_submissions_on_time", "pct_capa_evaluated_on_time", "avg_turnaround_time"}

def tiny_label(kpi_id: str) -> str:
    short = KPI_NAME_MAP.get(kpi_id, {}).get("short", kpi_id)
    t = short.replace("on Time", "").replace("Avg ", "Average ").replace("TAT", "turnaround time").strip()
    return t[0].lower() + t[1:] if t else kpi_id

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
    if kpi_id in TIME_BASED:
        if value <= target: return "success"
        if value <= target * 1.05: return "warning"
        return "error"
    else:
        if value >= target: return "success"
        if value >= target * 0.95: return "warning"
        return "error"

def status_color(status: str) -> str:
    return {"success": PALETTE["ok"], "warning": PALETTE["warn"]}.get(status, PALETTE["bad"])

def pct(v):
    return None if v is None else f"{round(v)}%"

def csv_download(df: pd.DataFrame, filename: str):
    buf = io.StringIO(); df.to_csv(buf, index=False)
    st.download_button("Download CSV", buf.getvalue(), file_name=filename, type="primary")

def qp_all() -> dict:
    try:
        return dict(st.query_params)
    except Exception:
        raw = st.experimental_get_query_params()
        return {k: (v[0] if isinstance(v, list) and v else v) for k, v in raw.items()}

def set_qp_dict(d: dict):
    try:
        st.query_params.update(**d)
    except Exception:
        st.experimental_set_query_params(**d)

def remove_qp_key(key: str):
    qs = qp_all()
    if key in qs:
        qs.pop(key, None)
        set_qp_dict(qs)

def set_qp(**kwargs):
    qs = qp_all()
    qs.update({k: v for k, v in kwargs.items() if v is not None})
    set_qp_dict(qs)

# =======================
# CHARTS
# =======================
def donut(labels: List[str], values: List[float], *, colors: List[str] | None = None, height=220):
    df = pd.DataFrame({"label": labels, "value": values})
    if colors is None:
        colors = [NDA_GREEN, NDA_ACCENT, "#ef4444", "#94a3b8"]
    color_map = {lb: colors[i % len(colors)] for i, lb in enumerate(labels)}
    fig = px.pie(df, values="value", names="label", hole=0.7, color="label", color_discrete_map=color_map)
    fig.update_traces(textinfo="none")
    fig.update_layout(
        margin=dict(l=0, r=0, t=0, b=0),
        height=height,
        showlegend=True,
        legend=dict(orientation="h", y=-0.1),
        plot_bgcolor=CARD_BG,
        paper_bgcolor=CARD_BG,
    )
    st.plotly_chart(fig, use_container_width=True, config={"displaylogo": False})

def stacked_bar(labels: List[str], series: List[Tuple[str, List[float]]]):
    df = pd.DataFrame({"quarter": labels})
    for name, vals in series:
        df[name] = vals
    df = df.melt(id_vars="quarter", var_name="series", value_name="value")
    fig = px.bar(
        df, x="quarter", y="value", color="series", barmode="stack",
        color_discrete_sequence=[NDA_GREEN, NDA_ACCENT, NDA_DARK_GREEN, "#aadc64", "#c8f096", "#3b82f6"],
    )
    fig.update_layout(height=320, margin=dict(l=10, r=10, t=10, b=0), plot_bgcolor=CARD_BG, paper_bgcolor=CARD_BG, font=dict(color=TEXT_DARK))
    st.plotly_chart(fig, use_container_width=True)

def kpi_trend(kpi_id: str, kpi_obj: Dict[str, Any]):
    series = pd.DataFrame(kpi_obj["data"])
    target = kpi_obj.get("target")
    baseline = kpi_obj.get("baseline")
    y_max = 100 if kpi_id.startswith("pct_") else None

    fig = go.Figure()
    fig.add_trace(go.Scatter(x=series["quarter"], y=series["value"], name="Performance", mode="lines+markers", line=dict(width=3, color=NDA_GREEN)))
    if target is not None:
        fig.add_trace(go.Scatter(x=series["quarter"], y=[target] * len(series), name="Target", mode="lines", line=dict(dash="dash", color=NDA_ACCENT)))
    if baseline is not None:
        fig.add_trace(go.Scatter(x=series["quarter"], y=[baseline] * len(series), name="Baseline", mode="lines", line=dict(dash="dot", color="#94a3b8")))
    fig.update_layout(height=300, margin=dict(l=10, r=10, t=10, b=0), yaxis_range=[0, y_max] if y_max else None, plot_bgcolor=CARD_BG, paper_bgcolor=CARD_BG, font=dict(color=TEXT_DARK))
    st.plotly_chart(fig, use_container_width=True)

# =======================
# VOLUMES
# =======================
def volumes_chart(active_process: str, quarterlyVolumes: Dict[str, Any], inspectionVolumes: Dict[str, Any], mode_by_proc: Dict[str, str]):
    if active_process == "MA":
        qv = quarterlyVolumes["MA"]
        labels = [d["quarter"] for d in qv]
        if mode_by_proc.get("MA", "apps") == "apps":
            ds = [("Applications received", [d["applications_received"] for d in qv]),
                  ("Applications completed", [d["applications_completed"] for d in qv])]
        else:
            ds = [("Approvals granted", [d["approvals_granted"] for d in qv])]
    elif active_process == "CT":
        qv = quarterlyVolumes["CT"]
        labels = [d["quarter"] for d in qv]
        if mode_by_proc.get("CT", "apps") == "apps":
            ds = [("Applications received", [d["applications_received"] for d in qv]),
                  ("Applications completed", [d["applications_completed"] for d in qv])]
        else:
            ds = [("GCP inspections requested", [d["gcp_inspections_requested"] for d in qv]),
                  ("GCP inspections conducted", [d["gcp_inspections_conducted"] for d in qv])]
    else:
        iv = inspectionVolumes["GMP"]
        labels = [d["quarter"] for d in iv]
        ds = [("Inspections requested — Domestic", [d["requested_domestic"] for d in iv]),
              ("Inspections requested — Foreign", [d["requested_foreign"] for d in iv]),
              ("Inspections requested — Reliance/Desk", [(d.get("requested_reliance", 0) + d.get("requested_desk", 0)) for d in iv]),
              ("Inspections conducted — Domestic", [d["conducted_domestic"] for d in iv]),
              ("Inspections conducted — Foreign", [d["conducted_foreign"] for d in iv]),
              ("Inspections conducted — Reliance/Desk", [(d.get("conducted_reliance", 0) + d.get("conducted_desk", 0)) for d in iv])]
    stacked_bar(labels, ds)

# =======================
# PANELS & UI HELPERS
# =======================
def section_header(title: str, icon: str = "✅"):
    st.markdown(f"""<div class="section-header">{icon} {title}</div>""", unsafe_allow_html=True)

def panel_open(title: str, icon: str = ""):
    st.markdown(
        f"""
        <div class="panel">
          <div class="panel-header"><h3>{icon} {title}</h3></div>
          <div class="panel-body">
        """,
        unsafe_allow_html=True,
    )

def panel_close():
    st.markdown("</div></div>", unsafe_allow_html=True)

def kpi_card(kpi_id: str, kpi_obj: Dict[str, Any], quarter: str, *, process: str):
    """Renders a KPI card with an inline 'Open KPI' button. Returns True if clicked."""
    st.markdown(f"<a id='kpi-{kpi_id}'></a>", unsafe_allow_html=True)  # anchor
    series = kpi_obj["data"]
    cur = next((x for x in series if x["quarter"] == quarter), None)
    prev_val = None
    if cur:
        idx = series.index(cur)
        if idx > 0:
            prev_val = series[idx - 1]["value"]

    is_time = kpi_id in TIME_BASED
    is_pct = kpi_id.startswith("pct_")
    delta = None if (not cur or prev_val is None) else (cur["value"] - prev_val)
    vdisp = pct(cur["value"]) if (cur and is_pct) else (f"{cur['value']:.2f}" if cur else "—")
    ddisp = None if delta is None else (f"{'+' if delta>0 else ''}{delta:.1f}" + ("%" if is_pct else ""))
    good = (delta is not None) and ((delta < 0) if is_time else (delta > 0))
    chip_html = f"<span class='kpi-chip {'ok' if good else 'bad'}'>{ddisp} vs prev</span>" if ddisp else ""
    short = KPI_NAME_MAP.get(kpi_id, {}).get("short", kpi_id)

    st.markdown("<div class='kpi-card'>", unsafe_allow_html=True)
    st.markdown(f"<div class='kpi-title'>{short}</div>", unsafe_allow_html=True)
    st.markdown(f"<div class='kpi-value'>{vdisp}</div>", unsafe_allow_html=True)
    if chip_html:
        st.markdown(chip_html, unsafe_allow_html=True)
    st.markdown(f"<div class='kpi-sub'>{tiny_label(kpi_id)}</div>", unsafe_allow_html=True)
    st.markdown("<div class='kpi-btn'>", unsafe_allow_html=True)
    clicked = st.button("Open KPI", key=f"kbtn_{process}_{kpi_id}_{quarter}", use_container_width=True)
    st.markdown("</div>", unsafe_allow_html=True)
    st.markdown("</div>", unsafe_allow_html=True)
    return clicked

def kpi_details_inline(kpi_id: str, kpi_obj: Dict[str, Any], quarter: str, *, process: str):
    """Renders the details panel UNDER the card column, with Close action."""
    cur = next((x for x in kpi_obj["data"] if x["quarter"] == quarter), None)
    s = status_for(kpi_id, None if not cur else cur["value"], kpi_obj.get("target"))

    st.markdown("<div class='card-details'>", unsafe_allow_html=True)
    st.markdown(
        f"""
        <div class="card-details-header" style="border-left:6px solid {status_color(s)}; padding-left:.6rem;">
          <div style="font-weight:900;">{KPI_NAME_MAP.get(kpi_id, {}).get('long', kpi_id)}</div>
          <div><b>Current ({quarter})</b>: {pct(cur['value']) if (kpi_id.startswith('pct_') and cur) else (f"{cur['value']:.2f}" if cur else '—')}</div>
          <div><b>Target</b>: {pct(kpi_obj.get('target')) if kpi_id.startswith('pct_') else (kpi_obj.get('target','—'))}</div>
          <div><b>Baseline</b>: {pct(kpi_obj.get('baseline')) if kpi_id.startswith('pct_') else (kpi_obj.get('baseline','—'))}</div>
          <div><b>Status</b>: {"On Target" if s=='success' else ("Near Target" if s=='warning' else "Below Target")}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    c1, c2 = st.columns([1, 1])
    with c1:
        kpi_trend(kpi_id, kpi_obj)
    with c2:
        # Volumes mode logic for CT
        mode_by_proc = {"MA": "apps", "CT": "apps"}
        if kpi_id in CT_INSPECTIONS_SET:
            mode_by_proc["CT"] = "inspections"
        elif kpi_id in CT_APPS_SET:
            mode_by_proc["CT"] = "apps"
        section_header(f"Quarter {quarter} — volumes", "📦")
        # We need the data dicts; pull from st.session_state cache set in app
    # (we'll inject a small closure to call volumes here)
    st.markdown("</div>", unsafe_allow_html=True)  # close .card-details wrapper

# =======================
# HEADER
# =======================
st.markdown(
    """
<div class="header">
  <div>
    <h1>National Drug Authority — Regulatory KPIs</h1>
    <p>Overview first • Inline KPI drilldowns • Close to return home</p>
  </div>
  <div style="font-size:.85rem;opacity:.95;">v2.3</div>
</div>
""",
    unsafe_allow_html=True,
)

# =======================
# SIDEBAR
# =======================
st.sidebar.image(
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Flag_of_Uganda.svg/1200px-Flag_of_Uganda.svg.png",
    caption="Uganda NDA",
    use_container_width=True,
)
data_path = st.sidebar.text_input("Path to data (JSON exported from kpiData.js)", value="data/kpiData.json")
data = load_data(data_path)

tab = st.sidebar.radio("View", ["Overview", "Reports"], index=0, horizontal=False)

# Collect all quarters
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
# OVERVIEW
# =======================
if tab == "Overview":
    process_default = qp_all().get("process", "MA")
    quarter_default = qp_all().get("quarter", all_quarters[-1])

    process = st.sidebar.radio(
        "Process", ["MA", "CT", "GMP"],
        index=(["MA", "CT", "GMP"].index(process_default) if process_default in ["MA", "CT", "GMP"] else 0),
        horizontal=True,
    )
    quarter = st.sidebar.selectbox(
        "Quarter", all_quarters,
        index=(all_quarters.index(quarter_default) if quarter_default in all_quarters else len(all_quarters) - 1),
    )
    set_qp(process=process, quarter=quarter, tab="Overview")

    # ===== TOP INSIGHTS =====
    kpis_block = data["quarterlyData"][process]
    stat_counts = {"success": 0, "warning": 0, "error": 0}
    for kpi_id, kpi_obj in kpis_block.items():
        cur = next((x for x in kpi_obj["data"] if x["quarter"] == quarter), None)
        s = status_for(kpi_id, None if not cur else cur["value"], kpi_obj.get("target"))
        stat_counts[s] += 1

    steps = data["processStepData"].get(process, {})
    on, off = 0, 0
    for _, obj in steps.items():
        qrec = next((d for d in obj["data"] if d["quarter"] == quarter), None)
        if not qrec:
            continue
        if qrec["avgDays"] <= qrec["targetDays"]: on += 1
        else: off += 1

    total_kpis = sum(stat_counts.values()) or 1
    on_pct, near_pct = round(stat_counts["success"]/total_kpis*100), round(stat_counts["warning"]/total_kpis*100)
    off_pct = 100 - on_pct - near_pct
    total_steps = (on + off) or 1
    steps_on_pct, steps_off_pct = round(on/total_steps*100), round(off/total_steps*100)

    panel_open("Overview insights", icon="🧠")
    c0, c1, c2 = st.columns([1, 1, 2])
    with c0:
        section_header("KPI status mix", "📊")
        donut(["On track", "At risk", "Off track"], [stat_counts["success"], stat_counts["warning"], stat_counts["error"]])
    with c1:
        section_header("Process steps status", "🧭")
        donut(["On-track", "Off-track"], [on, off], colors=[NDA_GREEN, "#ef4444"])
    with c2:
        section_header("Auto insights", "💬")
        st.markdown(
            f"""
            <ul style="line-height:1.6;margin-top:.2rem">
              <li><b>{on_pct}%</b> of KPIs are on track; <b>{near_pct}%</b> near target; <b>{off_pct}%</b> off track.</li>
              <li><b>{steps_on_pct}%</b> of process steps meet/beat target; <b>{steps_off_pct}%</b> exceed target days.</li>
              <li>Click a KPI card below to deep-dive; close it to return to this clean overview.</li>
            </ul>
            """,
            unsafe_allow_html=True,
        )
    panel_close()

    # ===== KPI GRID (NO SCROLL) =====
    panel_open("KPI cards", icon="🗂️")
    GRID_COLS = 4
    ordered_ids = list(kpis_block.keys())

    # IMPORTANT: At launch, show NO details. Only show after a click or deep link (?kpi=...)
    if "sel_kpi" not in st.session_state:
        st.session_state["sel_kpi"] = qp_all().get("kpi", None)

    # We'll need volumes data inside inline details; stash pointers in session for the closure below
    st.session_state["_volume_refs"] = {
        "quarterlyVolumes": data["quarterlyVolumes"],
        "inspectionVolumes": data["inspectionVolumes"],
        "process": process,
    }

    rows = [ordered_ids[i:i+GRID_COLS] for i in range(0, len(ordered_ids), GRID_COLS)]
    for row_ids in rows:
        cols = st.columns(GRID_COLS, gap="small")
        for col, kpi_id in zip(cols, row_ids):
            with col:
                # --- Card ---
                if kpi_card(kpi_id, kpis_block[kpi_id], quarter, process=process):
                    st.session_state["sel_kpi"] = kpi_id
                    set_qp(kpi=kpi_id, process=process, quarter=quarter, tab="Overview")
                    st.rerun()

                # --- Inline details under this card if selected ---
                if st.session_state.get("sel_kpi") == kpi_id:
                    # Inline details header + charts
                    st.markdown("<div class='card-details'>", unsafe_allow_html=True)

                    # Header strip
                    cur = next((x for x in kpis_block[kpi_id]["data"] if x["quarter"] == quarter), None)
                    status = status_for(kpi_id, None if not cur else cur["value"], kpis_block[kpi_id].get("target"))
                    st.markdown(
                        f"""
                        <div class="card-details-header" style="border-left:6px solid {status_color(status)}; padding-left:.6rem;">
                          <div style="font-weight:900;">{KPI_NAME_MAP.get(kpi_id, {}).get('long', kpi_id)}</div>
                          <div><b>Current ({quarter})</b>: {pct(cur['value']) if (kpi_id.startswith('pct_') and cur) else (f"{cur['value']:.2f}" if cur else '—')}</div>
                          <div><b>Target</b>: {pct(kpis_block[kpi_id].get('target')) if kpi_id.startswith('pct_') else (kpis_block[kpi_id].get('target','—'))}</div>
                          <div><b>Baseline</b>: {pct(kpis_block[kpi_id].get('baseline')) if kpi_id.startswith('pct_') else (kpis_block[kpi_id].get('baseline','—'))}</div>
                          <div><b>Status</b>: {"On Target" if status=='success' else ("Near Target" if status=='warning' else "Below Target")}</div>
                        </div>
                        """,
                        unsafe_allow_html=True,
                    )

                    c1, c2 = st.columns([1, 1])
                    with c1:
                        kpi_trend(kpi_id, kpis_block[kpi_id])
                    with c2:
                        # Determine CT mode based on KPI
                        mode_by_proc = {"MA": "apps", "CT": "apps"}
                        if kpi_id in CT_INSPECTIONS_SET: mode_by_proc["CT"] = "inspections"
                        elif kpi_id in CT_APPS_SET: mode_by_proc["CT"] = "apps"
                        section_header(f"Quarter {quarter} — volumes", "📦")
                        volumes_chart(
                            st.session_state["_volume_refs"]["process"],
                            st.session_state["_volume_refs"]["quarterlyVolumes"],
                            st.session_state["_volume_refs"]["inspectionVolumes"],
                            mode_by_proc
                        )

                    # Close/Hide actions
                    st.markdown("<div class='card-details-actions'>", unsafe_allow_html=True)
                    cclose, csp = st.columns([1, 4])
                    with cclose:
                        if st.button("Close details", key=f"close_{kpi_id}"):
                            # Clear selection and remove 'kpi' from URL
                            st.session_state["sel_kpi"] = None
                            remove_qp_key("kpi")
                            st.rerun()
                    st.markdown("</div>", unsafe_allow_html=True)

                    st.markdown("</div>", unsafe_allow_html=True)  # /card-details

    panel_close()

    # ===== PROCESS STEPS DRAWER (hidden by default) =====
    if "show_steps" not in st.session_state:
        st.session_state["show_steps"] = False

    drawer_cols = st.columns([1, 6, 1])
    with drawer_cols[1]:
        st.markdown("<div class='drawer-btn'>", unsafe_allow_html=True)
        if st.button(("Close process steps drawer" if st.session_state["show_steps"] else "Open process steps drawer"), use_container_width=True):
            st.session_state["show_steps"] = not st.session_state["show_steps"]
            st.rerun()
        st.markdown("</div>", unsafe_allow_html=True)

    if st.session_state["show_steps"]:
        panel_open("Process steps analysis", icon="🧩")
        all_steps = data["processStepData"].get(process, {})
        rows = []
        for step, step_obj in all_steps.items():
            series = step_obj["data"]
            cur = next((x for x in series if x["quarter"] == quarter), None)
            if not cur:
                continue
            metric = cur.get("avgDays")
            target = cur.get("targetDays")
            if metric is None or target is None:
                continue
            rows.append({"step": step, "Actual days": float(metric), "Target days": float(target), "Variance": float(metric - target)})

        if rows:
            df_bar = pd.DataFrame(rows)
            dfm = df_bar.melt(id_vars="step", value_vars=["Target days", "Actual days"], var_name="type", value_name="days")
            fig = px.bar(dfm, x="step", y="days", color="type", barmode="group", color_discrete_sequence=[NDA_GREEN, "#ef4444"])
            fig.update_layout(height=360, margin=dict(l=10, r=10, t=10, b=80), xaxis_tickangle=45, plot_bgcolor=CARD_BG, paper_bgcolor=CARD_BG)
            st.plotly_chart(fig, use_container_width=True)

            st.dataframe(df_bar.sort_values("step"), use_container_width=True, hide_index=True)
            csv_download(df_bar, f"process_steps_{process}_{quarter}.csv")
        else:
            st.info("No process step data for this quarter.")
        panel_close()

# =======================
# REPORTS
# =======================
if tab == "Reports":
    process = st.sidebar.selectbox("Process (table)", ["MA", "CT", "GMP"])
    quarter = st.sidebar.selectbox("Quarter (table)", all_quarters, index=len(all_quarters) - 1)
    view = st.sidebar.radio("View", ["Quarterly Volumes", "Bottleneck Metrics"], horizontal=True)
    set_qp(tab="Reports", process=process, quarter=quarter)

    if view == "Quarterly Volumes":
        panel_open(f"Quarterly volumes — {process}", icon="📦")
        volumes_chart(process, data["quarterlyVolumes"], data["inspectionVolumes"], {"MA": "apps", "CT": "apps"})
        rows = data["quarterlyVolumes"][process] if process in ["MA", "CT"] else data["inspectionVolumes"]["GMP"]
        df = pd.DataFrame(rows)
        st.dataframe(df, use_container_width=True, hide_index=True)
        csv_download(df, f"quarterly_volumes_{process}.csv")
        panel_close()
    else:
        panel_open(f"Bottleneck metrics — {process} ({quarter})", icon="🔬")
        cols = [
            ("cycle_time_median", "Cycle time (median)"),
            ("ext_median_days", "External responsiveness (median)"),
            ("opening_backlog", "Opening backlog"),
            ("carry_over_rate", "Carry-over rate"),
            ("avg_query_cycles", "Avg query cycles"),
            ("fpy_pct", "FPY %"),
            ("wait_share_pct", "Wait share %"),
        ]
        steps = data["bottleneckData"].get(process, {})
        table_rows = []
        for step, series in steps.items():
            qrec = next((x for x in series if x["quarter"] == quarter), None)
            if not qrec:
                continue
            row = {"step": step}
            for key, _ in cols:
                if key == "cycle_time_median":
                    t = qrec.get("touch_median_days")
                    w = qrec.get("wait_median_days")
                    row[key] = None if (t is None and w is None) else float((t or 0) + (w or 0))
                else:
                    # =================================================================
                    # FIXED BUG: This line was missing, causing an incomplete table.
                    # =================================================================
                    row[key] = qrec.get(key)
            table_rows.append(row)

        if table_rows:
            df = pd.DataFrame(table_rows)
            df = df.rename(columns={k: v for k, v in cols})
            st.dataframe(df, use_container_width=True, hide_index=True)
            csv_download(df, f"bottleneck_metrics_{process}_{quarter}.csv")
        else:
            st.info("No bottleneck data available for this selection.")
        panel_close()
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
# THEME TOKENS (match GCP-themed green)
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
# GLOBAL CSS (GCP-style panels, green-fade KPI cards, headers)
# =======================
st.markdown(
    f"""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
* {{ font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }}

.main .block-container {{ padding-top: .6rem; padding-bottom: 0; background: {BG_COLOR}; }}

/* Header */
.header {{ background:{NDA_GREEN}; color:#fff; padding:.8rem 1rem; border-radius:10px; margin-bottom:1rem; display:flex; align-items:center; justify-content:space-between; }}
.header h1 {{ font-size:1.05rem; margin:0; font-weight:700; }}
.header p {{ margin:0; opacity:.9; font-size:.85rem; }}

/* Panels */
.panel {{ background:{CARD_BG}; border:1px solid {BORDER_COLOR}; border-radius:10px; box-shadow:0 2px 12px rgba(0,0,0,.04); overflow:hidden; margin-bottom:1rem; }}
.panel-header {{ background:{NDA_GREEN}; color:white; padding:.8rem 1rem; display:flex; align-items:center; justify-content:space-between; border-radius:10px 10px 0 0; }}
.panel-header h3 {{ margin:0; font-weight:600; font-size:1rem; }}
.panel-body {{ padding:1rem; }}

/* Section header (inline badge) */
.section-header {{ color:{NDA_DARK_GREEN}; font-size:1.05rem; font-weight:700; margin:1rem 0 .5rem; }}

/* KPI rail + cards */
.kpi-rail {{ display:flex; gap:.75rem; overflow-x:auto; padding:.25rem .25rem .5rem; scroll-snap-type:x mandatory; }}
.kpi-rail::-webkit-scrollbar {{ height:8px; }}
.kpi-rail::-webkit-scrollbar-thumb {{ background: {NDA_LIGHT_GREEN}; border-radius: 999px; }}

/* We keep smooth st.button interaction, but style the underlying button like your card */
.kpi-btn > button {{
  width: 280px; min-width: 280px; scroll-snap-align:start; text-align:left;
  background: linear-gradient(180deg, rgba(141,198,63,0.14) 0%, rgba(0,99,65,0.06) 100%);
  border:1px solid {NDA_LIGHT_GREEN};
  border-left:6px solid {NDA_GREEN};
  border-radius:12px; padding:1rem;
  box-shadow:0 2px 10px rgba(0,0,0,.05);
  transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease;
  color: {TEXT_DARK};
}}
.kpi-btn > button:hover {{ transform: translateY(-2px); box-shadow:0 6px 18px rgba(0,0,0,.12); }}
.kpi-btn.active > button {{ border-color:{NDA_DARK_GREEN}; box-shadow:0 6px 18px rgba(0,99,65,.18); }}

/* Title/value/sub text inside the card */
.kpi-title {{ font-weight:800; color:{NDA_DARK_GREEN}; }}
.kpi-value {{ font-size:1.6rem; font-weight:800; color:{TEXT_DARK}; line-height:1; margin:.1rem 0; }}
.kpi-sub {{ font-size:.8rem; color:{TEXT_LIGHT}; text-transform:uppercase; letter-spacing:.04em; }}

/* Delta chips */
.kpi-chip {{ display:inline-block; border-radius:999px; padding:2px 8px; font-weight:700; border:1px solid; }}
.kpi-chip.ok {{ color:{NDA_GREEN}; border-color:{NDA_GREEN}; }}
.kpi-chip.bad {{ color:#ef4444; border-color:#ef4444; }}

/* Progress color */
.stProgress > div > div > div > div {{ background-color: {NDA_GREEN}!important; }}

/* Layout tweaks */
div[data-testid="stHorizontalBlock"] {{ gap:.75rem; }}

/* Pager buttons */
.pager-btn > button {{
  border: 1px solid {NDA_GREEN}; color: {NDA_GREEN}; background: white;
}}
.pager-btn > button:hover {{ background:{NDA_LIGHT_GREEN}; }}
</style>
""",
    unsafe_allow_html=True,
)

# =======================
# KPI NAME MAP (short/long)
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
# KPI → PROCESS & MODE MAPPINGS (kept intact)
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
CT_INSPECTIONS_SET = {"pct_gcp_inspections_on_time", "pct_gcp_compliant", "pct_safety_reports_assessed_on_time"}
CT_APPS_SET = {"pct_new_apps_evaluated_on_time_ct", "pct_amendment_apps_evaluated_on_time", "pct_registry_submissions_on_time", "pct_capa_evaluated_on_time", "avg_turnaround_time"}

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
        if value <= target:
            return "success"
        if value <= target * 1.05:
            return "warning"
        return "error"
    else:
        if value >= target:
            return "success"
        if value >= target * 0.95:
            return "warning"
        return "error"

def status_color(status: str) -> str:
    return {"success": PALETTE["ok"], "warning": PALETTE["warn"]}.get(status, PALETTE["bad"])

def pct(v): return None if v is None else f"{round(v)}%"

def csv_download(df: pd.DataFrame, filename: str):
    buf = io.StringIO(); df.to_csv(buf, index=False)
    st.download_button("Download CSV", buf.getvalue(), file_name=filename, type="primary")

def last_n(series: List[Dict[str, Any]], n=6): return series[-n:]

# --- Query params helper ---
def qp_all() -> dict:
    try:
        return dict(st.query_params)
    except Exception:
        raw = st.experimental_get_query_params()
        return {k: (v[0] if isinstance(v, list) and v else v) for k, v in raw.items()}

def qp_get(key: str, default=None):
    return qp_all().get(key, default)

# --- Smooth selection state ---
SEL_KEY = "sel_kpi"
RAIL_START_KEY = "rail_start"

def init_state(default_kpi: str):
    if SEL_KEY not in st.session_state:
        st.session_state[SEL_KEY] = default_kpi
    if RAIL_START_KEY not in st.session_state:
        st.session_state[RAIL_START_KEY] = 0

def select_kpi(kpi_id: str, process: str, quarter: str):
    mapped_proc = KPI_PROCESS_MAP.get(kpi_id, process)
    st.session_state[SEL_KEY] = kpi_id
    # keep URL in sync (no hard navigation)
    try:
        st.query_params.update(kpi=kpi_id, process=mapped_proc, quarter=quarter, tab="Overview")
    except Exception:
        st.experimental_set_query_params(kpi=kpi_id, process=mapped_proc, quarter=quarter, tab="Overview")

def page_window(ids: List[str], page_size: int) -> List[str]:
    start = st.session_state.get(RAIL_START_KEY, 0)
    start = max(0, min(start, max(0, len(ids) - page_size)))
    return ids[start:start + page_size]

# =======================
# PANELS & SECTION HEADERS
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

# --- KPI button (smooth + themed like your CSS) ---
def kpi_button(kpi_id: str, kpi_obj: Dict[str, Any], quarter: str, active: bool, *, process: str):
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

    # Wrap for styling
    st.markdown(f"<div class='kpi-btn {'active' if active else ''}'>", unsafe_allow_html=True)
    # Card body text (title/value/sub) above the button
    st.markdown(f"<div class='kpi-title'>{short}</div>", unsafe_allow_html=True)
    st.markdown(f"<div class='kpi-value'>{vdisp}</div>", unsafe_allow_html=True)
    if chip_html:
        st.markdown(chip_html, unsafe_allow_html=True)
    st.markdown(f"<div class='kpi-sub'>{tiny_label(kpi_id)}</div>", unsafe_allow_html=True)

    # Click surface = button (styled as card via CSS above)
    clicked = st.button(
        " ",  # empty label; visual content is provided by the HTML above
        key=f"kbtn_{process}_{kpi_id}_{quarter}",
        use_container_width=True,
    )
    st.markdown("</div>", unsafe_allow_html=True)

    if clicked:
        select_kpi(kpi_id, process, quarter)

# =======================
# INSIGHTS donuts + dynamic bar (with theme)
# =======================
def donut(labels: List[str], values: List[float]):
    df = pd.DataFrame({"label": labels, "value": values})
    fig = px.pie(
        df,
        values="value",
        names="label",
        hole=0.7,
        color="label",
        color_discrete_map={
            labels[0]: NDA_GREEN if labels else NDA_GREEN,
            labels[1] if len(labels) > 1 else "b": NDA_ACCENT,
            labels[2] if len(labels) > 2 else "c": "#ef4444",
        },
    )
    fig.update_traces(textinfo="none")
    fig.update_layout(
        margin=dict(l=0, r=0, t=0, b=0),
        height=220,
        showlegend=False,
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
        df,
        x="quarter",
        y="value",
        color="series",
        barmode="stack",
        color_discrete_sequence=[NDA_GREEN, NDA_ACCENT, NDA_DARK_GREEN, "#aadc64", "#c8f096", "#3b82f6"],
    )
    fig.update_layout(
        height=320,
        margin=dict(l=10, r=10, t=10, b=0),
        plot_bgcolor=CARD_BG,
        paper_bgcolor=CARD_BG,
        font=dict(color=TEXT_DARK),
    )
    st.plotly_chart(fig, use_container_width=True)

# =======================
# VOLUMES (like OverviewVolumesChart)
# =======================
def volumes_chart(active_process: str, quarterlyVolumes: Dict[str, Any], inspectionVolumes: Dict[str, Any], mode_by_proc: Dict[str, str]):
    if active_process == "MA":
        qv = quarterlyVolumes["MA"]
        labels = [d["quarter"] for d in qv]
        if mode_by_proc.get("MA", "apps") == "apps":
            ds = [
                ("Applications received", [d["applications_received"] for d in qv]),
                ("Applications completed", [d["applications_completed"] for d in qv]),
            ]
        else:
            ds = [("Approvals granted", [d["approvals_granted"] for d in qv])]
    elif active_process == "CT":
        qv = quarterlyVolumes["CT"]
        labels = [d["quarter"] for d in qv]
        if mode_by_proc.get("CT", "apps") == "apps":
            ds = [
                ("Applications received", [d["applications_received"] for d in qv]),
                ("Applications completed", [d["applications_completed"] for d in qv]),
            ]
        else:
            ds = [
                ("GCP inspections requested", [d["gcp_inspections_requested"] for d in qv]),
                ("GCP inspections conducted", [d["gcp_inspections_conducted"] for d in qv]),
            ]
    else:
        iv = inspectionVolumes["GMP"]
        labels = [d["quarter"] for d in iv]
        ds = [
            ("Inspections requested — Domestic", [d["requested_domestic"] for d in iv]),
            ("Inspections requested — Foreign", [d["requested_foreign"] for d in iv]),
            ("Inspections requested — Reliance/Desk", [(d.get("requested_reliance", 0) + d.get("requested_desk", 0)) for d in iv]),
            ("Inspections conducted — Domestic", [d["conducted_domestic"] for d in iv]),
            ("Inspections conducted — Foreign", [d["conducted_foreign"] for d in iv]),
            ("Inspections conducted — Reliance/Desk", [(d.get("conducted_reliance", 0) + d.get("conducted_desk", 0)) for d in iv]),
        ]
    stacked_bar(labels, ds)

# =======================
# PROCESS STEPS BAR (actual vs target) + TABLE
# =======================
def process_steps_block(process: str, quarter: str, processStepData: Dict[str, Any], bottleneckData: Dict[str, Any]):
    all_steps = processStepData.get(process, {})
    rows = []
    for step, step_obj in all_steps.items():
        series = step_obj["data"]
        cur = next((x for x in series if x["quarter"] == quarter), None)
        if not cur: continue
        metric = cur.get("avgDays")
        target = cur.get("targetDays")
        if metric is None or target is None: continue
        rows.append({"step": step, "metricDays": float(metric), "targetDays": float(target), "variance": float(metric - target)})

    if not rows:
        st.info("No process step data for this quarter.")
        return

    df_bar = pd.DataFrame({
        "step": [r["step"] for r in rows],
        "Target days": [r["targetDays"] for r in rows],
        "Actual days": [r["metricDays"] for r in rows],
    })
    dfm = df_bar.melt(id_vars="step", var_name="type", value_name="days")
    fig = px.bar(dfm, x="step", y="days", color="type", barmode="group", color_discrete_sequence=[NDA_GREEN, "#ef4444"])
    fig.update_layout(height=360, margin=dict(l=10, r=10, t=10, b=80), xaxis_tickangle=45, plot_bgcolor=CARD_BG, paper_bgcolor=CARD_BG)
    st.plotly_chart(fig, use_container_width=True)

    df_tbl = pd.DataFrame(rows).sort_values("step")
    st.dataframe(df_tbl, use_container_width=True, hide_index=True)
    csv_download(df_tbl, f"process_steps_{process}_{quarter}.csv")

# =======================
# KPI DETAILS (trend vs target/baseline)
# =======================
def kpi_trend(process: str, kpi_id: str, kpi_obj: Dict[str, Any]):
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
    fig.update_layout(height=340, margin=dict(l=10, r=10, t=10, b=0), yaxis_range=[0, y_max] if y_max else None, plot_bgcolor=CARD_BG, paper_bgcolor=CARD_BG, font=dict(color=TEXT_DARK))
    st.plotly_chart(fig, use_container_width=True)

# =======================
# APP
# =======================

# Header
st.markdown(
    """
<div class="header">
  <div>
    <h1>National Drug Authority — Regulatory KPIs</h1>
    <p>GCP-style theme • Executive overview</p>
  </div>
  <div style="font-size:.85rem;opacity:.9;">v1.4 (smooth + your KPI card colors)</div>
</div>
""",
    unsafe_allow_html=True,
)

# Sidebar (filters + data path)
st.sidebar.image(
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Flag_of_Uganda.svg/1200px-Flag_of_Uganda.svg.png",
    caption="Uganda NDA",
    use_column_width=True,
)
data_path = st.sidebar.text_input("Path to data (JSON exported from kpiData.js)", value="data/kpiData.json")
data = load_data(data_path)

tab = st.sidebar.radio("View", ["Overview", "Reports"], index=0, horizontal=False)

# shared quarters
all_quarters = sorted(
    {
        q
        for proc in data["quarterlyData"].values()
        for k in proc.values()
        for q in [d["quarter"] for d in k["data"]]
    },
    key=lambda s: (int(s.split()[1]), int(s.split()[0][1:])),
)

if tab == "Overview":
    # Persisted defaults from query params if present
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

    # KPI rail (scrollable, clickable, smooth)
    panel_open(
        "Marketing Authorization KPIs" if process == "MA" else ("Clinical Trials KPIs" if process == "CT" else "GMP Compliance KPIs"),
        icon="📊",
    )
    kpis_block = data["quarterlyData"][process]
    ordered_ids = list(kpis_block.keys())

    default_kpi = qp_get("kpi", ordered_ids[0] if ordered_ids else None)
    # initialize smooth selection state
    if SEL_KEY not in st.session_state:
        st.session_state[SEL_KEY] = default_kpi

    # pager
    rail_cols = st.columns([1, 12, 1])
    with rail_cols[0]:
        st.markdown("<div class='pager-btn'>", unsafe_allow_html=True)
        if st.button("◀", key="kpi_prev", use_container_width=True, help="Previous"):
            st.session_state[RAIL_START_KEY] = max(0, st.session_state.get(RAIL_START_KEY, 0) - 4)
        st.markdown("</div>", unsafe_allow_html=True)

    with rail_cols[2]:
        st.markdown("<div class='pager-btn'>", unsafe_allow_html=True)
        if st.button("▶", key="kpi_next", use_container_width=True, help="Next"):
            st.session_state[RAIL_START_KEY] = min(
                max(0, len(ordered_ids) - 4),
                st.session_state.get(RAIL_START_KEY, 0) + 4
            )
        st.markdown("</div>", unsafe_allow_html=True)

    def page_window(ids: List[str], page_size: int) -> List[str]:
        start = st.session_state.get(RAIL_START_KEY, 0)
        start = max(0, min(start, max(0, len(ids) - page_size)))
        return ids[start:start + page_size]

    visible_ids = page_window(ordered_ids, page_size=4)

    st.markdown('<div class="kpi-rail">', unsafe_allow_html=True)
    ccols = st.columns(4, gap="small")
    # status counts across all KPIs of this process
    stat_counts = {"success": 0, "warning": 0, "error": 0}
    for kpi_id in ordered_ids:
        series = kpis_block[kpi_id]["data"]
        cur = next((x for x in series if x["quarter"] == quarter), None)
        s = status_for(kpi_id, None if not cur else cur["value"], kpis_block[kpi_id].get("target"))
        stat_counts[s] += 1

    for idx, kpi_id in enumerate(visible_ids):
        with ccols[idx]:
            active = (st.session_state[SEL_KEY] == kpi_id)
            kpi_button(kpi_id, kpis_block[kpi_id], quarter, active=active, process=process)

    st.markdown("</div>", unsafe_allow_html=True)
    panel_close()

    # CT volumes mode determined by selected KPI
    sel_kpi = st.session_state.get(SEL_KEY, ordered_ids[0] if ordered_ids else None)
    mode_by_proc = {"MA": "apps", "CT": "apps"}  # defaults
    if sel_kpi in CT_INSPECTIONS_SET:
        mode_by_proc["CT"] = "inspections"
    elif sel_kpi in CT_APPS_SET:
        mode_by_proc["CT"] = "apps"

    # KPI details panel
    panel_open("KPI details", icon="🧭")
    if sel_kpi and sel_kpi in kpis_block:
        k = kpis_block[sel_kpi]
        cur = next((x for x in k["data"] if x["quarter"] == quarter), None)
        s = status_for(sel_kpi, None if not cur else cur["value"], k.get("target"))
        st.markdown(
            f"""
            <div style="display:flex;flex-wrap:wrap;gap:1rem;align-items:center;padding:.6rem 1rem;margin:.2rem 0 1rem 0; border-left:6px solid {status_color(s)}; background:rgba(0,0,0,.03); border-radius:8px;">
              <div style="font-weight:900;">{KPI_NAME_MAP.get(sel_kpi, {}).get('long', sel_kpi)}</div>
              <div><b>Current ({quarter})</b>: {pct(cur['value']) if (sel_kpi.startswith('pct_') and cur) else (f"{cur['value']:.2f}" if cur else '—')}</div>
              <div><b>Target</b>: {pct(k.get('target')) if sel_kpi.startswith('pct_') else (k.get('target','—'))}</div>
              <div><b>Baseline</b>: {pct(k.get('baseline')) if sel_kpi.startswith('pct_') else (k.get('baseline','—'))}</div>
              <div><b>Status</b>: {"On Target" if s=='success' else ("Near Target" if s=='warning' else "Below Target")}</div>
            </div>
            """,
            unsafe_allow_html=True,
        )

        c1, c2 = st.columns([1, 1])
        with c1:
            section_header("KPI performance mix", "🧩")
            c1a, c1b = st.columns(2)
            with c1a:
                st.markdown("**KPI status count (this process)**")
                donut(["On track", "At risk", "Off track"], [stat_counts["success"], stat_counts["warning"], stat_counts["error"]])
            with c1b:
                st.markdown("**Process steps on/off track**")
                steps = data["processStepData"][process]
                on = off = 0
                for step, obj in steps.items():
                    qrec = next((d for d in obj["data"] if d["quarter"] == quarter), None)
                    if not qrec: continue
                    if qrec["avgDays"] <= qrec["targetDays"]: on += 1
                    else: off += 1
                donut(["On-track", "Off-track"], [on, off])
            section_header(f"Quarter {quarter} — volumes", "📦")
            volumes_chart(process, data["quarterlyVolumes"], data["inspectionVolumes"], mode_by_proc)
        with c2:
            kpi_trend(process, sel_kpi, k)
    else:
        mp = KPI_PROCESS_MAP.get(sel_kpi, process) if sel_kpi else process
        st.info(f"This KPI belongs to the **{mp}** process. The view will reflect that once the sidebar updates.")
    panel_close()

    section_header("Process step analysis", "📈")
    panel_open("Process steps", icon="📊")
    process_steps_block(process, quarter, data["processStepData"], data["bottleneckData"])
    panel_close()

elif tab == "Reports":
    process = st.sidebar.selectbox("Process (table)", ["MA", "CT", "GMP"])
    quarter = st.sidebar.selectbox("Quarter (table)", all_quarters, index=len(all_quarters) - 1)
    view = st.sidebar.radio("View", ["Quarterly Volumes", "Bottleneck Metrics"], horizontal=True)

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
            if not qrec: continue
            row = {"step": step}
            for key, _ in cols:
                if key == "cycle_time_median":
                    t = qrec.get("touch_median_days"); w = qrec.get("wait_median_days")
                    row[key] = None if (t is None and w is None) else float((t or 0) + (w or 0))
                else:
                    v = qrec.get(key)
                    row[key] = v if (v is None or isinstance(v, (int, float))) else None
            table_rows.append(row)
        df = pd.DataFrame(table_rows)
        st.dataframe(df, use_container_width=True, hide_index=True)
        csv_download(df, f"bottleneck_curated_{process}_{quarter}.csv")
        panel_close()

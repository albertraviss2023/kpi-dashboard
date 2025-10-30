# app.py — NDA Regulatory KPI Dashboard (full fixed version)
# - Overview preserved exactly (incl. original process steps drawer using avgDays)
# - Reports: Self-service analytics w/ safe melt + multiple analyses
# - Reports: Bottleneck per-step charts (cycle time median & opening backlog) above table

import json, pathlib, io, random, base64
from typing import Dict, Any, List, Tuple

import numpy as np
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

# =======================
# GLOBAL CSS
# =======================
st.markdown(
    f"""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
* {{ font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }}
html, body, [data-testid="stAppViewContainer"] > .main {{ padding-top: 0 !important; }}
.main .block-container {{ padding-top:.1rem !important; padding-bottom:0 !important; background:{BG_COLOR}; }}
.main .block-container > div:first-child {{ margin-top:0 !important; }}

/* HEADER */
.app-header {{
  background: linear-gradient(180deg, #07573f 0%, #06563e 100%);
  border: 1px solid rgba(255,255,255,0.08); color: #fff; border-radius: 14px;
  padding: 16px 18px; box-shadow: 0 8px 24px rgba(0,0,0,.10); margin-bottom: 14px;
}}
.app-header__row {{ display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; }}
.app-header__title {{ display:flex; align-items:center; gap:12px; }}
.app-header__title .app-header__logo {{
  width:38px; height:38px; border-radius:8px; object-fit:cover;
  border:1px solid rgba(255,255,255,.25); box-shadow: 0 2px 8px rgba(0,0,0,.15);
}}
.app-header__title h1 {{ margin:0; font-size: 1.15rem; font-weight: 900; letter-spacing:.2px; }}
.app-header__subtitle {{ margin-top:2px; opacity:.92; font-size:.86rem; font-weight:600; }}
.badge {{
  display:inline-block; padding:6px 10px; border-radius:999px;
  background: rgba(255,255,255,0.10); border:1px solid rgba(255,255,255,0.18);
  font-weight:800; font-size:.78rem; letter-spacing:.02em;
}}
.app-header__divider {{ height:1px; background: linear-gradient(90deg, rgba(255,255,255,.18), rgba(255,255,255,.05) 60%, transparent); margin-top:10px; border-radius:1px; }}

/* TOOLBAR */
.toolbar {{
  background: linear-gradient(180deg, rgba(0,99,65,.08) 0%, rgba(0,99,65,.04) 100%);
  border: 1px solid {NDA_LIGHT_GREEN}; border-radius: 12px; padding: 12px 14px;
  box-shadow: 0 2px 8px rgba(0,0,0,.04); margin: 10px 0 6px;
}}
.toolbar .stRadio > label, .toolbar .stSelectbox > label {{ font-weight:800; color:{NDA_DARK_GREEN}; }}
.toolbar .stRadio, .toolbar .stSelectbox {{ margin-bottom: 0; }}

/* PANELS */
.panel {{ background:{CARD_BG}; border:1px solid {BORDER_COLOR}; border-radius:12px; box-shadow:0 2px 12px rgba(0,0,0,.04); overflow:hidden; margin-bottom:1rem; }}
.panel-header {{ background:{NDA_GREEN}; color:white; padding:.8rem 1rem; display:flex; align-items:center; justify-content:space-between; }}
.panel-header h3 {{ margin:0; font-weight:700; font-size:1rem; }}
.panel-body {{ padding:1rem; }}
.section-header {{ color:{NDA_DARK_GREEN}; font-size:1.05rem; font-weight:900; margin:.2rem 0 .6rem; }}

/* KPI card */
.kpi-card {{
  border:1px solid {BORDER_COLOR}; background:#ffffff; border-left:6px solid {NDA_GREEN};
  border-radius:12px; padding:1rem; box-shadow:0 2px 10px rgba(0,0,0,.05);
  transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease;
}}
.kpi-card:hover {{ transform:translateY(-2px); box-shadow:0 6px 18px rgba(0,0,0,.12); }}
.kpi-title {{ font-weight:900; color:{NDA_DARK_GREEN}; }}
.kpi-value {{ font-size:1.6rem; font-weight:900; color:{TEXT_DARK}; line-height:1; margin:.15rem 0; }}
.kpi-sub {{ font-size:.78rem; color:{TEXT_LIGHT}; text-transform:uppercase; letter-spacing:.04em; }}
.kpi-chip {{ display:inline-block; border-radius:999px; padding:2px 8px; font-weight:800; border:1px solid; font-size:.78rem; }}
.kpi-chip.ok {{ color:{NDA_GREEN}; border-color:{NDA_GREEN}; }}
.kpi-chip.bad {{ color:#ef4444; border-color:#ef4444; }}

/* SIDEBAR */
[data-testid="stSidebar"] {{ background:#fff; border-right:1px solid {BORDER_COLOR}; }}
.sidebar-shell {{ padding: 14px 12px 18px 12px; }}
.sidebar-card {{ background:#fff; border:1px solid {BORDER_COLOR}; border-radius:12px; box-shadow:0 2px 10px rgba(0,0,0,.04); padding:12px; margin-bottom:12px; }}
.sidebar-logo {{ display:flex; align-items:center; gap:10px; margin-bottom:10px; }}
.sidebar-logo .brand {{ font-weight:900; color:{TEXT_DARK}; line-height:1.1; }}
.sidebar-section-title {{ font-size:.9rem; font-weight:800; color:{TEXT_DARK}; margin:.2rem 0 .4rem; }}

.stRadio > label, .stSelectbox > label, .stTextInput > label {{ font-weight:700; color:{TEXT_DARK}; }}
.stRadio, .stSelectbox, .stTextInput {{ margin-bottom:.6rem; }}
.stButton>button {{ border-radius:10px; }}
.stProgress > div > div > div > div {{ background-color:{NDA_GREEN}!important; }}
</style>
""",
    unsafe_allow_html=True,
)

# =======================
# KPI MAPS
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
    "pct_capa_decisions_on_time": {"short": "CAPA Decisions on Time", "long": "GMP: % of CAPA Decisions On Time"},
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
    if value is None or target is None: return "error"
    if kpi_id in TIME_BASED:
        if value <= target: return "success"
        if value <= target * 1.05: return "warning"
        return "error"
    else:
        if value >= target: return "success"
        if value >= target * 0.95: return "warning"
        return "error"

def status_color(status: str) -> str:
    return {"success": NDA_GREEN, "warning": "#F59E0B"}.get(status, "#C62828")

def status_bg_tint(status: str) -> str:
    return {
        "success": "rgba(0, 99, 65, 0.09)",
        "warning": "rgba(245, 158, 11, 0.12)",
        "error":   "rgba(198, 40, 40, 0.12)",
    }.get(status, "rgba(0,0,0,0.04)")

def pct(v): 
    return None if v is None else f"{round(v)}%"

def csv_download(df: pd.DataFrame, filename: str):
    buf = io.StringIO(); df.to_csv(buf, index=False)
    st.download_button("Download CSV", buf.getvalue(), file_name=filename, type="primary")

def qp_all() -> dict:
    try: return dict(st.query_params)
    except Exception:
        raw = st.experimental_get_query_params()
        return {k: (v[0] if isinstance(v, list) and v else v) for k, v in raw.items()}

def set_qp_dict(d: dict):
    try: st.query_params.update(**d)
    except Exception: st.experimental_set_query_params(**d)

def remove_qp_key(key: str):
    qs = qp_all()
    if key in qs:
        qs.pop(key, None)
        set_qp_dict(qs)

def set_qp(**kwargs):
    qs = qp_all(); qs.update({k: v for k, v in kwargs.items() if v is not None})
    set_qp_dict(qs)

def parse_quarter_label(label: str) -> Tuple[int, int]:
    parts = label.strip().split()
    q = int(parts[0][1:]); y = int(parts[1])
    return q, y

def year_of_quarter_label(label: str) -> int:
    return parse_quarter_label(label)[1]

def quarters_in_year(labels: List[str], year: int) -> List[str]:
    qs = [lb for lb in labels if year_of_quarter_label(lb) == year]
    return sorted(qs, key=lambda s: parse_quarter_label(s)[0])

# =======================
# CHART PRIMITIVES
# =======================
def donut(labels: List[str], values: List[float], *, colors: List[str] | None = None, height=220):
    df = pd.DataFrame({"label": labels, "value": values})
    if colors is None:
        colors = [NDA_GREEN, NDA_ACCENT, "#ef4444", "#94a3b8"]
    color_map = {lb: colors[i % len(colors)] for i, lb in enumerate(labels)}
    fig = px.pie(df, values="value", names="label", hole=0.7, color="label", color_discrete_map=color_map)
    fig.update_traces(textinfo="none")
    fig.update_layout(margin=dict(l=0, r=0, t=0, b=0), height=height, showlegend=True,
                      legend=dict(orientation="h", y=-0.1), plot_bgcolor=CARD_BG, paper_bgcolor=CARD_BG)
    st.plotly_chart(fig, use_container_width=True, config={"displaylogo": False})

def kpi_trend(kpi_id: str, kpi_obj: Dict[str, Any], height=440):
    series = pd.DataFrame(kpi_obj["data"])
    target = kpi_obj.get("target"); baseline = kpi_obj.get("baseline")
    y_max = 100 if kpi_id.startswith("pct_") else None

    fig = go.Figure()
    fig.add_trace(go.Scatter(x=series["quarter"], y=series["value"], name="Performance",
                             mode="lines+markers", line=dict(width=3, color=NDA_GREEN)))
    if target is not None:
        fig.add_trace(go.Scatter(x=series["quarter"], y=[target] * len(series), name="Target",
                                 mode="lines", line=dict(dash="dash", color=NDA_ACCENT, width=3)))
    if baseline is not None:
        fig.add_trace(go.Scatter(x=series["quarter"], y=[baseline] * len(series), name="Baseline",
                                 mode="lines", line=dict(dash="dot", color="#94a3b8", width=2)))
    fig.update_layout(height=height, margin=dict(l=10, r=10, t=10, b=0),
                      yaxis_range=[0, y_max] if y_max else None,
                      plot_bgcolor=CARD_BG, paper_bgcolor=CARD_BG, font=dict(color=TEXT_DARK))
    st.plotly_chart(fig, use_container_width=True)

# =======================
# KPI-SPECIFIC COMPARISON BARS
# =======================
def seeded_rng(*parts) -> random.Random:
    s = "|".join(str(p) for p in parts)
    r = random.Random(); r.seed(s)
    return r

def clamp(v, lo, hi): return max(lo, min(hi, v))

def build_kpi_comparison_df(process: str, kpi_id: str, quarter: str, data: Dict[str, Any]) -> Tuple[pd.DataFrame, str, str]:
    if kpi_id in TIME_BASED:
        return pd.DataFrame(columns=["quarter", "series", "value"]), "", ""

    year = year_of_quarter_label(quarter)
    def labels_from(block_list): return [d["quarter"] for d in block_list]

    if process in ["MA", "CT"]:
        qlist = data["quarterlyVolumes"][process]
        year_quarters = quarters_in_year(labels_from(qlist), year)
        rec_map = {d["quarter"]: d for d in qlist if d["quarter"] in year_quarters}
    else:
        qlist = data["inspectionVolumes"]["GMP"]
        year_quarters = quarters_in_year(labels_from(qlist), year)
        rec_map = {d["quarter"]: d for d in qlist if d["quarter"] in year_quarters}

    if not year_quarters:
        return pd.DataFrame(columns=["quarter", "series", "value"]), f"No volume data for {year}", ""

    rows = []; title = ""; ylabel = "count"

    # ---- MA ----
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
            var_subm_ratio = clamp(1.0 - (new_ratio + ren_ratio), 0.1, 0.4)

            new_subm = int(round(recvd * new_ratio))
            ren_subm = int(round(recvd * ren_ratio))
            var_subm = clamp(recvd - new_subm - ren_subm, 0, recvd)

            new_eval = int(round(compl * (new_ratio + rng.uniform(-0.03, 0.03))))
            ren_eval = int(round(compl * (ren_ratio + rng.uniform(-0.03, 0.03))))
            var_eval = clamp(compl - new_eval - ren_eval, 0, compl)

            queries = int(round(compl * clamp(0.55 + rng.uniform(-0.1, 0.1), 0.3, 0.8)))
            q_resps = int(round(queries * clamp(0.82 + rng.uniform(-0.08, 0.08), 0.5, 0.98)))
            fir_q = int(round(compl * clamp(0.35 + rng.uniform(-0.08, 0.08), 0.15, 0.6)))
            fir_r = int(round(fir_q * clamp(0.88 + rng.uniform(-0.05, 0.05), 0.6, 1.0)))

            if kpi_id == "pct_new_apps_evaluated_on_time":
                rows += [{"quarter": q, "series": "Submitted", "value": new_subm},
                         {"quarter": q, "series": "Evaluated", "value": new_eval}]
            elif kpi_id == "pct_renewal_apps_evaluated_on_time":
                rows += [{"quarter": q, "series": "Submitted", "value": ren_subm},
                         {"quarter": q, "series": "Evaluated", "value": ren_eval}]
            elif kpi_id == "pct_variation_apps_evaluated_on_time":
                rows += [{"quarter": q, "series": "Submitted", "value": var_subm},
                         {"quarter": q, "series": "Evaluated", "value": var_eval}]
            elif kpi_id == "pct_fir_responses_on_time":
                rows += [{"quarter": q, "series": "FIR queries", "value": fir_q},
                         {"quarter": q, "series": "FIR responses", "value": fir_r}]
            elif kpi_id == "pct_query_responses_evaluated_on_time":
                rows += [{"quarter": q, "series": "Queries", "value": queries},
                         {"quarter": q, "series": "Query responses", "value": q_resps}]
            elif kpi_id == "pct_granted_within_90_days":
                rows += [{"quarter": q, "series": "Submitted", "value": recvd},
                         {"quarter": q, "series": "Granted", "value": appr}]

    # ---- CT ----
    elif process == "CT":
        title_map = {
            "pct_new_apps_evaluated_on_time_ct": "CT New Applications: Submitted vs Evaluated",
            "pct_amendment_apps_evaluated_on_time": "CT Amendments: Submitted vs Evaluated",
            "pct_gcp_inspections_on_time": "GCP Inspections: Requested vs Conducted",
            "pct_safety_reports_assessed_on_time": "Safety Reports: Submitted vs Assessed",
            "pct_gcp_compliant": "GCP Sites: Assessed vs Compliant",
            "pct_registry_submissions_on_time": "Registry Submissions: Submitted vs Processed",
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
            safety_assessed = int(round(safety_reports * max(min(0.85 + rng.uniform(-0.08, 0.05), 1.0), 0.5)))
            sites_assessed = int(round(cond_insp * max(min(1.2 + rng.uniform(-0.2, 0.2), 2.0), 0.5)))
            sites_compliant = int(round(sites_assessed * max(min(0.9 + rng.uniform(-0.05, 0.05), 1.0), 0.6)))
            registry_sub = int(round(recvd * max(min(0.5 + rng.uniform(-0.1, 0.1), 0.9), 0.3)))
            registry_proc = int(round(registry_sub * max(min(0.9 + rng.uniform(-0.05, 0.05), 1.0), 0.6)))
            capa_raised = int(round(compl * max(min(0.25 + rng.uniform(-0.08, 0.08), 0.6), 0.1)))
            capa_eval = int(round(capa_raised * max(min(0.9 + rng.uniform(-0.08, 0.05), 1.0), 0.5)))

            if kpi_id == "pct_new_apps_evaluated_on_time_ct":
                rows += [{"quarter": q, "series": "Submitted", "value": new_subm},
                         {"quarter": q, "series": "Evaluated", "value": new_eval}]
            elif kpi_id == "pct_amendment_apps_evaluated_on_time":
                rows += [{"quarter": q, "series": "Submitted", "value": amd_subm},
                         {"quarter": q, "series": "Evaluated", "value": amd_eval}]
            elif kpi_id == "pct_gcp_inspections_on_time":
                rows += [{"quarter": q, "series": "Requested", "value": req_insp},
                         {"quarter": q, "series": "Conducted", "value": cond_insp}]
            elif kpi_id == "pct_safety_reports_assessed_on_time":
                rows += [{"quarter": q, "series": "Safety reports", "value": safety_reports},
                         {"quarter": q, "series": "Assessed", "value": safety_assessed}]
            elif kpi_id == "pct_gcp_compliant":
                rows += [{"quarter": q, "series": "Sites assessed", "value": sites_assessed},
                         {"quarter": q, "series": "Compliant", "value": sites_compliant}]
            elif kpi_id == "pct_registry_submissions_on_time":
                rows += [{"quarter": q, "series": "Submissions", "value": registry_sub},
                         {"quarter": q, "series": "Processed", "value": registry_proc}]
            elif kpi_id == "pct_capa_evaluated_on_time":
                rows += [{"quarter": q, "series": "CAPA raised", "value": capa_raised},
                         {"quarter": q, "series": "Evaluated", "value": capa_eval}]

    # ---- GMP ----
    elif process == "GMP":
        title_map = {
            "pct_facilities_inspected_on_time": "GMP: Submitted vs Inspected by Inspection Type",
            "pct_inspections_waived_on_time": "GMP: Waived Inspections by Inspection Type",
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
                    rows += [{"quarter": q, "series": f"{t} — Submitted", "value": req[t]},
                             {"quarter": q, "series": f"{t} — Inspected", "value": cond[t]}]
            elif kpi_id == "pct_inspections_waived_on_time":
                for t in types:
                    rows += [{"quarter": q, "series": f"{t} — Waived", "value": waived[t]}]
            elif kpi_id == "pct_facilities_compliant":
                for t in types:
                    rows += [{"quarter": q, "series": f"{t} — Conducted", "value": cond[t]},
                             {"quarter": q, "series": f"{t} — Compliant", "value": compliant[t]}]
            elif kpi_id == "pct_capa_decisions_on_time":
                for t in types:
                    rows += [{"quarter": q, "series": f"{t} — CAPA decisions", "value": capa[t]}]
            elif kpi_id == "pct_applications_completed_on_time":
                for t in types:
                    rows += [{"quarter": q, "series": f"{t} — Applications", "value": apps_by_src[t]}]
            elif kpi_id == "pct_reports_published_on_time":
                for t in types:
                    rows += [{"quarter": q, "series": f"{t} — Reports published", "value": reports[t]}]

    df = pd.DataFrame(rows)
    return df, title, ylabel

def render_kpi_comparison(process: str, kpi_id: str, quarter: str, data: Dict[str, Any]):
    df, title, ylabel = build_kpi_comparison_df(process, kpi_id, quarter, data)
    if df.empty or not title:
        st.info("No per-quarter comparison chart for this KPI.")
        return
    qorder = sorted(df["quarter"].unique(), key=lambda s: parse_quarter_label(s)[0])
    df["quarter"] = pd.Categorical(df["quarter"], categories=qorder, ordered=True)
    fig = px.bar(
        df, x="quarter", y="value", color="series", barmode="group",
        text="value", labels={"quarter": "quarter", "value": ylabel, "series": "series"},
        color_discrete_sequence=[NDA_GREEN, NDA_ACCENT, NDA_DARK_GREEN, "#3b82f6", "#a855f7", "#f59e0b", "#ef4444", "#10b981"]
    )
    fig.update_traces(textposition="outside", cliponaxis=False)
    fig.update_layout(
        title=title, height=440, margin=dict(l=10, r=10, t=50, b=10),
        plot_bgcolor=CARD_BG, paper_bgcolor=CARD_BG, font=dict(color=TEXT_DARK),
        legend=dict(orientation="h", y=-0.2), xaxis=dict(title=""), yaxis=dict(title=ylabel or "count", rangemode="tozero"),
    )
    st.plotly_chart(fig, use_container_width=True)

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

# ===== KPI CARD =====
def kpi_card(kpi_id: str, kpi_obj: Dict[str, Any], quarter: str, *, process: str):
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
    good_vs_prev = (delta is not None) and ((delta < 0) if is_time else (delta > 0))

    status = status_for(kpi_id, None if not cur else cur["value"], kpi_obj.get("target"))
    bleft = status_color(status)
    btint = status_bg_tint(status)
    status_label = {"success": "On target", "warning": "Near target", "error": "Below target"}.get(status, "—")
    short = KPI_NAME_MAP.get(kpi_id, {}).get("short", kpi_id)

    st.markdown(
        f"""
        <div class='kpi-card' style="border-left: 6px solid {bleft}; background: linear-gradient(180deg, {btint} 0%, rgba(0,0,0,0) 100%);">
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
# HEADER (logo)
# =======================
_here = pathlib.Path(__file__).parent if "__file__" in globals() else pathlib.Path(".")

def logo_data_uri() -> str | None:
    p = _here / "logo.jpg"
    if not p.exists():
        return None
    return "data:image/jpeg;base64," + base64.b64encode(p.read_bytes()).decode("utf-8")

logo_uri = logo_data_uri()
st.markdown(
    f"""
<div class="app-header">
  <div class="app-header__row">
    <div class="app-header__title">
      {f'<img class="app-header__logo" src="{logo_uri}" alt="logo"/>' if logo_uri else ''}
      <div>
        <h1>National Drug Authority — Regulatory KPIs</h1>
        <div class="app-header__subtitle">Overview first • Full-page KPI drilldowns • Year-wide comparison bars • Pivot analytics</div>
      </div>
    </div>
    <div><span class="badge">v5.5</span></div>
  </div>
  <div class="app-header__divider"></div>
</div>
""",
    unsafe_allow_html=True,
)

# =======================
# SIDEBAR
# =======================
with st.sidebar:
    st.markdown('<div class="sidebar-shell">', unsafe_allow_html=True)
    st.markdown(
        """
        <div class="sidebar-logo">
          <div class="brand">NDA Dashboard</div>
          <div style="font-size:.78rem;color:#64748b;margin-top:2px;">Regulatory KPIs</div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    st.markdown('<div class="sidebar-card">', unsafe_allow_html=True)
    st.markdown('<div class="sidebar-section-title">Data</div>', unsafe_allow_html=True)
    data_path = st.text_input("Path to data (JSON)", value="data/kpiData.json")
    st.markdown('</div>', unsafe_allow_html=True)

    st.markdown('<div class="sidebar-card">', unsafe_allow_html=True)
    st.markdown('<div class="sidebar-section-title">View</div>', unsafe_allow_html=True)
    tab = st.radio("Mode", ["Overview", "Reports"], index=0, horizontal=False)
    st.markdown('</div>', unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)

# =======================
# LOAD DATA + QUARTERS
# =======================
data = load_data(data_path)
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
# FILTER TOOLBAR
# =======================
process_default = qp_all().get("process", "MA")
quarter_default = qp_all().get("quarter", all_quarters[-1])

if tab == "Overview":
    st.markdown('<div class="toolbar">', unsafe_allow_html=True)
    tcols = st.columns([1, 1, 6])
    with tcols[0]:
        process = st.radio("Process", ["MA", "CT", "GMP"], index=(["MA","CT","GMP"].index(process_default) if process_default in ["MA","CT","GMP"] else 0))
    with tcols[1]:
        quarter = st.selectbox("Quarter", all_quarters, index=(all_quarters.index(quarter_default) if quarter_default in all_quarters else len(all_quarters)-1))
    st.markdown('</div>', unsafe_allow_html=True)
    set_qp(process=process, quarter=quarter, tab="Overview")
else:
    st.markdown('<div class="toolbar">', unsafe_allow_html=True)
    tcols = st.columns([1, 1, 6])
    with tcols[0]:
        process = st.selectbox("Process", ["MA", "CT", "GMP"], index=(["MA","CT","GMP"].index(process_default) if process_default in ["MA","CT","GMP"] else 0))
    with tcols[1]:
        quarter = st.selectbox("Quarter", all_quarters, index=(all_quarters.index(quarter_default) if quarter_default in all_quarters else len(all_quarters)-1))
    st.markdown('</div>', unsafe_allow_html=True)
    set_qp(process=process, quarter=quarter, tab="Reports")

# =======================
# FOCUS MODE
# =======================
FOCUS_KEY = "focus_kpi"
if FOCUS_KEY not in st.session_state:
    st.session_state[FOCUS_KEY] = qp_all().get("kpi")

# =======================
# OVERVIEW / FOCUS  (ORIGINAL BEHAVIOR)
# =======================
if tab == "Overview":
    if st.session_state.get(FOCUS_KEY):
        kpi_id = st.session_state[FOCUS_KEY]
        if kpi_id not in data["quarterlyData"].get(process, {}):
            target_proc = KPI_PROCESS_MAP.get(kpi_id)
            if target_proc and target_proc in data["quarterlyData"]:
                process = target_proc; set_qp(process=process)
            else:
                st.session_state[FOCUS_KEY] = None; remove_qp_key("kpi"); st.rerun()

        kpi_obj = data["quarterlyData"][process][kpi_id]
        cur = next((x for x in kpi_obj["data"] if x["quarter"] == quarter), None)
        s = status_for(kpi_id, None if not cur else cur["value"], kpi_obj.get("target"))

        c_left, c_right = st.columns([4, 1])
        with c_left:
            st.markdown(
                f"""
                <div style="
                  border-radius:14px; padding:1rem 1.2rem; margin-bottom:1rem;
                  background:#ffffff; border:1px solid {BORDER_COLOR}; box-shadow:0 4px 18px rgba(0,0,0,.06);
                  border-left:10px solid {status_color(s)};">
                  <div style="font-size:1.05rem; font-weight:900; color:{TEXT_DARK};">
                    {KPI_NAME_MAP.get(kpi_id, {}).get('long', kpi_id)}
                  </div>
                  <div style="opacity:.9; margin-top:.25rem;">
                    <b>Current ({quarter})</b>: {pct(cur['value']) if (kpi_id.startswith('pct_') and cur) else (f"{cur['value']:.2f}" if cur else '—')}
                    • <b>Target</b>: {pct(kpi_obj.get('target')) if kpi_id.startswith('pct_') else (kpi_obj.get('target','—'))}
                    • <b>Baseline</b>: {pct(kpi_obj.get('baseline')) if kpi_id.startswith('pct_') else (kpi_obj.get('baseline','—'))}
                    • <b>Status</b>: {"On Target" if s=='success' else ("Near Target" if s=='warning' else "Below Target")}
                  </div>
                </div>
                """,
                unsafe_allow_html=True,
            )
        with c_right:
            if st.button("⬅️  Back to Overview", type="primary", use_container_width=True):
                st.session_state[FOCUS_KEY] = None; remove_qp_key("kpi"); st.rerun()

        c1, c2 = st.columns([1.25, 1])
        with c1:
            kpi_trend(kpi_id, kpi_obj, height=440)
        with c2:
            section_header(f"Per-quarter comparison ({year_of_quarter_label(quarter)})", "📦")
            render_kpi_comparison(process, kpi_id, quarter, data)

        # -------- Original process steps analysis drawer (avgDays vs targetDays) --------
        st.divider()
        if "show_steps" not in st.session_state:
            st.session_state["show_steps"] = False
        label = "Close process steps drawer" if st.session_state["show_steps"] else "Open process steps drawer"
        if st.button(label):
            st.session_state["show_steps"] = not st.session_state["show_steps"]; st.rerun()

        if st.session_state["show_steps"]:
            all_steps = data["processStepData"].get(process, {})
            rows = []
            for step, step_obj in all_steps.items():
                series = step_obj["data"]
                qrec = next((x for x in series if x["quarter"] == quarter), None)
                if not qrec: continue
                m, t = qrec.get("avgDays"), qrec.get("targetDays")
                if m is None or t is None: continue
                rows.append({"step": step, "Actual days": float(m), "Target days": float(t), "Variance": float(m - t)})
            if rows:
                df_bar = pd.DataFrame(rows)
                dfm = df_bar.melt(id_vars="step", value_vars=["Target days", "Actual days"], var_name="type", value_name="days")
                fig = px.bar(dfm, x="step", y="days", color="type", barmode="group",
                             color_discrete_sequence=[NDA_GREEN, "#ef4444"])
                fig.update_layout(height=380, margin=dict(l=10, r=10, t=10, b=80),
                                  xaxis_tickangle=45, plot_bgcolor=CARD_BG, paper_bgcolor=CARD_BG)
                st.plotly_chart(fig, use_container_width=True)
                st.dataframe(df_bar.sort_values("step"), use_container_width=True, hide_index=True)
                csv_download(df_bar, f"process_steps_{process}_{quarter}.csv")
            else:
                st.info("No process step data for this quarter.")
        # ------------------------------------------------------------------------------
        st.stop()

    # ---------- Overview cards + insights (original) ----------
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
        if not qrec: continue
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
              <li>Click a KPI card below to open a full-page view; the right panel shows year-wide comparisons for that KPI.</li>
            </ul>
            """,
            unsafe_allow_html=True,
        )
    panel_close()

    panel_open("KPI cards", icon="🗂️")
    GRID_COLS = 4
    ordered_ids = list(kpis_block.keys())
    rows_grid = [ordered_ids[i:i+GRID_COLS] for i in range(0, len(ordered_ids), GRID_COLS)]
    for row_ids in rows_grid:
        cols = st.columns(GRID_COLS, gap="small")
        for col, kpi_id in zip(cols, row_ids):
            with col:
                if kpi_card(kpi_id, kpis_block[kpi_id], quarter, process=process):
                    st.session_state[FOCUS_KEY] = kpi_id
                    set_qp(kpi=kpi_id, process=process, quarter=quarter, tab="Overview")
                    st.rerun()
    panel_close()

# =====================================================================
# REPORTS — SELF-SERVICE ANALYTICS
# =====================================================================

# ---------- VOLUMES FACT ----------
@st.cache_data(show_spinner=False)
def build_volumes_fact(data: Dict[str, Any]) -> pd.DataFrame:
    rows = []
    for proc in ["MA", "CT"]:
        if proc not in data["quarterlyVolumes"]: continue
        for rec in data["quarterlyVolumes"][proc]:
            q = rec.get("quarter")
            if not q: continue
            qnum = int(q.split()[0][1:]); year = int(q.split()[1])
            for stream, key in [("Received","applications_received"),
                                ("Completed","applications_completed"),
                                ("Granted","approvals_granted")]:
                v = rec.get(key)
                if v is not None:
                    rows.append(dict(process=proc, quarter=q, q_num=qnum, year=year, source_type=None, stream=stream, value=int(v)))
    if "GMP" in data.get("inspectionVolumes", {}):
        for rec in data["inspectionVolumes"]["GMP"]:
            q = rec.get("quarter")
            if not q: continue
            qnum = int(q.split()[0][1:]); year = int(q.split()[1])
            for src in ["domestic","foreign","reliance","desk"]:
                r_key, c_key = f"requested_{src}", f"conducted_{src}"
                src_label = src.capitalize()
                r = rec.get(r_key); c = rec.get(c_key)
                if r is not None: rows.append(dict(process="GMP", quarter=q, q_num=qnum, year=year, source_type=src_label, stream="Requested", value=int(r)))
                if c is not None: rows.append(dict(process="GMP", quarter=q, q_num=qnum, year=year, source_type=src_label, stream="Conducted", value=int(c)))
    df = pd.DataFrame(rows)
    if df.empty:
        return pd.DataFrame(columns=["process","quarter","q_num","year","source_type","stream","value"])
    df["year"] = df["year"].astype(int); df["q_num"] = df["q_num"].astype(int)
    return df

def available_rates_for(df: pd.DataFrame) -> List[str]:
    present = set(df["stream"].unique().tolist())
    rates = []
    if {"Completed","Received"} <= present: rates.append("Completion Rate = Completed / Received")
    if {"Granted","Received"}   <= present: rates.append("Grant Rate = Granted / Received")
    if {"Conducted","Requested"}<= present: rates.append("Conduct Ratio = Conducted / Requested")
    if {"Waived","Requested"}   <= present: rates.append("Waive Rate = Waived / Requested")
    if {"Compliant","Conducted"}<= present: rates.append("Compliance Rate = Compliant / Conducted")
    return rates

def _pivot_values(df: pd.DataFrame, rows: List[str], col: str | None, agg: str) -> pd.DataFrame:
    if not rows and not col:
        val = getattr(df["value"], agg)() if hasattr(df["value"], agg) else df["value"].sum()
        return pd.DataFrame({"value":[val]})
    if col:
        pv = pd.pivot_table(df, index=rows or None, columns=col, values="value", aggfunc=agg, fill_value=0, observed=True)
    else:
        pv = pd.pivot_table(df, index=rows or None, values="value", aggfunc=agg, fill_value=0, observed=True)
    return pv

def _group_sum(df: pd.DataFrame, rows: List[str], col: str | None, for_streams: List[str]) -> pd.DataFrame:
    sub = df[df["stream"].isin(for_streams)].copy()
    if col:
        return pd.pivot_table(sub, index=rows or None, columns=col, values="value", aggfunc="sum", fill_value=0, observed=True)
    else:
        return pd.pivot_table(sub, index=rows or None, values="value", aggfunc="sum", fill_value=0, observed=True)

def _safe_div(num: pd.DataFrame, den: pd.DataFrame) -> pd.DataFrame:
    num, den = num.align(den, join="outer", fill_value=0)
    with pd.option_context("mode.use_inf_as_na", True):
        out = num / den.replace(0, pd.NA)
    return out.fillna(0.0)

def compute_pivot(df: pd.DataFrame, rows: List[str], col: str | None, agg: str, value_choice: str) -> Tuple[pd.DataFrame, bool]:
    if value_choice == "Raw Count (value)":
        return _pivot_values(df, rows, col, agg), False
    if value_choice.startswith("Completion"):
        num, den = _group_sum(df, rows, col, ["Completed"]), _group_sum(df, rows, col, ["Received"]); return _safe_div(num, den), True
    if value_choice.startswith("Grant Rate"):
        num, den = _group_sum(df, rows, col, ["Granted"]), _group_sum(df, rows, col, ["Received"]); return _safe_div(num, den), True
    if value_choice.startswith("Conduct Ratio"):
        num, den = _group_sum(df, rows, col, ["Conducted"]), _group_sum(df, rows, col, ["Requested"]); return _safe_div(num, den), True
    if value_choice.startswith("Waive Rate"):
        num, den = _group_sum(df, rows, col, ["Waived"]), _group_sum(df, rows, col, ["Requested"]); return _safe_div(num, den), True
    if value_choice.startswith("Compliance Rate"):
        num, den = _group_sum(df, rows, col, ["Compliant"]), _group_sum(df, rows, col, ["Conducted"]); return _safe_div(num, den), True
    return _pivot_values(df, rows, col, agg), False

# ---- collision-safe melt helper ----
def _pivot_to_long(pv: pd.DataFrame, rows: List[str], col: str | None) -> pd.DataFrame:
    if isinstance(pv, pd.Series):
        df_wide = pv.to_frame(name="__metric")
    else:
        df_wide = pv.copy()
    df_wide = df_wide.reset_index()

    desired_var_name = (col or "series")
    desired_val_name = "value"

    var_name = desired_var_name if desired_var_name not in df_wide.columns else "__series"
    value_name = desired_val_name if desired_val_name not in df_wide.columns else "__value"

    id_vars = [c for c in (rows or []) if c in df_wide.columns]
    value_vars = [c for c in df_wide.columns if c not in id_vars]

    if not any(c for c in value_vars if c not in id_vars):
        df_wide[value_name] = 0
        value_vars = [value_name]

    long_df = pd.melt(
        df_wide,
        id_vars=id_vars,
        value_vars=[c for c in value_vars if c not in id_vars],
        var_name=var_name,
        value_name=value_name,
        ignore_index=True,
    )

    if var_name != desired_var_name:
        long_df = long_df.rename(columns={var_name: desired_var_name})
    if value_name != desired_val_name:
        long_df = long_df.rename(columns={value_name: desired_val_name})

    return long_df

def infer_is_time(rows: List[str]) -> bool:
    return ("quarter" in rows) or ("year" in rows)

def _quarter_sort_key(qstr: str) -> tuple[int, int]:
    qn, yr = qstr.split()
    return (int(yr), int(qn[1:]))

def _ensure_time_order(df: pd.DataFrame) -> pd.DataFrame:
    if "quarter" in df.columns:
        df = df.copy()
        def _key(s):
            qn, yr = str(s).split()
            return (int(yr), int(qn[1:]))
        df["__qorder"] = df["quarter"].map(_key)
        if "year" not in df.columns:
            df["year"] = df["quarter"].map(lambda s: int(str(s).split()[1]))
        df = df.sort_values(["year","__qorder"]).drop(columns="__qorder")
    elif "year" in df.columns:
        df = df.sort_values("year")
    return df

def compute_share_pivot(pv: pd.DataFrame, within: str = "row") -> pd.DataFrame:
    pv = pv.astype(float)
    if pv.ndim == 1:
        total = pv.sum()
        return (pv / total) if total else pv
    if within == "row":
        denom = pv.sum(axis=1).replace(0, np.nan); out = pv.div(denom, axis=0)
    else:
        denom = pv.sum(axis=0).replace(0, np.nan); out = pv.div(denom, axis=1)
    return out.fillna(0.0)

def compute_change_long(df: pd.DataFrame, group_dims: list[str], value_col: str, basis: str = "QoQ") -> pd.DataFrame:
    if basis not in {"QoQ","YoY"}: basis = "QoQ"
    if "quarter" not in df.columns:
        return pd.DataFrame(columns=df.columns.tolist()+["delta"])
    df2 = _ensure_time_order(df)
    cols = [c for c in group_dims+["year","quarter"] if c in df2.columns] + [value_col]
    df2 = df2[cols].copy()

    def _shift_key(row):
        y, q = row["year"], int(str(row["quarter"]).split()[0][1:])
        if basis == "QoQ":
            prev_q, prev_y = (q-1, y) if q > 1 else (4, y-1)
        else:
            prev_q, prev_y = (q, y-1)
        return f"Q{prev_q} {prev_y}"

    df2["__prev_quarter"] = df2.apply(_shift_key, axis=1)
    idx_cols = [c for c in group_dims if c in df2.columns]
    prev_df = df2.rename(columns={"quarter":"__prev_quarter", value_col:"__prev_value"})[idx_cols+["__prev_quarter","__prev_value"]]
    merged = df2.merge(prev_df, how="left", on=idx_cols+["__prev_quarter"])
    merged["delta"] = (merged[value_col] - merged["__prev_value"]) / merged["__prev_value"].replace(0, np.nan)
    return merged.drop(columns="__prev_quarter")

def build_metric_series(df: pd.DataFrame, metric: str) -> pd.Series:
    if metric.startswith("Raw: "):
        stream = metric.split(": ", 1)[1]
        return df.assign(_v=np.where(df["stream"] == stream, df["value"], 0)).groupby(df.index)["_v"].sum()
    gcols = ["process","year","quarter","source_type"]
    key = df[gcols].astype(str).agg("|".join, axis=1)
    pack = df.assign(_key=key)

    def _sum_by(names: list[str]) -> pd.Series:
        sub = pack[pack["stream"].isin(names)]
        return sub.groupby("_key")["value"].sum()

    num = den = None
    if "Completion" in metric: num, den = _sum_by(["Completed"]), _sum_by(["Received"])
    elif "Grant" in metric:    num, den = _sum_by(["Granted"]), _sum_by(["Received"])
    elif "Conduct" in metric:  num, den = _sum_by(["Conducted"]), _sum_by(["Requested"])
    elif "Compliance" in metric:num, den = _sum_by(["Compliant"]), _sum_by(["Conducted"])
    elif "Waive" in metric:    num, den = _sum_by(["Waived"]), _sum_by(["Requested"])
    if num is None or den is None: return pd.Series(index=df.index, data=np.nan)
    ratio = (num / den.replace(0, np.nan)).reindex(pack["_key"]).values
    return pd.Series(index=df.index, data=ratio)

def render_chart_from_pivot(pv: pd.DataFrame, rows: List[str], col: str | None, chart_type: str, is_rate: bool):
    if pv.empty:
        st.info("No data to chart for the current selection."); return
    n_rows = pv.shape[0]
    too_big = (n_rows > 60 and chart_type in ["Column (Grouped)","Column (Stacked)"]) or (n_rows > 200 and chart_type in ["Line","Area"])
    if too_big and chart_type != "Heatmap":
        st.warning("This selection is large for the chosen chart. Consider filtering further or switching to Heatmap."); return
    df_long = _pivot_to_long(pv, rows, col)
    yaxis_title = "%" if is_rate else "count"
    if is_rate: df_long["value"] = (df_long["value"] * 100).round(2)
    if "quarter" in rows:
        def q_order(qstr):
            qn, yr = str(qstr).split(); return (int(yr), int(qn[1:]))
        df_long["quarter"] = pd.Categorical(df_long["quarter"], ordered=True,
                                            categories=sorted(df_long["quarter"].dropna().unique(), key=q_order))
    if chart_type == "Auto":
        if infer_is_time(rows): chart_type = "Line"
        elif col: chart_type = "Column (Grouped)"
        else: chart_type = "Column (Grouped)"

    if chart_type in ["Column (Grouped)", "Column (Stacked)"]:
        fig = px.bar(df_long,
                     x=rows[-1] if rows else df_long.columns[0],
                     y="value", color=(col or "series"),
                     barmode="group" if chart_type.endswith("Grouped") else "stack",
                     text="value",
                     color_discrete_sequence=[NDA_GREEN, NDA_ACCENT, NDA_DARK_GREEN, "#3b82f6", "#a855f7", "#f59e0b", "#ef4444", "#10b981"],
                     labels={"value": yaxis_title})
        fig.update_traces(textposition="outside", cliponaxis=False)
    elif chart_type == "Line":
        fig = px.line(df_long,
                      x=rows[-1] if rows else df_long.columns[0],
                      y="value", color=(col or "series"),
                      markers=True, labels={"value": yaxis_title})
    elif chart_type == "Area":
        fig = px.area(df_long,
                      x=rows[-1] if rows else df_long.columns[0],
                      y="value", color=(col or "series"),
                      labels={"value": yaxis_title})
    elif chart_type == "Heatmap":
        if pv.ndim == 1:
            st.info("Heatmap needs a comparison dimension. Choose a 'Compare by' column."); return
        fig = px.imshow(pv.astype(float), labels=dict(color=yaxis_title), aspect="auto")
    elif chart_type == "Pie":
        if pv.ndim == 1 or pv.shape[0] != 1:
            st.info("Pie charts require a single row (e.g., filter to one quarter/year/process)."); return
        row_label = rows[-1] if rows else "index"
        row_val = pv.index[0]
        df_one = df_long[df_long[row_label] == row_val]
        fig = px.pie(df_one, names=(col or "series"), values="value", hole=0.3)
    else:
        st.info("Unsupported chart type selected."); return

    fig.update_layout(height=420, margin=dict(l=10, r=10, t=30, b=10),
                      plot_bgcolor=CARD_BG, paper_bgcolor=CARD_BG, font=dict(color=TEXT_DARK),
                      legend=dict(orientation="h", y=-0.2),
                      yaxis=dict(title=yaxis_title, rangemode="tozero"))
    st.plotly_chart(fig, use_container_width=True)

def render_scatter_with_regression(df_long: pd.DataFrame, xcol: str, ycol: str, color_by: str | None):
    if df_long.empty:
        st.info("No data for scatter."); return
    x = df_long[xcol].values.astype(float)
    y = df_long[ycol].values.astype(float)
    mask = ~(np.isnan(x) | np.isnan(y))
    if mask.sum() < 2:
        st.info("Not enough points for regression."); return
    slope, intercept = np.polyfit(x[mask], y[mask], 1)
    r = np.corrcoef(x[mask], y[mask])[0, 1]
    x_line = np.linspace(np.nanmin(x), np.nanmax(x), 100)
    y_line = slope * x_line + intercept

    fig = px.scatter(df_long, x=xcol, y=ycol,
                     color=(color_by if color_by and color_by in df_long.columns else None),
                     labels={xcol: xcol, ycol: ycol},
                     color_discrete_sequence=[NDA_GREEN, NDA_ACCENT, NDA_DARK_GREEN, "#3b82f6", "#a855f7", "#f59e0b", "#ef4444", "#10b981"])
    fig.add_trace(go.Scatter(x=x_line, y=y_line, mode="lines", name="Regression", line=dict(width=3)))
    fig.update_layout(height=420, margin=dict(l=10, r=10, t=30, b=10),
                      plot_bgcolor=CARD_BG, paper_bgcolor=CARD_BG, font=dict(color=TEXT_DARK),
                      legend=dict(orientation="h", y=-0.2))
    st.plotly_chart(fig, use_container_width=True)
    st.markdown(f"<div style='margin-top:.3rem;color:{TEXT_LIGHT}'>slope={slope:.3f} • r={r:.3f}</div>", unsafe_allow_html=True)

def render_box_violin(df_long: pd.DataFrame, metric_col: str, group_col: str, chart_type: str = "Box"):
    if df_long.empty:
        st.info("No data for distribution."); return
    if chart_type == "Violin":
        fig = px.violin(df_long, x=group_col, y=metric_col, box=True, points="all")
    else:
        fig = px.box(df_long, x=group_col, y=metric_col, points="all")
    fig.update_layout(height=420, margin=dict(l=10, r=10, t=10, b=80),
                      plot_bgcolor=CARD_BG, paper_bgcolor=CARD_BG, font=dict(color=TEXT_DARK),
                      xaxis_tickangle=45, legend=dict(orientation="h", y=-0.2))
    st.plotly_chart(fig, use_container_width=True)

def filter_volumes(df: pd.DataFrame, processes: List[str], years: List[int] | None,
                   quarters: List[str] | None, streams: List[str] | None, sources: List[str] | None) -> pd.DataFrame:
    sub = df.copy()
    if processes: sub = sub[sub["process"].isin(processes)]
    if years:     sub = sub[sub["year"].isin(years)]
    if quarters:  sub = sub[sub["quarter"].isin(quarters)]
    if streams:   sub = sub[sub["stream"].isin(streams)]
    if sources is not None and len(sources) > 0: sub = sub[sub["source_type"].isin(sources)]
    return sub

# ---------------------- REPORTS TAB ----------------------
if tab == "Reports":
    view = st.radio("Report view", ["Quarterly Volumes", "Bottleneck Metrics"], horizontal=True)

    if view == "Quarterly Volumes":
        panel_open("Quarterly Volumes — Self-service Analytics", icon="📦")

        vol_fact = build_volumes_fact(data)
        if vol_fact.empty:
            st.info("No volume data available.")
            panel_close()
        else:
            # --- FILTERS ---
            f1, f2, f3, f4 = st.columns([1.3, 1.3, 1.3, 3])
            with f1:
                proc_sel = st.multiselect("Process", sorted(vol_fact["process"].dropna().unique().tolist()),
                                          default=sorted(vol_fact["process"].dropna().unique().tolist()))
            with f2:
                years_all = sorted(vol_fact["year"].dropna().unique().tolist())
                years_sel = st.multiselect("Year", years_all, default=years_all[-2:] if len(years_all) > 2 else years_all)
            with f3:
                quarters_all = vol_fact[vol_fact["year"].isin(years_sel)]["quarter"].dropna().unique().tolist() if years_sel else vol_fact["quarter"].dropna().unique().tolist()
                quarters_all = sorted(quarters_all, key=_quarter_sort_key)
                quarters_sel = st.multiselect("Quarter", quarters_all, default=quarters_all)
            with f4:
                streams_all = sorted(vol_fact["stream"].dropna().unique().tolist())
                streams_sel = st.multiselect("Streams", streams_all, default=streams_all)

            src_sel = []
            if any(p == "GMP" for p in proc_sel):
                src_all = sorted([s for s in vol_fact["source_type"].dropna().unique().tolist()])
                src_sel = st.multiselect("Inspection type (GMP)", src_all, default=src_all)

            filtered = filter_volumes(vol_fact, proc_sel, years_sel, quarters_sel, streams_sel, src_sel)

            st.markdown(
                f"<div style='margin:.25rem 0 .5rem; color:{TEXT_LIGHT}; font-size:.9rem;'><b>{len(filtered):,}</b> rows after filters.</div>",
                unsafe_allow_html=True,
            )

            if filtered.empty:
                st.info("No rows match your filters.")
                panel_close()
            else:
                st.markdown("### Analysis")
                mode = st.selectbox(
                    "Choose analysis",
                    ["Trend", "Change (QoQ/YoY)", "Composition (Share)", "Correlation (Scatter + Regression)", "Distribution", "Benchmarks"],
                    index=0
                )

                dims = ["process", "year", "quarter", "source_type", "stream"]

                if mode in ["Trend", "Composition (Share)", "Benchmarks", "Change (QoQ/YoY)"]:
                    left, right = st.columns([1.2, 1])
                    with left:
                        rows_dims = st.multiselect("Rows", dims, default=["process","year","quarter"] if mode != "Composition (Share)" else ["year","quarter"])
                        compare_by = st.selectbox("Compare by (columns)", ["— None —"] + dims, index=0)
                        col_dim = None if compare_by == "— None —" else compare_by
                    with right:
                        agg = st.selectbox("Aggregation", ["sum","mean","max","min","count"], index=0)
                        rate_opts = available_rates_for(filtered)
                        value_choice = st.selectbox("Value", ["Raw Count (value)"] + rate_opts, index=0)
                        chart_type = st.selectbox("Chart type", ["Auto","Column (Grouped)","Column (Stacked)","Line","Area","Heatmap","Pie"], index=0)

                if mode == "Trend":
                    pv, is_rate = compute_pivot(filtered, rows_dims, col_dim, agg, value_choice)
                    st.markdown("#### Visualization")
                    render_chart_from_pivot(pv, rows_dims, col_dim, chart_type, is_rate)

                    st.markdown("#### Pivot table")
                    show_tbl = (pv * 100.0).round(2) if is_rate else pv
                    st.dataframe(show_tbl, use_container_width=True)

                elif mode == "Change (QoQ/YoY)":
                    basis = st.radio("Basis", ["QoQ","YoY"], index=0, horizontal=True)
                    pv_raw, is_rate = compute_pivot(filtered, rows_dims, col_dim, agg, value_choice)
                    if pv_raw.empty:
                        st.info("No data for the current selection.")
                    else:
                        df_long = _pivot_to_long(pv_raw, rows_dims, col_dim)
                        if "quarter" not in df_long.columns:
                            st.warning("Add 'quarter' to Rows for QoQ/YoY analysis.")
                        gcols = [c for c in rows_dims if c in df_long.columns and c != "quarter"]
                        if col_dim: gcols.append(col_dim)
                        df_long2 = df_long.copy()
                        if "quarter" in df_long2.columns and "year" not in df_long2.columns:
                            df_long2["year"] = df_long2["quarter"].map(lambda s: int(str(s).split()[1]))
                        df_long2 = _ensure_time_order(df_long2)
                        parts = []
                        for _, sub in df_long2.groupby(gcols, dropna=False):
                            ch = compute_change_long(sub, gcols, "value", basis=basis)
                            parts.append(ch)
                        changed = pd.concat(parts, ignore_index=True) if parts else pd.DataFrame()

                        if changed.empty or changed["delta"].isna().all():
                            st.info("Not enough periods to compute change.")
                        else:
                            if col_dim:
                                pv_delta = pd.pivot_table(changed, index=[c for c in rows_dims if c in changed.columns],
                                                          columns=col_dim, values="delta", aggfunc="last", fill_value=0, observed=True)
                            else:
                                pv_delta = pd.pivot_table(changed, index=[c for c in rows_dims if c in changed.columns],
                                                          values="delta", aggfunc="last", fill_value=0, observed=True)
                            st.markdown("#### Visualization (Δ%)")
                            render_chart_from_pivot(pv_delta, rows_dims, col_dim, chart_type, is_rate=True)
                            st.markdown("#### Change table (Δ%)")
                            st.dataframe((pv_delta * 100.0).round(2), use_container_width=True)

                elif mode == "Composition (Share)":
                    within = st.radio("Normalize within", ["row","column"], index=0, horizontal=True)
                    pv, _ = compute_pivot(filtered, rows_dims, col_dim, agg, value_choice="Raw Count (value)")
                    if pv.empty:
                        st.info("No data for the current selection.")
                    else:
                        pv_share = compute_share_pivot(pv, within=within)
                        st.markdown("#### Visualization (Share %)")
                        use_chart = "Column (Stacked)" if chart_type == "Auto" and pv_share.shape[0] <= 40 else (chart_type if chart_type != "Auto" else "Heatmap")
                        render_chart_from_pivot(pv_share, rows_dims, col_dim, use_chart, is_rate=True)
                        st.markdown("#### Share table (%)")
                        st.dataframe((pv_share * 100.0).round(2), use_container_width=True)

                elif mode == "Correlation (Scatter + Regression)":
                    raw_opts = [f"Raw: {s}" for s in sorted(filtered["stream"].dropna().unique())]
                    rate_opts = available_rates_for(filtered)
                    x_metric = st.selectbox("X metric", raw_opts + [f"Rate: {r.split()[0]}" for r in rate_opts], index=0)
                    y_metric = st.selectbox("Y metric", raw_opts + [f"Rate: {r.split()[0]}" for r in rate_opts], index=min(1, max(0, len(raw_opts)-1)))
                    color_by = st.selectbox("Color by (optional)", ["None","process","source_type","year","quarter"], index=0)

                    base = filtered.copy().pipe(_ensure_time_order).reset_index(drop=True)
                    x_series = build_metric_series(base, x_metric)
                    y_series = build_metric_series(base, y_metric)
                    df_xy = base[["process","year","quarter","source_type"]].copy()
                    df_xy["X"] = x_series.values; df_xy["Y"] = y_series.values
                    if df_xy[["X","Y"]].dropna(how="any").empty:
                        st.info("Not enough data for correlation.")
                    else:
                        to_pct = st.checkbox("Show rates as % on axes (if applicable)", value=True)
                        if to_pct:
                            if "Rate" in x_metric: df_xy["X"] = df_xy["X"] * 100.0
                            if "Rate" in y_metric: df_xy["Y"] = df_xy["Y"] * 100.0
                        color_dim = None if color_by == "None" else color_by
                        render_scatter_with_regression(
                            df_xy.rename(columns={"X": x_metric, "Y": y_metric}),
                            xcol=x_metric, ycol=y_metric, color_by=color_dim
                        )
                        st.dataframe(df_xy[[c for c in ["process","source_type","year","quarter"] if c in df_xy.columns] + ["X","Y"]].round(3),
                                     use_container_width=True)

                elif mode == "Distribution":
                    raw_opts = [f"Raw: {s}" for s in sorted(filtered["stream"].dropna().unique())]
                    rate_opts = available_rates_for(filtered)
                    metric = st.selectbox("Metric", raw_opts + [f"Rate: {r.split()[0]}" for r in rate_opts], index=0)
                    group_by = st.selectbox("Group by", ["process","source_type","year","quarter"], index=0)
                    chart_pick = st.selectbox("Chart type", ["Box","Violin"], index=0)

                    base = filtered.copy().reset_index(drop=True)
                    val_series = build_metric_series(base, metric)
                    df_dist = base[[group_by]].copy()
                    val_col = "value"
                    df_dist[val_col] = val_series.values
                    df_dist = df_dist.dropna()
                    if metric.startswith("Rate: "): df_dist[val_col] = df_dist[val_col] * 100.0

                    render_box_violin(df_dist, val_col, group_by, chart_type=chart_pick)
                    st.dataframe(df_dist.round(3), use_container_width=True)

                elif mode == "Benchmarks":
                    target_val = st.number_input("Target line (enter % for rates, count for raw)", value=0.0, step=1.0)
                    pv, is_rate = compute_pivot(filtered, rows_dims, col_dim, agg, value_choice)
                    if pv.empty:
                        st.info("No data to chart for the current selection.")
                    else:
                        st.markdown("#### Visualization")
                        render_chart_from_pivot(pv, rows_dims, col_dim, chart_type, is_rate)
                        unit = "%" if is_rate else "count"
                        st.markdown(f"<div style='color:{TEXT_LIGHT};'>Target reference: <b>{target_val:g}{unit if is_rate else ''}</b></div>", unsafe_allow_html=True)

                # Export
                st.markdown("#### Export")
                try:
                    table_to_export = locals().get("show_tbl", None) or locals().get("pv_share", None) or locals().get("pv_delta", None) or locals().get("pv", None)
                except Exception:
                    table_to_export = None
                if isinstance(table_to_export, pd.DataFrame) and not table_to_export.empty:
                    csv_buf = io.StringIO(); table_to_export.to_csv(csv_buf)
                    st.download_button("Download CSV", csv_buf.getvalue(), file_name="ssa_output.csv", type="secondary")
                panel_close()

    else:
        # ======== Bottleneck Metrics — per process STEP charts (cycle time & backlog on top, table below) ========
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

        # Build from bottleneckData for the SELECTED process & quarter
        steps_map = data["bottleneckData"].get(process, {})
        table_rows = []
        for step, series in steps_map.items():
            qrec = next((x for x in series if x.get("quarter") == quarter), None)
            if not qrec:
                continue
            row = {"step": step}
            # cycle_time_median = touch + wait
            t = qrec.get("touch_median_days")
            w = qrec.get("wait_median_days")
            row["cycle_time_median"] = None if (t is None and w is None) else float((t or 0) + (w or 0))
            # other numeric fields
            row["ext_median_days"] = qrec.get("ext_median_days") if isinstance(qrec.get("ext_median_days"), (int, float)) else None
            row["opening_backlog"] = qrec.get("opening_backlog") if isinstance(qrec.get("opening_backlog"), (int, float)) else None
            row["carry_over_rate"] = qrec.get("carry_over_rate") if isinstance(qrec.get("carry_over_rate"), (int, float)) else None
            row["avg_query_cycles"] = qrec.get("avg_query_cycles") if isinstance(qrec.get("avg_query_cycles"), (int, float)) else None
            row["fpy_pct"] = qrec.get("fpy_pct") if isinstance(qrec.get("fpy_pct"), (int, float)) else None
            row["wait_share_pct"] = qrec.get("wait_share_pct") if isinstance(qrec.get("wait_share_pct"), (int, float)) else None
            table_rows.append(row)

        df = pd.DataFrame(table_rows)

        if df.empty:
            st.info("No process step data available for this quarter.")
        else:
            top1, top2 = st.columns(2)

            # Cycle time bars (median) per step
            with top1:
                st.markdown("#### Cycle time (median) per process step")
                df_ct = df.dropna(subset=["cycle_time_median"]).sort_values("cycle_time_median", ascending=False)
                if df_ct.empty:
                    st.info("No cycle time values for steps in this quarter.")
                else:
                    fig_ct = px.bar(
                        df_ct,
                        x="step",
                        y="cycle_time_median",
                        text="cycle_time_median",
                        color_discrete_sequence=[NDA_GREEN],
                        labels={"cycle_time_median": "days", "step": "process step"},
                    )
                    fig_ct.update_traces(texttemplate="%{text:.1f}", textposition="outside", cliponaxis=False)
                    fig_ct.update_layout(
                        height=380,
                        margin=dict(l=10, r=10, t=30, b=80),
                        xaxis_tickangle=45,
                        plot_bgcolor=CARD_BG,
                        paper_bgcolor=CARD_BG,
                        font=dict(color=TEXT_DARK),
                        showlegend=False,
                        yaxis=dict(title="days", rangemode="tozero"),
                    )
                    st.plotly_chart(fig_ct, use_container_width=True)

            # Opening backlog bars per step
            with top2:
                st.markdown("#### Opening backlog per process step")
                df_bl = df.dropna(subset=["opening_backlog"]).sort_values("opening_backlog", ascending=False)
                if df_bl.empty:
                    st.info("No opening backlog values for steps in this quarter.")
                else:
                    fig_bl = px.bar(
                        df_bl,
                        x="step",
                        y="opening_backlog",
                        text="opening_backlog",
                        color_discrete_sequence=[NDA_ACCENT],
                        labels={"opening_backlog": "count", "step": "process step"},
                    )
                    fig_bl.update_traces(textposition="outside", cliponaxis=False)
                    fig_bl.update_layout(
                        height=380,
                        margin=dict(l=10, r=10, t=30, b=80),
                        xaxis_tickangle=45,
                        plot_bgcolor=CARD_BG,
                        paper_bgcolor=CARD_BG,
                        font=dict(color=TEXT_DARK),
                        showlegend=False,
                        yaxis=dict(title="count", rangemode="tozero"),
                    )
                    st.plotly_chart(fig_bl, use_container_width=True)

            st.divider()

            # Table below charts
            ordered_cols = ["step"] + [c for c, _ in cols if c in df.columns]
            st.dataframe(df[ordered_cols], use_container_width=True, hide_index=True)
            csv_download(df[ordered_cols], f"bottleneck_curated_{process}_{quarter}.csv")

        panel_close()

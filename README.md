# Regulatory KPI Dashboard (Streamlit Version)

An interactive **Regulatory KPI Dashboard** built with Streamlit for monitoring BMGF Focussed KPIs in Marketing Authorization (MA), Clinical Trials (CT), and GMP. We answer key performance questions using a structured approach from overall status overview, KPI details, process-step tracking, and bottleneck analytics. In addition we propose a self service analytics page where users are anabled to perform advanced analytics that are not included in the dashboard in order not to bloat the UI with too much information and statistics. 

This dashboard is designed to serve as a **baseline**  after consultation with stakholders clearly demonstrating all the necessary data points for regulatory decision making tailoring insights to directors, managers, process owners etc:
- Transparent performance tracking
- Drill-down by process including disaggregations
- Bottleneck visibility across the process workflow
- A guided **self-service analytics** layer for deeper insights
- Carefully designed charts/plots are used to visualize data accross the board. 

> **Important:** The bundled dataset is **synthetic dummy data** built solely for demonstration. It must **not** be interpreted as real NDA performance data.

---

## 1. Dummy Data: How It Was Created & Its Limitations

The application expects a JSON file (e.g. `data/kpiData.json`) with the following top-level structure:

- `quarterlyData`
- `processStepData`
- `kpiCounts`
- `quarterlyVolumes`
- `inspectionVolumes`
- `bottleneckData`

For the demo, these are populated with **synthetic values** constructed to look realistic but remain only sythetic.

### 1.1. How the Dummy Data Is Shaped

The dummy data is **scenario-based**, created to:

- Cover multiple years and quarters (e.g. `Q1 2023`–`Q2 2025`).
- Populate KPIs for:
  - MA (on-time review, approvals, query handling, duration)
  - CT (on-time review, GCP inspections, safety reporting, registry, CAPA)
  - GMP (on-time inspections, compliance, CAPA, reports, disaggregated by inspection type)
- Represent:
  - Reasonable trends (improving, stable, or deteriorating)
  - Variation across quarters to make analytics meaningful
  - Multiple disaggregation categories, especially for GMP:
    - Domestic vs Foreign
    - Reliance / Joint inspections
    - Desk / Remote inspections

Where explicit counts are not in the JSON, the app uses **seeded pseudo-random logic** (e.g. to derive splits like new vs renewal vs variation) to keep values internally consistent and reproducible.

### 1.2. Limitations of the Dummy Data

- **Simplified logic**:
  - KPIs are computed from per-quarter records in the JSON instead of raw application-level transactions. A real application will have a real end-to-end data pipeline from raw logs to cleaning to aggregation of the KPIs.
  - Some comparisons/volume splits (e.g. FIR/query breakdowns, some GMP disaggregations) are inferred using deterministic randomization to illustrate logic.

  - **Simplified Data Processing**:
  - The data processing used is rather simplified and technologies for distributed computing such as spark, trino are not used. In a real application, data processing optimization for minimal UI-loading and data refresh times need to be considered.
- **No edge-case completeness**:
  - Missing data paths are handled with fallbacks; in production you should ensure complete, validated feeds.
  - Bottleneck data may be partially synthetic, auto-filled and sometimes incomplete for some steps.

---

## 2. Technology Stack & Deployment Considerations

### 2.1. Tools & Libraries

This app uses thuse libraries and they should be installed on local computer before running the app:

- **Python 3.9+** (recommended)
- **[Streamlit]** – UI framework for rapid interactive dashboards.
- **[Pandas]** – Data manipulation and aggregation.
- **[NumPy]** – Numerical utilities.
- **[Plotly]** – For Interactive charts for trends, comparisons, and breakdowns.
- **[SciPy]** (`scipy.stats`) – Regression & correlation in self-service analytics.
- **Standard Library**:
  - `json`, `pathlib`, `io`, `random`, `typing`, `string.Template`

## 3. Local Setup & How to Run

### 3.1. Clone the Repository

```bash
git clone https://github.com/albertraviss2023/kpi-dashboard.git
cd kpi-dashboard
```

### 3.2. Create & Activate a Virtual Environment

**On macOS / Linux:**

```bash
python3 -m venv .venv
source .venv/bin/activate
```

**On Windows (PowerShell):**

```bash
python -m venv .venv
.venv\Scripts\activate
```

### 3.3. Install Required Packages

Create a `requirements.txt` with (adjust versions as needed):

```text
streamlit>=1.37.0
pandas>=2.0.0
numpy>=1.24.0
plotly>=5.20.0
scipy>=1.11.0
```

Then install:

```bash
pip install -r requirements.txt
```

### 3.4. Directory Structure

A minimal structure:

```text
.
├── app.py                     # Main Streamlit app (your dashboard script)
├── data
│   └── kpiData.json           # Dummy / real KPI dataset
├── logo.jpg                   # Agency/authority logo for sidebar
├── requirements.txt
└── README.md
```

Ensure the path in the sidebar (`Path to data`) matches your data file, e.g.:

- Default: `data/kpiData.json`
- Or supply a custom path.

### 3.5. Run the App

From the project root (with venv activated):

```bash
streamlit run app.py
```

Then open the URL shown in the terminal ( `http://localhost:8501`).

---

## 4. KPI Framework

The dashboard monitors KPIs across three core regulatory domains: **MA**, **CT**, and **GMP**.

All KPIs are defined centrally via `KPI_NAME_MAP` and `KPI_PROCESS_MAP`. Values are expected as percentages or days, usually per quarter.

### 4.1. Marketing Authorization (MA) KPIs

1. **% of New Applications Evaluated On Time**
2. **% of Renewal Applications Evaluated On Time**
3. **% of Variation Applications Evaluated On Time**
4. **% of Further Information (FIR) Responses on Time**
5. **% of Query Responses Evaluated On Time**
6. **% of Applications Granted Within 90 Days**
7. **Median Duration to Grant (Days, Continental / Overall)**

**Computation (expected logic):**

- On-time KPIs:  
  `on-time % = (Number of items completed within defined timeline / Total completed items) * 100`
- “Within 90 days”:  
  `(Applications granted ≤ 90 days / Total granted applications) * 100`
- Median duration:  
  Median of calendar days from submission to decision for completed applications.

> In the demo, these are provided/derived from quarterly aggregates in the JSON rather than raw-level data.

### 4.2. Clinical Trials (CT) KPIs

1. **% of New CT Applications Evaluated On Time**
2. **% of Amendment Applications Evaluated On Time**
3. **% of GCP Inspections Completed On Time**
4. **% of Safety Reports Assessed On Time**
5. **% of Sites Compliant with GCP**
6. **% of Registry Submissions On Time**
7. **% of CAPA Evaluations Completed On Time**
8. **Average Turnaround Time (Days)**

**Computation (conceptual):**

- Same on-time formula: within defined regulatory timelines.
- GCP Compliance: `(Compliant sites / Sites assessed) * 100`
- Safety / Registry / CAPA on time: relevant events completed within timeline.
- Avg TAT: mean number of days from submission to decision/closure.

### 4.3. GMP KPIs

Core (overall) KPIs:

1. **% of Facilities Inspected On Time**
2. **% of Inspections Waived (Desk/Remote) On Time**
3. **% of Facilities Compliant**
4. **% of CAPA Decisions On Time**
5. **% of Applications Completed On Time**
6. **Average Turnaround Time (Days)**
7. **Median Turnaround Time (Days)**
8. **% of Inspection Reports Published On Time**

Disaggregated views (Thes should come directly from the data.):

- On-site Domestic vs On-site Foreign
- Reliance / Joint On-site Foreign
- Reliance / Joint Desk-based Foreign
- Direct NRA vs Reliance recommendations
- Domestic vs Foreign applicants

**Computation (conceptual):**

- On-time: `(Inspections or decisions within SLA / Total relevant events) * 100`
- Compliance: `(Number of compliant facilities / Facilities inspected) * 100`
- Turnaround time: days from request/application/inspection trigger to decision or report.
- Disaggregation: same formulas, filtered by inspection/source category.

---

## 5. Process Steps Monitored

Process steps come from `processStepData` and are harmonised to human-readable labels.

Examples (varies by process):

- Application submission review
- Technical screening / dossier review
- Committee assignment & review
- Inspection scheduling & execution
- Report drafting & publication
- CAPA request & evaluation

For each step, the dashboard tracks at least:

- **`avgDays`**: average days taken for that step in the selected quarter.
- **`targetDays`**: target SLA for that step.

**Step Status Logic:**

```text
If avgDays <= targetDays         → On track (success)
If avgDays <= 1.05 * targetDays  → At risk (warning)
Else                             → Off track (error)
```

This powers:

- The step performance chart (Actual vs Target).
- Executive “Where are delays?” summaries.

Disaggregated variants (e.g. Domestic / Foreign / Reliance) are interpreted using suffix mappings and displayed when available.

---

## 6. Bottlenecks Monitored & How They’re Computed

The `bottleneckData` structure and derived analytics focus on **flow efficiency** rather than just outcomes.

Key bottleneck metrics per process step include:

1. **`cycle_time_median`**  
   Median calendar days to complete the step.

2. **`ext_median_days`**  
   Median days waiting on external parties (applicant, sponsor, site, etc.).

3. **`opening_backlog`**  
   Number of cases/items pending at the start of the quarter.

4. **`carry_over_rate` (%)**  
   `(Items not completed by end of quarter / Items available in quarter) * 100`

5. **`avg_query_cycles`**  
   Average number of back-and-forth query rounds before completion.

6. **`fpy_pct` (First Pass Yield)**  
   `(Items completed without any queries / Total completed items) * 100`

7. **`wait_share_pct`**  
   Percentage of total elapsed time spent “waiting” (queue, external response) vs active processing.

8. **`work_to_staff_ratio`** (MA-specific in demo)  
   Proxy for workload intensity: e.g. `(Open + New cases) / Available staff`.

9. **`sched_median_days`** (often GMP-specific)  
   Median days from case readiness to scheduled inspection.

These metrics feed:

- Backlog bar charts (which steps accumulate work)
- Cycle-time bar charts (which steps are slow)
- Comparative tables & CSVs for deeper analysis

In the demo, if real values are missing, the app fills with **plausible synthetic values** to keep visuals functional.

For production, you should:
- Populate all metrics directly from workflow systems.
- Tightly define each calculation in a data dictionary.

---

## 7. Self-Service Analytics: What we are exploring -- When time comes best to have back and forth with teams to tailor these to user needs. 

The **Self-Service Analytics** section turns the dashboard into an exploratory tool for KPI and process performance. Please note that this is just to demo the idea but the real curated list of SS analytics would have to be tailored to specific user requirements. 

Curated capabilities include:

1. **Trend Analysis (Over Time)**
   - Group by **quarter** or **year**.
   - View **sum/mean/median** of selected metrics.
   - Optional **% change vs previous period**.
   - Use cases:
     - Is on-time performance improving?
     - Are approval volumes rising faster than staff capacity?
     - Are inspection timelines stabilising?

2. **Cross-Process Comparison**
   - Compare MA vs CT vs GMP on selected metrics.
   - Identify which stream is lagging or leading.
   - Supports:
     - KPI harmonisation across departments.
     - Balanced scorecard views.

3. **Category-Based Breakdowns**
   - Toggle “Breakdown by Category” for metrics with meaningful splits:
     - Domestic vs Foreign vs Reliance vs Desk (GMP)
     - Other categorical splits from the volume data.
   - Use cases:
     - Are foreign inspections consistently slower?
     - Is reliance delivering faster decisions?

4. **Correlation Analysis**
   - Select **two metrics** (e.g. Applications Received vs On-Time %, Backlog vs TAT).
   - Visualise scatter + optional regression line, with R² and p-value.
   - Use cases:
     - Does higher volume correlate with delays?
     - Are more queries associated with lower first-pass yield?

5. **Proportion / Share Analysis**
   - Pie/stacked charts for distribution-type views (where applicable).
   - Use cases:
     - Share of inspections by type.
     - Share of backlog concentrated in a few steps.

6. **Workflow & Bottleneck Deep-Dive**
   - Combine steps/bottleneck metrics with volumes:
     - E.g. cycle time vs backlog vs wait share.
   - Use cases:
     - Pinpoint stages causing missed KPI targets.
     - Validate where investments (staff, SOP fixes, digital tools) are needed.

### Why This Matters for KPI Monitoring

- Links **outcome KPIs** (on-time, compliance, approvals) with **operational drivers** (backlog, wait times, queries).
- Enables **evidence-based explanations**:
  - “On-time approvals dropped because backlog & wait time spiked at technical screening.”
- Supports **what-if & prioritisation**:
  - “If we reduce wait_share_pct at this step, we can recover KPI performance.”
- Moves beyond static reporting into an **interactive performance management tool**.

---




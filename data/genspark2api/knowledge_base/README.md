![pipeline](_img/banner_OSint.png)


### Open-Source Intelligence(OSINT) Data Fusion Engine for Military Escalation Prediction

<div align="center">

[![Author](https://img.shields.io/badge/Author-mohd--faizy-red?style=for-the-badge&logo=github&logoColor=white)](https://github.com/mohd-faizy)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](#prerequisites)
[![scikit-learn](https://img.shields.io/badge/ML-scikit--learn-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)](#the-machine-learning-model)
[![GDELT](https://img.shields.io/badge/News-GDELT%202.0-4285F4?style=for-the-badge&logo=googlenews&logoColor=white)](https://gdeltproject.org/)
[![yfinance](https://img.shields.io/badge/Finance-yfinance-6001D2?style=for-the-badge&logo=yahoo&logoColor=white)](https://pypi.org/project/yfinance/)
[![Maintained](https://img.shields.io/maintenance/yes/2026?style=for-the-badge)](https://github.com/mohd-faizy/War-Probability-OSINT)
[![Last Commit](https://img.shields.io/badge/Last%20Commit-Feb%202026-brightgreen?style=for-the-badge&logo=git&logoColor=white)](https://github.com/mohd-faizy/War-Probability-OSINT/commits/main)
[![GitHub Issues](https://img.shields.io/badge/Issues-Open-yellow?style=for-the-badge&logo=github&logoColor=white)](https://github.com/mohd-faizy/War-Probability-OSINT/issues)
[![Stars](https://img.shields.io/badge/Stars-⭐_Give_a_Star-gold?style=for-the-badge&logo=github&logoColor=white)](https://github.com/mohd-faizy/War-Probability-OSINT/stargazers)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge&logo=opensourceinitiative&logoColor=white)](https://github.com/mohd-faizy/War-Probability-OSINT/blob/main/LICENSE)
[![Contributions Welcome](https://img.shields.io/badge/Contributions-Welcome-0059b3?style=for-the-badge&logo=handshake&logoColor=white)](https://github.com/mohd-faizy/War-Probability-OSINT)
[![Repo Size](https://img.shields.io/badge/Repo%20Size-~3MB-blue?style=for-the-badge&logo=github&logoColor=white)](https://github.com/mohd-faizy/War-Probability-OSINT)

</div>

*A machine-learning pipeline that fuses real-time signals from military aviation, civic anomalies, geopolitical news sentiment, and global financial markets to output a continuously updated probability of imminent military conflict.*


---

## Table of Contents

1. [The Concept](#the-concept)
2. [How It Works — The 4-Phase Pipeline](#how-it-works--the-4-phase-pipeline)
3. [The 8 Anomaly Features — Explained in Depth](#the-8-anomaly-features--explained-in-depth)
4. [Project Structure — File-by-File Breakdown](#project-structure--file-by-file-breakdown)
5. [The Machine Learning Model](#the-machine-learning-model)
6. [Data Sources & APIs](#data-sources--apis)
7. [Getting Started](#getting-started)
   - [Prerequisites](#prerequisites)
   - [Installation](#installation)
   - [Configuration (.env)](#configuration-env)
   - [Training the Model](#training-the-model)
   - [Running the Pipeline](#running-the-pipeline)
8. [Understanding the Output](#understanding-the-output)
9. [Known Limitations & False Positives](#known-limitations--false-positives)
10. [Roadmap](#roadmap)
11. [Contributing](#contributing)
12. [Disclaimer](#disclaimer)
13. [License](#license)
14. [Connect with me](#connect-with-me)

---

## The Concept

Modern intelligence agencies don't predict wars by looking at a single data point. They practice **data fusion** — layering hundreds of weak signals on top of each other until a pattern emerges that no single signal could reveal alone.

This project replicates that principle using entirely open-source, publicly available data. The core hypothesis is:

> **Before a major military operation, detectable anomalies ripple across multiple independent domains simultaneously.** Military cargo flights surge, government buildings light up at 2 AM, news sentiment turns sharply negative, oil prices spike, and defense stocks rally — all within the same 24–72 hour window.

Any one of these signals alone produces noise. When they all fire together, the signal becomes actionable.

### The "Pentagon Pizza Index" — Why It Works

The most famous example is the so-called **Pentagon Pizza Index**, a real heuristic used by journalists and analysts since the 1990s. The logic is simple:

- The Pentagon, CIA Headquarters, and the White House are massive government buildings with predictable daily rhythms.
- When a genuine crisis erupts, hundreds of staffers are recalled for overnight planning sessions.
- These staffers order food — pizza, coffee, fast food — at 1:00 AM, 2:00 AM, 3:00 AM.
- This creates a **measurable spike** in foot traffic and food delivery activity near these buildings.

During the lead-up to the 1991 Gulf War, reporters famously noticed Domino's deliveries to the Pentagon skyrocketing at midnight. The same pattern was observed before operations in Kosovo, Iraq, and during the 2011 Bin Laden raid.

This project automates that observation and combines it with three other intelligence domains.

---

## How It Works — The 4-Phase Pipeline


The system is built as a sequential, modular pipeline. Each phase transforms data from its rawest form into the final probability score.

![pipeline](_img/pipeline.png)

### Phase 1 — Data Acquisition

Four API clients independently pull data from their respective domains. Each client:
- Loads API credentials from `.env`.
- Makes HTTP requests with retry logic and exponential backoff.
- Saves the raw JSON response to `data/raw/<source>/` for auditing and retraining.
- Returns a clean `pandas.DataFrame` to the pipeline.

### Phase 2 — Data Cleaning & Merging

Raw DataFrames from each source are standardised:
- All timestamps are converted to **UTC ISO-8601** format.
- Missing values are handled (dropped or filled depending on context).
- Exact duplicates are removed.
- Numeric columns are coerced to proper types.
- All four DataFrames are then **collapsed into a single summary dictionary** containing aggregate statistics (counts, means, ratios) — the bridge between raw data and features.

### Phase 3 — Feature Engineering

The summary dictionary is transformed into the **8-element feature vector** that the ML model expects. Each feature is a normalised anomaly score — typically a z-score against a 30-day rolling baseline. A z-score of 0 means "perfectly normal." A z-score of +2 means "2 standard deviations above normal."

### Phase 4 — Model Inference

The feature vector is fed through a `StandardScaler` (fitted during training) and then into a `RandomForestClassifier`. The model outputs:
- **Probability** (0.0 – 1.0): the estimated chance of military escalation.
- **Risk Level**: LOW / MODERATE / HIGH / CRITICAL.
- **Confidence**: how far from 50/50 the model's prediction is.
- **Feature importances**: which signals contributed most to this prediction.

---

## The 8 Anomaly Features — Explained in Depth

These are the eight numbers the AI model sees. Each one captures a different facet of pre-conflict behaviour. Understanding *why* each feature matters is critical to understanding the model's predictions.

### Feature 0: `military_flight_surge`

| Attribute | Value |
|-----------|-------|
| **Source** | ADS-B Exchange, OpenSky Network |
| **Calculation** | Z-score of current military aircraft count vs. 30-day baseline |
| **Normal value** | ~ 0.0 (± 0.5) |
| **Escalation value** | > +2.0 |

**Why it matters:** Before any major military operation, forces need to be **moved**. The U.S. military's primary strategic airlift fleet consists of C-17 Globemaster IIIs and C-5 Galaxies — massive cargo aircraft capable of carrying tanks, helicopters, and hundreds of troops. A sudden surge in these aircraft departing bases like Dover AFB, Travis AFB, or Ramstein (Germany) indicates that materiel is being pre-positioned for operations.

**What we track:** We filter ADS-B transponder data for specific ICAO aircraft type designators (C17, C5M, C130, etc.) and military callsign prefixes (RCH for "Reach" — Air Mobility Command missions, DUKE, IRON, etc.). The raw count of military aircraft in our observation window is compared to the 30-day rolling average to produce a z-score.

**Real-world example:** In the days before the April 2024 Iranian missile attack on Israel, ADS-B trackers detected a massive surge in KC-135 tanker flights and E-4B "Doomsday" plane activity over the Eastern Mediterranean.

---

### Feature 1: `tanker_refueler_ratio`

| Attribute | Value |
|-----------|-------|
| **Source** | ADS-B Exchange, OpenSky Network |
| **Calculation** | Count of KC-135 / KC-46 tankers ÷ total military flights |
| **Normal value** | < 0.10 (10%) |
| **Escalation value** | > 0.25 (25%) |

**Why it matters:** Aerial refueling tankers (KC-135 Stratotanker, KC-46 Pegasus) are the **enablers** of power projection. Fighter jets, bombers, and surveillance aircraft cannot reach distant theaters without mid-air refueling. A disproportionate increase in tanker flights relative to total military traffic specifically indicates preparation for **long-range operations** — not routine training.

**Why it's separate from Feature 0:** A general military flight surge might be a large-scale exercise (Red Flag, etc.). But if the *proportion* of tankers jumps from the usual 5–8% to 25–35%, it means the military is preparing to sustain operations far from home bases. This distinction is crucial.

---

### Feature 2: `foot_traffic_anomaly`

| Attribute | Value |
|-----------|-------|
| **Source** | Outscraper (Google Maps scraping), BestTime.app, Google Places API |
| **Calculation** | (Current late-night foot traffic ÷ Usual foot traffic) – 1.0 |
| **Normal value** | ~ 0.0 |
| **Escalation value** | > 1.0 (i.e., 200%+ of usual) |

**Why it matters:** This is the **Pentagon Pizza Index** formalised as a feature. The five geofences monitored are:

| Location | Why |
|----------|-----|
| **Pentagon** (Arlington, VA) | Department of Defense headquarters |
| **CIA Headquarters** (Langley, VA) | Central Intelligence Agency |
| **White House** (Washington, D.C.) | National Security Council situates here |
| **Fort Bragg** (Fayetteville, NC) | Home of U.S. Special Operations Command |
| **CENTCOM HQ** (MacDill AFB, Tampa, FL) | U.S. Central Command — oversees Middle East operations |

The system uses the Google Maps "Popular Times" and "Live Visit Data" features (scraped via Outscraper or BestTime APIs) for restaurants, coffee shops, and convenience stores within a ~1 mile radius. It specifically focuses on the **22:00 – 04:00 local time window**.

**How it works:** Google calculates "Popular Times" from anonymised location data from Android phones. When hundreds of government employees are recalled to the Pentagon at midnight, their phones report to Google, and the "Live Busyness" score at nearby food venues spikes. We compare the current busyness to the historical average for that hour/day.

**Why the shift (–1.0):** A ratio of 1.0 means *perfectly normal*. By subtracting 1.0, we centre the feature at 0.0 for a normal day. A value of +1.5 means foot traffic is 250% of usual — a strong anomaly.

---

### Feature 3: `gdelt_negative_tone`

| Attribute | Value |
|-----------|-------|
| **Source** | GDELT Project 2.0 DOC API |
| **Calculation** | Negated mean tone score of conflict-related articles |
| **Normal value** | ~ 1.0 (mildly negative news is normal) |
| **Escalation value** | > 4.0 |

**Why it matters:** The **GDELT Project** (Global Database of Events, Language, and Tone) is a massive, free database maintained by Google Jigsaw. It processes virtually every news article published worldwide in 100+ languages and extracts structured metadata, including a **tone score** ranging from –100 (extremely negative) to +100 (extremely positive).

Before a military escalation, global media coverage shifts dramatically. Diplomatic language hardens, threat rhetoric increases, and the average tone of articles mentioning the involved nations plummets.

**Why we negate it:** GDELT's tone is negative for negative news. By negating, we make the feature *increase* when things get worse, which is more intuitive for the model and for human interpretation. A `gdelt_negative_tone` of +6.0 means the average article is deeply alarming.

**Search queries used:** The system searches for articles matching terms like "military escalation," "troop deployment," "missile strike," "naval blockade," "airspace closure," "diplomatic expulsion," "sanctions threat," and "nuclear threat."

---

### Feature 4: `gdelt_article_spike`

| Attribute | Value |
|-----------|-------|
| **Source** | GDELT Project 2.0 DOC API |
| **Calculation** | Z-score of conflict article count vs. 7-day baseline |
| **Normal value** | ~ 0.0 |
| **Escalation value** | > 2.0 |

**Why it matters:** It's not just the *tone* of coverage that matters — it's the **volume**. On a normal day, there might be 25–35 articles globally mentioning "military escalation" or "troop deployment." Before a real crisis, this number can triple or quadruple within hours as every news outlet worldwide pivots to covering the situation.

**Why it's separate from Feature 3:** Tone and volume measure different things. You can have very negative coverage of a minor incident (high tone, low volume). Or you can have a massive volume of moderately toned articles about a developing situation (high volume, moderate tone). When *both* spike together, the signal is much stronger.

---

### Feature 5: `oil_price_z`

| Attribute | Value |
|-----------|-------|
| **Source** | yfinance (Yahoo Finance), Alpha Vantage |
| **Calculation** | Z-score of Brent Crude Oil futures (BZ=F) vs. 30-day rolling mean |
| **Normal value** | ~ 0.0 (± 0.5) |
| **Escalation value** | > 2.0 |

**Why it matters:** Oil markets are among the fastest-reacting indicators to geopolitical risk. Unlike news articles which take time to write and publish, and unlike military flights which require hours to organize, oil futures **trade 24/7** and react within seconds to rumours of conflict.

**The mechanism:** Any military conflict involving or near the Middle East threatens the Strait of Hormuz, through which ~20% of the world's oil supply flows. Traders immediately bid up oil prices on escalation news. Even conflicts outside the Middle East cause oil spikes due to general "risk premium" pricing.

**Brent Crude specifically:** We use Brent Crude (BZ=F) rather than WTI Crude because Brent is the international benchmark and is more sensitive to geopolitical events outside North America.

---

### Feature 6: `defense_stock_z`

| Attribute | Value |
|-----------|-------|
| **Source** | yfinance (Yahoo Finance) |
| **Calculation** | Average z-score across 6 major defense contractor stocks |
| **Normal value** | ~ 0.0 (± 0.5) |
| **Escalation value** | > 1.5 |

**Why it matters:** Defense contractors' stock prices are a proxy for **institutional investor sentiment about conflict probability**. Hedge funds and institutional investors have their own intelligence teams. When they assess that conflict is likely, they buy defense stocks — Lockheed Martin (LMT), Raytheon/RTX, Northrop Grumman (NOC), General Dynamics (GD), Boeing (BA), and L3Harris (LHX).

**Why average z-score across 6 tickers:** Individual stocks can spike for company-specific reasons (earnings, contracts, scandals). By averaging across the entire defense sector, we filter out company-specific noise and isolate the **sector-wide uplift** that only happens when the market broadly expects increased defense spending.

---

### Feature 7: `gold_price_z`

| Attribute | Value |
|-----------|-------|
| **Source** | yfinance (Yahoo Finance) |
| **Calculation** | Z-score of Gold futures (GC=F) vs. 30-day rolling mean |
| **Normal value** | ~ 0.0 (± 0.5) |
| **Escalation value** | > 1.5 |

**Why it matters:** Gold is the classic **"fear asset."** In times of geopolitical uncertainty, institutional and retail investors move capital from equities and bonds into gold as a store of value. A sudden gold price spike that coincides with oil spikes and defense stock rallies creates a **triple confirmation** from financial markets that sophisticated actors are pricing in conflict risk.

**Why it's the weakest feature:** Gold also rises during inflation, currency crises, and general market downturns that have nothing to do with war. That's why the model weights it lower than other features. It's a supporting signal, not a leading indicator.

---

## Project Structure — File-by-File Breakdown

```
war-probability-osint/
│
├── api_clients/                 # Data ingestion layer
│   ├── __init__.py              # Package init — re-exports all clients
│   ├── adsb_client.py           # Flight radar data ingestion
│   ├── foot_traffic_client.py   # Pentagon pizza / Google Places scraper
│   ├── gdelt_client.py          # Geopolitical news/sentiment ingestion
│   └── finance_client.py        # Oil and defense stock trackers
│
├── data/                        # Local data storage (git-ignored)
│   ├── raw/                     # Unprocessed JSON responses from APIs
│   │   ├── flights/             # Raw ADS-B and OpenSky JSON dumps
│   │   ├── foot_traffic/        # Raw Outscraper / Google Places JSON
│   │   ├── gdelt/               # Raw GDELT article JSON
│   │   └── finance/             # Raw yfinance / Alpha Vantage JSON
│   └── processed/               # Final prediction outputs
│       └── prediction_*.json    # Timestamped prediction results
│
├── src/                         # Core logic and data pipelines
│   ├── __init__.py              # Package init
│   ├── data_cleaner.py          # Normalises timestamps, handles missing data, merges sources
│   ├── feature_engineering.py   # Computes the 8-element anomaly feature vector
│   └── model_inference.py       # Loads trained model, scales features, predicts probability
│
├── models/                      # ML model artifacts
│   ├── train_model.py           # Synthetic data generator + Random Forest trainer
│   ├── random_forest_v1.pkl     # Trained model (generated by train_model.py)
│   └── scaler.pkl               # Fitted StandardScaler (generated by train_model.py)
│
├── notebooks/                   # Jupyter notebooks
│   └── 01_data_exploration.ipynb # Interactive data exploration & visualization
│
├── .env                         # API keys (NEVER commit — git-ignored)
├── .gitignore                   # Ignores data/, .env, __pycache__, *.pkl
├── requirements.txt             # Python dependencies
├── main.py                      # Master pipeline script
└── README.md                    # This file
```

### Detailed File Descriptions

#### `api_clients/adsb_client.py`
Connects to two flight-tracking services:
- **ADS-B Exchange** (via RapidAPI): Unfiltered, community-driven aircraft tracking. Unlike Flightradar24, ADS-B Exchange does not comply with government requests to filter military/VIP aircraft, making it invaluable for OSINT.
- **OpenSky Network**: Free, academic-grade API with slightly delayed data but excellent geographic coverage.

The client classifies aircraft as "military" using two heuristics:
1. **ICAO type designator matching** — looks for known military airframes (C-17, KC-135, E-4B, B-52H, etc.).
2. **Callsign prefix matching** — identifies military callsigns (RCH = Air Mobility Command, FORTE = Global Hawk ISR, DOOM = E-4B Nightwatch, etc.).

#### `api_clients/foot_traffic_client.py`
Implements three data paths (in priority order):
1. **Outscraper API** — scrapes Google Maps live popularity data.
2. **BestTime.app API** — specialized venue foot traffic forecasting.
3. **Google Places API** — discovers nearby venues (metadata only, no live popularity).

The client is pre-configured with 5 geofences centred on key government buildings and monitors 24-hour food/coffee venues within a ~1 mile radius.

#### `api_clients/gdelt_client.py`
Interfaces with the GDELT 2.0 DOC API (free, no API key required). Provides three functions:
1. **Article search** — fetches conflict-related articles with tone scores.
2. **Tone timeline** — tracks sentiment shifts over time for trend detection.
3. **Bilateral tension scanner** — monitors 8 country-pairs (US–Iran, US–China, US–Russia, Israel–Iran, NATO–Russia, etc.) for sudden tone deterioration.

#### `api_clients/finance_client.py`
Uses `yfinance` (Yahoo Finance wrapper) to pull 60 days of historical data for 11 tickers spanning commodities (Brent Crude, WTI, Gold), defense stocks (LMT, RTX, NOC, GD, BA, LHX), and volatility indicators (VIX, TLT). Computes 24h % change, 30-day rolling mean, and z-score for each ticker.

#### `src/data_cleaner.py`
Contains four per-source cleaning functions and one merge function:
- `clean_flight_data()` — normalises timestamps, drops missing lat/lon, deduplicates by ICAO + timestamp.
- `clean_foot_traffic_data()` — coerces popularity columns, recomputes anomaly ratios.
- `clean_gdelt_data()` — parses GDELT's unusual date format, ensures tone is numeric, deduplicates by URL.
- `clean_finance_data()` — coerces all numeric columns, drops rows with missing prices.
- `merge_all_sources()` — collapses all four DataFrames into a single flat dictionary of aggregate statistics.

#### `src/feature_engineering.py`
Transforms the merged summary into the 8-element feature vector using z-score calculations against configurable baselines. Also provides `explain_features()` for human-readable interpretation of each feature's current state.

#### `src/model_inference.py`
Loads the `.pkl` model files (with caching), scales the feature vector, and runs `predict_proba()`. Returns probability, risk level (LOW / MODERATE / HIGH / CRITICAL), confidence, and per-feature importances.

#### `models/train_model.py`
Since real labeled escalation data is extremely scarce, this script generates **synthetic training data** with two regimes:
- **Normal (800 samples):** Features drawn from low-anomaly distributions (calm days).
- **Escalation (200 samples):** Features drawn from high-anomaly distributions modeled on known conflict signatures.

Trains a `RandomForestClassifier` with 200 estimators, balanced class weights, and saves both the model and scaler.

#### `main.py`
Orchestrates the full pipeline with an ASCII dashboard. Supports:
- `--dry-run` — uses synthetic data (no API keys needed).
- `--train` — re-trains the model before running.
- Default mode — calls all live APIs and produces a real prediction.

---

## The Machine Learning Model

### Algorithm: Random Forest Classifier

We use a **Random Forest** because:
1. **Interpretable** — feature importances tell you *which* signals drove the prediction.
2. **Robust to noise** — individual trees may overfit to noise, but the ensemble averages it out.
3. **Handles non-linear interactions** — captures scenarios like "oil spike alone = moderate signal, but oil spike + military surge = critical signal."
4. **No need for massive data** — works well even with our synthetic training set of 1,000 samples.

### Training Data Philosophy

Real-world military escalation events are rare (thankfully). We can't train on thousands of real examples. Instead, we use **distribution-based synthetic data**:

- Study documented pre-conflict data signatures (what did the signals look like before known events?).
- Model the *distributions* of each feature during calm periods vs. escalation periods.
- Sample from these distributions to generate training data.

As you collect real data over time, you should gradually **replace synthetic samples with real observations** to improve accuracy.

### Hyperparameters

| Parameter | Value | Reason |
|-----------|-------|--------|
| `n_estimators` | 200 | Sufficient trees for stable predictions |
| `max_depth` | 8 | Prevents overfitting to synthetic patterns |
| `min_samples_split` | 10 | Forces each decision node to have statistical backing |
| `min_samples_leaf` | 5 | Prevents overly specific leaf nodes |
| `class_weight` | `balanced` | Compensates for 4:1 class imbalance (800 normal : 200 escalation) |

---

## Data Sources & APIs

| Source | Type | API Key Required? | Cost |
|--------|------|-------------------|------|
| **ADS-B Exchange** (RapidAPI) | Flight tracking | Yes | Freemium |
| **OpenSky Network** | Flight tracking | Optional (higher rate limits w/ account) | Free |
| **Outscraper** | Google Maps scraping | Yes | Freemium |
| **BestTime.app** | Venue foot traffic | Yes | Freemium |
| **Google Places API** | Venue discovery | Yes | Pay-per-use |
| **GDELT 2.0** | Geopolitical news | No | Free |
| **yfinance** | Financial markets | No | Free |
| **Alpha Vantage** | Financial markets (intraday) | Yes | Freemium |

---

## Getting Started

### Prerequisites

- **Python 3.10+** (tested with 3.11 and 3.12)
- **pip** (Python package manager)
- A terminal / command prompt
- (Optional) API keys for live data — see [Configuration](#configuration-env)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/war-probability-osint.git
cd war-probability-osint

# 2. Create a virtual environment (recommended)
python -m venv .venv

# Windows:
.venv\Scripts\activate

# macOS / Linux:
source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt
```

### Configuration (.env)

Create a `.env` file in the project root by copying the template below. Replace each placeholder with your actual API key.

```env
# ============================================================
# WAR-PROBABILITY-OSINT — API Keys
# ============================================================
# NEVER commit this file to Git. It is listed in .gitignore.

# --- Aerospace / Flight Tracking ---
ADSB_API_KEY=your_adsb_exchange_rapidapi_key_here
OPENSKY_USERNAME=your_opensky_username_here
OPENSKY_PASSWORD=your_opensky_password_here

# --- Civic / Foot Traffic ---
OUTSCRAPER_API_KEY=your_outscraper_api_key_here
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
BESTTIME_API_KEY=your_besttime_api_key_here

# --- Finance ---
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key_here

# --- Cyber ---
SHODAN_API_KEY=your_shodan_api_key_here

# --- Conflict Events ---
ACLED_API_KEY=your_acled_api_key_here
```

> **⚠️ IMPORTANT:** Never commit `.env` to Git. It is already listed in `.gitignore`.

**Which keys are required?**
- **None** for `--dry-run` mode (synthetic data).
- **None** for GDELT (free, no key) and yfinance (free, no key). These two work without any configuration.
- The other keys unlock additional data sources for richer predictions.

### Training the Model

```bash
# Train the Random Forest on synthetic data
python models/train_model.py
```

This generates:
- `models/random_forest_v1.pkl` — the trained classifier.
- `models/scaler.pkl` — the fitted StandardScaler.

If you skip this step, `main.py` will auto-train on first run.

### Running the Pipeline

```bash
# ---- Option A: Dry-run (no API keys needed) ----
python main.py --dry-run

# ---- Option B: Live data (requires API keys in .env) ----
python main.py

# ---- Option C: Re-train model, then run live ----
python main.py --train

# ---- Option D: Test individual clients ----
python api_clients/adsb_client.py
python api_clients/gdelt_client.py
python api_clients/finance_client.py
python api_clients/foot_traffic_client.py
```

---

## Understanding the Output

When you run the pipeline, you'll see a full ASCII dashboard:

```
╔══════════════════════════════════════════════════════════╗
║   WAR-PROBABILITY OSINT — ESCALATION DASHBOARD           ║
╠══════════════════════════════════════════════════════════╣
║  Timestamp : 2026-02-22 20:09:35 UTC                     ║
║  Risk Level:                                  CRITICAL   ║
║  Probability:  89.8%                                     ║
║  [████████████████████████████████████░░░░] 89.8%        ║
║  Confidence :  79.6%                                     ║
╠══════════════════════════════════════════════════════════╣
║  SIGNAL BREAKDOWN                                        ║
╠══════════════════════════════════════════════════════════╣
║  military_flight_surge      +3.600  ELEVATED     █████   ║
║  tanker_refueler_ratio      +0.167  MODERATE     █       ║
║  foot_traffic_anomaly       +0.989  ELEVATED     ███     ║
║  gdelt_negative_tone        +2.379  NEGATIVE     █████   ║
║  gdelt_article_spike        +1.300  ELEVATED     █████   ║
║  oil_price_z                +0.602  NORMAL       ██      ║
║  defense_stock_z            +0.321  NORMAL       █       ║
║  gold_price_z               +0.072  NORMAL               ║
╠══════════════════════════════════════════════════════════╣
║  FEATURE IMPORTANCES (model weights)                     ║
╠══════════════════════════════════════════════════════════╣
║  tanker_refueler_ratio      0.2892  ██████████████       ║
║  foot_traffic_anomaly       0.2157  ██████████           ║
║  gdelt_article_spike        0.2052  ██████████           ║
║  gdelt_negative_tone        0.0962  ████                 ║
║  military_flight_surge      0.0901  ████                 ║
║  defense_stock_z            0.0512  ██                   ║
║  oil_price_z                0.0482  ██                   ║
║  gold_price_z               0.0041                       ║
╚══════════════════════════════════════════════════════════╝
```

### Reading the Dashboard

| Section | What it tells you |
|---------|------------------|
| **Probability** | The model's estimated chance (0–100%) that a military escalation is imminent. |
| **Risk Level** | Categorical: LOW (<25%), MODERATE (25–50%), HIGH (50–75%), CRITICAL (>75%). |
| **Confidence** | How decisive the model is. 100% = very sure of its prediction. 0% = coin flip. |
| **Signal Breakdown** | Per-feature values and interpretations. Shows which data domains are anomalous. |
| **Feature Importances** | Model weights — which features have the most influence on the prediction overall. |

### Saved Output

Each run saves a JSON file to `data/processed/prediction_<timestamp>.json` containing:
- Probability, risk level, and confidence.
- All 8 feature values.
- Feature importances.
- The raw summary statistics from the merge step.

---

## Known Limitations & False Positives

This model is an **OSINT exercise and educational project**. It has real limitations:

### Sources of False Positives
1. **Government shutdowns / budget crises** — Pentagon staffers ordering midnight pizza for budget negotiations, not war planning.
2. **Domestic natural disasters** — FEMA coordination can cause the same military flight + late-night government activity patterns.
3. **Major military exercises** — Large-scale NATO exercises (Defender Europe, etc.) mimic pre-war logistics patterns.
4. **Oil supply disruptions** — OPEC decisions, refinery accidents, and hurricanes in the Gulf of Mexico cause oil spikes unrelated to conflict.

### Structural Limitations
- **OPSEC darkening** — When a real operation is imminent, the military turns off ADS-B transponders. A sudden *drop* in visible military flights could paradoxically indicate escalation, but the model currently treats fewer flights as "calm."
- **Synthetic training data** — The model has never seen a real war. Its training data is generated from estimated distributions, not actual observations.
- **No satellite imagery** — Professional platforms (Palantir, Planet Labs) use satellite imagery to verify troop movements. This project relies only on signals that are accessible via public APIs.

---

## 🛣️Roadmap

- [ ] **Maritime tracking** — Add MarineTraffic / AISHub API for Carrier Strike Group and oil tanker monitoring.
- [ ] **Cyber threat indicator** — Integrate Shodan API to detect spikes in state-sponsored infrastructure scanning.
- [ ] **ACLED conflict events** — Add Armed Conflict Location & Event Data for political violence tracking.
- [ ] **Historical backtesting** — Collect baseline data over months and backtest against known escalation events.
- [ ] **LSTM neural network** — Add a time-series model that captures *temporal patterns* (e.g., 3 consecutive days of increasing anomaly scores).
- [ ] **Web dashboard** — Real-time Streamlit or Grafana dashboard with historical charts.
- [ ] **Alert system** — Email/Telegram notifications when probability exceeds configurable thresholds.

---

## 🤝Contributing

Contributions are welcome! Areas where help is especially valuable:

1. **New data sources** — Maritime, cyber, satellite, or social media signals.
2. **Real event labeling** — If you can identify historical date ranges for known escalation events and pull the corresponding API data, this would dramatically improve the model.
3. **Model improvements** — LSTM, gradient boosting, or ensemble approaches.
4. **Testing & CI** — Unit tests, integration tests, GitHub Actions.

---

## ⛔Disclaimer

> **This project is an educational exercise in Open-Source Intelligence (OSINT) engineering and machine learning.** It is NOT a reliable predictor of military conflict. The model's outputs should NEVER be used as the basis for financial decisions, security assessments, or any real-world actions. The creators assume no responsibility for any use of this tool. War prediction is an inherently uncertain task that even nation-state intelligence agencies with classified data struggle with.

---

## ⚖️ License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

---

## 🔗 Connect with me

<div align="center">

[![Twitter](https://img.shields.io/badge/Twitter-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white)](https://twitter.com/F4izy)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/mohd-faizy/)
[![Stack Exchange](https://img.shields.io/badge/Stack_Exchange-1E5397?style=for-the-badge&logo=stack-exchange&logoColor=white)](https://ai.stackexchange.com/users/36737/faizy)
[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/mohd-faizy)

</div>

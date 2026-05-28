# IntelliCanteen Platform

Next.js dashboard + FastAPI backend for 7-day canteen demand forecasting.

## Project Layout

- `app/` and `components/` — Next.js frontend
- `backend/` — FastAPI inference API (`app/main.py`)

## Requirements

- Node.js `>= 22.13`
- Python `>= 3.10`

## Local Development

### 1) Backend

From the platform root:

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API endpoints:

- `GET /api/health`
- `GET /api/canteens`
- `GET /api/weather`
- `POST /api/forecast`

### 2) Frontend

```bash
cd ..
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

### Frontend (`.env.local`)

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### Backend (`backend/.env`)

```bash
MODEL_PATH=../lightgbm_residual.joblib
RESIDUAL_FEATURES_PATH=../residual_tree_features.json
MODEL_SELECTION_PATH=../final_model_selection.json
SEPARATE_MEAL_MODELS_DIR=../IMPORTS/Modeling/Separate_meal_type_models/models
SEPARATE_MEAL_FEATURES_PATH=../IMPORTS/Modeling/Separate_meal_type_models/results/meal_tree_features.json
HISTORY_CSV_PATH=../model_second_stage_clean.csv
HISTORY_PARQUET_PATH=./artifacts/history_snapshot.parquet
CORS_ORIGINS=http://localhost:3000,https://your-frontend.vercel.app
```

Notes:

- On first backend start, a Parquet snapshot is built from the CSV.
- Large model/data artifacts are expected outside git and can be mounted at runtime.

## Lint / Build

```bash
npm run lint
npm run build
```

## Backend Variants

`backend/main.py` and `backend/api/` are legacy pipeline wrappers. The supported entrypoint for deployment is `backend/app/main.py`.

# CV Evaluator by Redbee

Sistema de evaluacion automatica de CVs usando Lever API y Claude AI.

## Stack

- **Backend**: Node.js + Express + PostgreSQL
- **Frontend**: React + CSS
- **IA**: Claude API (claude-sonnet-4-20250514)
- **Integracion**: Lever ATS

## Setup Local

### Backend
```bash
cd backend
npm install
# Crear .env con las variables necesarias
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## Variables de Entorno

**Backend (.env):**
```env
LEVER_API_KEY=tu_lever_api_key
CLAUDE_API_KEY=tu_claude_api_key
DATABASE_URL=postgresql://...
PORT=5000
FRONTEND_URL=http://localhost:3000
```

**Frontend (.env):**
```env
REACT_APP_API_URL=http://localhost:5000/api
```

## API Endpoints

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/api/jobs` | Lista jobs de Lever |
| GET | `/api/jobs/:jobId/candidates` | Candidatos de un job |
| POST | `/api/evaluate` | Evaluar candidato |
| GET | `/api/evaluations/stats/:jobId` | Stats por job |
| DELETE | `/api/evaluations/:id` | Eliminar evaluacion |

## Evaluacion

- **VERDE**: Cumple 80-100% de requisitos
- **AMARILLO**: Cumple 60-80%, revisar manualmente
- **ROJO**: No cumple requisitos criticos

---

Redbee 2025

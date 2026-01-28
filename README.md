# CV Evaluator by Redbee

Sistema de evaluacion automatica de CVs usando Lever API y Claude AI.

## Stack Tecnologico

- **Backend**: Node.js + Express.js
- **Frontend**: React (sin TypeScript) + CSS puro
- **Database**: PostgreSQL (Railway)
- **IA**: Claude API (claude-sonnet-4-20250514)
- **API Externa**: Lever ATS

## Estructura del Proyecto

```
lever-cv-evaluator/
├── backend/
│   ├── src/
│   │   ├── config/database.js
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── migrations/
│   │   └── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── styles/
│   │   ├── api.js
│   │   └── App.jsx
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Configuracion Inicial

### 1. Clonar y configurar variables de entorno

```bash
# Copiar archivos de ejemplo
cp .env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 2. Configurar las API Keys en `backend/.env`:

```env
LEVER_API_KEY=tu_lever_api_key
CLAUDE_API_KEY=tu_claude_api_key
DATABASE_URL=tu_database_url_de_railway
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 3. Configurar PostgreSQL en Railway

1. Crear cuenta en [Railway](https://railway.app)
2. Crear nuevo proyecto
3. Agregar PostgreSQL addon
4. Copiar la `DATABASE_URL` del dashboard
5. Ejecutar migraciones:

```bash
cd backend
npm install
npm run migrate
```

### 4. Iniciar el proyecto

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Frontend (en otra terminal):**
```bash
cd frontend
npm install
npm start
```

La app estara disponible en `http://localhost:3000`

## API Endpoints

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/api/jobs` | Lista jobs activos de Lever |
| GET | `/api/jobs/:jobId` | Detalle de un job |
| POST | `/api/jobs/refresh` | Refrescar cache de jobs |
| GET | `/api/jobs/:jobId/candidates` | Candidatos de un job |
| GET | `/api/candidates/:id/cv` | Texto del CV |
| POST | `/api/evaluate` | Evaluar un candidato |
| POST | `/api/evaluate/batch` | Evaluar multiples candidatos |
| GET | `/api/evaluations` | Historial de evaluaciones |
| GET | `/api/evaluations/stats/:jobId` | Stats por job |
| DELETE | `/api/evaluations/:id` | Eliminar evaluacion |

## Flujo de Uso

1. Abrir la app y seleccionar un job del dropdown
2. Ver lista de candidatos con sus CVs
3. Seleccionar candidatos a evaluar (checkbox)
4. Click en "Evaluar Seleccionados"
5. Ver resultados con clasificacion:
   - **VERDE**: Cumple 80-100% de requisitos
   - **AMARILLO**: Cumple 60-80%, revisar manualmente
   - **ROJO**: No aplica (<60% o falta algo critico)

## Deploy a Railway

### Backend

1. Conectar repositorio a Railway
2. Configurar variables de entorno en Railway dashboard
3. Railway detectara automaticamente el proyecto Node.js

### Frontend

Opcion 1: Railway
- Agregar como servicio separado en Railway

Opcion 2: Vercel
```bash
cd frontend
npm run build
# Deploy a Vercel
```

## Desarrollo Local con Docker (opcional)

Si queres usar PostgreSQL local con Docker:

```bash
docker-compose up -d
```

Esto levanta PostgreSQL en `localhost:5432`.

## Variables de Entorno

| Variable | Descripcion |
|----------|-------------|
| `LEVER_API_KEY` | API Key de Lever |
| `CLAUDE_API_KEY` | API Key de Anthropic |
| `DATABASE_URL` | Connection string de PostgreSQL |
| `PORT` | Puerto del backend (default: 5000) |
| `NODE_ENV` | development / production |
| `FRONTEND_URL` | URL del frontend para CORS |
| `REACT_APP_API_URL` | URL del backend API |

## Notas Tecnicas

- **Rate Limiting**: El sistema espera 1.5s entre evaluaciones de Claude para evitar rate limits
- **Cache de Jobs**: Los jobs se cachean por 5 minutos. Usar "Actualizar Datos" para refrescar
- **CVs**: Se intenta extraer texto de PDFs. Si falla, se marca como "CV no disponible"
- **Evaluaciones**: Se guardan en DB y no se re-evaluan candidatos ya evaluados

---

Desarrollado por Redbee - Powered by Claude AI

# Deployment Guide - Railway

## Root Cause del 500 en Login

**Problema identificado**: La tabla `users` se creaba pero **NO se ejecutaba el seed del usuario admin**.

### Causa específica:
1. El migration `004_create_users.js` nunca se ejecutaba (no estaba en el array de migrations del `run.js`)
2. No existía ningún script de seed para crear el usuario admin usando `ADMIN_EMAIL` y `ADMIN_PASSWORD`
3. Resultado: tabla vacía → login fallaba porque no había usuarios en la DB

## Cambios Implementados

### Backend - Fixes Críticos

#### 1. `/backend/src/migrations/run.js`
**Cambio**: Agregado ejecución de migration 004 + seed idempotente del admin
- ✅ Ejecuta `004_create_users.js` para crear tabla users
- ✅ Seed automático del admin usando `ADMIN_EMAIL` y `ADMIN_PASSWORD`
- ✅ Idempotente: verifica si el admin existe antes de crearlo
- ✅ Warning si faltan las variables de entorno (no falla el deploy)

#### 2. `/backend/src/migrations/004_create_users.js`
**Cambio**: Actualizado para recibir pool de conexión como parámetro
- ✅ Evita crear múltiples conexiones a la DB

#### 3. `/backend/src/controllers/authController.js`
**Cambio**: Logging detallado y seguro en el flujo de login
- ✅ Logs por cada paso: validación, DB lookup, password check, token generation
- ✅ No loguea passwords (solo email anonimizado)
- ✅ Stack trace completo en errores 500
- ✅ 401 para credenciales inválidas (no 500)

#### 4. `/backend/src/services/authService.js`
**Cambio**: Mejor mensaje de error si falta JWT_SECRET
- ✅ Log claro: "CRITICAL: JWT_SECRET environment variable is not set!"

### Frontend - Fix UI

#### 5. `/frontend/src/styles/auth.css`
**Cambio**: Mejorada alineación del campo password
- ✅ Input de password alineado con email (mismo padding)
- ✅ Botón "Mostrar/Ocultar" correctamente posicionado
- ✅ Responsive y consistente con el resto del form

#### 6. `/frontend/src/styles/index.css`
**Cambio**: Agregado `input[type="password"]` a los estilos globales
- ✅ Mismo estilo que text/email inputs

## Variables de Entorno en Railway

Asegúrate de que estas variables estén configuradas en Railway:

```bash
# Backend
DATABASE_URL=postgresql://...  # Railway lo genera automáticamente
JWT_SECRET=<tu-jwt-secret>      # Debe ser una cadena larga y aleatoria
ADMIN_EMAIL=admin@redb.ee       # Email del usuario administrador
ADMIN_PASSWORD=<tu-password>    # Contraseña segura del admin
NODE_ENV=production
FRONTEND_URL=https://<tu-frontend-url>.railway.app

# Frontend
REACT_APP_API_URL=https://<tu-backend-url>.railway.app
```

## Pasos para Redeploy en Railway

### Opción 1: Deploy automático (si tienes CI/CD conectado)

1. **Commitea y pushea los cambios:**
   ```bash
   cd /Users/nahuel/Documents/redbee_desarrollo/AnalisisCV/lever-cv-evaluator
   git add .
   git commit -m "fix: resolve 500 login error + seed admin user + UI password field"
   git push origin main
   ```

2. **Railway detectará el push y re-deployará automáticamente**

### Opción 2: Deploy manual desde Railway CLI

1. **Instala Railway CLI** (si no lo tienes):
   ```bash
   npm i -g @railway/cli
   railway login
   ```

2. **Deploy backend:**
   ```bash
   cd backend
   railway up
   ```

3. **Deploy frontend:**
   ```bash
   cd ../frontend
   railway up
   ```

### Opción 3: Redeploy desde Railway Dashboard

1. Ve a https://railway.app/dashboard
2. Selecciona tu proyecto
3. En el servicio de **backend**, click en los 3 puntos → "Redeploy"
4. En el servicio de **frontend**, click en los 3 puntos → "Redeploy"

## Verificación Post-Deploy

### 1. Verificar que las migrations corrieron

En los logs del backend en Railway deberías ver:

```
Starting database migrations...
[Migration] Creating users table...
[Migration 004] Creating users table...
[Migration 004] Users table created successfully.
[Seed] ✓ Admin user created: admin@redb.ee
All migrations completed!
```

O si ya existe:

```
[Seed] Admin user already exists: admin@redb.ee
```

### 2. Probar el login desde local

```bash
curl -i https://analisis-cv-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@redb.ee","password":"TU_ADMIN_PASSWORD"}'
```

**Respuesta esperada (200 OK):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@redb.ee",
    "name": "Administrator",
    "role": "administrator"
  }
}
```

### 3. Probar /me con el token

```bash
curl -i https://analisis-cv-production.up.railway.app/api/auth/me \
  -H "Authorization: Bearer <TOKEN_DEL_PASO_ANTERIOR>"
```

**Respuesta esperada (200 OK):**

```json
{
  "user": {
    "id": 1,
    "email": "admin@redb.ee",
    "name": "Administrator",
    "role": "administrator"
  }
}
```

### 4. Probar desde el frontend

1. Abre `https://<tu-frontend>.railway.app`
2. Intenta hacer login con `admin@redb.ee` y tu password
3. Deberías ser redirigido al panel de admin

## Troubleshooting

### Si el login aún falla:

1. **Revisa los logs del backend en Railway:**
   - Busca `[Auth] Login attempt for: ad***@redb.ee`
   - Verifica qué paso falla: DB lookup, password check, token generation

2. **Verifica que las variables estén configuradas:**
   ```bash
   railway variables
   ```
   Debe mostrar: JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, DATABASE_URL

3. **Verifica que el admin existe en la DB:**
   - Conecta a la DB de Railway (desde el dashboard: Database → Connect)
   - Ejecuta: `SELECT id, email, role FROM users WHERE email = 'admin@redb.ee';`

4. **Si el admin no existe**, fuerza las migrations:
   - Desde Railway CLI:
     ```bash
     railway run npm run migrate
     ```

### Si el UI se ve mal:

1. **Verifica que el frontend se haya rebuildeado:**
   - En Railway, el frontend debe ejecutar `npm run build`
   - Los archivos deben estar en `build/` (no `frontend/build`)

2. **Hard refresh en el browser:**
   - Cmd+Shift+R (Mac) o Ctrl+Shift+R (Windows)

## Resumen de Archivos Modificados

```
backend/
  src/
    controllers/authController.js      ← Logging detallado + mejor error handling
    services/authService.js            ← Mejor mensaje si falta JWT_SECRET
    migrations/
      run.js                           ← Ejecuta 004 + seed del admin
      004_create_users.js              ← Recibe pool como parámetro

frontend/
  src/
    styles/
      auth.css                         ← Fix alineación password input
      index.css                        ← Agregado input[type="password"]
```

## Comandos Rápidos

```bash
# Commitear cambios
git add .
git commit -m "fix: login 500 error + admin seed + UI fixes"
git push origin main

# Verificar login (reemplazar con tu password real)
curl -X POST https://analisis-cv-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@redb.ee","password":"TuPassword123!"}'

# Ver logs del backend
railway logs --service=backend

# Forzar re-run de migrations (si es necesario)
railway run npm run migrate
```

---

**Autor**: Claude  
**Fecha**: 13 de febrero de 2026  
**Ticket**: Login 500 en Railway + UI password field

# 🚨 FIX RÁPIDO: Error 500 en Login

## TL;DR - Ejecuta Estos 2 Comandos en Railway

```bash
# En Railway Dashboard → Backend → Deployments → último deploy → ••• → "Run Command":

# 1. Primero ejecuta las migrations:
npm run migrate

# 2. Luego crea el admin:
npm run seed-admin

# 3. ¡Listo! Prueba el login
```

---

## ⚠️ Problema Real (según logs)

```
[Auth] DB query error: relation "users" does not exist
```

**La tabla `users` NO EXISTE** porque las migrations **NO corrieron** durante el deploy.

El `postinstall` tiene `|| true` que hace que falle silenciosamente sin crear las tablas.

## Fix en 3 Pasos

### 1️⃣ Verifica las Variables de Entorno en Railway

**Backend service → Settings → Variables**

Deben existir:
```
ADMIN_EMAIL=admin@redb.ee
ADMIN_PASSWORD=<tu-password-seguro>
JWT_SECRET=<secret-largo>
DATABASE_URL=<generado-automático>
NODE_ENV=production
```

Si falta alguna, **agrégala ahora** (especialmente `ADMIN_EMAIL` y `ADMIN_PASSWORD`).

### 2️⃣ Ejecuta las Migrations + Seed

**Railway Dashboard → Backend Service → Deployments → último deployment → "•••" → "Run Command"**

**Comando 1 - Crear tablas**:
```bash
npm run migrate
```

Espera a que termine. Deberías ver:
```
Starting database migrations...
✓ Migration 001_create_tables.sql completed
[Migration 004] Creating users table...
✓ Users table created successfully.
```

**Comando 2 - Crear admin**:
```bash
npm run seed-admin
```

Deberías ver:
```
✓ Admin user created successfully!
User details:
   ID: 1
   Email: admin@redb.ee
   Name: Administrator
   Role: administrator
```

### 3️⃣ Verifica que Funciona

**Opción A - Con el script de test**:
```bash
cd /Users/nahuel/Documents/redbee_desarrollo/AnalisisCV/lever-cv-evaluator
./test-railway-login.sh
```

**Opción B - Con curl**:
```bash
curl -i -X POST https://analisis-cv-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@redb.ee","password":"TU_PASSWORD_REAL"}'
```

**Esperado**: `HTTP/2 200` + un token en el JSON

**Opción C - Desde el frontend**:
1. Abre el frontend en Railway
2. Login con `admin@redb.ee`
3. Debe funcionar ✅

---

## ¿Por qué pasó esto?

1. Railway deployó el backend
2. El `postinstall: "npm run migrate || true"` **falló silenciosamente**
3. La tabla `users` nunca se creó
4. Login intenta consultar `users` → error: "relation does not exist" → 500

## Fix Aplicado (ya en el código)

- ✅ `run.js` ahora ejecuta migration 004 + seed del admin automáticamente
- ✅ Nuevo script `seed-admin.js` para crear el admin manualmente
- ✅ Logging mejorado para diagnosticar problemas

**Pero necesitas ejecutar manualmente las migrations esta primera vez.**

## Troubleshooting

### Error: "ADMIN_EMAIL or ADMIN_PASSWORD not set"

→ Agrega las variables en Railway (Backend → Settings → Variables)

### Error: "Admin user already exists"

→ ¡Perfecto! El admin ya existe. Prueba el login.

### Aún 500 después del seed

→ Revisa los logs del backend en Railway:
```bash
railway logs --service=backend | tail -50
```

Busca líneas con `[Auth]` para ver dónde falla.

### El seed dice "users table does not exist"

→ Corre las migrations primero:
```bash
railway run npm run migrate
```

Luego ejecuta el seed nuevamente.

---

## Resumen

| Paso | Comando | Dónde |
|------|---------|-------|
| 1 | Verifica todas las variables (especialmente `ADMIN_EMAIL`, `ADMIN_PASSWORD`) | Railway Dashboard → Backend → Settings → Variables |
| 2 | `npm run migrate` | Railway Dashboard → Backend → Deployments → Run Command |
| 3 | `npm run seed-admin` | Railway Dashboard → Backend → Deployments → Run Command |
| 4 | Prueba el login | Frontend o curl |

**Tiempo total**: ~3 minutos ⏱️

---

🎯 **Después del fix, el login debería devolver 200 OK con un token JWT.**

## Alternativa: Railway CLI

Si prefieres la terminal:

```bash
cd backend
railway login
railway link  # Selecciona tu proyecto y el servicio backend

# Paso 1: Migrations
railway run npm run migrate

# Paso 2: Seed admin
railway run npm run seed-admin

# Paso 3: Verifica
curl -X POST https://analisis-cv-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@redb.ee","password":"TU_PASSWORD"}'
```

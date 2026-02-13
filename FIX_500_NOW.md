# 🚨 FIX RÁPIDO: Error 500 en Login

## TL;DR - Ejecuta Esto Ahora

```bash
# En Railway Dashboard:
# 1. Backend service → Deployments → último deploy → ••• → "Run Command"
# 2. Ejecuta: npm run seed-admin
# 3. Listo! Prueba el login
```

---

## ¿Qué está pasando?

El backend está deployado pero la tabla `users` está **vacía**. Las migrations corrieron antes de que existiera el código para crear el usuario admin.

## Fix en 3 Pasos

### 1️⃣ Verifica las Variables de Entorno en Railway

**Backend service → Settings → Variables**

Deben existir:
```
ADMIN_EMAIL=admin@redb.ee
ADMIN_PASSWORD=<tu-password>
JWT_SECRET=<secret-largo>
DATABASE_URL=<generado-automático>
```

Si faltan `ADMIN_EMAIL` o `ADMIN_PASSWORD`, agrégalas ahora.

### 2️⃣ Ejecuta el Script de Seed

**Método 1 - Railway Dashboard** (recomendado):

1. Backend service → **Deployments**
2. Click en el deployment más reciente
3. Botón **"•••"** (arriba derecha) → **"Run Command"**
4. Ingresa: `npm run seed-admin`
5. Click **"Run"**

**Método 2 - Railway CLI**:

```bash
cd backend
railway run npm run seed-admin
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

1. Las migrations corrieron en Railway (crearon la tabla `users`)
2. PERO el código del seed del admin **no existía en ese momento**
3. Resultado: tabla vacía → login falla → 500

## Fix Aplicado (ya en el código)

- ✅ `run.js` ahora llama a `seedAdminUser(pool)` después de crear la tabla
- ✅ Nuevo script `seed-admin.js` para crear el admin manualmente
- ✅ El próximo deploy lo hará automáticamente

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
| 1 | Verifica variables `ADMIN_EMAIL` y `ADMIN_PASSWORD` | Railway Dashboard → Backend → Settings → Variables |
| 2 | `npm run seed-admin` | Railway Dashboard → Backend → Deployments → Run Command |
| 3 | Prueba el login | Frontend o curl |

**Tiempo total**: ~2 minutos ⏱️

---

🎯 **Después del fix, el login debería devolver 200 OK con un token JWT.**

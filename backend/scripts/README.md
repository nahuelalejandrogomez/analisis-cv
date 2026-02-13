# 🗑️ Scripts de Utilidad

## 1. Seed Admin User (Crear Usuario Administrador)

Script para crear el usuario administrador inicial. **Necesario si las migrations corrieron antes del fix del seed automático.**

### 🚨 ¿Cuándo usar este script?

Si obtienes error 500 al hacer login y las migrations ya corrieron, probablemente la tabla `users` existe pero está vacía. Este script crea el admin manualmente.

### 📦 Uso

#### Opción A: Desde Railway Dashboard (Más Fácil)

1. Ve a https://railway.app/dashboard
2. Selecciona tu proyecto → servicio **backend**
3. Verifica variables en **Settings → Variables**:
   ```
   ADMIN_EMAIL=admin@redb.ee
   ADMIN_PASSWORD=<tu-password-seguro>
   ```
4. Ve a **Deployments** → último deployment → **"•••"** → **"Run Command"**
5. Ejecuta:
   ```bash
   npm run seed-admin
   ```

#### Opción B: Desde Railway CLI

```bash
cd backend
railway login
railway link  # Selecciona tu proyecto
railway run npm run seed-admin
```

### ✅ Output Esperado

```
========================================
  Admin User Seed Script
========================================

📧 Admin email: admin@redb.ee

[1/4] Checking users table...
✓ Users table exists

[2/4] Checking if admin user exists...
✓ Admin user does not exist, will create

[3/4] Hashing password...
✓ Password hashed with bcrypt (12 rounds)

[4/4] Creating admin user...
✓ Admin user created successfully!

User details:
   ID: 1
   Email: admin@redb.ee
   Name: Administrator
   Role: administrator

========================================
You can now login with these credentials!
========================================
```

### 🔍 Verificación Post-Seed

```bash
curl -X POST https://analisis-cv-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@redb.ee","password":"TU_PASSWORD"}'
```

Esperado: **HTTP 200** + token

---

## 2. Clear Evaluations (Limpiar Base de Datos)

Script para borrar evaluaciones de la tabla `evaluations`.

### 📦 Uso

#### Opción 1: Con npm (recomendado)
```bash
# Modo interactivo (con menú)
npm run clear-db

# Modo automático (borra todo sin preguntar)
npm run clear-db:confirm
```

#### Opción 2: Directo con node
```bash
# Modo interactivo
node scripts/clear-evaluations.js

# Modo automático
node scripts/clear-evaluations.js --confirm
```

### 🎯 Opciones del Menú Interactivo

1. **Borrar TODAS las evaluaciones** - Elimina todos los registros
2. **Borrar solo VERDES** - Elimina solo evaluaciones con status VERDE
3. **Borrar solo AMARILLAS** - Elimina solo evaluaciones con status AMARILLO
4. **Borrar solo ROJAS** - Elimina solo evaluaciones con status ROJO
0. **Cancelar** - Sale sin hacer cambios

### 📊 Ejemplo de Ejecución

```bash
$ npm run clear-db

═══════════════════════════════════════════════════
  🗑️  LIMPIEZA DE EVALUACIONES
═══════════════════════════════════════════════════

📊 Estadísticas actuales:
   🟢 VERDE: 15
   🟡 AMARILLO: 8
   🔴 ROJO: 3
   Total: 26 evaluaciones

Opciones:
  1 - Borrar TODAS las evaluaciones (26 registros)
  2 - Borrar solo evaluaciones VERDES
  3 - Borrar solo evaluaciones AMARILLAS
  4 - Borrar solo evaluaciones ROJAS
  0 - Cancelar

Selecciona una opción [0-4]: 1
⚠️  ¿Estás seguro de borrar TODAS las evaluaciones? (escribe 'SI' para confirmar): SI

✅ 26 todas las evaluaciones borradas exitosamente.

📊 Evaluaciones restantes: 0
```

### ⚡ Uso Rápido (Sin Confirmación)

Útil para scripts automatizados o CI/CD:

```bash
npm run clear-db:confirm
```

### 🔒 Seguridad

- ✅ Requiere confirmación explícita para borrar todo (modo interactivo)
- ✅ Muestra estadísticas antes de borrar
- ✅ Confirma cantidad de registros borrados
- ✅ Solo afecta la tabla `evaluations`, no toca otras tablas

### 🌍 Variables de Entorno

El script usa la misma conexión configurada en `.env`:

```env
DATABASE_URL=postgresql://user:pass@host:port/dbname
```

### 📝 Notas

- El script cierra la conexión automáticamente al finalizar
- En caso de error, muestra mensaje descriptivo y sale con código 1
- Soporta PostgreSQL con SSL (producción) y sin SSL (local)

---

**Uso común:** Limpiar base de datos antes de hacer pruebas o después de tests masivos.

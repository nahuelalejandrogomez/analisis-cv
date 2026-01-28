# 🔧 Configuración DATABASE_URL

## Obtener DATABASE_URL de Railway

### Opción 1: Desde Railway Dashboard

1. Ve a [Railway.app](https://railway.app)
2. Entra a tu proyecto
3. Click en el servicio de **PostgreSQL**
4. Ve a la pestaña **Variables** o **Connect**
5. Copia la variable `DATABASE_URL`

### Opción 2: Desde Railway CLI

```bash
# Instalar Railway CLI (si no lo tienes)
npm install -g @railway/cli

# Login
railway login

# Listar proyectos
railway list

# Conectar a tu proyecto
railway link

# Ver variables
railway variables

# Obtener DATABASE_URL específicamente
railway variables | grep DATABASE_URL
```

---

## Pegar en .env

Una vez que tengas el `DATABASE_URL`, pégalo en tu archivo `.env`:

```bash
# Ejemplo de formato
DATABASE_URL=postgresql://postgres:TuPasswordAqui@containers-us-west-123.railway.app:5432/railway
```

---

## Ejecutar Script de Limpieza

Una vez configurado el `.env`:

```bash
# Modo interactivo
npm run clear-db

# Modo automático (borra todo sin preguntar)
npm run clear-db:confirm
```

---

## ⚠️ Importante

- **NO subas el `.env` a git** (ya está en .gitignore)
- El DATABASE_URL es sensible, protégelo
- Para producción, usa las variables de entorno de Railway directamente

---

## Alternativa: Limpiar desde Railway

Si no quieres configurar localmente, puedes:

1. Conectarte a la base de datos desde Railway:
   - Dashboard → PostgreSQL → Data (pestaña)
   - O usar un cliente SQL (TablePlus, DBeaver, etc.)

2. Ejecutar manualmente:
   ```sql
   -- Ver cuántas evaluaciones hay
   SELECT COUNT(*) FROM evaluations;

   -- Ver por status
   SELECT evaluation_status, COUNT(*) 
   FROM evaluations 
   GROUP BY evaluation_status;

   -- Borrar todas
   DELETE FROM evaluations;

   -- O borrar por status
   DELETE FROM evaluations WHERE evaluation_status = 'ROJO';
   ```

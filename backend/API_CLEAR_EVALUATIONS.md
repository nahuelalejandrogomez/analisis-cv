# 🗑️ API Endpoints para Limpiar Evaluaciones

## Endpoints Disponibles

### 1. Borrar TODAS las evaluaciones

```bash
DELETE https://tu-backend.railway.app/api/evaluations/clear?confirm=true
```

**Seguridad:** Requiere `?confirm=true` para evitar borrados accidentales.

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "26 evaluaciones borradas exitosamente",
  "deletedCount": 26,
  "beforeStats": {
    "VERDE": 15,
    "AMARILLO": 8,
    "ROJO": 3
  },
  "timestamp": "2026-01-28T14:30:00.000Z"
}
```

**Error sin confirmación:**
```json
{
  "error": "Para borrar todas las evaluaciones, debes incluir ?confirm=true",
  "example": "DELETE /api/evaluations/clear?confirm=true"
}
```

---

### 2. Borrar evaluaciones por STATUS

```bash
# Borrar solo VERDES
DELETE https://tu-backend.railway.app/api/evaluations/clear/VERDE

# Borrar solo AMARILLAS
DELETE https://tu-backend.railway.app/api/evaluations/clear/AMARILLO

# Borrar solo ROJAS
DELETE https://tu-backend.railway.app/api/evaluations/clear/ROJO
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "15 evaluaciones con status VERDE borradas",
  "deletedCount": 15,
  "status": "VERDE",
  "timestamp": "2026-01-28T14:30:00.000Z"
}
```

---

## 🌐 Ejemplos de Uso

### Desde curl

```bash
# Borrar todas (con confirmación)
curl -X DELETE "https://tu-backend.railway.app/api/evaluations/clear?confirm=true"

# Borrar solo verdes
curl -X DELETE "https://tu-backend.railway.app/api/evaluations/clear/VERDE"

# Borrar solo amarillas
curl -X DELETE "https://tu-backend.railway.app/api/evaluations/clear/AMARILLO"

# Borrar solo rojas
curl -X DELETE "https://tu-backend.railway.app/api/evaluations/clear/ROJO"
```

### Desde el navegador

Simplemente pega la URL en el navegador (navegadores modernos convierten GET a DELETE automáticamente):

```
https://tu-backend.railway.app/api/evaluations/clear?confirm=true
```

O usa una extensión como **Postman** o **Thunder Client**.

### Desde JavaScript/Frontend

```javascript
// Borrar todas
async function clearAllEvaluations() {
  const response = await fetch(
    'https://tu-backend.railway.app/api/evaluations/clear?confirm=true',
    { method: 'DELETE' }
  );
  const data = await response.json();
  console.log(data);
}

// Borrar por status
async function clearByStatus(status) {
  const response = await fetch(
    `https://tu-backend.railway.app/api/evaluations/clear/${status}`,
    { method: 'DELETE' }
  );
  const data = await response.json();
  console.log(data);
}

// Uso
clearAllEvaluations();
clearByStatus('VERDE');
```

### Desde Postman

1. **Method:** DELETE
2. **URL:** `https://tu-backend.railway.app/api/evaluations/clear?confirm=true`
3. **Send**

---

## 🔐 Seguridad

### Endpoint público con confirmación
- `/evaluations/clear` requiere `?confirm=true`
- Sin token de autenticación (para simplicidad en testing)
- **⚠️ En producción:** Considera agregar autenticación

### Ejemplo con autenticación (opcional)

Si quieres agregar un token simple:

```javascript
// En evaluationController.js
async function clearEvaluations(req, res, next) {
  const { confirm } = req.query;
  const authToken = req.headers['x-clear-token'];
  
  // Verificar token
  if (authToken !== process.env.CLEAR_DB_TOKEN) {
    return res.status(401).json({ error: 'Token inválido' });
  }
  
  // ... resto del código
}
```

Y en `.env`:
```bash
CLEAR_DB_TOKEN=mi-token-secreto-123
```

Uso:
```bash
curl -X DELETE \
  -H "X-Clear-Token: mi-token-secreto-123" \
  "https://tu-backend.railway.app/api/evaluations/clear?confirm=true"
```

---

## 📊 Verificar antes de borrar

Antes de ejecutar el DELETE, puedes ver las estadísticas:

```bash
GET https://tu-backend.railway.app/api/evaluations
```

O estadísticas por job:
```bash
GET https://tu-backend.railway.app/api/evaluations/stats/:jobId
```

---

## 🚀 URL de tu Backend en Railway

Para obtener tu URL de Railway:

1. Ve a [Railway Dashboard](https://railway.app)
2. Selecciona tu proyecto
3. Click en el servicio **backend**
4. En la pestaña **Settings**, busca **Domains**
5. Tu URL será algo como: `https://lever-cv-evaluator-backend-production.up.railway.app`

---

## ✅ Ejemplo Completo de Flujo

```bash
# 1. Ver evaluaciones actuales
curl https://tu-backend.railway.app/api/evaluations

# 2. Borrar todas las evaluaciones de prueba
curl -X DELETE "https://tu-backend.railway.app/api/evaluations/clear?confirm=true"

# 3. Verificar que se borraron
curl https://tu-backend.railway.app/api/evaluations

# Respuesta: {"evaluations": [], "count": 0}
```

---

## 📝 Notas

- ✅ Los endpoints están disponibles inmediatamente después del deploy
- ✅ No requieren configuración adicional
- ✅ Funcionan tanto en local (`http://localhost:5000`) como en producción
- ✅ Devuelven JSON con estadísticas del borrado
- ⚠️ No hay "undo", los datos se borran permanentemente

---

**Creado:** 28 de enero de 2026  
**Para:** Limpieza rápida de evaluaciones de testing

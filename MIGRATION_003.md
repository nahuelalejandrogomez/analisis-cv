# Migration 003: Fix Old Evaluations Without CV

## Problema
Evaluaciones antiguas se hicieron **ANTES** de la validación de CV, resultando en:
- Status: AMARILLO/ROJO (incorrectos)
- cv_extraction_method: `no_extraction`, `extraction_failed`, etc.
- cv_text: vacío o < 100 caracteres
- Reasoning: generado por LLM sin tener CV real

## Solución
Actualizar todas estas evaluaciones a `status: ERROR` con reasoning apropiado.

## Cómo Ejecutar la Migración

### Opción 1: Endpoint HTTP (Recomendado)

Una vez que Railway despliegue el código nuevo:

```bash
curl -X POST https://analisis-cv-production.up.railway.app/api/migrations/run
```

Respuesta esperada:
```json
{
  "success": true,
  "message": "Migrations completed successfully",
  "migrations": [
    "002_add_cv_metadata",
    "003_fix_no_cv_evaluations (N rows updated)"
  ]
}
```

### Opción 2: Desde Railway CLI

```bash
railway run npm run migrate
```

### Opción 3: SQL Directo (Railway Dashboard)

Ejecutar en la consola de PostgreSQL de Railway:

```sql
UPDATE evaluations
SET 
  evaluation_status = 'ERROR',
  reasoning = 'CV no disponible o contenido insuficiente para evaluar'
WHERE 
  (cv_extraction_method IN ('no_extraction', 'extraction_failed', 'insufficient_content', 'error')
  OR cv_text IS NULL 
  OR LENGTH(TRIM(cv_text)) < 100)
  AND evaluation_status != 'ERROR';

-- Verificar cuántos se actualizaron
SELECT COUNT(*) FROM evaluations WHERE evaluation_status = 'ERROR';
```

## Verificación Post-Migración

1. Ir a https://analisis-cv-production.up.railway.app
2. Seleccionar un job que tenga evaluaciones
3. Verificar que el Dashboard muestre la tarjeta "ERROR" con el conteo correcto
4. Buscar a "Lautaro Rodriguez Marcon" - debería aparecer con badge ERROR (gris)
5. Hacer clic en "Ver CV" - debería mostrar el método `no_extraction`

## Notas Importantes

- La migración es **idempotente**: puede ejecutarse múltiples veces sin problemas
- Usa `AND evaluation_status != 'ERROR'` para evitar actualizar registros ya corregidos
- **NO elimina** las evaluaciones, solo corrige el status
- El reasoning se actualiza a un mensaje estándar

## Casos Afectados

Típicamente incluyen:
- Candidatos donde Lever no tenía CV disponible
- PDFs que fallaron al descargar desde Lever
- PDFs escaneados (imágenes) que no pudieron ser parseados
- CVs con contenido mínimo (< 100 caracteres)

## Después de la Migración

Una vez ejecutada exitosamente, puedes:
1. **Eliminar las evaluaciones ERROR** si no son útiles
2. **Re-evaluar** esos candidatos si ahora tienen CV disponible en Lever
3. **Mantenerlas** como registro de intentos fallidos

---

**Status**: Pendiente de despliegue
**Fecha**: 2026-01-28
**Autor**: Sistema automático de migraciones

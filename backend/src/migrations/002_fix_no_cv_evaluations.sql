-- Migration 002: Fix evaluations without CV
-- Cambiar status a ERROR para evaluaciones sin CV disponible

UPDATE evaluations
SET 
  evaluation_status = 'ERROR',
  reasoning = 'CV no disponible o contenido insuficiente para evaluar'
WHERE 
  cv_extraction_method IN ('no_extraction', 'extraction_failed', 'insufficient_content', 'error')
  OR cv_text IS NULL 
  OR LENGTH(TRIM(cv_text)) < 100;

-- Log de cambios
SELECT 
  'Migration 002 completed' as message,
  COUNT(*) as affected_rows
FROM evaluations
WHERE evaluation_status = 'ERROR';

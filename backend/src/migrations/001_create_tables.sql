-- Migration: Create evaluations table
-- Created: 2026-01-28

-- Tabla de evaluaciones
CREATE TABLE IF NOT EXISTS evaluations (
  id SERIAL PRIMARY KEY,
  job_id VARCHAR(255) NOT NULL,
  job_title VARCHAR(255),
  candidate_id VARCHAR(255) NOT NULL,
  candidate_name VARCHAR(255) NOT NULL,
  candidate_email VARCHAR(255),
  evaluation_status VARCHAR(50) NOT NULL, -- VERDE, AMARILLO, ROJO
  reasoning TEXT NOT NULL,
  cv_text TEXT, -- Guardar CV para auditoría
  evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255), -- Para multi-usuario después
  UNIQUE(job_id, candidate_id)
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_evaluations_job_id ON evaluations(job_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_candidate_id ON evaluations(candidate_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_status ON evaluations(evaluation_status);
CREATE INDEX IF NOT EXISTS idx_evaluations_date ON evaluations(evaluated_at DESC);

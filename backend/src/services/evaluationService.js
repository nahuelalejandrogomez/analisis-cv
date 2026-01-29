const db = require('../config/database');
const leverService = require('./leverService');
const openaiService = require('./openaiService');
const pdfParse = require('pdf-parse');

// ============================================================================
// GUARDRAIL: Determina si se debe llamar al LLM para evaluar
// ============================================================================
const INVALID_EXTRACTION_METHODS = [
  'no_extraction',
  'download_failed',
  'extraction_failed',
  'insufficient_content',
  'none',
  'error'
];

const MIN_CV_CHARS = 50; // Umbral mínimo para considerar CV "útil"

const NO_CV_RESPONSE = {
  status: 'AMARILLO',
  reasoning: 'CV no disponible o ilegible. Reintentar extracción y reevaluar. Revisión manual recomendada.'
};

/**
 * GUARDRAIL: Determina si hay suficiente contenido de CV para llamar al LLM
 * @param {Object} params - { cvText, extractionMethod, metadata }
 * @returns {Object} - { shouldCall: boolean, reason: string }
 */
function shouldCallLLM({ cvText, extractionMethod, metadata }) {
  const charCount = cvText?.trim()?.length || 0;
  const method = extractionMethod?.toLowerCase() || 'no_extraction';

  // Verificar si el método de extracción indica fallo
  const hasInvalidMethod = INVALID_EXTRACTION_METHODS.some(invalid =>
    method.includes(invalid)
  );

  // Si el método indica fallo explícito, NO llamar al LLM
  if (hasInvalidMethod && charCount < MIN_CV_CHARS) {
    return {
      shouldCall: false,
      reason: `Extraction method indicates failure: ${method}, chars: ${charCount}`
    };
  }

  // Verificar contenido mínimo
  if (!cvText || charCount < MIN_CV_CHARS) {
    return {
      shouldCall: false,
      reason: `Insufficient CV content: ${charCount} chars (min: ${MIN_CV_CHARS})`
    };
  }

  // Verificar que no sea solo whitespace/newlines
  const meaningfulContent = cvText.replace(/[\s\n\r\t]+/g, ' ').trim();
  if (meaningfulContent.length < MIN_CV_CHARS) {
    return {
      shouldCall: false,
      reason: `CV content is mostly whitespace: ${meaningfulContent.length} meaningful chars`
    };
  }

  return {
    shouldCall: true,
    reason: `Valid CV: ${charCount} chars, method: ${method}`
  };
}

/**
 * Extract text from PDF buffer
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<string>} - Extracted text
 */
async function extractTextFromPDF(pdfBuffer) {
  try {
    const data = await pdfParse(pdfBuffer);
    return data.text || '';
  } catch (error) {
    console.error('Error extracting PDF text:', error.message);
    return '';
  }
}

/**
 * Get CV text for a candidate
 * @param {string} opportunityId - Lever opportunity ID
 */
async function getCVText(opportunityId) {
  try {
    console.log(`[CV Extract] Obteniendo CV para candidato: ${opportunityId}`);
    
    // First try to get parsed data from Lever
    const resumeData = await leverService.getResumeParsedData(opportunityId);

    if (!resumeData) {
      console.log(`[CV Extract] No se encontró resume data en Lever para: ${opportunityId}`);
      return { 
        text: '', 
        source: 'none',
        metadata: null
      };
    }

    console.log(`[CV Extract] Resume encontrado - ID: ${resumeData.id}, FileName: ${resumeData.fileName}`);

    // Prepare metadata
    const metadata = {
      fileName: resumeData.fileName || null,
      fileUrl: resumeData.downloadUrl || null,
      fileSize: null,
      extractionMethod: null
    };

    let finalText = '';
    let extractionMethods = [];

    // Strategy 1: Try Lever's parsed data first
    if (resumeData.parsedData) {
      console.log(`[CV Extract] Lever tiene parsedData disponible`);
      const parsed = resumeData.parsedData;
      let parsedText = '';

      if (parsed.positions) {
        parsedText += 'EXPERIENCIA:\n';
        parsed.positions.forEach(p => {
          parsedText += `- ${p.title || ''} en ${p.org || ''} (${p.start || ''} - ${p.end || 'Presente'})\n`;
          if (p.summary) parsedText += `  ${p.summary}\n`;
        });
      }

      if (parsed.schools) {
        parsedText += '\nEDUCACIÓN:\n';
        parsed.schools.forEach(s => {
          parsedText += `- ${s.degree || ''} en ${s.org || ''} (${s.end || ''})\n`;
        });
      }

      if (parsed.skills) {
        parsedText += `\nSKILLS: ${parsed.skills.join(', ')}\n`;
      }

      if (parsedText.length > 50) {
        console.log(`[CV Extract] Texto extraído de parsedData: ${parsedText.length} caracteres`);
        finalText = parsedText;
        extractionMethods.push('lever_parsed');
      }
    }

    // Strategy 2: ALWAYS try to download and extract PDF (even if parsedData exists)
    // This ensures we get the full CV content
    if (resumeData.id) {
      console.log(`[CV Extract] Intentando descargar PDF - Opportunity: ${opportunityId}, Resume ID: ${resumeData.id}, Source: ${resumeData.source || 'resumes'}`);
      try {
        const pdfBuffer = await leverService.downloadResume(opportunityId, resumeData.id, resumeData.source);
        console.log(`[CV Extract] ✅ PDF descargado exitosamente: ${pdfBuffer.length} bytes`);
        metadata.fileSize = pdfBuffer.length;
        
        console.log(`[CV Extract] Extrayendo texto del PDF con pdf-parse...`);
        const pdfText = await extractTextFromPDF(pdfBuffer);
        console.log(`[CV Extract] Texto extraído del PDF: ${pdfText.length} caracteres`);
        
        if (pdfText && pdfText.length > 100) {
          // PDF extraction successful and substantial
          extractionMethods.push('pdf_extracted');
          
          // If PDF has more content than parsedData, use PDF
          if (pdfText.length > finalText.length * 1.5) {
            console.log(`[CV Extract] PDF tiene más contenido (${pdfText.length} vs ${finalText.length}), usando PDF`);
            finalText = pdfText;
          } else if (finalText.length === 0) {
            // No parsedData, use PDF
            finalText = pdfText;
          } else {
            // Combine both sources
            console.log(`[CV Extract] Combinando parsedData y PDF`);
            finalText = `${finalText}\n\n--- CONTENIDO ADICIONAL DEL PDF ---\n\n${pdfText}`;
          }
        } else if (pdfText && pdfText.length > 0) {
          console.warn(`[CV Extract] ⚠️  PDF extraído pero contenido mínimo: ${pdfText.length} caracteres (umbral: 100)`);
          extractionMethods.push('insufficient_content');
        } else {
          console.warn(`[CV Extract] ⚠️  PDF descargado pero no se pudo extraer texto (posiblemente es imagen escaneada)`);
          extractionMethods.push('extraction_failed');
        }
      } catch (downloadError) {
        console.error(`[CV Extract] ❌ Error downloading/parsing PDF:`, downloadError.message);
        console.error(`[CV Extract] ❌ Error stack:`, downloadError.stack);
        extractionMethods.push('download_failed');
      }
    } else {
      console.warn(`[CV Extract] ⚠️  No resume ID available - skipping PDF download`);
    }

    // Set extraction method
    metadata.extractionMethod = extractionMethods.length > 0 
      ? extractionMethods.join('+') 
      : 'no_extraction';

    if (finalText.length > 50) {
      console.log(`[CV Extract] ✅ Extracción exitosa: ${finalText.length} caracteres, método: ${metadata.extractionMethod}`);
      return { text: finalText, source: metadata.extractionMethod, metadata };
    } else {
      console.log(`[CV Extract] ⚠️  No se pudo obtener contenido suficiente del CV (${finalText.length} caracteres)`);
      return { text: finalText, source: 'insufficient_content', metadata };
    }
  } catch (error) {
    console.error(`[CV Extract] ❌ Error general getting CV text:`, error.message);
    return { text: '', source: 'error', metadata: null };
  }
}

/**
 * Evaluate a single candidate
 * @param {string} jobId - Job posting ID
 * @param {string} candidateId - Candidate opportunity ID
 * @param {string} candidateName - Candidate name
 * @param {string} candidateEmail - Candidate email
 */
async function evaluateCandidate(jobId, candidateId, candidateName, candidateEmail) {
  // Check if already evaluated
  const existing = await getEvaluationByCandidate(jobId, candidateId);
  if (existing) {
    return {
      ...existing,
      alreadyEvaluated: true
    };
  }

  // Get job details
  const job = await leverService.getJob(jobId);
  const jobDescription = `
Título: ${job.title}
Equipo: ${job.team}
Ubicación: ${job.location}

Descripción:
${job.descriptionPlain || job.description}

${job.lists || ''}

${job.additionalText || ''}
  `.trim();

  // Get CV text
  const { text: cvText, source: cvSource, metadata: cvMetadata } = await getCVText(candidateId);

  console.log(`[Evaluation] Candidato: ${candidateName} (${candidateId})`);
  console.log(`[Evaluation] CV Source: ${cvSource}, Length: ${cvText?.length || 0} caracteres`);
  console.log(`[Evaluation] Extraction Method: ${cvMetadata?.extractionMethod || 'unknown'}`);

  // =========================================================================
  // GUARDRAIL: Verificar si hay CV suficiente antes de llamar al LLM
  // =========================================================================
  const llmCheck = shouldCallLLM({
    cvText,
    extractionMethod: cvMetadata?.extractionMethod || cvSource,
    metadata: cvMetadata
  });

  if (!llmCheck.shouldCall) {
    console.error(`[Evaluation] ❌ GUARDRAIL ACTIVADO para ${candidateName}`);
    console.error(`[Evaluation] ❌ Razón: ${llmCheck.reason}`);
    console.error(`[Evaluation] ❌ CV Source: ${cvSource}, Method: ${cvMetadata?.extractionMethod}, Chars: ${cvText?.length || 0}`);

    // Devolver AMARILLO con reasoning fijo - NO llamar al LLM
    const evaluation = { ...NO_CV_RESPONSE };

    await saveEvaluation({
      jobId,
      jobTitle: job.title,
      candidateId,
      candidateName,
      candidateEmail,
      ...evaluation,
      cvText: cvText || '',
      cvMetadata
    });

    return {
      candidateId,
      candidateName,
      ...evaluation,
      cvSource,
      guardrailActivated: true,
      guardrailReason: llmCheck.reason,
      savedToDb: true
    };
  }

  console.log(`[Evaluation] ✅ GUARDRAIL PASADO: ${llmCheck.reason}`);
  console.log(`[Evaluation] ✅ Procediendo con evaluación LLM`);

  // Evaluate with OpenAI
  const evaluation = await openaiService.evaluateCV(jobDescription, cvText);

  // Save to database
  await saveEvaluation({
    jobId,
    jobTitle: job.title,
    candidateId,
    candidateName,
    candidateEmail,
    ...evaluation,
    cvText,
    cvMetadata
  });

  return {
    candidateId,
    candidateName,
    ...evaluation,
    cvSource,
    savedToDb: true
  };
}

/**
 * Save evaluation to database
 */
async function saveEvaluation(data) {
  const query = `
    INSERT INTO evaluations (
      job_id, job_title, candidate_id, candidate_name, candidate_email,
      evaluation_status, reasoning, cv_text,
      cv_file_name, cv_file_url, cv_file_size, cv_extraction_method
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (job_id, candidate_id)
    DO UPDATE SET
      evaluation_status = $6,
      reasoning = $7,
      cv_text = $8,
      cv_file_name = $9,
      cv_file_url = $10,
      cv_file_size = $11,
      cv_extraction_method = $12,
      evaluated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;

  const values = [
    data.jobId,
    data.jobTitle,
    data.candidateId,
    data.candidateName,
    data.candidateEmail,
    data.status,
    data.reasoning,
    data.cvText,
    data.cvMetadata?.fileName || null,
    data.cvMetadata?.fileUrl || null,
    data.cvMetadata?.fileSize || null,
    data.cvMetadata?.extractionMethod || null
  ];

  const result = await db.query(query, values);
  return result.rows[0];
}

/**
 * Get evaluation by candidate
 */
async function getEvaluationByCandidate(jobId, candidateId) {
  const query = `
    SELECT * FROM evaluations
    WHERE job_id = $1 AND candidate_id = $2
  `;
  const result = await db.query(query, [jobId, candidateId]);
  return result.rows[0] || null;
}

/**
 * Get evaluations with filters
 */
async function getEvaluations({ jobId, status, limit = 50, offset = 0 }) {
  let query = 'SELECT * FROM evaluations WHERE 1=1';
  const values = [];
  let paramCount = 0;

  if (jobId) {
    paramCount++;
    query += ` AND job_id = $${paramCount}`;
    values.push(jobId);
  }

  if (status) {
    paramCount++;
    query += ` AND evaluation_status = $${paramCount}`;
    values.push(status);
  }

  query += ` ORDER BY evaluated_at DESC`;

  paramCount++;
  query += ` LIMIT $${paramCount}`;
  values.push(limit);

  paramCount++;
  query += ` OFFSET $${paramCount}`;
  values.push(offset);

  const result = await db.query(query, values);
  return result.rows;
}

/**
 * Get evaluation stats for a job
 */
async function getEvaluationStats(jobId) {
  const query = `
    SELECT
      evaluation_status as status,
      COUNT(*) as count
    FROM evaluations
    WHERE job_id = $1
    GROUP BY evaluation_status
  `;
  const result = await db.query(query, [jobId]);

  const stats = {
    total: 0,
    VERDE: 0,
    AMARILLO: 0,
    ROJO: 0
  };

  result.rows.forEach(row => {
    stats[row.status] = parseInt(row.count);
    stats.total += parseInt(row.count);
  });

  return stats;
}

/**
 * Get comprehensive evaluation summary for dashboard
 * @param {string} jobId - Job posting ID
 */
/**
 * Simple cache for candidate counts (evita llamadas repetidas a Lever API)
 * TTL: 5 minutos
 */
const candidateCountCache = {
  data: {},
  TTL: 5 * 60 * 1000 // 5 minutos
};

/**
 * Get evaluation summary with optimized performance
 * @param {string} jobId - Job posting ID
 */
async function getEvaluationSummary(jobId) {
  try {
    // 1. Get evaluation stats from DB (RÁPIDO)
    const query = `
      SELECT
        evaluation_status as status,
        COUNT(*) as count,
        MAX(evaluated_at) as last_evaluated
      FROM evaluations
      WHERE job_id = $1
      GROUP BY evaluation_status
    `;
    const result = await db.query(query, [jobId]);

    // 2. Calculate stats from DB
    let verde = 0;
    let amarillo = 0;
    let rojo = 0;
    let error = 0;
    let evaluated = 0;
    let lastEvaluatedAt = null;

    result.rows.forEach(row => {
      const count = parseInt(row.count);
      evaluated += count;

      if (row.status === 'VERDE') verde = count;
      else if (row.status === 'AMARILLO') amarillo = count;
      else if (row.status === 'ROJO') rojo = count;
      else if (row.status === 'ERROR') error = count;

      // Track most recent evaluation
      if (row.last_evaluated) {
        const rowDate = new Date(row.last_evaluated);
        if (!lastEvaluatedAt || rowDate > new Date(lastEvaluatedAt)) {
          lastEvaluatedAt = row.last_evaluated;
        }
      }
    });

    // 3. Get total candidates (con cache para evitar llamadas lentas a Lever)
    let totalCandidates = evaluated; // Fallback mínimo
    
    const cacheEntry = candidateCountCache.data[jobId];
    const now = Date.now();
    
    if (cacheEntry && (now - cacheEntry.timestamp < candidateCountCache.TTL)) {
      // Cache hit
      console.log(`[Summary] Using cached candidate count for job ${jobId}`);
      totalCandidates = cacheEntry.count;
    } else {
      // Cache miss - fetch from Lever (esto es lo lento)
      console.log(`[Summary] Cache miss, fetching candidates from Lever for job ${jobId}`);
      try {
        const candidates = await leverService.getCandidates(jobId);
        totalCandidates = candidates.length;
        
        // Update cache
        candidateCountCache.data[jobId] = {
          count: totalCandidates,
          timestamp: now
        };
      } catch (leverError) {
        console.warn(`[Summary] Error fetching from Lever, using evaluated count as fallback:`, leverError.message);
        totalCandidates = evaluated; // Fallback si Lever falla
      }
    }

    const pending = Math.max(0, totalCandidates - evaluated);

    return {
      total: totalCandidates,
      evaluated,
      pending,
      verde,
      amarillo,
      rojo,
      error,
      failed: 0, // No tenemos este flag en el modelo actual
      lastEvaluatedAt
    };
  } catch (error) {
    console.error('Error getting evaluation summary:', error.message);
    throw error;
  }
}

/**
 * Delete evaluation
 */
async function deleteEvaluation(id) {
  const query = 'DELETE FROM evaluations WHERE id = $1 RETURNING *';
  const result = await db.query(query, [id]);
  return result.rows[0];
}

module.exports = {
  evaluateCandidate,
  getCVText,
  saveEvaluation,
  getEvaluationByCandidate,
  getEvaluations,
  getEvaluationStats,
  getEvaluationSummary,
  deleteEvaluation
};

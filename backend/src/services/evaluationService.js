const db = require('../config/database');
const leverService = require('./leverService');
const openaiService = require('./openaiService');
const pdfParse = require('pdf-parse');

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
      fileSize: null, // We don't have this from Lever API
      extractionMethod: null // Will be set below
    };

    // If Lever has parsed data, use it
    if (resumeData.parsedData) {
      console.log(`[CV Extract] Lever tiene parsedData disponible`);
      const parsed = resumeData.parsedData;
      let text = '';

      if (parsed.positions) {
        text += 'EXPERIENCIA:\n';
        parsed.positions.forEach(p => {
          text += `- ${p.title || ''} en ${p.org || ''} (${p.start || ''} - ${p.end || 'Presente'})\n`;
          if (p.summary) text += `  ${p.summary}\n`;
        });
      }

      if (parsed.schools) {
        text += '\nEDUCACIÓN:\n';
        parsed.schools.forEach(s => {
          text += `- ${s.degree || ''} en ${s.org || ''} (${s.end || ''})\n`;
        });
      }

      if (parsed.skills) {
        text += `\nSKILLS: ${parsed.skills.join(', ')}\n`;
      }

      if (text) {
        console.log(`[CV Extract] Texto extraído de parsedData: ${text.length} caracteres`);
        metadata.extractionMethod = 'lever_parsed';
        return { text, source: 'lever_parsed', metadata };
      }
    }

    // If no parsed data, download and parse PDF
    if (resumeData.id) {
      console.log(`[CV Extract] No hay parsedData, intentando descargar PDF...`);
      try {
        const pdfBuffer = await leverService.downloadResume(opportunityId, resumeData.id);
        console.log(`[CV Extract] PDF descargado: ${pdfBuffer.length} bytes`);
        metadata.fileSize = pdfBuffer.length;
        
        const text = await extractTextFromPDF(pdfBuffer);
        console.log(`[CV Extract] Texto extraído del PDF: ${text.length} caracteres`);
        
        if (text && text.length > 0) {
          metadata.extractionMethod = 'pdf_extracted';
          return { text, source: 'pdf_extracted', metadata };
        } else {
          console.warn(`[CV Extract] PDF descargado pero no se pudo extraer texto`);
        }
      } catch (downloadError) {
        console.error(`[CV Extract] Error downloading/parsing PDF:`, downloadError.message);
      }
    }

    console.log(`[CV Extract] No se pudo obtener contenido del CV para: ${opportunityId}`);
    return { text: '', source: 'none', metadata };
  } catch (error) {
    console.error(`[CV Extract] Error general getting CV text:`, error.message);
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

  if (!cvText || cvText.trim().length < 50) {
    console.warn(`[Evaluation] CV insuficiente para ${candidateName}. Source: ${cvSource}, Length: ${cvText?.length || 0}`);
    
    // Save as ROJO if no CV available
    const evaluation = {
      status: 'ROJO',
      reasoning: 'CV no disponible o contenido insuficiente para evaluar'
    };

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
      savedToDb: true
    };
  }

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
async function getEvaluationSummary(jobId) {
  try {
    // 1. Get total candidates from Lever
    const candidates = await leverService.getCandidates(jobId);
    const totalCandidates = candidates.length;

    // 2. Get evaluation stats from DB
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

    // 3. Calculate stats
    let verde = 0;
    let amarillo = 0;
    let rojo = 0;
    let evaluated = 0;
    let lastEvaluatedAt = null;

    result.rows.forEach(row => {
      const count = parseInt(row.count);
      evaluated += count;

      if (row.status === 'VERDE') verde = count;
      else if (row.status === 'AMARILLO') amarillo = count;
      else if (row.status === 'ROJO') rojo = count;

      // Track most recent evaluation
      if (row.last_evaluated) {
        const rowDate = new Date(row.last_evaluated);
        if (!lastEvaluatedAt || rowDate > new Date(lastEvaluatedAt)) {
          lastEvaluatedAt = row.last_evaluated;
        }
      }
    });

    const pending = Math.max(0, totalCandidates - evaluated);

    return {
      total: totalCandidates,
      evaluated,
      pending,
      verde,
      amarillo,
      rojo,
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

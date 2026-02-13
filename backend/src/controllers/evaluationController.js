const evaluationService = require('../services/evaluationService');

/**
 * POST /api/evaluate
 * Evaluate a single candidate
 */
async function evaluateCandidate(req, res, next) {
  try {
    const { jobId, candidateId, candidateName, candidateEmail } = req.body;

    if (!jobId || !candidateId) {
      return res.status(400).json({
        error: 'jobId and candidateId are required'
      });
    }

    const result = await evaluationService.evaluateCandidate(
      jobId,
      candidateId,
      candidateName || 'Unknown',
      candidateEmail || ''
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/evaluate/batch
 * Evaluate multiple candidates
 */
async function evaluateBatch(req, res, next) {
  try {
    const { jobId, candidates } = req.body;

    if (!jobId || !candidates || !Array.isArray(candidates)) {
      return res.status(400).json({
        error: 'jobId and candidates array are required'
      });
    }

    const results = [];

    for (const candidate of candidates) {
      try {
        const result = await evaluationService.evaluateCandidate(
          jobId,
          candidate.id,
          candidate.name,
          candidate.email
        );
        results.push(result);
      } catch (error) {
        results.push({
          candidateId: candidate.id,
          candidateName: candidate.name,
          status: 'ROJO',
          reasoning: `Error: ${error.message}`,
          error: true
        });
      }

      // Rate limiting: wait between evaluations
      if (candidates.indexOf(candidate) < candidates.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    res.json({
      results,
      total: results.length,
      successful: results.filter(r => !r.error).length
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/evaluations
 * Get evaluation history
 */
async function getEvaluations(req, res, next) {
  try {
    const { jobId, status, limit = 50, offset = 0 } = req.query;

    const evaluations = await evaluationService.getEvaluations({
      jobId,
      status,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Format response
    const formatted = evaluations.map(e => ({
      id: e.id,
      jobId: e.job_id,
      jobTitle: e.job_title,
      candidateId: e.candidate_id,
      candidateName: e.candidate_name,
      candidateEmail: e.candidate_email,
      status: e.evaluation_status,
      reasoning: e.reasoning,
      evaluatedAt: e.evaluated_at
    }));

    res.json({
      evaluations: formatted,
      count: formatted.length
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/evaluations/stats/:jobId
 * Get evaluation statistics for a job
 */
async function getStats(req, res, next) {
  try {
    const { jobId } = req.params;
    const stats = await evaluationService.getEvaluationStats(jobId);

    res.json({ stats });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/jobs/:jobId/evaluations/summary
 * Get comprehensive evaluation summary (KPIs para dashboard)
 */
async function getSummary(req, res, next) {
  try {
    const { jobId } = req.params;
    const summary = await evaluationService.getEvaluationSummary(jobId);

    res.json(summary);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/evaluations/:id
 * Delete an evaluation
 */
async function deleteEvaluation(req, res, next) {
  try {
    const { id } = req.params;
    
    console.log(`[Delete Evaluation] Request received for ID: "${id}" (type: ${typeof id})`);
    
    // Validate ID
    if (!id || id === 'undefined' || id === 'null') {
      console.error('[Delete Evaluation] Invalid ID received:', id);
      return res.status(400).json({ 
        error: 'ID de evaluación inválido',
        receivedId: id,
        type: typeof id
      });
    }
    
    const deleted = await evaluationService.deleteEvaluation(id);

    if (!deleted) {
      console.warn('[Delete Evaluation] Evaluation not found for ID:', id);
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    console.log(`[Delete Evaluation] ✅ Successfully deleted evaluation ID: ${id}`);
    res.json({ success: true, deleted });
  } catch (error) {
    console.error('[Delete Evaluation] ❌ Error:', error.message);
    next(error);
  }
}

/**
 * DELETE /api/evaluations/clear
 * Clear ALL evaluations (útil para testing)
 * Requiere query param ?confirm=true para seguridad
 */
async function clearEvaluations(req, res, next) {
  try {
    const { confirm } = req.query;

    if (confirm !== 'true') {
      return res.status(400).json({
        error: 'Para borrar todas las evaluaciones, debes incluir ?confirm=true',
        example: 'DELETE /api/evaluations/clear?confirm=true'
      });
    }

    // Obtener stats antes de borrar
    const db = require('../config/database');
    const statsResult = await db.query(`
      SELECT 
        evaluation_status,
        COUNT(*) as count
      FROM evaluations
      GROUP BY evaluation_status
    `);

    const beforeStats = {};
    statsResult.rows.forEach(row => {
      beforeStats[row.evaluation_status] = parseInt(row.count);
    });

    // Borrar todas
    const result = await db.query('DELETE FROM evaluations RETURNING *');
    const deletedCount = result.rowCount;

    res.json({
      success: true,
      message: `${deletedCount} evaluaciones borradas exitosamente`,
      deletedCount,
      beforeStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/evaluations/clear/:status
 * Clear evaluations by status (VERDE, AMARILLO, ROJO)
 */
async function clearEvaluationsByStatus(req, res, next) {
  try {
    const { status } = req.params;
    const validStatuses = ['VERDE', 'AMARILLO', 'ROJO'];

    if (!validStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({
        error: 'Status inválido',
        validStatuses
      });
    }

    const db = require('../config/database');
    const result = await db.query(
      'DELETE FROM evaluations WHERE evaluation_status = $1 RETURNING *',
      [status.toUpperCase()]
    );

    const deletedCount = result.rowCount;

    res.json({
      success: true,
      message: `${deletedCount} evaluaciones con status ${status.toUpperCase()} borradas`,
      deletedCount,
      status: status.toUpperCase(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/jobs/:jobId/candidates/:candidateId/evaluation
 * Delete evaluation by jobId + candidateId (fallback method)
 */
async function deleteEvaluationByCandidate(req, res, next) {
  try {
    const { jobId, candidateId } = req.params;
    
    console.log(`[Delete Evaluation] By jobId=${jobId}, candidateId=${candidateId}`);
    
    const db = require('../config/database');
    const result = await db.query(
      'DELETE FROM evaluations WHERE job_id = $1 AND candidate_id = $2 RETURNING *',
      [jobId, candidateId]
    );

    if (result.rowCount === 0) {
      console.warn('[Delete Evaluation] Not found for jobId/candidateId');
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    const deleted = result.rows[0];
    console.log(`[Delete Evaluation] ✅ Successfully deleted evaluation ID: ${deleted.id}`);
    
    res.json({ 
      success: true, 
      deleted: {
        id: deleted.id,
        candidateName: deleted.candidate_name
      }
    });
  } catch (error) {
    console.error('[Delete Evaluation] ❌ Error:', error.message);
    next(error);
  }
}

module.exports = {
  evaluateCandidate,
  evaluateBatch,
  getEvaluations,
  getStats,
  getSummary,
  deleteEvaluation,
  deleteEvaluationByCandidate,
  clearEvaluations,
  clearEvaluationsByStatus
};

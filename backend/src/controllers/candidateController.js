const leverService = require('../services/leverService');
const evaluationService = require('../services/evaluationService');

/**
 * GET /api/jobs/:jobId/candidates
 * Get all candidates for a specific job
 */
async function getCandidates(req, res, next) {
  try {
    const { jobId } = req.params;

    // Get candidates from Lever
    const candidates = await leverService.getCandidates(jobId);

    // Get existing evaluations for these candidates
    const evaluations = await evaluationService.getEvaluations({ jobId });
    const evaluationMap = {};
    evaluations.forEach(e => {
      evaluationMap[e.candidate_id] = {
        status: e.evaluation_status,
        reasoning: e.reasoning,
        evaluatedAt: e.evaluated_at
      };
    });

    // Merge evaluation data with candidates
    const candidatesWithEvaluations = candidates.map(candidate => ({
      ...candidate,
      evaluated: !!evaluationMap[candidate.id],
      evaluation: evaluationMap[candidate.id] || null
    }));

    res.json({
      candidates: candidatesWithEvaluations,
      count: candidatesWithEvaluations.length,
      evaluatedCount: evaluations.length
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/candidates/:candidateId/cv
 * Get CV text for a specific candidate
 */
async function getCVText(req, res, next) {
  try {
    const { candidateId } = req.params;
    const { text, source } = await evaluationService.getCVText(candidateId);

    res.json({
      candidateId,
      cvText: text,
      source,
      hasContent: text.length > 50
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCandidates,
  getCVText
};

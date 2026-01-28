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
        id: e.id, // ID de la evaluación para poder eliminarla
        status: e.evaluation_status,
        reasoning: e.reasoning,
        cv_text: e.cv_text, // OBJETIVO B: Include CV text for audit modal
        cvText: e.cv_text,  // Alias for compatibility
        cv_file_name: e.cv_file_name, // CV file metadata
        cv_file_url: e.cv_file_url,
        cv_file_size: e.cv_file_size,
        cv_extraction_method: e.cv_extraction_method,
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

/**
 * GET /api/candidates/:candidateId/cv-metadata
 * Get CV metadata from Lever API (in real-time, always fresh)
 */
async function getCVMetadata(req, res, next) {
  try {
    const { candidateId } = req.params;
    
    // Obtener metadata actualizada desde Lever API
    const resumeData = await leverService.getResumeParsedData(candidateId);
    
    if (!resumeData) {
      return res.json({
        candidateId,
        hasCV: false,
        fileName: null,
        downloadUrl: null,
        source: null
      });
    }

    res.json({
      candidateId,
      hasCV: true,
      fileName: resumeData.fileName,
      downloadUrl: resumeData.downloadUrl,
      fileId: resumeData.id,
      source: resumeData.source // 'resumes' or 'files'
    });
  } catch (error) {
    console.error('Error getting CV metadata:', error.message);
    next(error);
  }
}

/**
 * GET /api/candidates/:candidateId/resume/download
 * Download CV file for a specific candidate
 */
async function downloadResume(req, res, next) {
  try {
    const { candidateId } = req.params;
    const { resumeId, name, source } = req.query;

    if (!resumeId) {
      return res.status(400).json({ error: 'resumeId is required' });
    }

    // Download from Lever (source: 'resumes' or 'files')
    const pdfBuffer = await leverService.downloadResume(candidateId, resumeId, source || 'resumes');

    // Set headers for file download
    const filename = `CV_${(name || 'candidato').replace(/\s+/g, '_')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCandidates,
  getCVText,
  getCVMetadata,
  downloadResume
};

const leverService = require('../services/leverService');

/**
 * GET /api/jobs
 * Get all active jobs from Lever
 */
async function getJobs(req, res, next) {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const jobs = await leverService.getJobs(forceRefresh);

    res.json({
      jobs,
      count: jobs.length,
      cached: !forceRefresh
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/jobs/:jobId
 * Get a specific job by ID
 */
async function getJob(req, res, next) {
  try {
    const { jobId } = req.params;
    const job = await leverService.getJob(jobId);

    res.json({ job });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/jobs/refresh
 * Force refresh jobs cache
 */
async function refreshJobs(req, res, next) {
  try {
    leverService.clearCache();
    const jobs = await leverService.getJobs(true);

    res.json({
      jobs,
      count: jobs.length,
      refreshed: true
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getJobs,
  getJob,
  refreshJobs
};

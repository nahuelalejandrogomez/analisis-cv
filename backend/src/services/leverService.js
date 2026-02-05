const axios = require('axios');

const LEVER_API_BASE = 'https://api.lever.co/v1';

// Cache for jobs (5 minutes TTL)
let jobsCache = {
  data: null,
  timestamp: null,
  TTL: 5 * 60 * 1000 // 5 minutes
};

/**
 * Create axios instance with Lever auth
 */
const leverApi = axios.create({
  baseURL: LEVER_API_BASE,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.LEVER_API_KEY}`
  }
});

/**
 * Get all active job postings
 * @param {boolean} forceRefresh - Force cache refresh
 */
async function getJobs(forceRefresh = false) {
  if (!forceRefresh && jobsCache.data && (Date.now() - jobsCache.timestamp < jobsCache.TTL)) {
    return jobsCache.data;
  }

  try {
    const response = await leverApi.get('/postings', {
      params: {
        state: 'published',
        limit: 100
      }
    });

    const jobs = response.data.data.map(posting => ({
      id: posting.id,
      title: posting.text,
      team: posting.categories?.team || 'No team',
      location: posting.categories?.location || 'Remote',
      department: posting.categories?.department || '',
      status: posting.state,
      createdAt: posting.createdAt,
      description: posting.content?.description || '',
      requirements: posting.content?.lists?.find(l => l.text === 'Requirements')?.content || ''
    }));

    jobsCache.data = jobs;
    jobsCache.timestamp = Date.now();

    return jobs;
  } catch (error) {
    throw new Error(`Failed to fetch jobs: ${error.message}`);
  }
}

/**
 * Get candidates (opportunities) for a specific job posting
 * @param {string} jobId - The posting ID
 */
async function getCandidates(jobId) {
  try {
    const response = await leverApi.get('/opportunities', {
      params: {
        posting_id: jobId,
        limit: 100,
        expand: ['applications', 'stage']
      }
    });

    const candidates = await Promise.all(
      response.data.data.map(async (opp) => {
        let resumeUrl = null;
        let resumeFileId = null;

        try {
          const filesResponse = await leverApi.get(`/opportunities/${opp.id}/resumes`);
          if (filesResponse.data.data && filesResponse.data.data.length > 0) {
            const resume = filesResponse.data.data[0];
            resumeFileId = resume.id;
            resumeUrl = resume.file?.downloadUrl || null;
          }
        } catch {
          // No resume found in /resumes endpoint
        }

        if (!resumeFileId) {
          try {
            const filesResponse = await leverApi.get(`/opportunities/${opp.id}/files`);
            if (filesResponse.data.data && filesResponse.data.data.length > 0) {
              const pdfFile = filesResponse.data.data.find(f =>
                f.name?.toLowerCase().endsWith('.pdf') ||
                f.name?.toLowerCase().includes('cv') ||
                f.name?.toLowerCase().includes('resume')
              );
              if (pdfFile) {
                resumeFileId = pdfFile.id;
                resumeUrl = pdfFile.downloadUrl || null;
              }
            }
          } catch {
            // No files found
          }
        }

        // Buscar LinkedIn en links
        const linkedinLink = opp.links?.find(link =>
          link.toLowerCase?.().includes('linkedin') ||
          (typeof link === 'object' && link.value?.toLowerCase?.().includes('linkedin'))
        );
        const linkedinUrl = typeof linkedinLink === 'string'
          ? linkedinLink
          : linkedinLink?.value || null;

        return {
          id: opp.id,
          name: opp.name || 'Unknown',
          email: opp.emails?.[0] || '',
          phone: opp.phones?.[0]?.value || '',
          stage: opp.stage?.text || 'New',
          resumeUrl,
          resumeFileId,
          hasResume: !!resumeUrl,
          linkedinUrl,
          createdAt: opp.createdAt,
          source: opp.sources?.[0] || 'Direct'
        };
      })
    );

    return candidates;
  } catch (error) {
    throw new Error(`Failed to fetch candidates: ${error.message}`);
  }
}

/**
 * Get a specific job posting by ID
 * @param {string} jobId - The posting ID
 */
async function getJob(jobId) {
  try {
    const response = await leverApi.get(`/postings/${jobId}`);
    const posting = response.data.data;

    let allLists = '';
    if (posting.content?.lists && Array.isArray(posting.content.lists)) {
      posting.content.lists.forEach(list => {
        if (list.text && list.content) {
          allLists += `\n${list.text}:\n${list.content}\n`;
        }
      });
    }

    const additionalText = posting.content?.closing || '';

    return {
      id: posting.id,
      title: posting.text,
      team: posting.categories?.team || 'No team',
      location: posting.categories?.location || 'Remote',
      department: posting.categories?.department || '',
      status: posting.state,
      description: posting.content?.description || '',
      descriptionPlain: posting.content?.descriptionPlain || '',
      lists: allLists,
      additionalText: additionalText,
      requirements: posting.content?.lists?.find(l => l.text === 'Requirements')?.content || '',
      responsibilities: posting.content?.lists?.find(l => l.text === 'Responsibilities')?.content || ''
    };
  } catch (error) {
    throw new Error(`Failed to fetch job: ${error.message}`);
  }
}

/**
 * Download resume content from Lever
 * @param {string} opportunityId - The opportunity ID
 * @param {string} resumeId - The resume file ID
 * @param {string} source - 'resumes' or 'files' endpoint
 */
async function downloadResume(opportunityId, resumeId, source = 'resumes') {
  const endpoint = source === 'files'
    ? `/opportunities/${opportunityId}/files/${resumeId}/download`
    : `/opportunities/${opportunityId}/resumes/${resumeId}/download`;

  try {
    const response = await leverApi.get(endpoint, {
      responseType: 'arraybuffer',
      maxRedirects: 5,
      timeout: 30000
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('Empty response from Lever API');
    }

    return response.data;
  } catch (error) {
    const status = error.response?.status;
    const statusText = error.response?.statusText;
    throw new Error(`Failed to download resume: ${status || ''} ${statusText || error.message}`);
  }
}

/**
 * Get parsed resume text from Lever (if available)
 * @param {string} opportunityId - The opportunity ID
 */
async function getResumeParsedData(opportunityId) {
  try {
    const response = await leverApi.get(`/opportunities/${opportunityId}/resumes`);

    if (response.data.data && response.data.data.length > 0) {
      const resume = response.data.data[0];
      const downloadUrl = resume.file?.downloadUrl ||
        `${LEVER_API_BASE}/opportunities/${opportunityId}/resumes/${resume.id}/download`;

      return {
        id: resume.id,
        fileName: resume.file?.name || 'resume.pdf',
        parsedData: resume.parsedData || null,
        downloadUrl: downloadUrl,
        source: 'resumes'
      };
    }
  } catch {
    // /resumes endpoint failed, try /files
  }

  // Fallback: try /files endpoint
  try {
    const filesResponse = await leverApi.get(`/opportunities/${opportunityId}/files`);

    if (filesResponse.data.data && filesResponse.data.data.length > 0) {
      let cvFile = filesResponse.data.data.find(f =>
        f.name?.toLowerCase().endsWith('.pdf') ||
        f.name?.toLowerCase().includes('cv') ||
        f.name?.toLowerCase().includes('resume') ||
        f.name?.toLowerCase().includes('curriculum')
      );

      if (!cvFile) {
        cvFile = filesResponse.data.data.find(f =>
          f.name?.toLowerCase().endsWith('.doc') ||
          f.name?.toLowerCase().endsWith('.docx') ||
          f.name?.toLowerCase().endsWith('.txt')
        );
      }

      if (!cvFile && filesResponse.data.data.length > 0) {
        cvFile = filesResponse.data.data[0];
      }

      if (cvFile) {
        const downloadUrl = cvFile.downloadUrl ||
          `${LEVER_API_BASE}/opportunities/${opportunityId}/files/${cvFile.id}/download`;

        return {
          id: cvFile.id,
          fileName: cvFile.name || 'cv.pdf',
          parsedData: null,
          downloadUrl: downloadUrl,
          source: 'files'
        };
      }
    }
  } catch {
    // /files endpoint also failed
  }

  return null;
}

/**
 * Clear jobs cache (call when user wants fresh data)
 */
function clearCache() {
  jobsCache.data = null;
  jobsCache.timestamp = null;
}

module.exports = {
  getJobs,
  getCandidates,
  getJob,
  downloadResume,
  getResumeParsedData,
  clearCache
};

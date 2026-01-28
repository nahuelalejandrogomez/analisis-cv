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
  // Check cache
  if (!forceRefresh && jobsCache.data && (Date.now() - jobsCache.timestamp < jobsCache.TTL)) {
    console.log('Returning cached jobs');
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

    // Update cache
    jobsCache.data = jobs;
    jobsCache.timestamp = Date.now();

    return jobs;
  } catch (error) {
    console.error('Error fetching jobs from Lever:', error.response?.data || error.message);
    throw new Error(`Failed to fetch jobs: ${error.message}`);
  }
}

/**
 * Get candidates (opportunities) for a specific job posting
 * @param {string} jobId - The posting ID
 */
async function getCandidates(jobId) {
  try {
    // Get opportunities for this posting
    const response = await leverApi.get('/opportunities', {
      params: {
        posting_id: jobId,
        limit: 100,
        expand: ['applications', 'stage']
      }
    });

    const candidates = await Promise.all(
      response.data.data.map(async (opp) => {
        // Get resume info if available
        let resumeUrl = null;
        let resumeFileId = null;

        try {
          // Try /resumes endpoint first
          const filesResponse = await leverApi.get(`/opportunities/${opp.id}/resumes`);
          if (filesResponse.data.data && filesResponse.data.data.length > 0) {
            const resume = filesResponse.data.data[0];
            resumeFileId = resume.id;
            resumeUrl = resume.file?.downloadUrl || null;
          }
        } catch (e) {
          console.log(`No resume found in /resumes for opportunity ${opp.id}`);
        }

        // If no resume found, try /files endpoint
        if (!resumeFileId) {
          try {
            const filesResponse = await leverApi.get(`/opportunities/${opp.id}/files`);
            if (filesResponse.data.data && filesResponse.data.data.length > 0) {
              // Look for PDF files (likely CVs)
              const pdfFile = filesResponse.data.data.find(f => 
                f.name?.toLowerCase().endsWith('.pdf') || 
                f.name?.toLowerCase().includes('cv') ||
                f.name?.toLowerCase().includes('resume')
              );
              if (pdfFile) {
                resumeFileId = pdfFile.id;
                resumeUrl = pdfFile.downloadUrl || null;
                console.log(`Found CV in /files for opportunity ${opp.id}: ${pdfFile.name}`);
              }
            }
          } catch (e) {
            console.log(`No files found in /files for opportunity ${opp.id}`);
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
    console.error('Error fetching candidates from Lever:', error.response?.data || error.message);
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

    // Extraer TODAS las listas (no solo Requirements y Responsibilities)
    let allLists = '';
    if (posting.content?.lists && Array.isArray(posting.content.lists)) {
      posting.content.lists.forEach(list => {
        if (list.text && list.content) {
          allLists += `\n${list.text}:\n${list.content}\n`;
        }
      });
    }

    // Extraer texto adicional si existe
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
      lists: allLists, // TODAS las listas juntas
      additionalText: additionalText,
      // Mantener los campos viejos por compatibilidad
      requirements: posting.content?.lists?.find(l => l.text === 'Requirements')?.content || '',
      responsibilities: posting.content?.lists?.find(l => l.text === 'Responsibilities')?.content || ''
    };
  } catch (error) {
    console.error('Error fetching job from Lever:', error.response?.data || error.message);
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
  try {
    const endpoint = source === 'files' 
      ? `/opportunities/${opportunityId}/files/${resumeId}/download`
      : `/opportunities/${opportunityId}/resumes/${resumeId}/download`;
    
    const response = await leverApi.get(endpoint, { responseType: 'arraybuffer' });
    return response.data;
  } catch (error) {
    console.error('Error downloading resume:', error.response?.data || error.message);
    throw new Error(`Failed to download resume: ${error.message}`);
  }
}

/**
 * Get parsed resume text from Lever (if available)
 * @param {string} opportunityId - The opportunity ID
 */
async function getResumeParsedData(opportunityId) {
  try {
    // Try /resumes endpoint first
    const response = await leverApi.get(`/opportunities/${opportunityId}/resumes`);
    if (response.data.data && response.data.data.length > 0) {
      const resume = response.data.data[0];
      return {
        id: resume.id,
        fileName: resume.file?.name || 'resume.pdf',
        parsedData: resume.parsedData || null,
        downloadUrl: resume.file?.downloadUrl || null,
        source: 'resumes'
      };
    }
  } catch (error) {
    console.log('No resume in /resumes endpoint:', error.message);
  }

  // If no resume found, try /files endpoint
  try {
    const filesResponse = await leverApi.get(`/opportunities/${opportunityId}/files`);
    if (filesResponse.data.data && filesResponse.data.data.length > 0) {
      // Look for PDF files (likely CVs)
      const pdfFile = filesResponse.data.data.find(f => 
        f.name?.toLowerCase().endsWith('.pdf') || 
        f.name?.toLowerCase().includes('cv') ||
        f.name?.toLowerCase().includes('resume') ||
        f.name?.toLowerCase().includes('curriculum')
      );
      
      if (pdfFile) {
        return {
          id: pdfFile.id,
          fileName: pdfFile.name || 'cv.pdf',
          parsedData: null, // Files endpoint doesn't have parsed data
          downloadUrl: pdfFile.downloadUrl || null,
          source: 'files'
        };
      }
    }
  } catch (error) {
    console.log('No files in /files endpoint:', error.message);
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

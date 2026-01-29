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
  const endpoint = source === 'files'
    ? `/opportunities/${opportunityId}/files/${resumeId}/download`
    : `/opportunities/${opportunityId}/resumes/${resumeId}/download`;

  console.log(`[Lever Download] Iniciando descarga - Endpoint: ${endpoint}`);
  console.log(`[Lever Download] OpportunityId: ${opportunityId}, ResumeId: ${resumeId}, Source: ${source}`);

  try {
    const response = await leverApi.get(endpoint, {
      responseType: 'arraybuffer',
      maxRedirects: 5, // Seguir redirects (Lever a veces redirige a S3)
      timeout: 30000   // 30 segundos timeout
    });

    const contentType = response.headers['content-type'];
    const contentLength = response.headers['content-length'];

    console.log(`[Lever Download] ✅ Respuesta recibida - Status: ${response.status}`);
    console.log(`[Lever Download] Content-Type: ${contentType}, Content-Length: ${contentLength}`);
    console.log(`[Lever Download] Buffer size: ${response.data?.length || 0} bytes`);

    // Verificar que recibimos datos
    if (!response.data || response.data.length === 0) {
      console.error(`[Lever Download] ❌ Respuesta vacía del servidor`);
      throw new Error('Empty response from Lever API');
    }

    // Verificar que es un PDF (empieza con %PDF-)
    const header = Buffer.from(response.data.slice(0, 5)).toString('utf8');
    if (header !== '%PDF-') {
      console.warn(`[Lever Download] ⚠️ Archivo no parece ser PDF. Header: "${header}"`);
      // Podría ser otro formato, continuamos igual
    }

    return response.data;
  } catch (error) {
    const status = error.response?.status;
    const statusText = error.response?.statusText;
    const errorData = error.response?.data
      ? Buffer.from(error.response.data).toString('utf8').substring(0, 200)
      : error.message;

    console.error(`[Lever Download] ❌ Error descargando resume`);
    console.error(`[Lever Download] ❌ HTTP Status: ${status} ${statusText}`);
    console.error(`[Lever Download] ❌ Error: ${errorData}`);
    console.error(`[Lever Download] ❌ Endpoint: ${endpoint}`);

    throw new Error(`Failed to download resume: ${status || ''} ${statusText || error.message}`);
  }
}

/**
 * Get parsed resume text from Lever (if available)
 * @param {string} opportunityId - The opportunity ID
 */
async function getResumeParsedData(opportunityId) {
  console.log(`[Lever Resume] Buscando CV para opportunity: ${opportunityId}`);

  try {
    // Try /resumes endpoint first
    console.log(`[Lever Resume] Intentando endpoint /resumes...`);
    const response = await leverApi.get(`/opportunities/${opportunityId}/resumes`);
    console.log(`[Lever Resume] Respuesta /resumes - Status: ${response.status}, Data length: ${response.data?.data?.length || 0}`);

    if (response.data.data && response.data.data.length > 0) {
      const resume = response.data.data[0];

      // Si Lever no da downloadUrl, construirla manualmente
      const downloadUrl = resume.file?.downloadUrl ||
        `${LEVER_API_BASE}/opportunities/${opportunityId}/resumes/${resume.id}/download`;

      console.log(`[Lever Resume] ✅ Resume encontrado en /resumes`);
      console.log(`[Lever Resume] - ID: ${resume.id}`);
      console.log(`[Lever Resume] - FileName: ${resume.file?.name || 'N/A'}`);
      console.log(`[Lever Resume] - HasParsedData: ${!!resume.parsedData}`);
      console.log(`[Lever Resume] - DownloadURL: ${downloadUrl}`);

      return {
        id: resume.id,
        fileName: resume.file?.name || 'resume.pdf',
        parsedData: resume.parsedData || null,
        downloadUrl: downloadUrl,
        source: 'resumes'
      };
    } else {
      console.log(`[Lever Resume] /resumes respondió OK pero sin archivos`);
    }
  } catch (error) {
    console.error(`[Lever Resume] ❌ Error en /resumes endpoint:`, error.message);
    if (error.response) {
      console.error(`[Lever Resume] ❌ HTTP Status: ${error.response.status}`);
    }
  }

  // If no resume found, try /files endpoint
  console.log(`[Lever Resume] Intentando endpoint /files como fallback...`);
  try {
    const filesResponse = await leverApi.get(`/opportunities/${opportunityId}/files`);
    console.log(`[Lever Resume] Respuesta /files - Status: ${filesResponse.status}, Data length: ${filesResponse.data?.data?.length || 0}`);

    if (filesResponse.data.data && filesResponse.data.data.length > 0) {
      // Primero buscar PDFs o archivos con nombre de CV
      let cvFile = filesResponse.data.data.find(f =>
        f.name?.toLowerCase().endsWith('.pdf') ||
        f.name?.toLowerCase().includes('cv') ||
        f.name?.toLowerCase().includes('resume') ||
        f.name?.toLowerCase().includes('curriculum')
      );

      // Si no encuentra ninguno específico, tomar el primer archivo que parezca documento
      if (!cvFile) {
        cvFile = filesResponse.data.data.find(f =>
          f.name?.toLowerCase().endsWith('.doc') ||
          f.name?.toLowerCase().endsWith('.docx') ||
          f.name?.toLowerCase().endsWith('.txt')
        );
      }

      // Si aún no hay, tomar el primer archivo disponible
      if (!cvFile && filesResponse.data.data.length > 0) {
        cvFile = filesResponse.data.data[0];
        console.log(`[Lever Resume] No se encontró archivo típico de CV, usando primer archivo: ${cvFile.name}`);
      }

      if (cvFile) {
        // Si Lever no da downloadUrl, construirla manualmente
        const downloadUrl = cvFile.downloadUrl ||
          `${LEVER_API_BASE}/opportunities/${opportunityId}/files/${cvFile.id}/download`;

        console.log(`[Lever Resume] ✅ File encontrado en /files`);
        console.log(`[Lever Resume] - ID: ${cvFile.id}`);
        console.log(`[Lever Resume] - Name: ${cvFile.name}`);
        console.log(`[Lever Resume] - DownloadURL: ${downloadUrl}`);

        return {
          id: cvFile.id,
          fileName: cvFile.name || 'cv.pdf',
          parsedData: null, // Files endpoint doesn't have parsed data
          downloadUrl: downloadUrl,
          source: 'files'
        };
      }
    } else {
      console.log(`[Lever Resume] /files respondió OK pero sin archivos`);
    }
  } catch (error) {
    console.error(`[Lever Resume] ❌ Error en /files endpoint:`, error.message);
    if (error.response) {
      console.error(`[Lever Resume] ❌ HTTP Status: ${error.response.status}`);
    }
  }

  console.warn(`[Lever Resume] ⚠️ No se encontró CV en ningún endpoint para opportunity: ${opportunityId}`);
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

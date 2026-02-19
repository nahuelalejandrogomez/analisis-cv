const OpenAI = require('openai');
const skillMatchingLLM = require('./skillMatchingLLM');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const EVALUATION_PROMPT = `Eres un especialista en RRHH evaluando candidatos para una empresa de tecnología.

**DESCRIPCIÓN DEL JOB:**
{jobDescription}

**CV DEL CANDIDATO:**
{cvText}

**TAREA:**
Evalúa si el candidato aplica para esta posición.

Responde ÚNICAMENTE en JSON (sin markdown, sin explicación adicional):
{
  "status": "VERDE" | "AMARILLO" | "ROJO",
  "reasoning": "Máximo 30 palabras explicando por qué ese color",
  "job_country": "país de la búsqueda",
  "candidate_country": "país de residencia del candidato o null"
}

**CRITERIOS:**
- VERDE: Cumple 100% de requisitos técnicos + experiencia
- AMARILLO: Cumple 70-90% de requisitos, falta algo menor
- ROJO: Cumple <70% de requisitos o falta tech crítica

**CRITERIO - PAÍS DE RESIDENCIA:**
- "job_country": extrae el país de la búsqueda del campo "Ubicación:" del job o de cualquier mención explícita en la descripción. Si dice "Remote", "Anywhere" o no se especifica, usa "Argentina".
- "candidate_country": detecta el país de residencia actual del candidato en el CV (dirección, ciudad, menciones como "vivo en X" o "based in X"). Si el CV no menciona país, devuelve null.

**IMPORTANTE:**
Considera variantes de tecnologías (NestJS = Nest.js, Node.js = NodeJS, etc.)
Si una tech está en el CV, evalúa la PROFUNDIDAD de experiencia, no digas que "no la menciona".

El reasoning DEBE ser máximo 30 palabras. Sé conciso.`;

/**
 * Evaluate a candidate's CV against a job description
 * @param {string} jobDescription - The job description/requirements
 * @param {string} cvText - The candidate's CV text
 * @returns {Promise<{status: string, reasoning: string}>}
 */
async function evaluateCV(jobDescription, cvText) {
  // GUARDRAIL SECUNDARIO: Defensa en profundidad
  // El guardrail principal está en evaluationService.js
  // Este es un fallback por si algo bypasea el primero
  const charCount = cvText?.trim()?.length || 0;
  if (!cvText || charCount < 50) {
    console.error(`[OpenAI] ❌ GUARDRAIL SECUNDARIO: CV insuficiente (${charCount} chars). No se enviará al LLM.`);
    return {
      status: 'AMARILLO',
      reasoning: 'CV no disponible o ilegible. Reintentar extracción y reevaluar. Revisión manual recomendada.'
    };
  }

  const prompt = EVALUATION_PROMPT
    .replace('{jobDescription}', jobDescription)
    .replace('{cvText}', cvText);

  try {
    console.log(`[OpenAI] Evaluando con modelo ${OPENAI_MODEL}...`);

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = response.choices[0].message.content.trim();
    console.log('[OpenAI] Respuesta recibida');

    // Parse JSON response
    let evaluation;
    try {
      // Clean up response if it has markdown backticks
      let cleanContent = content;
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }

      // Try to extract JSON if wrapped in text
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanContent = jsonMatch[0];
      }

      evaluation = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('[OpenAI] Error parseando respuesta:', content);
      return {
        status: 'AMARILLO',
        reasoning: 'Error al procesar la evaluación. Revisar manualmente.'
      };
    }

    // Validate response
    if (!['VERDE', 'AMARILLO', 'ROJO'].includes(evaluation.status)) {
      evaluation.status = 'AMARILLO';
    }
    if (!evaluation.reasoning) {
      evaluation.reasoning = 'Sin razón especificada';
    }

    // POST-LLM GUARDRAIL: Detectar contradicciones usando LLM
    console.log('[Guardrail] Verificando contradicciones con LLM...');
    try {
      const requiredTechs = await skillMatchingLLM.extractRequiredTechsLLM(jobDescription);
      console.log(`[Guardrail] Techs requeridas: ${requiredTechs.join(', ')}`);
      
      const contradictionCheck = await skillMatchingLLM.detectContradictionsLLM(
        cvText, 
        evaluation.reasoning, 
        requiredTechs
      );

      if (contradictionCheck.hasContradiction) {
        console.warn('⚠️  [Guardrail] Contradicción detectada:', contradictionCheck.warnings);
        
        // Reescribir reasoning basado en techs presentes
        // NO cambiar status (mantener decisión del LLM sobre fit general)
        if (contradictionCheck.presentTechs && contradictionCheck.presentTechs.length > 0) {
          const techsList = contradictionCheck.presentTechs.slice(0, 3).join(', ');
          evaluation.reasoning = `Tiene: ${techsList}. Evaluar profundidad de experiencia en estas tecnologías.`;
          console.log('✅ [Guardrail] Reasoning corregido');
        }
      } else {
        console.log('✅ [Guardrail] Sin contradicciones');
      }
    } catch (guardrailError) {
      console.warn('⚠️  [Guardrail] Error en verificación, manteniendo reasoning original:', guardrailError.message);
    }

    // COUNTRY MISMATCH CHECK (post-guardrail)
    const candidateCountry = evaluation.candidate_country || null;
    const jobCountry = evaluation.job_country || 'Argentina';

    if (candidateCountry) {
      const normalize = (s) => s.toLowerCase().trim()
        .replace(/^república\s+/i, '')
        .replace(/^the\s+/i, '');

      if (normalize(candidateCountry) !== normalize(jobCountry)) {
        console.log(`[Country] Mismatch: candidato en "${candidateCountry}", búsqueda para "${jobCountry}"`);

        if (evaluation.status === 'VERDE') {
          evaluation.status = 'AMARILLO';
          console.log('[Country] Status downgradado VERDE → AMARILLO por mismatch de país');
        }

        const countryObs = `Reside en ${candidateCountry}, búsqueda para ${jobCountry}. Considerar relocation/remoto.`;
        evaluation.reasoning = `${countryObs} ${evaluation.reasoning}`;
        evaluation.country_mismatch = true;
      } else {
        console.log(`[Country] OK: candidato en "${candidateCountry}", coincide con job`);
      }
    } else {
      console.log('[Country] País del candidato no detectado en CV, sin chequeo de mismatch');
    }

    // Limitar palabras: 50 si hay mismatch de país, 30 en caso normal
    const wordLimit = evaluation.country_mismatch ? 50 : 30;
    const words = evaluation.reasoning.split(/\s+/);
    if (words.length > wordLimit) {
      console.log(`[Guardrail] Reasoning excede ${wordLimit} palabras (${words.length}). Truncando...`);
      evaluation.reasoning = words.slice(0, wordLimit).join(' ') + '...';
    }

    console.log(`✅ Evaluación completada: ${evaluation.status}`);
    return evaluation;
  } catch (error) {
    console.error('❌ Error calling OpenAI API:', error.message);
    throw new Error(`OpenAI API error: ${error.message}`);
  }
}

/**
 * Rate-limited batch evaluation
 * @param {Array} candidates - Array of {jobDescription, cvText, candidateId}
 * @param {number} delayMs - Delay between calls (default 1500ms)
 */
async function evaluateBatch(candidates, delayMs = 1500) {
  const results = [];

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];

    try {
      const evaluation = await evaluateCV(candidate.jobDescription, candidate.cvText);
      results.push({
        candidateId: candidate.candidateId,
        ...evaluation,
        success: true
      });
    } catch (error) {
      results.push({
        candidateId: candidate.candidateId,
        status: 'ROJO',
        reasoning: `Error en evaluación: ${error.message}`,
        success: false
      });
    }

    // Delay between calls to avoid rate limiting
    if (i < candidates.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

module.exports = {
  evaluateCV,
  evaluateBatch
};

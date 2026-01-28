const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

const EVALUATION_PROMPT = `Eres un especialista en RRHH evaluando candidatos para una empresa de tecnología.

Job Description:
{jobDescription}

Candidato CV:
{cvText}

Evalúa si el candidato aplica para el rol. Responde SOLO en JSON válido:
{
  "status": "VERDE" | "AMARILLO" | "ROJO",
  "reasoning": "Explicación breve (2-3 líneas) de por qué"
}

CRITERIOS:
- VERDE: Cumple con 80-100% de requisitos técnicos + experiencia suficiente. Es un candidato fuerte.
- AMARILLO: Cumple 60-80% de requisitos. Tiene potencial pero falta algo relevante. Vale la pena revisar.
- ROJO: Cumple <60% de requisitos o falta tecnología/experiencia crítica. No es un buen fit.

IMPORTANTE:
- Sé objetivo y basa tu evaluación en hechos del CV
- Si el CV está vacío o no se puede leer, responde ROJO con razón "CV no disponible o ilegible"
- Responde SOLO el JSON, sin texto adicional, sin markdown, sin backticks`;

/**
 * Evaluate a candidate's CV against a job description
 * @param {string} jobDescription - The job description/requirements
 * @param {string} cvText - The candidate's CV text
 * @returns {Promise<{status: string, reasoning: string}>}
 */
async function evaluateCV(jobDescription, cvText) {
  const prompt = EVALUATION_PROMPT
    .replace('{jobDescription}', jobDescription)
    .replace('{cvText}', cvText || 'CV no disponible');

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = response.content[0].text.trim();

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

      evaluation = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', content);
      // Return a safe default if parsing fails
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

    return evaluation;
  } catch (error) {
    console.error('Error calling Claude API:', error.message);
    throw new Error(`Claude API error: ${error.message}`);
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

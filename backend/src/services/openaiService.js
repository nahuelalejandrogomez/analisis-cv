const OpenAI = require('openai');
const skillMatchingUtils = require('./skillMatchingUtils');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const EVALUATION_PROMPT = `Eres un especialista en RRHH evaluando candidatos para una empresa de tecnología.

**DESCRIPCIÓN DEL JOB:**
{jobDescription}

**CV DEL CANDIDATO:**
{cvText}
{skillsMetadata}

**TAREA:**
Evalúa si el candidato aplica para esta posición.

Responde ÚNICAMENTE en JSON (sin markdown, sin explicación adicional):
{
  "status": "VERDE" | "AMARILLO" | "ROJO",
  "reasoning": "Máximo 30 palabras explicando por qué ese color"
}

**CRITERIOS:**
- VERDE: Cumple 100% de requisitos técnicos + experiencia
- AMARILLO: Cumple 70-90% de requisitos, falta algo menor
- ROJO: Cumple <70% de requisitos o falta tech crítica

**GUARDRAIL CRÍTICO:**
Si una tecnología aparece en el CV (incluyendo variantes como Node.js/NodeJS/Node o NestJS/Nest.js), 
NO digas que "no la menciona" o "no tiene experiencia". En su lugar, evalúa la PROFUNDIDAD de la experiencia.

El reasoning DEBE ser máximo 30 palabras. Sé conciso.`;

/**
 * Evaluate a candidate's CV against a job description
 * @param {string} jobDescription - The job description/requirements
 * @param {string} cvText - The candidate's CV text
 * @returns {Promise<{status: string, reasoning: string}>}
 */
async function evaluateCV(jobDescription, cvText) {
  // PRE-LLM: Extraer tecnologías requeridas y detectar cuáles están presentes
  const requiredTechs = skillMatchingUtils.extractRequiredTechs(jobDescription);
  const skillsMetadata = skillMatchingUtils.generateSkillsMetadata(cvText, requiredTechs);

  const prompt = EVALUATION_PROMPT
    .replace('{jobDescription}', jobDescription)
    .replace('{cvText}', cvText || 'CV no disponible')
    .replace('{skillsMetadata}', skillsMetadata);

  try {
    console.log(`Evaluando con OpenAI (${OPENAI_MODEL})...`);
    if (requiredTechs.length > 0) {
      console.log(`Tecnologías requeridas detectadas: ${requiredTechs.join(', ')}`);
    }

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = response.choices[0].message.content.trim();
    console.log('Respuesta OpenAI:', content);

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
      console.error('Failed to parse OpenAI response:', content);
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

    // POST-LLM GUARDRAIL: Detectar contradicciones
    const contradictionCheck = skillMatchingUtils.detectContradictions(
      cvText, 
      evaluation.reasoning, 
      requiredTechs
    );

    if (contradictionCheck.hasContradiction) {
      console.warn('⚠️  Contradicción detectada:', contradictionCheck.warnings);
      
      // Ajustar reasoning para evitar falso negativo
      // NO cambiar status (mantener decisión del LLM sobre fit general)
      const presentTechs = requiredTechs.filter(tech => 
        skillMatchingUtils.isTechPresent(cvText, tech)
      );
      
      if (presentTechs.length > 0) {
        // Reescribir reasoning de forma conservadora
        evaluation.reasoning = `Tiene: ${presentTechs.slice(0, 3).join(', ')}. Evaluar profundidad de experiencia en estas tecnologías.`;
      }
    }

    // Limitar a 30 palabras
    const words = evaluation.reasoning.split(/\s+/);
    if (words.length > 30) {
      console.log(`Reasoning excede 30 palabras (${words.length}). Truncando...`);
      evaluation.reasoning = words.slice(0, 30).join(' ') + '...';
    }

    console.log(`Evaluación completada: ${evaluation.status}`);
    return evaluation;
  } catch (error) {
    console.error('Error calling OpenAI API:', error.message);
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

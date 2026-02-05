/**
 * Skill Matching con LLM (Versión Simplificada)
 *
 * En lugar de mantener diccionarios y regex, usamos el LLM para:
 * 1. Normalizar tecnologías semánticamente
 * 2. Detectar contradicciones de forma más inteligente
 */

const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

/**
 * Extrae tecnologías del job description usando LLM
 * @param {string} jobDescription - Descripción del trabajo
 * @returns {Promise<Array<string>>} - Lista de tecnologías en forma canónica
 */
async function extractRequiredTechsLLM(jobDescription) {
  const prompt = `Extrae TODAS las tecnologías/herramientas mencionadas. Devuelve array JSON con nombres canónicos (lowercase, sin puntos).

Job:
${jobDescription.slice(0, 2000)}

Ejemplo: ["nodejs", "nestjs", "postgresql", "docker", "git"]
JSON:`;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 200
    });

    const content = response.choices[0].message.content.trim();
    const techs = JSON.parse(content);
    return Array.isArray(techs) ? techs : [];
  } catch {
    return [];
  }
}

/**
 * Verifica si una tecnología está presente en el CV (con variantes) usando LLM
 * @param {string} cvText - Texto del CV
 * @param {string} tech - Tecnología a buscar (ej: "nestjs")
 * @returns {Promise<boolean>} - true si está presente (incluyendo variantes)
 */
async function isTechPresentLLM(cvText, tech) {
  const prompt = `¿El siguiente CV menciona la tecnología "${tech}" (incluyendo variantes como NestJS/Nest.js o Node.js/NodeJS)?

CV:
${cvText.slice(0, 3000)}

Responde SOLO "SI" o "NO":`;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 10
    });

    const answer = response.choices[0].message.content.trim().toUpperCase();
    return answer === 'SI' || answer === 'SÍ' || answer === 'YES';
  } catch {
    return false;
  }
}

/**
 * Detecta contradicciones usando LLM (versión inteligente)
 * @param {string} cvText - Texto del CV
 * @param {string} reasoning - Reasoning del LLM
 * @param {Array<string>} requiredTechs - Tecnologías requeridas
 * @returns {Promise<Object>} - {hasContradiction: bool, warnings: Array<string>, presentTechs: Array<string>}
 */
async function detectContradictionsLLM(cvText, reasoning, requiredTechs) {
  const prompt = `CV:
${cvText.slice(0, 1500)}

Reasoning: "${reasoning}"
Techs requeridas: ${requiredTechs.join(', ')}

¿El reasoning dice que FALTA alguna tech que SÍ está en el CV (considerando variantes NestJS=Nest.js, etc)?

JSON:
{
  "hasContradiction": true/false,
  "contradictions": ["tech1", ...],
  "presentTechs": ["tech1", "tech2", ...]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 250
    });

    const content = response.choices[0].message.content.trim();
    const result = JSON.parse(content);

    return {
      hasContradiction: result.hasContradiction || false,
      warnings: result.contradictions || [],
      presentTechs: result.presentTechs || []
    };
  } catch {
    return {
      hasContradiction: false,
      warnings: [],
      presentTechs: []
    };
  }
}

/**
 * Genera metadata de skills (versión simplificada para PRE-LLM hint)
 * @param {string} cvText - Texto del CV
 * @param {Array<string>} requiredTechs - Tecnologías requeridas
 * @returns {Promise<string>} - Texto formateado para agregar al prompt
 */
async function generateSkillsMetadataLLM(cvText, requiredTechs) {
  if (requiredTechs.length === 0) return '';

  const prompt = `De estas tecnologías: ${requiredTechs.join(', ')}
¿Cuáles están mencionadas en el CV (incluyendo variantes)?

CV:
${cvText.slice(0, 2000)}

Responde solo con array JSON de las que SÍ están:`;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 200
    });

    const content = response.choices[0].message.content.trim();
    const presentTechs = JSON.parse(content);

    if (presentTechs.length === 0) return '';

    return `\n**TECNOLOGÍAS DETECTADAS EN CV (considerando variantes):**\n${presentTechs.join(', ')}\n`;
  } catch {
    return '';
  }
}

module.exports = {
  extractRequiredTechsLLM,
  isTechPresentLLM,
  detectContradictionsLLM,
  generateSkillsMetadataLLM
};

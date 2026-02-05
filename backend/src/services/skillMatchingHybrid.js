/**
 * Skill Matching - Versión Híbrida
 *
 * Estrategia: Usar diccionario local para casos comunes (rápido)
 * Fallback a LLM para casos no cubiertos o ambiguos
 */

const skillMatchingUtils = require('./skillMatchingUtils');
const skillMatchingLLM = require('./skillMatchingLLM');

/**
 * Extrae tecnologías requeridas (híbrido: diccionario + LLM si es necesario)
 */
async function extractRequiredTechsHybrid(jobDescription) {
  const localTechs = skillMatchingUtils.extractRequiredTechs(jobDescription);

  if (localTechs.length < 3) {
    try {
      const llmTechs = await skillMatchingLLM.extractRequiredTechsLLM(jobDescription);
      const combined = [...new Set([...localTechs, ...llmTechs])];
      return combined;
    } catch {
      return localTechs;
    }
  }

  return localTechs;
}

/**
 * Verifica si tech está presente (híbrido: diccionario + LLM si no está en diccionario)
 */
async function isTechPresentHybrid(cvText, tech) {
  const inDictionary = skillMatchingUtils.TECH_SYNONYMS.hasOwnProperty(tech.toLowerCase());

  if (inDictionary) {
    return skillMatchingUtils.isTechPresent(cvText, tech);
  }

  try {
    return await skillMatchingLLM.isTechPresentLLM(cvText, tech);
  } catch {
    return false;
  }
}

/**
 * Detecta contradicciones (híbrido: reglas locales primero, LLM para casos ambiguos)
 */
async function detectContradictionsHybrid(cvText, reasoning, requiredTechs) {
  const localResult = skillMatchingUtils.detectContradictions(cvText, reasoning, requiredTechs);

  if (localResult.hasContradiction) {
    const presentTechs = requiredTechs.filter(tech =>
      skillMatchingUtils.isTechPresent(cvText, tech)
    );

    return {
      hasContradiction: true,
      warnings: localResult.warnings,
      presentTechs
    };
  }

  const hasNegativePattern = /no\s+(menciona|tiene)|falta|carece/i.test(reasoning);

  if (hasNegativePattern && requiredTechs.length > 0) {
    try {
      const llmResult = await skillMatchingLLM.detectContradictionsLLM(cvText, reasoning, requiredTechs);
      if (llmResult.hasContradiction) {
        return llmResult;
      }
    } catch {
      // LLM failed, use local result
    }
  }

  return {
    hasContradiction: false,
    warnings: [],
    presentTechs: []
  };
}

/**
 * Genera metadata (usa método local, es suficientemente bueno)
 */
function generateSkillsMetadataHybrid(cvText, requiredTechs) {
  return skillMatchingUtils.generateSkillsMetadata(cvText, requiredTechs);
}

module.exports = {
  extractRequiredTechsHybrid,
  isTechPresentHybrid,
  detectContradictionsHybrid,
  generateSkillsMetadataHybrid
};

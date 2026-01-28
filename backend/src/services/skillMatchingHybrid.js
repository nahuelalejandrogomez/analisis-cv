/**
 * Skill Matching - Versión Híbrida
 * 
 * Estrategia: Usar diccionario local para casos comunes (rápido)
 * Fallback a LLM para casos no cubiertos o ambiguos
 * 
 * PROS:
 * - Rápido para 95% de casos (diccionario local)
 * - Flexible para casos raros (LLM)
 * - No mantener diccionario gigante
 * 
 * CONS:
 * - Más llamadas a API (pero solo para casos edge)
 * - Latencia mayor en casos edge
 */

const skillMatchingUtils = require('./skillMatchingUtils');
const skillMatchingLLM = require('./skillMatchingLLM');

/**
 * Extrae tecnologías requeridas (híbrido: diccionario + LLM si es necesario)
 */
async function extractRequiredTechsHybrid(jobDescription) {
  // Primero intentar con diccionario local (rápido)
  const localTechs = skillMatchingUtils.extractRequiredTechs(jobDescription);
  
  // Si encontramos pocas techs (<3), usar LLM para complementar
  if (localTechs.length < 3) {
    console.log('[Hybrid Extract] Pocas techs encontradas localmente, usando LLM...');
    try {
      const llmTechs = await skillMatchingLLM.extractRequiredTechsLLM(jobDescription);
      
      // Combinar, eliminar duplicados
      const combined = [...new Set([...localTechs, ...llmTechs])];
      console.log(`[Hybrid Extract] Local: ${localTechs.length}, LLM: ${llmTechs.length}, Combined: ${combined.length}`);
      return combined;
    } catch (error) {
      console.warn('[Hybrid Extract] LLM falló, usando solo local:', error.message);
      return localTechs;
    }
  }
  
  return localTechs;
}

/**
 * Verifica si tech está presente (híbrido: diccionario + LLM si no está en diccionario)
 */
async function isTechPresentHybrid(cvText, tech) {
  // Primero verificar con diccionario local
  const inDictionary = skillMatchingUtils.TECH_SYNONYMS.hasOwnProperty(tech.toLowerCase());
  
  if (inDictionary) {
    // Si está en diccionario, usar método local (rápido y confiable)
    return skillMatchingUtils.isTechPresent(cvText, tech);
  }
  
  // Si NO está en diccionario, usar LLM (más flexible)
  console.log(`[Hybrid TechPresent] "${tech}" no está en diccionario, usando LLM...`);
  try {
    return await skillMatchingLLM.isTechPresentLLM(cvText, tech);
  } catch (error) {
    console.warn(`[Hybrid TechPresent] LLM falló para ${tech}, fallback a false:`, error.message);
    return false;
  }
}

/**
 * Detecta contradicciones (híbrido: reglas locales primero, LLM para casos ambiguos)
 */
async function detectContradictionsHybrid(cvText, reasoning, requiredTechs) {
  // Primero intentar con reglas locales (rápido)
  const localResult = skillMatchingUtils.detectContradictions(cvText, reasoning, requiredTechs);
  
  // Si hay contradicción detectada localmente, confiar en ella
  if (localResult.hasContradiction) {
    console.log('[Hybrid Contradictions] Contradicción detectada localmente');
    
    // Obtener presentTechs para reescribir reasoning
    const presentTechs = requiredTechs.filter(tech => 
      skillMatchingUtils.isTechPresent(cvText, tech)
    );
    
    return {
      hasContradiction: true,
      warnings: localResult.warnings,
      presentTechs
    };
  }
  
  // Si hay patrones de "no menciona" pero no detectamos contradicción,
  // usar LLM para segunda opinión (evitar falsos negativos)
  const hasNegativePattern = /no\s+(menciona|tiene)|falta|carece/i.test(reasoning);
  
  if (hasNegativePattern && requiredTechs.length > 0) {
    console.log('[Hybrid Contradictions] Patrón negativo detectado, verificando con LLM...');
    try {
      const llmResult = await skillMatchingLLM.detectContradictionsLLM(cvText, reasoning, requiredTechs);
      
      if (llmResult.hasContradiction) {
        console.log('[Hybrid Contradictions] LLM detectó contradicción que reglas locales no vieron');
        return llmResult;
      }
    } catch (error) {
      console.warn('[Hybrid Contradictions] LLM falló, usando resultado local:', error.message);
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
  // Para metadata PRE-LLM, el método local es suficiente y rápido
  return skillMatchingUtils.generateSkillsMetadata(cvText, requiredTechs);
}

module.exports = {
  extractRequiredTechsHybrid,
  isTechPresentHybrid,
  detectContradictionsHybrid,
  generateSkillsMetadataHybrid
};

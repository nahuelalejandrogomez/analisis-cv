/**
 * Skill Matching Utilities
 * 
 * Funciones auxiliares para normalizar texto y detectar variantes de tecnologías.
 * NO modifica lógica de scoring existente, solo previene falsos negativos.
 */

/**
 * Normaliza texto para matching: lowercase, sin puntuación, espacios colapsados
 * @param {string} text - Texto a normalizar
 * @returns {string} - Texto normalizado
 */
function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .toLowerCase()
    .replace(/[.\-_\/\\]/g, ' ')  // Reemplazar puntos, guiones, barras por espacio
    .replace(/[^\w\s]/g, '')       // Remover otros símbolos
    .replace(/\s+/g, ' ')          // Colapsar espacios múltiples
    .trim();
}

/**
 * Diccionario de sinónimos/variantes de tecnologías comunes
 * EXTENSIBLE: Agregar más según necesidades del negocio
 */
const TECH_SYNONYMS = {
  // JavaScript & Node.js
  'nodejs': ['node js', 'node.js', 'node', 'nodejs'],
  'nestjs': ['nest js', 'nest.js', 'nestjs'],
  'nextjs': ['next js', 'next.js', 'nextjs'],
  'reactjs': ['react js', 'react.js', 'react', 'reactjs'],
  'vuejs': ['vue js', 'vue.js', 'vue', 'vuejs'],
  'angularjs': ['angular js', 'angular.js', 'angular', 'angularjs'],
  'typescript': ['type script', 'ts'],
  'javascript': ['java script', 'js'],
  
  // Bases de datos
  'postgresql': ['postgres', 'postgres ql', 'psql'],
  'mongodb': ['mongo db', 'mongo'],
  'mysql': ['my sql'],
  'mariadb': ['maria db'],
  'redis': ['redis'],
  'elasticsearch': ['elastic search', 'elastic'],
  
  // Cloud & DevOps
  'kubernetes': ['k8s', 'kube'],
  'docker': ['docker'],
  'aws': ['amazon web services', 'amazon aws'],
  'gcp': ['google cloud platform', 'google cloud'],
  'azure': ['microsoft azure'],
  
  // Backend Frameworks
  'expressjs': ['express js', 'express.js', 'express'],
  'fastapi': ['fast api'],
  'django': ['django'],
  'flask': ['flask'],
  'spring': ['spring boot', 'springboot'],
  
  // Frontend
  'css3': ['css 3', 'css'],
  'html5': ['html 5', 'html'],
  'sass': ['scss'],
  'webpack': ['web pack'],
  
  // Testing
  'jest': ['jest'],
  'mocha': ['mocha'],
  'pytest': ['py test'],
  'junit': ['j unit'],
  
  // Otros
  'github': ['git hub'],
  'gitlab': ['git lab'],
  'graphql': ['graph ql'],
  'restapi': ['rest api', 'rest'],
  'microservices': ['micro services'],
  'cicd': ['ci cd', 'ci/cd', 'continuous integration', 'continuous deployment'],
};

/**
 * Construye todas las variantes normalizadas de una tecnología
 * @param {string} tech - Tecnología a buscar (ej: "NestJS")
 * @returns {Array<string>} - Array de variantes normalizadas
 */
function buildTechVariants(tech) {
  const normalized = normalizeText(tech);
  
  // Buscar en diccionario
  for (const [canonical, variants] of Object.entries(TECH_SYNONYMS)) {
    const allVariants = [canonical, ...variants].map(v => normalizeText(v));
    if (allVariants.includes(normalized)) {
      return allVariants;
    }
  }
  
  // Si no está en diccionario, devolver solo la versión normalizada
  return [normalized];
}

/**
 * Verifica si una tecnología (o sus variantes) está presente en el CV
 * @param {string} cvText - Texto del CV
 * @param {string} tech - Tecnología a buscar
 * @returns {boolean} - true si encuentra alguna variante
 */
function isTechPresent(cvText, tech) {
  if (!cvText || !tech) return false;
  
  const normalizedCV = normalizeText(cvText);
  const variants = buildTechVariants(tech);
  
  // Buscar cualquier variante como palabra completa
  return variants.some(variant => {
    // Match como palabra completa (evitar falsos positivos)
    const regex = new RegExp(`\\b${variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return regex.test(normalizedCV);
  });
}

/**
 * Extrae lista de tecnologías del job description
 * Busca patrones comunes: "Requisitos:", "Skills:", bullet points, etc.
 * @param {string} jobDescription - Descripción del trabajo
 * @returns {Array<string>} - Lista de tecnologías encontradas
 */
function extractRequiredTechs(jobDescription) {
  if (!jobDescription) return [];
  
  const techs = new Set();
  const text = jobDescription.toLowerCase();
  
  // Buscar todas las tecnologías conocidas en el diccionario
  for (const [canonical, variants] of Object.entries(TECH_SYNONYMS)) {
    const allVariants = [canonical, ...variants];
    
    for (const variant of allVariants) {
      // Buscar con word boundaries
      const regex = new RegExp(`\\b${variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(text)) {
        techs.add(canonical); // Agregar forma canónica
        break; // Ya encontramos esta tech, no seguir buscando variantes
      }
    }
  }
  
  return Array.from(techs);
}

/**
 * Verifica contradicciones entre CV y reasoning del LLM
 * Si el LLM dice "no menciona X" pero X está en el CV, devuelve warning
 * @param {string} cvText - Texto del CV
 * @param {string} reasoning - Reasoning del LLM
 * @param {Array<string>} requiredTechs - Tecnologías requeridas
 * @returns {Object} - {hasContradiction: bool, warnings: Array<string>}
 */
function detectContradictions(cvText, reasoning, requiredTechs) {
  const warnings = [];
  const reasoningNormalized = normalizeText(reasoning);
  
  // Patrones que indican "falta algo"
  const missingPatterns = [
    'no menciona',
    'no tiene',
    'falta',
    'carece',
    'sin experiencia en',
    'no posee',
    'ausencia de',
  ];
  
  // Primero, identificar TODAS las tecnologías mencionadas en el reasoning
  // para evitar falsos positivos por sub-strings (ej: "js" dentro de "nest js")
  const allMentionedTechs = new Set();
  
  for (const tech of requiredTechs) {
    const techVariants = buildTechVariants(tech);
    
    // Verificar si esta tech está mencionada EN CUALQUIER PARTE del reasoning
    for (const variant of techVariants) {
      const escapedVariant = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedVariant}\\b`);
      
      if (regex.test(reasoningNormalized)) {
        allMentionedTechs.add(tech);
        break;
      }
    }
  }
  
  // Ahora detectar contradicciones solo para techs mencionadas cerca de patrones negativos
  for (const tech of requiredTechs) {
    const techVariants = buildTechVariants(tech);
    
    // Verificar si el reasoning menciona que falta esta tech
    let mightBeMissing = false;
    
    for (const pattern of missingPatterns) {
      const patternIndex = reasoningNormalized.indexOf(pattern);
      if (patternIndex === -1) continue;
      
      // Extraer contexto alrededor del patrón (50 chars antes y después)
      const contextStart = Math.max(0, patternIndex - 50);
      const contextEnd = Math.min(reasoningNormalized.length, patternIndex + pattern.length + 50);
      const context = reasoningNormalized.slice(contextStart, contextEnd);
      
      // Verificar si ESTA TECH ESPECÍFICA aparece en el contexto negativo
      // Solo considerar si la tech tiene una variante que aparece COMPLETA en el contexto
      for (const variant of techVariants) {
        const escapedVariant = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedVariant}\\b`);
        
        if (regex.test(context)) {
          // Verificar que no sea un sub-string de otra tech más larga
          // Por ejemplo: "js" no debe matchear si "nest js" está en el contexto
          let isPartOfLongerTech = false;
          
          for (const otherTech of allMentionedTechs) {
            if (otherTech === tech) continue; // Skip self
            
            const otherVariants = buildTechVariants(otherTech);
            for (const otherVariant of otherVariants) {
              // Si otra tech contiene esta variante, es un substring
              if (otherVariant.includes(variant) && otherVariant !== variant) {
                const escapedOther = otherVariant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const otherRegex = new RegExp(`\\b${escapedOther}\\b`);
                if (otherRegex.test(context)) {
                  isPartOfLongerTech = true;
                  break;
                }
              }
            }
            if (isPartOfLongerTech) break;
          }
          
          if (!isPartOfLongerTech) {
            mightBeMissing = true;
            break;
          }
        }
      }
      
      if (mightBeMissing) break;
    }
    
    // Si el reasoning dice que falta PERO la tech SÍ está en el CV
    if (mightBeMissing && isTechPresent(cvText, tech)) {
      warnings.push(`Posible falso negativo: "${tech}" está en el CV pero el reasoning sugiere que falta`);
    }
  }
  
  return {
    hasContradiction: warnings.length > 0,
    warnings
  };
}

/**
 * Genera metadata de skills presentes para incluir en el prompt
 * @param {string} cvText - Texto del CV
 * @param {Array<string>} requiredTechs - Tecnologías requeridas
 * @returns {string} - Texto formateado para agregar al prompt
 */
function generateSkillsMetadata(cvText, requiredTechs) {
  const presentTechs = requiredTechs.filter(tech => isTechPresent(cvText, tech));
  
  if (presentTechs.length === 0) {
    return '';
  }
  
  return `\n**TECNOLOGÍAS DETECTADAS EN CV (considerando variantes):**\n${presentTechs.join(', ')}\n`;
}

module.exports = {
  normalizeText,
  buildTechVariants,
  isTechPresent,
  extractRequiredTechs,
  detectContradictions,
  generateSkillsMetadata,
  TECH_SYNONYMS // Exportar para testing/extensión
};

/**
 * Test end-to-end de detección de variantes de NestJS
 */

// Solo cargar skillMatchingUtils, no openaiService (que requiere API key)
const skillMatchingUtils = require('./src/services/skillMatchingUtils');

console.log('=== TEST END-TO-END: NestJS Variant Detection ===\n');

// Test Case: CV tiene "NestJS" pero LLM dice "no menciona Nest.js"
const testJobDescription = `
Backend Developer
Required Skills:
- Nest.js (Node.js framework)
- PostgreSQL
- Git
`;

const testCVText = `
Senior Backend Developer
Experience:
- NestJS: 3 years building RESTful APIs
- PostgreSQL: Advanced queries and optimization
- Git: Daily use with GitHub
`;

console.log('Job Description:', testJobDescription);
console.log('\nCV Text:', testCVText);
console.log('\n--- Simulando respuesta del LLM que FALLA en detectar NestJS ---');

// Simular que el LLM devuelve un reasoning incorrecto
const mockLLMResponse = {
  status: 'AMARILLO',
  reasoning: 'Tiene PostgreSQL y Git pero no menciona Nest.js. Le falta el framework principal.'
};

console.log('Respuesta simulada del LLM:');
console.log('  Status:', mockLLMResponse.status);
console.log('  Reasoning:', mockLLMResponse.reasoning);

// Verificar detección de contradicción manualmente

console.log('\n--- POST-LLM Guardrail Check ---');

// Extraer techs requeridas
const requiredTechs = skillMatchingUtils.extractRequiredTechs(testJobDescription);
console.log('Techs requeridas detectadas:', requiredTechs);

// Verificar presencia en CV
console.log('\nVerificación de presencia en CV:');
requiredTechs.forEach(tech => {
  const present = skillMatchingUtils.isTechPresent(testCVText, tech);
  console.log(`  ${tech}: ${present ? '✅ PRESENTE' : '❌ AUSENTE'}`);
});

// Detectar contradicciones
const contradictions = skillMatchingUtils.detectContradictions(
  testCVText, 
  mockLLMResponse.reasoning, 
  requiredTechs
);

console.log('\nDetección de contradicciones:');
console.log('  hasContradiction:', contradictions.hasContradiction);
console.log('  warnings:', contradictions.warnings);

// Simular corrección
if (contradictions.hasContradiction) {
  console.log('\n✅ CONTRADICCIÓN DETECTADA - Aplicando corrección...');
  
  const presentTechs = requiredTechs.filter(tech => 
    skillMatchingUtils.isTechPresent(testCVText, tech)
  );
  
  const correctedReasoning = `Tiene: ${presentTechs.slice(0, 3).join(', ')}. Evaluar profundidad de experiencia en estas tecnologías.`;
  
  console.log('\nReasoning corregido:');
  console.log('  Original:', mockLLMResponse.reasoning);
  console.log('  Corregido:', correctedReasoning);
  console.log('  Status:', mockLLMResponse.status, '(sin cambios - mantiene decisión del LLM)');
  
  // Verificar límite de 30 palabras
  const words = correctedReasoning.split(/\s+/);
  console.log('\nVerificación de límite de palabras:');
  console.log('  Cantidad:', words.length, 'palabras');
  console.log('  Límite: 30 palabras');
  console.log('  Status:', words.length <= 30 ? '✅ OK' : '⚠️ EXCEDE (se truncará)');
} else {
  console.log('\n❌ ERROR: No se detectó contradicción cuando debería haberse detectado');
}

console.log('\n=== FIN TEST END-TO-END ===');

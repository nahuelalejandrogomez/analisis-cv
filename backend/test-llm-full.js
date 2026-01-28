/**
 * Test de la nueva versión 100% LLM
 */

require('dotenv').config();
const openaiService = require('./src/services/openaiService');

console.log('=== TEST: Sistema 100% LLM (sin diccionarios) ===\n');

const testJobDescription = `
Backend Developer Position
Required Skills:
- Nest.js (Node.js framework) - 3+ years
- PostgreSQL - Advanced level
- Docker & Kubernetes
- Git
`;

const testCVText = `
Senior Backend Developer
Experience:
- NestJS: 4 years building scalable APIs
- PostgreSQL: Expert in query optimization
- Docker: Container orchestration
- GitHub: Daily commits
`;

console.log('Job Description:');
console.log(testJobDescription);
console.log('\n' + '='.repeat(60) + '\n');
console.log('CV Text:');
console.log(testCVText);
console.log('\n' + '='.repeat(60) + '\n');

(async () => {
  try {
    console.log('🚀 Iniciando evaluación...\n');
    
    const result = await openaiService.evaluateCV(testJobDescription, testCVText);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESULTADO FINAL:');
    console.log('='.repeat(60));
    console.log('Status:', result.status);
    console.log('Reasoning:', result.reasoning);
    console.log('='.repeat(60));
    
    // Verificar que NO diga "no menciona NestJS"
    const reasoningLower = result.reasoning.toLowerCase();
    if (reasoningLower.includes('no menciona') && reasoningLower.includes('nest')) {
      console.log('\n❌ ERROR: El sistema sigue diciendo "no menciona NestJS"');
      process.exit(1);
    } else {
      console.log('\n✅ SUCCESS: El sistema detectó correctamente las variantes de tecnologías');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('\n❌ Error en test:', error.message);
    process.exit(1);
  }
})();

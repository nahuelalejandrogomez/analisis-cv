/**
 * Test para reproducir bug de NestJS variant detection
 */

const { 
  normalizeText, 
  buildTechVariants, 
  isTechPresent,
  extractRequiredTechs,
  detectContradictions
} = require('./src/services/skillMatchingUtils');

console.log('=== TEST: NestJS Variant Detection Bug ===\n');

// Caso 1: CV tiene "NestJS"
const cvText1 = "Backend Developer with 3 years of experience in NestJS, PostgreSQL, and TypeScript.";
const jobDesc1 = "Required skills: Nest.js, SQL, Git";

console.log('Caso 1: CV tiene "NestJS", Job requiere "Nest.js"');
console.log('CV Text:', cvText1);
console.log('Job Desc:', jobDesc1);

// Paso 1: Normalización
console.log('\n1. Normalización:');
console.log('   CV normalizado:', normalizeText(cvText1));
console.log('   "NestJS" normalizado:', normalizeText('NestJS'));
console.log('   "Nest.js" normalizado:', normalizeText('Nest.js'));

// Paso 2: Variantes
console.log('\n2. Variantes:');
console.log('   Variantes de "NestJS":', buildTechVariants('NestJS'));
console.log('   Variantes de "Nest.js":', buildTechVariants('Nest.js'));

// Paso 3: Detección
console.log('\n3. Detección:');
console.log('   isTechPresent(CV, "NestJS"):', isTechPresent(cvText1, 'NestJS'));
console.log('   isTechPresent(CV, "Nest.js"):', isTechPresent(cvText1, 'Nest.js'));
console.log('   isTechPresent(CV, "nestjs"):', isTechPresent(cvText1, 'nestjs'));

// Paso 4: Extracción de techs del job
console.log('\n4. Extracción de techs requeridas:');
const requiredTechs = extractRequiredTechs(jobDesc1);
console.log('   Techs extraídas del job:', requiredTechs);

// Paso 5: Simulación de reasoning con contradicción
const badReasoning = "Candidato tiene PostgreSQL pero no menciona Nest.js. AMARILLO";
console.log('\n5. Detección de contradicciones:');
console.log('   Reasoning del LLM:', badReasoning);
const contradictions = detectContradictions(cvText1, badReasoning, requiredTechs);
console.log('   Contradicciones detectadas:', contradictions);

// Caso 2: CV tiene "Backend: NestJS, SQL"
console.log('\n\n=== Caso 2: CV más realista ===');
const cvText2 = `
Desarrollador Backend
Experiencia:
- Backend: NestJS, Node.js
- Base de datos: PostgreSQL, MySQL
- Control de versiones: Git
`;
const jobDesc2 = `
Buscamos developer con:
- Nest.js (framework backend)
- SQL (PostgreSQL/MySQL)
- Git
`;

console.log('CV Text:', cvText2);
console.log('Job Desc:', jobDesc2);

const requiredTechs2 = extractRequiredTechs(jobDesc2);
console.log('\nTechs requeridas extraídas:', requiredTechs2);

console.log('\nVerificación individual:');
requiredTechs2.forEach(tech => {
  const present = isTechPresent(cvText2, tech);
  console.log(`   ${tech}: ${present ? '✅ PRESENTE' : '❌ AUSENTE'}`);
});

const badReasoning2 = "Tiene SQL y Git pero no menciona Nest.js. AMARILLO";
const contradictions2 = detectContradictions(cvText2, badReasoning2, requiredTechs2);
console.log('\nContradicciones:', contradictions2);

console.log('\n=== FIN TEST ===');

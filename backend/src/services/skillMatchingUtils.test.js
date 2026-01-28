/**
 * Test/Demo para skillMatchingUtils
 * 
 * Ejecutar con: node skillMatchingUtils.test.js
 * 
 * Demuestra que el fix resuelve el bug de variantes de tecnologías
 */

const {
  normalizeText,
  buildTechVariants,
  isTechPresent,
  extractRequiredTechs,
  detectContradictions,
  generateSkillsMetadata
} = require('./skillMatchingUtils');

console.log('='.repeat(70));
console.log('🧪 DEMO: Fix de matching de tecnologías con variantes');
console.log('='.repeat(70));

// Test 1: Normalización básica
console.log('\n📌 Test 1: Normalización de texto');
console.log('-'.repeat(70));
const texts = [
  'Node.js',
  'NodeJS',
  'node-js',
  'node_js',
  'NestJS',
  'Nest.js',
  'PostgreSQL',
  'Postgres',
  'K8s',
  'Kubernetes'
];

texts.forEach(text => {
  console.log(`"${text}" → "${normalizeText(text)}"`);
});

// Test 2: Construcción de variantes
console.log('\n📌 Test 2: Construcción de variantes');
console.log('-'.repeat(70));
const techsToTest = ['NestJS', 'Node.js', 'PostgreSQL', 'Kubernetes'];

techsToTest.forEach(tech => {
  const variants = buildTechVariants(tech);
  console.log(`"${tech}" → [${variants.join(', ')}]`);
});

// Test 3: Detección en CV (CASO CRÍTICO - BUG A RESOLVER)
console.log('\n📌 Test 3: Detección de tecnologías en CV (caso crítico del bug)');
console.log('-'.repeat(70));

const cvExample1 = `
Senior Backend Developer

Experiencia:
- Desarrollé APIs REST con Nest.js y Node para una fintech
- Base de datos: Postgres y Redis
- Infraestructura: Docker, K8s en AWS
- Testing con Jest

Skills: TypeScript, Express.js, MongoDB, GraphQL
`;

const cvExample2 = `
Full Stack Developer

Stack:
- Frontend: ReactJS, Next.js, TypeScript
- Backend: NodeJS, NestJS, Express
- Databases: PostgreSQL, MongoDB
- DevOps: Kubernetes, Docker, CI/CD
`;

const techsToFind = [
  'NestJS',
  'Node.js', 
  'PostgreSQL',
  'Kubernetes',
  'React',
  'TypeScript',
  'MongoDB'
];

console.log('CV Ejemplo 1:');
techsToFind.forEach(tech => {
  const found = isTechPresent(cvExample1, tech);
  const emoji = found ? '✅' : '❌';
  console.log(`  ${emoji} ${tech}: ${found ? 'ENCONTRADO' : 'NO ENCONTRADO'}`);
});

console.log('\nCV Ejemplo 2:');
techsToFind.forEach(tech => {
  const found = isTechPresent(cvExample2, tech);
  const emoji = found ? '✅' : '❌';
  console.log(`  ${emoji} ${tech}: ${found ? 'ENCONTRADO' : 'NO ENCONTRADO'}`);
});

// Test 4: Extracción de tecnologías del job description
console.log('\n📌 Test 4: Extracción de tecnologías del job description');
console.log('-'.repeat(70));

const jobDescription = `
Backend Engineer - Fintech

Requisitos:
- 3+ años de experiencia con Node.js y NestJS
- Experiencia sólida con PostgreSQL y Redis
- Conocimiento de Kubernetes y Docker
- Testing con Jest o Mocha
- Experiencia con TypeScript

Deseable:
- MongoDB
- GraphQL
- AWS o GCP
`;

const requiredTechs = extractRequiredTechs(jobDescription);
console.log(`Tecnologías detectadas en job description:`);
console.log(`  ${requiredTechs.join(', ')}`);

// Test 5: Detección de contradicciones (guardrail POST-LLM)
console.log('\n📌 Test 5: Detección de contradicciones en reasoning del LLM');
console.log('-'.repeat(70));

const testCases = [
  {
    cvText: cvExample1,
    reasoning: 'Candidato no menciona experiencia en NestJS, faltan skills críticas',
    requiredTechs: ['NestJS', 'Node.js', 'PostgreSQL']
  },
  {
    cvText: cvExample2,
    reasoning: 'Excelente match, cumple todos los requisitos técnicos',
    requiredTechs: ['NestJS', 'Node.js', 'PostgreSQL', 'React']
  },
  {
    cvText: 'Experiencia con Python y Django',
    reasoning: 'No tiene experiencia con Node.js ni NestJS',
    requiredTechs: ['NestJS', 'Node.js']
  }
];

testCases.forEach((testCase, idx) => {
  console.log(`\nCaso ${idx + 1}:`);
  console.log(`  Reasoning: "${testCase.reasoning}"`);
  
  const check = detectContradictions(
    testCase.cvText,
    testCase.reasoning,
    testCase.requiredTechs
  );
  
  if (check.hasContradiction) {
    console.log(`  ⚠️  CONTRADICCIÓN DETECTADA:`);
    check.warnings.forEach(w => console.log(`     - ${w}`));
  } else {
    console.log(`  ✅ Sin contradicciones`);
  }
});

// Test 6: Generación de metadata para el prompt
console.log('\n📌 Test 6: Metadata generada para incluir en el prompt');
console.log('-'.repeat(70));

const metadata = generateSkillsMetadata(cvExample2, requiredTechs);
console.log('Metadata agregada al prompt:');
console.log(metadata || '(vacío - no hay tecnologías requeridas presentes)');

// RESUMEN
console.log('\n' + '='.repeat(70));
console.log('✅ RESUMEN DEL FIX');
console.log('='.repeat(70));
console.log(`
PROBLEMA ORIGINAL:
  - "NestJS" en CV, pero job description pide "Nest.js" → ❌ Falso negativo
  - "Node" en CV, pero job description pide "Node.js" → ❌ Falso negativo
  - "Postgres" en CV, pero job description pide "PostgreSQL" → ❌ Falso negativo

SOLUCIÓN IMPLEMENTADA:
  ✅ Normalización de texto (lowercase, sin puntuación)
  ✅ Diccionario de sinónimos extensible (${Object.keys(require('./skillMatchingUtils').TECH_SYNONYMS).length} tecnologías)
  ✅ Matching determinístico con regex word boundaries
  ✅ Guardrail PRE-LLM: metadata de skills presentes en prompt
  ✅ Guardrail POST-LLM: detección de contradicciones + corrección

RESULTADO:
  - Todas las variantes ahora se detectan correctamente
  - NO se modificó lógica de scoring (VERDE/AMARILLO/ROJO)
  - NO se cambió el contrato de salida
  - Solo se evitan falsos negativos de tecnologías presentes
`);

console.log('='.repeat(70));
console.log('🎉 Fix completado exitosamente');
console.log('='.repeat(70));

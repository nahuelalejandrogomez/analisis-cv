/**
 * Debug: Ver exactamente qué pasa con javascript
 */

const { normalizeText, buildTechVariants } = require('./src/services/skillMatchingUtils');

const reasoning = "Tiene SQL y Git pero no menciona Nest.js. AMARILLO";
const reasoningNormalized = normalizeText(reasoning);

console.log('Reasoning original:', reasoning);
console.log('Reasoning normalizado:', reasoningNormalized);
console.log('');

// Buscar "no menciona"
const pattern = 'no menciona';
const patternIndex = reasoningNormalized.indexOf(pattern);
console.log('Índice de "no menciona":', patternIndex);

const contextStart = Math.max(0, patternIndex - 40);
const contextEnd = Math.min(reasoningNormalized.length, patternIndex + pattern.length + 40);
const context = reasoningNormalized.slice(contextStart, contextEnd);
console.log('Contexto extraído:', `"${context}"`);
console.log('');

// Ver variantes de javascript
const jsVariants = buildTechVariants('javascript');
console.log('Variantes de javascript:', jsVariants);
console.log('');

// Verificar si cada variante está en el contexto
jsVariants.forEach(variant => {
  const escapedVariant = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escapedVariant}\\b`);
  const matches = regex.test(context);
  console.log(`  "${variant}" con \\b: ${matches ? '✅ MATCH' : '❌ NO MATCH'}`);
});

console.log('');

// Ver variantes de nestjs
const nestVariants = buildTechVariants('nestjs');
console.log('Variantes de nestjs:', nestVariants);
nestVariants.forEach(variant => {
  const escapedVariant = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escapedVariant}\\b`);
  const matches = regex.test(context);
  console.log(`  "${variant}" con \\b: ${matches ? '✅ MATCH' : '❌ NO MATCH'}`);
});

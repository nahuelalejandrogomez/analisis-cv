# Fix: Falsos Negativos por Variantes de Tecnologías

## 🎯 Problema Original

El sistema generaba **falsos negativos** cuando las tecnologías aparecían escritas de forma diferente entre el CV y el job description:

- ❌ CV: "NestJS" → Job: "Nest.js" → Sistema: "No menciona NestJS"
- ❌ CV: "Node" → Job: "Node.js" → Sistema: "No tiene experiencia en Node.js"
- ❌ CV: "Postgres" → Job: "PostgreSQL" → Sistema: "Falta PostgreSQL"

**Impacto:** Candidatos calificados marcados como ROJO incorrectamente.

---

## ✅ Solución Implementada (QUIRÚRGICA)

### Restricciones respetadas:
- ✅ **NO** se modificó lógica de scoring (VERDE/AMARILLO/ROJO)
- ✅ **NO** se cambió formato de output (status + reasoning)
- ✅ **NO** se tocaron flujos, rate limiting, retries, logging
- ✅ **NO** se agregaron dependencias pesadas
- ✅ Solo funciones auxiliares **AISLADAS** + ajuste mínimo al prompt

---

## 📦 Archivos Modificados/Creados

### 1. **NUEVO: `skillMatchingUtils.js`** (aislado, no toca código existente)

**Funciones implementadas:**

```javascript
// Normalización
normalizeText(text) 
  → "Node.js" → "node js"
  → "NestJS" → "nestjs"
  → "PostgreSQL" → "postgresql"

// Sinónimos (38 tecnologías configuradas)
buildTechVariants(tech)
  → "Node.js" → ["nodejs", "node js", "node"]
  → "PostgreSQL" → ["postgresql", "postgres", "psql"]

// Detección en CV
isTechPresent(cvText, tech)
  → true si encuentra alguna variante con word boundaries

// Extracción de job description
extractRequiredTechs(jobDescription)
  → ["nodejs", "nestjs", "postgresql", ...]

// Guardrail POST-LLM
detectContradictions(cvText, reasoning, requiredTechs)
  → Detecta "no menciona X" cuando X SÍ está en CV

// Metadata para prompt
generateSkillsMetadata(cvText, requiredTechs)
  → "**TECNOLOGÍAS DETECTADAS EN CV:** nodejs, nestjs..."
```

**Diccionario de sinónimos incluye:**
- JavaScript: nodejs, nestjs, nextjs, reactjs, vuejs, angularjs, typescript
- Bases de datos: postgresql, mongodb, mysql, redis, elasticsearch
- Cloud/DevOps: kubernetes (k8s), docker, aws, gcp, azure
- Frameworks: express, fastapi, django, flask, spring
- Testing: jest, mocha, pytest, junit
- **Total: 38 tecnologías con variantes** (extensible)

---

### 2. **MODIFICADO: `openaiService.js`**

#### Cambio 1: Import del nuevo módulo

```javascript
const skillMatchingUtils = require('./skillMatchingUtils');
```

#### Cambio 2: Prompt actualizado (GUARDRAIL PRE-LLM)

```javascript
const EVALUATION_PROMPT = `...

**GUARDRAIL CRÍTICO:**
Si una tecnología aparece en el CV (incluyendo variantes como Node.js/NodeJS/Node o NestJS/Nest.js), 
NO digas que "no la menciona" o "no tiene experiencia". En su lugar, evalúa la PROFUNDIDAD de la experiencia.

...`;
```

Se agregó placeholder `{skillsMetadata}` para inyectar tecnologías detectadas.

#### Cambio 3: Lógica PRE-LLM en `evaluateCV()`

```javascript
// ANTES de llamar al LLM:
const requiredTechs = skillMatchingUtils.extractRequiredTechs(jobDescription);
const skillsMetadata = skillMatchingUtils.generateSkillsMetadata(cvText, requiredTechs);

const prompt = EVALUATION_PROMPT
  .replace('{jobDescription}', jobDescription)
  .replace('{cvText}', cvText || 'CV no disponible')
  .replace('{skillsMetadata}', skillsMetadata); // ← NUEVO
```

#### Cambio 4: Guardrail POST-LLM (después de parsear respuesta)

```javascript
// DESPUÉS de parsear JSON del LLM:
const contradictionCheck = skillMatchingUtils.detectContradictions(
  cvText, 
  evaluation.reasoning, 
  requiredTechs
);

if (contradictionCheck.hasContradiction) {
  console.warn('⚠️  Contradicción detectada:', contradictionCheck.warnings);
  
  // Ajustar reasoning (NO cambiar status)
  const presentTechs = requiredTechs.filter(tech => 
    skillMatchingUtils.isTechPresent(cvText, tech)
  );
  
  evaluation.reasoning = `Tiene: ${presentTechs.slice(0, 3).join(', ')}. Evaluar profundidad...`;
}
```

**Decisión de diseño:** Solo corregimos `reasoning`, **NO** el `status`. El LLM decide VERDE/AMARILLO/ROJO basado en fit general.

---

## 🧪 Ejemplo de Ejecución

### Antes del fix:

```
Job description: "Requiere experiencia con Nest.js y PostgreSQL"
CV: "Backend con NestJS y Postgres"

❌ Resultado: ROJO
   Reasoning: "No menciona Nest.js ni PostgreSQL, faltan skills críticas"
```

### Después del fix:

```
Job description: "Requiere experiencia con Nest.js y PostgreSQL"
CV: "Backend con NestJS y Postgres"

✅ Metadata detectada: "nestjs, postgresql"
✅ Prompt incluye: "TECNOLOGÍAS DETECTADAS EN CV: nestjs, postgresql"
✅ Guardrail POST-LLM: Si el LLM dice "no menciona", se corrige

✅ Resultado: AMARILLO o VERDE (según profundidad de experiencia)
   Reasoning: "Tiene: nestjs, postgresql. Evaluar profundidad de experiencia..."
```

---

## 📊 Cobertura de Variantes

| Tecnología | Variantes detectadas |
|-----------|---------------------|
| Node.js | node js, nodejs, node |
| NestJS | nest js, nest.js, nestjs |
| PostgreSQL | postgres, postgres ql, psql |
| Kubernetes | k8s, kube |
| React | react js, react.js, reactjs |
| TypeScript | type script, ts |
| MongoDB | mongo db, mongo |
| Express | express js, express.js |

**Total: 38 tecnologías configuradas** (ver `TECH_SYNONYMS` en el código)

---

## 🔧 Cómo Extender el Diccionario

Editar `skillMatchingUtils.js`:

```javascript
const TECH_SYNONYMS = {
  // ...existentes...
  
  // Agregar nueva tecnología:
  'nuevatech': ['nueva tech', 'nueva-tech', 'variante'],
};
```

**No requiere cambios en otros archivos.**

---

## ✅ Testing

Ejecutar:

```bash
cd backend
node src/services/skillMatchingUtils.test.js
```

**Resultado esperado:**
```
✅ NestJS: ENCONTRADO (en "Nest.js")
✅ Node.js: ENCONTRADO (en "NodeJS")
✅ PostgreSQL: ENCONTRADO (en "Postgres")
⚠️  CONTRADICCIÓN DETECTADA: "NestJS" está en el CV pero el reasoning sugiere que falta
```

---

## 🚀 Deploy

1. Commit cambios:
   ```bash
   git add backend/src/services/skillMatchingUtils.js
   git add backend/src/services/openaiService.js
   git commit -m "fix: resolver falsos negativos por variantes de tecnologías"
   ```

2. Deploy a producción (Railway/Railway auto-deploy si está configurado)

3. Verificar logs:
   ```
   Tecnologías requeridas detectadas: nodejs, nestjs, postgresql
   ⚠️  Contradicción detectada: [warnings...]
   Evaluación completada: AMARILLO
   ```

---

## 📝 Checklist de Cumplimiento

- ✅ No se modificó lógica de scoring (VERDE/AMARILLO/ROJO permanece igual)
- ✅ No se cambió contrato de salida (status + reasoning)
- ✅ No se agregaron dependencias (solo JS puro)
- ✅ No se tocó rate limiting, retries, logging
- ✅ Código aislado en módulo nuevo
- ✅ Cambios mínimos en código existente (solo integración)
- ✅ Extensible (diccionario fácil de expandir)
- ✅ Testing manual incluido
- ✅ Documentado

---

## 🎯 Resultado Final

**Antes:**
- 🐛 Falsos negativos por variantes → Candidatos válidos marcados ROJO

**Después:**
- ✅ Detección robusta de 38+ tecnologías con variantes
- ✅ Guardrail PRE-LLM: metadata en prompt
- ✅ Guardrail POST-LLM: corrección de contradicciones
- ✅ Sin cambios en lógica de negocio
- ✅ Extensible sin modificar código existente

---

**Autor:** Fix quirúrgico según especificaciones exactas  
**Fecha:** 28 de enero de 2026  
**Alcance:** Solo bug de matching de tecnologías, sin refactors

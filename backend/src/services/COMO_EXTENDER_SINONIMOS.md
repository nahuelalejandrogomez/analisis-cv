# 📘 Cómo Extender el Diccionario de Sinónimos

## 🎯 Objetivo
Agregar nuevas tecnologías o variantes al sistema de matching sin tocar código de negocio.

---

## ⚡ Quick Start (2 minutos)

### 1️⃣ Abrir archivo
```bash
vim backend/src/services/skillMatchingUtils.js
```

### 2️⃣ Localizar el diccionario
Buscar la constante `TECH_SYNONYMS` (línea ~27)

### 3️⃣ Agregar nueva entrada
```javascript
const TECH_SYNONYMS = {
  // ...existentes...
  
  // Nueva tecnología
  'laravel': ['laravel', 'php laravel'],
  'tailwindcss': ['tailwind css', 'tailwind', 'tailwindcss'],
  'svelte': ['svelte js', 'svelte.js', 'svelte'],
};
```

### 4️⃣ Guardar y listo ✅

**No requiere:**
- ❌ Reiniciar servidor (Node.js carga en cada request)
- ❌ Modificar otros archivos
- ❌ Tests unitarios (opcional pero recomendado)

---

## 📐 Formato del Diccionario

### Estructura
```javascript
'forma_canonica': ['variante1', 'variante2', 'variante3']
```

### Reglas
1. **Forma canónica**: lowercase, sin espacios/puntos (será la referencia)
2. **Variantes**: todas las formas en que puede aparecer escrita
3. **Incluir la canónica** en las variantes (redundante pero más claro)

### Ejemplos

#### ✅ Correcto
```javascript
'nodejs': ['node js', 'node.js', 'node', 'nodejs']
'postgresql': ['postgres', 'postgres ql', 'psql']
'cicd': ['ci cd', 'ci/cd', 'continuous integration']
```

#### ❌ Incorrecto
```javascript
'Node.js': [...] // NO usar mayúsculas en canónico
'nodejs': ['Node.js', 'NodeJS'] // Redundante, la normalización ya lo maneja
```

---

## 🔍 Casos Comunes

### Lenguajes de programación
```javascript
'python': ['python', 'py'],
'golang': ['go lang', 'go', 'golang'],
'csharp': ['c sharp', 'c#', 'csharp'],
'cplusplus': ['c plus plus', 'c++', 'cpp'],
```

### Frameworks
```javascript
'symfony': ['symfony', 'php symfony'],
'blazor': ['blazor', 'blazor server', 'blazor wasm'],
'quarkus': ['quarkus', 'quarkus io'],
```

### Bases de datos
```javascript
'cassandra': ['cassandra', 'apache cassandra'],
'neo4j': ['neo4j', 'neo 4j'],
'couchdb': ['couch db', 'couchdb', 'apache couch'],
```

### Cloud providers
```javascript
'digitalocean': ['digital ocean', 'digitalocean', 'do'],
'heroku': ['heroku', 'salesforce heroku'],
'vercel': ['vercel', 'zeit now'],
```

---

## 🧪 Testing Manual

### 1️⃣ Crear archivo de test temporal
```javascript
// test-nuevo-tech.js
const { isTechPresent } = require('./skillMatchingUtils');

const cv = "Desarrollé apps con Laravel y TailwindCSS";

console.log('Laravel:', isTechPresent(cv, 'Laravel'));
console.log('Tailwind:', isTechPresent(cv, 'TailwindCSS'));
```

### 2️⃣ Ejecutar
```bash
node test-nuevo-tech.js
```

### 3️⃣ Resultado esperado
```
Laravel: true
Tailwind: true
```

---

## 🚨 Casos Especiales

### Tecnologías con caracteres raros
```javascript
// C++ → se normaliza automáticamente
'cplusplus': ['c plus plus', 'c++', 'cpp']

// C# → se normaliza automáticamente
'csharp': ['c sharp', 'c#', 'csharp']
```

### Acrónimos ambiguos
```javascript
// "Go" puede ser el lenguaje o verbo común
// Solución: confiar en el contexto del LLM
'golang': ['go lang', 'go', 'golang']

// Si hay falsos positivos, usar variantes más específicas
'golang': ['golang', 'go lang'] // Omitir "go" solo
```

### Tecnologías con múltiples nombres oficiales
```javascript
// Elasticsearch vs Elastic Search
'elasticsearch': ['elastic search', 'elasticsearch', 'elastic']

// Kubernetes vs K8s
'kubernetes': ['kubernetes', 'k8s', 'kube']
```

---

## 📊 Diccionario Actual (38 tecnologías)

### JavaScript Ecosystem (8)
- nodejs, nestjs, nextjs, reactjs, vuejs, angularjs, typescript, javascript

### Databases (6)
- postgresql, mongodb, mysql, mariadb, redis, elasticsearch

### Cloud & DevOps (5)
- kubernetes, docker, aws, gcp, azure

### Backend Frameworks (5)
- expressjs, fastapi, django, flask, spring

### Frontend (4)
- css3, html5, sass, webpack

### Testing (4)
- jest, mocha, pytest, junit

### Otros (6)
- github, gitlab, graphql, restapi, microservices, cicd

**Total: 38 tecnologías**

---

## 🔄 Workflow de Extensión

### Para agregar 1-3 tecnologías
1. Editar `TECH_SYNONYMS` directamente
2. Commit y push

### Para agregar >10 tecnologías
1. Crear branch: `git checkout -b feat/add-tech-synonyms`
2. Editar diccionario
3. Ejecutar test manual (opcional)
4. PR con descripción de tecnologías agregadas

---

## 💡 Tips

### Encontrar qué tecnologías agregar
```bash
# Buscar en logs de evaluaciones con contradicciones
grep "Contradicción detectada" logs/app.log

# Analizar job descriptions más comunes
psql -d dbname -c "SELECT DISTINCT requirements FROM jobs" | grep -oE '\b[A-Z][a-zA-Z]+\b'
```

### Validar cobertura
```bash
# Ejecutar test completo
node src/services/skillMatchingUtils.test.js

# Ver tecnologías NO cubiertas en un job description
node -e "
const { extractRequiredTechs } = require('./src/services/skillMatchingUtils');
const text = process.argv[1];
console.log(extractRequiredTechs(text));
" "Tu job description aquí"
```

---

## 📝 Checklist para Agregar Nueva Tecnología

- [ ] Investigar variantes comunes (Google, StackOverflow, LinkedIn)
- [ ] Agregar entrada en `TECH_SYNONYMS` (lowercase)
- [ ] Incluir variantes con puntos, guiones, espacios
- [ ] Test manual con CV de ejemplo
- [ ] Commit con mensaje: `feat: add synonyms for [tecnología]`
- [ ] (Opcional) Actualizar este README con la nueva tech

---

## 🆘 Troubleshooting

### "La tecnología no se detecta"
1. Verificar normalización: `normalizeText("Tu Tech")` → debe ser lowercase
2. Verificar regex word boundaries: "React Native" ≠ "React"
3. Agregar más variantes al diccionario

### "Detecta falsos positivos"
1. Usar variantes más específicas: `'golang': ['golang']` en vez de `['go']`
2. Verificar que no haya overlap con otras tecnologías

### "Necesito agregar 100+ tecnologías"
Considera cambiar a un approach basado en embeddings (fuera de scope de este fix).
Para <50 tecnologías, el diccionario es suficiente.

---

**Última actualización:** 28 de enero de 2026  
**Mantenido por:** Equipo de Backend

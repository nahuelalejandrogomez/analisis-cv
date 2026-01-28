#!/usr/bin/env node

/**
 * Script para limpiar la tabla de evaluations
 * 
 * USO:
 *   node scripts/clear-evaluations.js              # Borra todas las evaluaciones
 *   node scripts/clear-evaluations.js --confirm    # Sin confirmación interactiva
 */

require('dotenv').config();
const db = require('../src/config/database');
const readline = require('readline');

// Colores para terminal
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

async function getEvaluationsCount() {
  try {
    const result = await db.query('SELECT COUNT(*) as count FROM evaluations');
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error(`${colors.red}Error obteniendo conteo:${colors.reset}`, error.message);
    throw error;
  }
}

async function getEvaluationsStats() {
  try {
    const result = await db.query(`
      SELECT 
        evaluation_status,
        COUNT(*) as count
      FROM evaluations
      GROUP BY evaluation_status
      ORDER BY evaluation_status
    `);
    return result.rows;
  } catch (error) {
    console.error(`${colors.red}Error obteniendo estadísticas:${colors.reset}`, error.message);
    throw error;
  }
}

async function clearAllEvaluations() {
  try {
    const result = await db.query('DELETE FROM evaluations RETURNING *');
    return result.rowCount;
  } catch (error) {
    console.error(`${colors.red}Error borrando evaluaciones:${colors.reset}`, error.message);
    throw error;
  }
}

async function clearEvaluationsByStatus(status) {
  try {
    const result = await db.query(
      'DELETE FROM evaluations WHERE evaluation_status = $1 RETURNING *',
      [status]
    );
    return result.rowCount;
  } catch (error) {
    console.error(`${colors.red}Error borrando evaluaciones:${colors.reset}`, error.message);
    throw error;
  }
}

function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  console.log(`\n${colors.bold}${colors.blue}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}  🗑️  LIMPIEZA DE EVALUACIONES${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}═══════════════════════════════════════════════════${colors.reset}\n`);

  // Verificar DATABASE_URL
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('TU_DATABASE_URL')) {
    console.log(`${colors.red}${colors.bold}❌ Error: DATABASE_URL no está configurado en .env${colors.reset}`);
    console.log(`\n${colors.yellow}Por favor configura la variable DATABASE_URL en el archivo .env${colors.reset}`);
    console.log(`${colors.yellow}Ejemplo: DATABASE_URL=postgresql://user:pass@host:port/dbname${colors.reset}\n`);
    process.exit(1);
  }

  try {
    // Obtener estadísticas actuales
    const count = await getEvaluationsCount();
    
    if (count === 0) {
      console.log(`${colors.yellow}ℹ️  No hay evaluaciones en la base de datos.${colors.reset}\n`);
      process.exit(0);
    }

    console.log(`${colors.bold}📊 Estadísticas actuales:${colors.reset}`);
    const stats = await getEvaluationsStats();
    
    let total = 0;
    stats.forEach(stat => {
      const emoji = stat.evaluation_status === 'VERDE' ? '🟢' : 
                    stat.evaluation_status === 'AMARILLO' ? '🟡' : '🔴';
      console.log(`   ${emoji} ${stat.evaluation_status}: ${stat.count}`);
      total += parseInt(stat.count);
    });
    console.log(`   ${colors.bold}Total: ${total} evaluaciones${colors.reset}\n`);

    // Menú de opciones
    console.log(`${colors.bold}Opciones:${colors.reset}`);
    console.log(`  ${colors.green}1${colors.reset} - Borrar TODAS las evaluaciones (${total} registros)`);
    console.log(`  ${colors.green}2${colors.reset} - Borrar solo evaluaciones VERDES`);
    console.log(`  ${colors.green}3${colors.reset} - Borrar solo evaluaciones AMARILLAS`);
    console.log(`  ${colors.green}4${colors.reset} - Borrar solo evaluaciones ROJAS`);
    console.log(`  ${colors.green}0${colors.reset} - Cancelar\n`);

    // Verificar si hay flag --confirm
    const hasConfirmFlag = process.argv.includes('--confirm');
    
    let option;
    if (hasConfirmFlag) {
      option = '1'; // Por defecto borrar todo si hay --confirm
      console.log(`${colors.yellow}⚡ Modo auto: borrando todas las evaluaciones...${colors.reset}\n`);
    } else {
      option = await askQuestion(`${colors.bold}Selecciona una opción [0-4]:${colors.reset} `);
    }

    let deletedCount = 0;
    let action = '';

    switch (option.trim()) {
      case '1':
        if (!hasConfirmFlag) {
          const confirm = await askQuestion(
            `${colors.red}${colors.bold}⚠️  ¿Estás seguro de borrar TODAS las evaluaciones? (escribe 'SI' para confirmar):${colors.reset} `
          );
          if (confirm.toUpperCase() !== 'SI') {
            console.log(`\n${colors.yellow}❌ Operación cancelada.${colors.reset}\n`);
            process.exit(0);
          }
        }
        deletedCount = await clearAllEvaluations();
        action = 'todas las evaluaciones';
        break;

      case '2':
        deletedCount = await clearEvaluationsByStatus('VERDE');
        action = 'evaluaciones VERDES';
        break;

      case '3':
        deletedCount = await clearEvaluationsByStatus('AMARILLO');
        action = 'evaluaciones AMARILLAS';
        break;

      case '4':
        deletedCount = await clearEvaluationsByStatus('ROJO');
        action = 'evaluaciones ROJAS';
        break;

      case '0':
        console.log(`\n${colors.yellow}❌ Operación cancelada.${colors.reset}\n`);
        process.exit(0);
        break;

      default:
        console.log(`\n${colors.red}❌ Opción inválida.${colors.reset}\n`);
        process.exit(1);
    }

    console.log(`\n${colors.green}${colors.bold}✅ ${deletedCount} ${action} borradas exitosamente.${colors.reset}\n`);

    // Mostrar nuevo conteo
    const newCount = await getEvaluationsCount();
    console.log(`${colors.blue}📊 Evaluaciones restantes: ${newCount}${colors.reset}\n`);

  } catch (error) {
    console.error(`\n${colors.red}${colors.bold}❌ Error:${colors.reset}`, error.message, '\n');
    process.exit(1);
  } finally {
    // Cerrar conexión
    await db.pool.end();
  }
}

// Ejecutar
main();

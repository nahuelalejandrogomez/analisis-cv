/**
 * Script de debug para investigar por qué no trae CVs de Lever
 * Ejecutar con: node debug-lever-cv.js <opportunityId>
 */

require('dotenv').config();
const axios = require('axios');

const LEVER_API_BASE = 'https://api.lever.co/v1';
const opportunityId = process.argv[2];

if (!opportunityId) {
  console.error('❌ Debes proporcionar un opportunityId');
  console.error('Uso: node debug-lever-cv.js <opportunityId>');
  process.exit(1);
}

const leverApi = axios.create({
  baseURL: LEVER_API_BASE,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.LEVER_API_KEY}`
  }
});

async function debugLeverCV() {
  console.log('\n🔍 Investigando CVs para opportunity:', opportunityId);
  console.log('='.repeat(80));

  // 1. Revisar /resumes
  console.log('\n📄 1. Consultando /opportunities/{id}/resumes...');
  try {
    const resumesResponse = await leverApi.get(`/opportunities/${opportunityId}/resumes`);
    console.log('✅ Respuesta recibida de /resumes');
    console.log('Data array length:', resumesResponse.data.data?.length || 0);
    
    if (resumesResponse.data.data && resumesResponse.data.data.length > 0) {
      console.log('\n📋 Resumes encontrados:');
      resumesResponse.data.data.forEach((resume, idx) => {
        console.log(`\n  Resume #${idx + 1}:`);
        console.log('  - ID:', resume.id);
        console.log('  - File object:', JSON.stringify(resume.file, null, 4));
        console.log('  - Has parsedData:', !!resume.parsedData);
        console.log('  - CreatedAt:', resume.createdAt);
      });
    } else {
      console.log('⚠️  Array vacío o sin data');
    }
  } catch (error) {
    console.log('❌ Error en /resumes:', error.response?.status, error.message);
    if (error.response?.data) {
      console.log('Error data:', JSON.stringify(error.response.data, null, 2));
    }
  }

  // 2. Revisar /files
  console.log('\n📁 2. Consultando /opportunities/{id}/files...');
  try {
    const filesResponse = await leverApi.get(`/opportunities/${opportunityId}/files`);
    console.log('✅ Respuesta recibida de /files');
    console.log('Data array length:', filesResponse.data.data?.length || 0);
    
    if (filesResponse.data.data && filesResponse.data.data.length > 0) {
      console.log('\n📋 Files encontrados:');
      filesResponse.data.data.forEach((file, idx) => {
        console.log(`\n  File #${idx + 1}:`);
        console.log('  - ID:', file.id);
        console.log('  - Name:', file.name);
        console.log('  - DownloadUrl:', file.downloadUrl);
        console.log('  - Ext:', file.ext);
        console.log('  - Size:', file.size);
        console.log('  - CreatedAt:', file.createdAt);
        console.log('  - Full object:', JSON.stringify(file, null, 4));
      });
    } else {
      console.log('⚠️  Array vacío o sin data');
    }
  } catch (error) {
    console.log('❌ Error en /files:', error.response?.status, error.message);
    if (error.response?.data) {
      console.log('Error data:', JSON.stringify(error.response.data, null, 2));
    }
  }

  // 3. Revisar opportunity details
  console.log('\n👤 3. Consultando /opportunities/{id}...');
  try {
    const oppResponse = await leverApi.get(`/opportunities/${opportunityId}`);
    const opp = oppResponse.data.data;
    console.log('✅ Opportunity encontrada');
    console.log('  - Name:', opp.name);
    console.log('  - Email:', opp.emails?.[0]);
    console.log('  - Stage:', opp.stage?.text);
    console.log('  - Has archived resumes?:', opp.archived?.resumes?.length || 0);
  } catch (error) {
    console.log('❌ Error en /opportunities:', error.response?.status, error.message);
  }

  console.log('\n' + '='.repeat(80));
  console.log('🏁 Debug completado\n');
}

debugLeverCV().catch(err => {
  console.error('💥 Error fatal:', err.message);
  process.exit(1);
});

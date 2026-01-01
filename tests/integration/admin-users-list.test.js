/**
 * Test de integración: Verificar que la vista de administrador incluye todos los usuarios
 * 
 * Este test se conecta a la base de datos real (entorno de desarrollo) y verifica que:
 * 1. Un usuario ADMIN puede obtener todos los usuarios
 * 2. La función usuarios.list() devuelve todos los usuarios esperados
 * 3. No hay usuarios faltantes debido a límites de paginación
 * 
 * Para ejecutar:
 *   node --experimental-modules tests/integration/admin-users-list.test.js
 *   o
 *   npm run test:integration
 * 
 * Requisitos:
 *   - Variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY configuradas
 *   - Un usuario ADMIN autenticado (email y password en variables de entorno)
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Función para cargar variables de entorno desde archivos .env
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  try {
    const envContent = readFileSync(filePath, 'utf-8');
    const envVars = {};
    envContent.split('\n').forEach(line => {
      // Ignorar comentarios y líneas vacías
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return;
      }

      // Parsear KEY=VALUE
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();

        // Remover comillas si existen
        if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        envVars[key] = value;
      }
    });
    return envVars;
  } catch (e) {
    console.warn(`⚠️  No se pudo leer ${filePath}:`, e.message);
    return {};
  }
}

// Cargar variables de entorno desde archivos .env (en orden de prioridad)
const projectRoot = join(__dirname, '../..');
const envFiles = [
  join(projectRoot, '.env.local'),  // Prioridad más alta
  join(projectRoot, '.env'),        // Prioridad media
];

let loadedEnvVars = {};
for (const envFile of envFiles) {
  const vars = loadEnvFile(envFile);
  loadedEnvVars = { ...loadedEnvVars, ...vars };
}

// Aplicar variables de entorno (las del sistema tienen prioridad sobre las del archivo)
Object.assign(process.env, loadedEnvVars);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Error: Variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY son requeridas');
  console.error('\n💡 Soluciones:');
  console.error('   1. Crear un archivo .env en la raíz del proyecto con:');
  console.error('      VITE_SUPABASE_URL=tu_url_de_supabase');
  console.error('      VITE_SUPABASE_ANON_KEY=tu_clave_anon');
  console.error('   2. O exportar las variables en tu shell:');
  console.error('      export VITE_SUPABASE_URL=tu_url_de_supabase');
  console.error('      export VITE_SUPABASE_ANON_KEY=tu_clave_anon');
  console.error('   3. O usar .env.local (tiene prioridad sobre .env)\n');
  process.exit(1);
}

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.warn('⚠️  Advertencia: TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD no están configurados.');
  console.warn('   El test intentará ejecutarse pero puede fallar si se requiere autenticación.');
}

/**
 * Replica la lógica de usuarios.list() con paginación
 * para verificar que se obtienen todos los usuarios
 */
async function getAllUsersWithPagination(supabase) {
  const PAGE_SIZE = 1000;
  let allData = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error, count } = await supabase
      .from('profiles')
      .select('id, full_name, role, profesor_asignado_id, is_active, created_at, updated_at', { count: 'exact' })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    if (data && data.length > 0) {
      allData = allData.concat(data);
      from += PAGE_SIZE;
      hasMore = data.length === PAGE_SIZE && (count === null || allData.length < count);
    } else {
      hasMore = false;
    }
  }

  return allData;
}

async function runTest() {
  console.log('🧪 Iniciando test de integración: Verificación de lista de usuarios para administrador\n');

  // Crear cliente de Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Autenticar como administrador si las credenciales están disponibles
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      });

      if (authError) {
        console.error('❌ Error al autenticar:', authError.message);
        console.log('   Continuando sin autenticación...\n');
      } else {
        console.log(`✅ Autenticado como: ${ADMIN_EMAIL}\n`);
      }
    } catch (error) {
      console.error('❌ Error al autenticar:', error.message);
      console.log('   Continuando sin autenticación...\n');
    }
  }

  // Obtener el conteo total de usuarios directamente desde Supabase
  // (para comparar con el resultado de la API)
  let totalUsersFromDB = 0;
  try {
    const { count, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.warn('⚠️  No se pudo obtener el conteo total desde la BD:', countError.message);
    } else {
      totalUsersFromDB = count || 0;
      console.log(`📊 Total de usuarios en la base de datos: ${totalUsersFromDB}\n`);
    }
  } catch (error) {
    console.warn('⚠️  Error al obtener conteo:', error.message);
  }

  // Obtener usuarios usando paginación (replicando la lógica de remoteDataAPI)
  console.log('📋 Obteniendo usuarios con paginación (replicando remoteDataAPI.usuarios.list())...\n');

  let usersFromAPI = [];
  let apiError = null;

  try {
    usersFromAPI = await getAllUsersWithPagination(supabase);
    console.log(`✅ API devolvió ${usersFromAPI.length} usuarios\n`);
  } catch (error) {
    apiError = error;
    console.error('❌ Error al obtener usuarios desde la API:', error.message);
    console.error('   Detalles:', error);
  }

  // Verificaciones
  console.log('🔍 Realizando verificaciones...\n');
  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
  };

  // Verificación 1: La API devolvió usuarios
  if (apiError) {
    console.log('❌ FALLO: La API no pudo obtener usuarios');
    results.failed++;
  } else if (usersFromAPI.length === 0) {
    console.log('⚠️  ADVERTENCIA: La API devolvió 0 usuarios');
    results.warnings++;
  } else {
    console.log(`✅ PASO: La API devolvió ${usersFromAPI.length} usuarios`);
    results.passed++;
  }

  // Verificación 2: Comparar con el conteo de la BD
  if (totalUsersFromDB > 0) {
    if (usersFromAPI.length === totalUsersFromDB) {
      console.log(`✅ PASO: El número de usuarios coincide con la BD (${usersFromAPI.length})`);
      results.passed++;
    } else {
      console.log(`❌ FALLO: Discrepancia en el número de usuarios`);
      console.log(`   API: ${usersFromAPI.length}, BD: ${totalUsersFromDB}`);
      console.log(`   Faltan ${totalUsersFromDB - usersFromAPI.length} usuarios`);
      results.failed++;
    }
  } else {
    console.log('⚠️  ADVERTENCIA: No se pudo obtener el conteo de la BD para comparar');
    results.warnings++;
  }

  // Verificación 3: Verificar que hay usuarios de diferentes roles
  const rolesCount = {};
  usersFromAPI.forEach(user => {
    // La consulta directa devuelve 'role', pero también puede venir 'rolPersonalizado' si se normaliza
    const role = (user.rolPersonalizado || user.role || 'DESCONOCIDO').toUpperCase();
    rolesCount[role] = (rolesCount[role] || 0) + 1;
  });

  console.log('\n📊 Distribución de usuarios por rol:');
  Object.entries(rolesCount).forEach(([role, count]) => {
    console.log(`   ${role}: ${count}`);
  });

  if (Object.keys(rolesCount).length >= 2) {
    console.log('✅ PASO: Se encontraron usuarios de múltiples roles');
    results.passed++;
  } else {
    console.log('⚠️  ADVERTENCIA: Solo se encontraron usuarios de un rol (puede ser normal)');
    results.warnings++;
  }

  // Verificación 4: Verificar que todos los usuarios tienen campos requeridos
  // Nota: La consulta directa devuelve 'role' (no 'rolPersonalizado' que es el campo normalizado)
  const usersWithMissingFields = usersFromAPI.filter(user => {
    return !user.id || (!user.role && !user.rolPersonalizado);
  });

  if (usersWithMissingFields.length === 0) {
    console.log('✅ PASO: Todos los usuarios tienen campos requeridos (id, role/rolPersonalizado)');
    results.passed++;
  } else {
    console.log(`❌ FALLO: ${usersWithMissingFields.length} usuarios tienen campos faltantes`);
    if (usersWithMissingFields.length <= 5) {
      usersWithMissingFields.forEach(user => {
        console.log(`   - Usuario ID: ${user.id}, tiene role: ${!!user.role}, tiene rolPersonalizado: ${!!user.rolPersonalizado}`);
      });
    }
    results.failed++;
  }

  // Verificación 5: Verificar paginación (si hay más de 1000 usuarios)
  if (usersFromAPI.length >= 1000) {
    console.log('✅ PASO: La paginación está funcionando (más de 1000 usuarios obtenidos)');
    results.passed++;
  } else if (totalUsersFromDB > 1000 && usersFromAPI.length < totalUsersFromDB) {
    console.log('❌ FALLO: La paginación no está funcionando correctamente');
    console.log(`   Se esperaban ${totalUsersFromDB} usuarios pero solo se obtuvieron ${usersFromAPI.length}`);
    results.failed++;
  }

  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN DEL TEST');
  console.log('='.repeat(60));
  console.log(`✅ Pruebas pasadas: ${results.passed}`);
  console.log(`❌ Pruebas fallidas: ${results.failed}`);
  console.log(`⚠️  Advertencias: ${results.warnings}`);
  console.log('='.repeat(60) + '\n');

  if (results.failed > 0) {
    console.log('❌ EL TEST FALLÓ\n');
    process.exit(1);
  } else if (results.warnings > 0 && results.passed === 0) {
    console.log('⚠️  EL TEST COMPLETÓ CON ADVERTENCIAS\n');
    process.exit(0);
  } else {
    console.log('✅ EL TEST PASÓ EXITOSAMENTE\n');
    process.exit(0);
  }
}

// Ejecutar el test
runTest().catch(error => {
  console.error('❌ Error fatal en el test:', error);
  process.exit(1);
});


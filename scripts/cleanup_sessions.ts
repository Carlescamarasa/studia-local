
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Manual .env.local parsing since dotenv is not available
const envPath = path.resolve(process.cwd(), '.env.local');
let envConfig: Record<string, string> = {};

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes if present
            envConfig[key] = value;
        }
    });
}

const supabaseUrl = envConfig.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = envConfig.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupSessions() {
    console.log('Starting session cleanup...');

    // 1. Fetch all sessions
    const { data: sessions, error: fetchError } = await supabase
        .from('registros_sesion')
        .select('id, duracion_real_seg, calificacion, registros_bloque(id)');

    if (fetchError) {
        console.error('Error fetching sessions:', fetchError);
        return;
    }

    console.log(`Fetched ${sessions.length} total sessions.`);

    const sessionsToDelete = [];

    for (const session of sessions) {
        const duration = session.duracion_real_seg || 0;
        const rating = session.calificacion;
        const blockCount = session.registros_bloque ? session.registros_bloque.length : 0;

        // Criteria for deletion:
        // 1. Duration is 0 AND Block count is 0 (Ghost session)
        // 2. Rating is null (Incomplete session, though we might want to keep if it has blocks/duration)
        // Let's be conservative: Delete if (Duration 0 AND Blocks 0) OR (Rating is NULL AND Duration 0)

        if ((duration === 0 && blockCount === 0) || (rating === null && duration === 0)) {
            sessionsToDelete.push(session.id);
        }
    }

    console.log(`Found ${sessionsToDelete.length} sessions to delete.`);

    if (sessionsToDelete.length > 0) {
        const { error: deleteError } = await supabase
            .from('registros_sesion')
            .delete()
            .in('id', sessionsToDelete);

        if (deleteError) {
            console.error('Error deleting sessions:', deleteError);
        } else {
            console.log('Successfully deleted invalid sessions.');
        }
    } else {
        console.log('No sessions to delete.');
    }

    console.log('Cleanup complete.');
}

cleanupSessions();

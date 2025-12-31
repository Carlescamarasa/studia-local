
import { localDataClient } from '../src/api/localDataClient';
import { RegistrosBloqueAPI } from '../src/data/registrosBloqueClient';
import { Bloque, RegistroBloque } from '../src/features/shared/types/domain';

async function migrateSkills() {
    console.log("Starting Value Migration: Skills to RegistrosBloque...");

    // 1. Fetch all Bloques (Source of Truth)
    const bloques = await localDataClient.entities.Bloque.list() as Bloque[];
    console.log(`Loaded ${bloques.length} Bloque definitions.`);

    // Create a lookup map: code -> skillTags[]
    const bloqueMap = new Map<string, string[]>();
    bloques.forEach(b => {
        if (b.code) {
            bloqueMap.set(b.code, b.skillTags || []);
        }
    });

    // 2. Fetch all RegistrosBloque
    const registros = await localDataClient.entities.RegistroBloque.list() as RegistroBloque[];
    console.log(`Loaded ${registros.length} RegistroBloque records.`);

    let updatedCount = 0;
    const batchUpdates: RegistroBloque[] = [];

    // 3. Iterate and Update
    for (const reg of registros) {
        // Skip if already has full skills (though we might want to refresh them?)
        // Let's assume we want to backfill missing ones.
        if (reg.skills && reg.skills.length > 0) continue;

        const skills = bloqueMap.get(reg.code);

        if (skills && skills.length > 0) {
            // Found skills!
            const updatedReg = { ...reg, skills: skills };
            batchUpdates.push(updatedReg);
            updatedCount++;
        }
    }

    if (updatedCount === 0) {
        console.log("No records needed updating.");
        return;
    }

    console.log(`Found ${updatedCount} records to update. Saving...`);

    // 4. Save Updates (Using bulk or individual)
    // LocalDataClient might not have a public bulkUpdate, so we might need to iterate.
    // However, for speed with local storage, direct array manipulation and single save is better if we had access.
    // Since we are using the API, let's try to be efficient.

    // NOTE: For local data, the underlying storage is just a JSON file or LocalStorage key.
    // Calling update() 1000 times might be slow.
    // But let's stick to the API contract.

    // Limit concurrency
    const chunks = chunkArray(batchUpdates, 10);
    let proceed = 0;

    for (const chunk of chunks) {
        await Promise.all(chunk.map(r => RegistrosBloqueAPI.updateRegistroBloque(r.id, { skills: r.skills })));
        proceed += chunk.length;
        if (proceed % 50 === 0) console.log(`Processed ${proceed}/${updatedCount}...`);
    }

    console.log("Migration completed successfully!");
}

function chunkArray<T>(array: T[], size: number): T[][] {
    const chunked_arr = [];
    for (let i = 0; i < array.length; i += size) {
        chunked_arr.push(array.slice(i, i + size));
    }
    return chunked_arr;
}

// Execute
migrateSkills().catch(console.error);

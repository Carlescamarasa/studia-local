
import { localDataClient } from './src/api/localDataClient';

async function debugRegistroBloque() {
    console.log("Fetching RegistrosBloque...");
    try {
        // Fetch a few blocks directly
        const blocks = await localDataClient.entities.RegistroBloque.list();
        if (blocks.length > 0) {
            console.log("Found", blocks.length, "blocks.");
            const sample = blocks.find(b => b.estado === 'completado');
            if (sample) {
                console.log("Sample Completed Block:", JSON.stringify(sample, null, 2));
            } else {
                console.log("No completed blocks found in list.");
                if (blocks[0]) console.log("First block (any status):", JSON.stringify(blocks[0], null, 2));
            }
        } else {
            console.log("No blocks found.");
        }
    } catch (e) {
        console.error("Error fetching blocks:", e);
    }
}

debugRegistroBloque();

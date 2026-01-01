
import { localDataClient } from '../src/api/localDataClient.js';
import { StudiaUser } from '../src/features/shared/types/domain.js';

async function seedPracticeData() {
    try {
        console.log('Seeding practice data...');

        // Get the first student (or specific one if known)
        const students = await localDataClient.entities.User.list();
        const student = students.find((s: StudiaUser) => s.email === 'trompetasonara@gmail.com') || students[0];

        if (!student) {
            console.error('No student found');
            return;
        }

        console.log(`Seeding for student: ${student.full_name} (${student.id})`);

        // Create a completed block for yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const blockData = {
            alumnoId: student.id,
            fecha: yesterday.toISOString(),
            estado: 'completado',
            completadoEn: yesterday.toISOString(),
            tipo: 'tecnica',
            ppmObjetivo: { bpm: 100 },
            ppmAlcanzado: { bpm: 100 }, // 100% performance -> 100 XP base
            duracion: 300,
            bloqueId: 'synthetic-block-1' // Mock ID
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await localDataClient.entities.RegistroBloque.create(blockData as any);
        console.log('Created synthetic block for yesterday');

        // Create another one for today
        const today = new Date();
        const blockData2 = {
            alumnoId: student.id,
            fecha: today.toISOString(),
            estado: 'completado',
            completadoEn: today.toISOString(),
            tipo: 'flexibilidad',
            ppmObjetivo: { bpm: 80 },
            ppmAlcanzado: { bpm: 80 },
            duracion: 300,
            bloqueId: 'synthetic-block-2'
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await localDataClient.entities.RegistroBloque.create(blockData2 as any);
        console.log('Created synthetic block for today');

        console.log('Done!');
    } catch (error) {
        console.error('Error seeding data:', error);
    }
}

seedPracticeData();

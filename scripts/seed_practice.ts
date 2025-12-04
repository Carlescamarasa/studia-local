
import { localDataClient } from '../src/api/localDataClient.js';

async function seedPracticeData() {
    try {
        console.log('Seeding practice data...');

        // Get the first student (or specific one if known)
        const students = await localDataClient.entities.User.list();
        const student = students.find((s: any) => s.email === 'trompetasonara@gmail.com') || students[0];

        if (!student) {
            console.error('No student found');
            return;
        }

        console.log(`Seeding for student: ${student.nombre} (${student.id})`);

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

        await localDataClient.entities.RegistroBloque.create(blockData);
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

        await localDataClient.entities.RegistroBloque.create(blockData2);
        console.log('Created synthetic block for today');

        console.log('Done!');
    } catch (error) {
        console.error('Error seeding data:', error);
    }
}

seedPracticeData();

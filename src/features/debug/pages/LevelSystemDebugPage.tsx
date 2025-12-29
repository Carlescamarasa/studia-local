import React, { useState, useEffect } from 'react';
import { computePracticeXP, canPromote, computeKeyCriteriaStatus } from '@/utils/levelLogic';
import { localDataClient } from '@/api/localDataClient';
import { Button } from '@/features/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/components/ds/Card';

export default function LevelSystemDebug() {
    const [logs, setLogs] = useState([]);
    const [running, setRunning] = useState(false);

    const log = (msg, type = 'info') => {
        setLogs(prev => [...prev, { msg, type, time: new Date().toLocaleTimeString() }]);
    };

    const runTests = async () => {
        setRunning(true);
        setLogs([]);
        log('Starting Level System Verification...', 'info');

        try {
            // 1. Setup Mock Data
            log('Setting up mock data...', 'info');

            // Ensure Level 2 Config exists
            const level2Config = {
                level: 2,
                min_xp_flex: 10,
                min_xp_motr: 10,
                min_xp_art: 10,
                min_eval_sound: 5,
                min_eval_cog: 5,
                evidence_window_days: 30
            };

            // We can't easily mock the DB return without modifying the client, 
            // but we can ensure the data exists in the local DB if we are in dev mode.
            // Or we can just test the functions assuming data is there or handling empty.

            // Let's try to create a config if missing
            const configs = await localDataClient.entities.LevelConfig.list();
            if (!configs.find(c => c.level === 2)) {
                await localDataClient.entities.LevelConfig.create(level2Config);
                log('Created Level 2 Config', 'success');
            } else {
                log('Level 2 Config exists', 'success');
            }

            // 2. Test XP Calculation
            // We need a student ID. Let's pick the first one or current user.
            const users = await localDataClient.entities.User.list();
            const student = users[0];

            if (!student) {
                log('No students found to test', 'error');
                return;
            }

            log(`Testing with student: ${student.email} (${student.id})`, 'info');

            const xp = await computePracticeXP(student.id, 30);
            log(`XP Calculated: Flex=${xp.flex}, Motr=${xp.motr}, Art=${xp.art}`, 'info');

            // 3. Test Criteria Status
            const criteria = await computeKeyCriteriaStatus(student.id, 2);
            log(`Criteria for Level 2: ${criteria.length} items`, 'info');
            criteria.forEach(c => {
                log(`- ${c.criterion.description}: ${c.status}`, 'info');
            });

            // 4. Test Promotion Eligibility
            const check = await canPromote(student.id, 1); // Assuming checking for promotion FROM level 1 TO level 2
            log(`Promotion Check to Level 2: ${check.allowed ? 'ALLOWED' : 'DENIED'}`, check.allowed ? 'success' : 'warning');

            if (!check.allowed) {
                log('Missing Requirements:', 'warning');
                check.missing.forEach(m => log(`- ${m}`, 'warning'));
            }

            log('Verification Complete', 'success');

        } catch (error) {
            log(`Error: ${error.message}`, 'error');
            console.error(error);
        } finally {
            setRunning(false);
        }
    };

    return (
        <div className="p-8 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Level System Debug & Verification</CardTitle>
                </CardHeader>
                <CardContent>
                    <Button onClick={runTests} disabled={running}>
                        {running ? 'Running...' : 'Run Verification Tests'}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Logs</CardTitle>
                </CardHeader>
                <CardContent className="bg-black text-green-400 font-mono text-xs p-4 rounded h-96 overflow-y-auto">
                    {logs.map((l, i) => (
                        <div key={i} className={`mb-1 ${l.type === 'error' ? 'text-red-400' : l.type === 'warning' ? 'text-yellow-400' : l.type === 'success' ? 'text-green-400' : 'text-gray-300'}`}>
                            <span className="opacity-50">[{l.time}]</span> {l.msg}
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}

/**
 * Database Tests - Connection and query validation
 */

import { supabase } from '@/lib/supabaseClient';
import { createTestResult, createAction, createEvidence, type TestContext, type TestResult } from '../testContract';

/**
 * Database Connection & Query Test
 * Validates Supabase database connection
 */
export async function testDatabaseConnection(ctx: TestContext): Promise<TestResult> {
    const startTime = Date.now();

    try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

        const checks: any[] = [];
        const actions: any[] = [];

        // Check env vars
        checks.push({
            check: 'VITE_SUPABASE_URL',
            value: supabaseUrl ? `${supabaseUrl.substring(0, 40)}...` : 'NOT SET',
            status: supabaseUrl ? 'ok' : 'fail'
        });

        checks.push({
            check: 'VITE_SUPABASE_ANON_KEY',
            value: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'NOT SET',
            status: supabaseAnonKey ? 'ok' : 'fail'
        });

        if (!supabaseUrl || !supabaseAnonKey) {
            actions.push(createAction(
                'Set Supabase environment variables',
                'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env file',
                { file: '.env' }
            ));

            return createTestResult({
                id: 'db-connection',
                title: 'Database Connection & Query',
                status: 'fail',
                severity: 'critical',
                whyItMatters: 'Without database connection, the app cannot function',
                metrics: {},
                evidence: createEvidence('Missing Supabase configuration', checks),
                actions,
                duration: Date.now() - startTime
            });
        }

        // Try a simple query
        const queryStart = Date.now();
        const { data, error, count } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: false })
            .limit(1);

        const queryDuration = Date.now() - queryStart;

        if (error) {
            checks.push({
                check: 'Query profiles table',
                value: `Error: ${error.message}`,
                status: 'fail'
            });

            actions.push(createAction(
                'Check database permissions',
                'Verify that the anon key has access to the profiles table',
                { link: `${supabaseUrl}/project/_/auth/policies` }
            ));

            actions.push(createAction(
                'Verify table exists',
                'Check that the profiles table exists in your Supabase database',
                { link: `${supabaseUrl}/project/_/editor` }
            ));

            return createTestResult({
                id: 'db-connection',
                title: 'Database Connection & Query',
                status: 'fail',
                severity: 'critical',
                whyItMatters: 'Database query failed - app cannot read data',
                metrics: {
                    responseTime: queryDuration,
                    error: error.message
                },
                evidence: createEvidence('Database query failed', checks),
                actions,
                duration: Date.now() - startTime,
                debug: error
            });
        }

        checks.push({
            check: 'Query profiles table',
            value: `Success (${queryDuration}ms)`,
            status: 'ok'
        });

        checks.push({
            check: 'Profiles count',
            value: count !== null ? `${count} profile(s)` : 'Unknown',
            status: 'ok'
        });

        return createTestResult({
            id: 'db-connection',
            title: 'Database Connection & Query',
            status: 'pass',
            severity: 'critical',
            whyItMatters: 'Database connection is essential for all app functionality',
            metrics: {
                responseTime: queryDuration,
                profilesCount: count || 0,
                supabaseUrl: `${supabaseUrl.substring(0, 40)}...`
            },
            evidence: createEvidence(
                `Database connected successfully. Query took ${queryDuration}ms.`,
                checks
            ),
            actions: [],
            duration: Date.now() - startTime
        });

    } catch (error: any) {
        return createTestResult({
            id: 'db-connection',
            title: 'Database Connection & Query',
            status: 'fail',
            severity: 'critical',
            whyItMatters: 'Database connection is essential for all app functionality',
            evidence: createEvidence(`Exception: ${error.message}`, []),
            actions: [
                createAction('Check network connection', 'Ensure you can reach Supabase servers'),
                createAction('Verify Supabase project', 'Check that your Supabase project is active'),
                createAction('Check environment variables', 'Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
            ],
            duration: Date.now() - startTime,
            debug: error
        });
    }
}

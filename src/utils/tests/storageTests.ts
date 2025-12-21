/**
 * Storage Tests - Actionable storage configuration and functionality tests
 */

import { supabase } from '@/lib/supabaseClient';
import { createTestResult, createAction, createEvidence, type TestContext, type TestResult } from '../testContract';

/**
 * Storage Config Sanity Check
 * Validates Supabase storage configuration and provides actionable steps
 */
export async function testStorageConfig(ctx: TestContext): Promise<TestResult> {
    const startTime = Date.now();
    const bucketName = 'media'; // Hardcoded bucket name used in the app

    try {
        // Get config from env
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

        const checks: Array<Record<string, any>> = [];
        const actions: any[] = [];
        let bucketExists = false;
        let canListBuckets = false;

        // Check 1: Supabase URL
        checks.push({
            check: 'Supabase URL',
            value: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'NOT SET',
            status: supabaseUrl ? 'ok' : 'fail'
        });

        if (!supabaseUrl) {
            actions.push(createAction(
                'Set VITE_SUPABASE_URL',
                'Add VITE_SUPABASE_URL to your .env file',
                { file: '.env' }
            ));
        }

        // Check 2: Anon Key
        checks.push({
            check: 'Anon Key',
            value: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'NOT SET',
            status: supabaseAnonKey ? 'ok' : 'fail'
        });

        if (!supabaseAnonKey) {
            actions.push(createAction(
                'Set VITE_SUPABASE_ANON_KEY',
                'Add VITE_SUPABASE_ANON_KEY to your .env file',
                { file: '.env' }
            ));
        }

        // Check 3: Try to list buckets
        try {
            const { data: buckets, error: listError } = await supabase.storage.listBuckets();

            if (listError) {
                checks.push({
                    check: 'List Buckets Permission',
                    value: `Error: ${listError.message}`,
                    status: 'warn'
                });

                actions.push(createAction(
                    'Check storage permissions',
                    'Storage policies may restrict bucket listing. This is OK if bucket exists.',
                    { link: `${supabaseUrl}/project/_/storage/policies` }
                ));
            } else {
                canListBuckets = true;
                checks.push({
                    check: 'List Buckets Permission',
                    value: `${buckets?.length || 0} buckets found`,
                    status: 'ok'
                });

                // Check if our bucket exists
                bucketExists = buckets?.some(b => b.name === bucketName) || false;
            }
        } catch (error: any) {
            checks.push({
                check: 'List Buckets Permission',
                value: `Exception: ${error.message}`,
                status: 'fail'
            });
        }

        // Check 4: Bucket exists
        checks.push({
            check: `Bucket '${bucketName}' exists`,
            value: bucketExists ? 'YES' : 'NOT FOUND',
            status: bucketExists ? 'ok' : 'fail'
        });

        if (!bucketExists) {
            const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'YOUR_PROJECT';

            actions.push(createAction(
                `Create bucket '${bucketName}' in Supabase`,
                `1. Go to Supabase Dashboard → Storage\n2. Click "New bucket"\n3. Name: ${bucketName}\n4. Set to Public if users need direct access`,
                { link: `https://app.supabase.com/project/${projectId}/storage/buckets` }
            ));

            actions.push(createAction(
                'Verify bucket name in code',
                `Check if bucket should be named differently. Currently hardcoded as '${bucketName}'`,
                { file: 'src/utils/tests/storageTests.ts', command: `grep -r "storage.from" src/` }
            ));
        }

        // Determine status
        const status = !supabaseUrl || !supabaseAnonKey || !bucketExists ? 'fail' : 'pass';
        const severity = !bucketExists ? 'critical' : 'high';

        return createTestResult({
            id: 'storage-config',
            title: 'Storage Configuration Sanity',
            status,
            severity,
            whyItMatters: 'Without storage, users cannot upload or download files (videos, images, documents)',
            metrics: {
                supabaseUrl: supabaseUrl ? `${supabaseUrl.substring(0, 40)}...` : 'NOT SET',
                bucketName,
                bucketExists: bucketExists ? 'YES' : 'NO',
                canListBuckets: canListBuckets ? 'YES' : 'NO'
            },
            evidence: createEvidence(
                bucketExists
                    ? `Storage configured correctly. Bucket '${bucketName}' exists.`
                    : `Storage bucket '${bucketName}' not found. Users cannot upload/download files.`,
                checks
            ),
            actions,
            duration: Date.now() - startTime
        });

    } catch (error: any) {
        return createTestResult({
            id: 'storage-config',
            title: 'Storage Configuration Sanity',
            status: 'fail',
            severity: 'critical',
            whyItMatters: 'Without storage, users cannot upload or download files',
            metrics: {},
            evidence: createEvidence(
                `Error checking storage: ${error.message}`,
                [{ error: error.message, stack: error.stack }]
            ),
            actions: [
                createAction('Check Supabase connection', 'Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'),
                createAction('Check network', 'Ensure you can reach Supabase servers')
            ],
            duration: Date.now() - startTime,
            debug: error
        });
    }
}

/**
 * Storage Upload/Download Roundtrip Test
 * Tests actual file upload, download, and cleanup
 */
export async function testStorageRoundtrip(ctx: TestContext): Promise<TestResult> {
    const startTime = Date.now();
    const bucketName = 'media';
    const testFileName = `test-${Date.now()}.txt`;
    const testContent = 'Studia test file';

    try {
        const checks: Array<Record<string, any>> = [];
        const actions: any[] = [];

        // Step 1: Upload
        const testFile = new Blob([testContent], { type: 'text/plain' });
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(testFileName, testFile);

        if (uploadError) {
            checks.push({ step: 'Upload', status: 'fail', detail: uploadError.message });

            actions.push(createAction(
                'Check upload permissions',
                'Verify storage policies allow uploads',
                { link: `https://app.supabase.com/project/_/storage/policies` }
            ));

            return createTestResult({
                id: 'storage-roundtrip',
                title: 'Upload/Download Roundtrip',
                status: 'fail',
                severity: 'high',
                whyItMatters: 'Users need to upload files for the app to function',
                evidence: createEvidence('Upload failed', checks),
                actions,
                duration: Date.now() - startTime
            });
        }

        checks.push({ step: 'Upload', status: 'ok', detail: `Uploaded ${testFileName}` });

        // Step 2: Download
        const { data: downloadData, error: downloadError } = await supabase.storage
            .from(bucketName)
            .download(testFileName);

        if (downloadError) {
            checks.push({ step: 'Download', status: 'fail', detail: downloadError.message });

            // Cleanup uploaded file
            await supabase.storage.from(bucketName).remove([testFileName]);

            return createTestResult({
                id: 'storage-roundtrip',
                title: 'Upload/Download Roundtrip',
                status: 'fail',
                severity: 'high',
                whyItMatters: 'Users need to download files',
                evidence: createEvidence('Download failed', checks),
                actions: [
                    createAction('Check download permissions', 'Verify storage policies allow downloads')
                ],
                duration: Date.now() - startTime
            });
        }

        checks.push({ step: 'Download', status: 'ok', detail: `Downloaded ${downloadData.size} bytes` });

        // Step 3: Cleanup
        const { error: removeError } = await supabase.storage
            .from(bucketName)
            .remove([testFileName]);

        if (removeError) {
            checks.push({ step: 'Cleanup', status: 'warn', detail: removeError.message });
        } else {
            checks.push({ step: 'Cleanup', status: 'ok', detail: 'Test file removed' });
        }

        return createTestResult({
            id: 'storage-roundtrip',
            title: 'Upload/Download Roundtrip',
            status: 'pass',
            severity: 'high',
            whyItMatters: 'Validates that file upload/download works end-to-end',
            metrics: {
                uploadedBytes: testFile.size,
                downloadedBytes: downloadData.size,
                fileName: testFileName
            },
            evidence: createEvidence('Storage roundtrip successful', checks),
            actions: [],
            duration: Date.now() - startTime
        });

    } catch (error: any) {
        return createTestResult({
            id: 'storage-roundtrip',
            title: 'Upload/Download Roundtrip',
            status: 'fail',
            severity: 'high',
            whyItMatters: 'File upload/download is critical for app functionality',
            evidence: createEvidence(`Error: ${error.message}`, []),
            actions: [
                createAction('Check storage configuration', 'Run Storage Config test first'),
                createAction('Check storage policies', 'Verify RLS policies in Supabase')
            ],
            duration: Date.now() - startTime,
            debug: error
        });
    }
}

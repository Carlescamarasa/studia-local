/**
 * Storage Tests - Actionable storage configuration and functionality tests
 */

import { supabase } from '@/lib/supabaseClient';
import { MEDIA_BUCKET_NAME, uploadFile, deleteFile } from '@/lib/storageUpload';
import { createTestResult, createAction, createEvidence, type TestContext, type TestResult } from '../testContract';

/**
 * Storage Config Sanity Check
 * Validates Supabase storage configuration and provides actionable steps
 */
export async function testStorageConfig(ctx: TestContext): Promise<TestResult> {
    const startTime = Date.now();
    const bucketName = MEDIA_BUCKET_NAME;

    try {
        const checks: Array<Record<string, any>> = [];
        const actions: any[] = [];

        // Check 0: Session Existence
        // Tests run in clean context, so we must verify we have a user
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
            return createTestResult({
                id: 'storage-config',
                title: 'Storage Configuration Sanity',
                status: 'fail',
                severity: 'critical',
                whyItMatters: 'Storage operations require an authenticated user.',
                metrics: { session: 'NONE' },
                evidence: createEvidence(
                    'No active session found. Please log in before running storage tests.',
                    [{ error: sessionError?.message || 'No session' }]
                ),
                actions: [
                    createAction('Log in', 'Sign in to the application to run authenticated tests')
                ],
                duration: Date.now() - startTime
            });
        }

        // Get config from env
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

        let bucketExists = false;
        let canListObjects = false;
        let smokeTestOk = false;
        let publicUrlGenerated = '';

        // Check 1: Supabase Config
        checks.push({
            check: 'Supabase URL & Key',
            value: (supabaseUrl && supabaseAnonKey) ? 'OK' : 'MISSING',
            status: (supabaseUrl && supabaseAnonKey) ? 'ok' : 'fail'
        });

        // Check 2: Smart Bucket Detection (replacing listBuckets)
        // We try to list a folder. The error tells us if bucket is missing or if we just lack permissions.
        try {
            const { data: files, error: listObjError } = await supabase.storage
                .from(bucketName)
                .list('ejercicios', { limit: 1 });

            if (listObjError) {
                // Analyze error to infer bucket existence
                const msg = listObjError.message?.toLowerCase() || '';

                // "The resource was not found" usually means bucket missing in Supabase storage context
                // "Bucket not found" is explicit
                if (msg.includes('not found') || msg.includes('bucket not found')) {
                    bucketExists = false;
                    checks.push({
                        check: `Bucket '${bucketName}' Exists`,
                        value: 'NO (Not Found)',
                        status: 'fail',
                        detail: `Error: ${listObjError.message}`
                    });
                } else if (msg.includes('jwt') || msg.includes('permission') || msg.includes('policy') || listObjError.name === 'StorageApiError') {
                    // Security error implies bucket exists but we can't list
                    bucketExists = true;
                    canListObjects = false;

                    checks.push({
                        check: `Bucket '${bucketName}' Exists`,
                        value: 'YES (Inferred)',
                        status: 'ok',
                        detail: 'Exists, but listing denied by headers/policies (Normal for RLS)'
                    });

                    checks.push({
                        check: 'List Objects Permission',
                        value: 'DENIED',
                        status: 'warn',
                        detail: `Error: ${listObjError.message}`
                    });
                } else {
                    // Unknown error
                    bucketExists = false; // Pessimistic
                    checks.push({
                        check: `Bucket '${bucketName}' Status`,
                        value: 'ERROR',
                        status: 'fail',
                        detail: `Unexpected error: ${listObjError.message}`
                    });
                }
            } else {
                // Success
                bucketExists = true;
                canListObjects = true;
                checks.push({
                    check: `Bucket '${bucketName}' Exists`,
                    value: 'YES',
                    status: 'ok'
                });
                checks.push({
                    check: 'List Objects Permission',
                    value: 'OK',
                    status: 'ok',
                    detail: `${files?.length || 0} items found`
                });
            }
        } catch (e: any) {
            checks.push({
                check: 'Bucket Interaction',
                value: `Exception: ${e.message}`,
                status: 'fail'
            });
        }

        if (!bucketExists) {
            const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'YOUR_PROJECT';
            actions.push(createAction(
                `Create bucket '${bucketName}'`,
                `The bucket '${bucketName}' seems to be missing. Create it in Supabase Storage.`,
                { link: `https://app.supabase.com/project/${projectId}/storage/buckets` }
            ));
        }

        // Check 3: Smoke Test (Upload -> PublicUrl -> Fetch -> Delete)
        // Only run if we think bucket exists
        if (bucketExists) {
            // Use a valid 1x1 PNG image to pass file type validation (vs text/plain)
            const sanityFileName = `sanity_${Date.now()}.png`;

            // 1x1 Transparent PNG
            const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

            // Convert base64 to Blob
            const byteCharacters = atob(base64Png);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/png' });

            // Create File object consistent with what the app expects
            const file = new File([blob], sanityFileName, { type: 'image/png' });

            try {
                // A. Upload using helper
                // Note: uploadFile expects a path prefix. It will generate a name like: ejercicios/_sanity/<ts>_<rnd>_<name>
                const uploadResult = await uploadFile(file, 'ejercicios/_sanity');

                if (!uploadResult.success) {
                    const errMsg = uploadResult.error || 'Unknown error';
                    throw new Error(`Upload failed: ${errMsg}`);
                }

                // If success, we have the path and url
                const uploadedPath = uploadResult.path!; // e.g. ejercicios/_sanity/...
                publicUrlGenerated = uploadResult.url || '';

                if (!publicUrlGenerated) {
                    throw new Error('Upload succeeded but no Public URL returned');
                }

                // B. Fetch (HEAD) to verify public access
                const response = await fetch(publicUrlGenerated, { method: 'HEAD' });
                if (!response.ok) {
                    // Clean up before throwing
                    await deleteFile(uploadedPath);
                    throw new Error(`Public URL not reachable (Status: ${response.status})`);
                }

                // C. Cleanup
                const deleteResult = await deleteFile(uploadedPath);
                if (!deleteResult.success) {
                    checks.push({
                        check: 'Cleanup',
                        value: 'WARN',
                        status: 'warn',
                        detail: `Could not delete test file: ${deleteResult.error}`
                    });
                }

                smokeTestOk = true;
                checks.push({
                    check: 'Smoke Test (Upload/Read/Delete)',
                    value: 'OK',
                    status: 'ok',
                    detail: `Verified via ${publicUrlGenerated}`
                });

            } catch (e: any) {
                const msg = e.message?.toLowerCase() || '';

                let blame = 'Permissions/Policies';
                if (msg.includes('not found')) blame = 'Bucket Missing?';

                checks.push({
                    check: 'Smoke Test',
                    value: `FAILED (${blame})`,
                    status: 'fail',
                    detail: e.message
                });

                if (msg.includes('new row violates row-level security policy') || msg.includes('permission denied')) {
                    actions.push(createAction(
                        'Check RLS Policies',
                        'Upload failed due to permissions. Check Storage Policies for INSERT/SELECT.',
                        { link: `${supabaseUrl}/project/_/storage/policies` }
                    ));
                }
            }
        }

        // Determine Final Status
        // Pass if bucket inferred existent AND smoke test passed
        // OR if bucket existent AND smoke test failed purely on fetch (network?) but upload worked? 
        // Let's be strict: Smoke test must pass for full green.

        const status = bucketExists && smokeTestOk ? 'pass' : 'fail';
        const severity = !bucketExists ? 'critical' : 'high';

        return createTestResult({
            id: 'storage-config',
            title: 'Storage Configuration Sanity',
            status,
            severity,
            whyItMatters: 'Ensures media assets (images, pdfs) can be reliably stored and accessed.',
            metrics: {
                bucketName,
                bucketExists: bucketExists ? 'YES' : 'NO',
                canListObjects: canListObjects ? 'YES' : 'NO/DENIED',
                smokeTest: smokeTestOk ? 'PASS' : 'FAIL'
            },
            evidence: createEvidence(
                status === 'pass'
                    ? `Storage active. Bucket '${bucketName}' validated via smoke test.`
                    : `Issues detected with bucket '${bucketName}'.`,
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
            whyItMatters: 'System error during storage check',
            metrics: { bucketName: MEDIA_BUCKET_NAME },
            evidence: createEvidence(
                `Critical exception: ${error.message}`,
                [{ error: error.message, stack: error.stack }]
            ),
            actions: [
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
 * (Kept for compatibility, though Config test now covers most of this)
 */
export async function testStorageRoundtrip(ctx: TestContext): Promise<TestResult> {
    // Re-use logic or deprecate? 
    // The user didn't ask to remove it, but Config test covers it better now.
    // Let's keep it but simplified or just wrapping the config test?
    // User requirement was "Cambia src/utils/tests/storageTests.ts", implied mainly the config test part.
    // But since we have robust logic now, let's just make this one also robust or leave as is (it used hardcoded 'media' before).
    // I will update it to at least use MEDIA_BUCKET_NAME.

    const startTime = Date.now();
    const bucketName = MEDIA_BUCKET_NAME;
    const testFileName = `roundtrip-${Date.now()}.txt`;
    const testContent = 'Studia roundtrip test';

    try {
        const checks: Array<Record<string, any>> = [];

        // 0. Session check
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return createTestResult({
                id: 'storage-roundtrip',
                title: 'Upload/Download Roundtrip',
                status: 'fail',
                severity: 'critical',
                whyItMatters: 'Authentication required',
                evidence: createEvidence('No active session', []),
                actions: [],
                duration: Date.now() - startTime
            });
        }

        // Step 1: Upload (Raw supabase)
        const testFile = new Blob([testContent], { type: 'text/plain' });
        const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(testFileName, testFile);

        if (uploadError) {
            return createTestResult({
                id: 'storage-roundtrip',
                title: 'Upload/Download Roundtrip',
                status: 'fail',
                severity: 'high',
                whyItMatters: 'Upload failed',
                evidence: createEvidence(`Upload failed: ${uploadError.message}`, [{ error: uploadError }]),
                actions: [],
                duration: Date.now() - startTime
            });
        }
        checks.push({ step: 'Upload', status: 'ok' });

        // Step 2: Download
        const { data: downloadData, error: downloadError } = await supabase.storage
            .from(bucketName)
            .download(testFileName);

        if (downloadError) {
            // Cleanup
            await supabase.storage.from(bucketName).remove([testFileName]);
            return createTestResult({
                id: 'storage-roundtrip',
                title: 'Upload/Download Roundtrip',
                status: 'fail',
                severity: 'high',
                whyItMatters: 'Download failed',
                evidence: createEvidence(`Download failed: ${downloadError.message}`, [{ error: downloadError }]),
                actions: [],
                duration: Date.now() - startTime
            });
        }
        checks.push({ step: 'Download', status: 'ok', size: downloadData.size });

        // Step 3: Cleanup
        await supabase.storage.from(bucketName).remove([testFileName]);
        checks.push({ step: 'Cleanup', status: 'ok' });

        return createTestResult({
            id: 'storage-roundtrip',
            title: 'Upload/Download Roundtrip',
            status: 'pass',
            severity: 'high',
            whyItMatters: 'Full roundtrip verified',
            metrics: { bucketName },
            evidence: createEvidence('Roundtrip successful', checks),
            actions: [],
            duration: Date.now() - startTime
        });

    } catch (e: any) {
        return createTestResult({
            id: 'storage-roundtrip',
            title: 'Upload/Download Roundtrip',
            status: 'fail',
            severity: 'high',
            whyItMatters: 'Exception',
            evidence: createEvidence(`Error: ${e.message}`, []),
            actions: [],
            duration: Date.now() - startTime
        });
    }
}

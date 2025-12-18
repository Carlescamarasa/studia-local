/**
 * Fetch the server's current version from /version.json
 * @param {number} timeoutMs - Timeout in ms (default 4000)
 * @returns {Promise<{versionName: string, commit: string, author: string, buildDate: string} | null>}
 */
export async function getServerVersion(timeoutMs = 4000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const url = `/version.json?ts=${Date.now()}`;
        const response = await fetch(url, {
            cache: 'no-store',
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.warn('[getServerVersion] Failed to fetch version.json:', response.status);
            return null;
        }

        const data = await response.json();

        // Validate required fields
        if (!data.versionName || !data.commit) {
            console.warn('[getServerVersion] Invalid version.json format:', data);
            return null;
        }

        return {
            versionName: data.versionName,
            commit: data.commit,
            author: data.author || 'unknown',
            buildDate: data.buildDate || null,
        };
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            console.warn('[getServerVersion] Request timed out');
        } else {
            console.warn('[getServerVersion] Fetch error:', error.message);
        }
        return null;
    }
}

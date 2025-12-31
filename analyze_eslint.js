const fs = require('fs');
try {
    const content = fs.readFileSync('eslint.json', 'utf8');
    if (!content) { console.log('Empty file'); process.exit(0); }
    const results = JSON.parse(content);
    // Sort by total problems (errors + warnings)
    results.sort((a, b) => (b.errorCount + b.warningCount) - (a.errorCount + a.warningCount));

    console.log('Top 10 Files by Problem Count:');
    results.slice(0, 10).forEach(r => {
        // Filter for no-unused-vars specifically if possible? 
        // The user summary wanted "no-unused-vars".
        // Let's count no-unused-vars specifically.
        const unused = r.messages.filter(m => m.ruleId && (m.ruleId.includes('no-unused-vars') || m.ruleId.includes('no-unused-expression'))).length;
        console.log(`${r.errorCount + r.warningCount} (Unused: ${unused}) - ${r.filePath}`);
    });
} catch (e) {
    console.error(e);
}

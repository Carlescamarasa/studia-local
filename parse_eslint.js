import fs from 'fs';

try {
    const content = fs.readFileSync('eslint_report.json', 'utf8');
    const results = JSON.parse(content);

    results.forEach(result => {
        const unescaped = result.messages.filter(m => m.ruleId === 'react-hooks/exhaustive-deps');
        if (unescaped.length > 0) {
            console.log(`File: ${result.filePath}`);
            const fileContent = fs.readFileSync(result.filePath, 'utf-8').split('\n');
            unescaped.forEach(m => {
                const lineContent = fileContent[m.line - 1].trim();
                console.log(`  Line ${m.line}: ${m.message}`);
                console.log(`    Code: ${lineContent}`);
            });
        }
    });

} catch (e) {
    console.error("Error parsing JSON:", e);
}

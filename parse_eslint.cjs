const fs = require('fs');
const report = JSON.parse(fs.readFileSync('eslint_report.json', 'utf8'));

const ruleToFilter = '@typescript-eslint/no-unused-vars';
const results = [];

report.forEach(file => {
    const unusedVars = file.messages.filter(msg => msg.ruleId === ruleToFilter);
    if (unusedVars.length > 0) {
        results.push({
            filePath: file.filePath,
            count: unusedVars.length
        });
    }
});

results.sort((a, b) => b.count - a.count);

console.log('Top Files with Unused Vars:');
results.slice(0, 20).forEach(res => {
    console.log(`${res.count}: ${res.filePath}`);
});

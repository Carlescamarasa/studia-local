import json
from collections import Counter

with open('eslint_report_after.json', 'r') as f:
    data = json.load(f)

rule_counts = Counter()
file_counts = Counter()

total_warnings = 0
for entry in data:
    for message in entry['messages']:
        if message['severity'] == 1: # Warning
            rule_counts[message['ruleId']] += 1
            file_counts[entry['filePath']] += 1
            total_warnings += 1

print(f"Total Warnings: {total_warnings}")
print("\nWarnings by Rule:")
for rule, count in rule_counts.most_common():
    print(f"{rule}: {count}")

unused_vars_files = Counter()
for entry in data:
    for message in entry['messages']:
        if message['ruleId'] == '@typescript-eslint/no-unused-vars' and message['severity'] == 1:
            unused_vars_files[entry['filePath']] += 1

print("\nTop 10 Files with most @typescript-eslint/no-unused-vars:")
for filepath, count in unused_vars_files.most_common(10):
    print(f"{filepath}: {count}")

print("\nTop 10 Files with most total warnings:")
for filepath, count in file_counts.most_common(10):
    print(f"{filepath}: {count}")

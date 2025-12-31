import json


try:
    with open('lint_report_phase4_check2.json', 'r') as f:
        content = f.read()
    
    start_index = content.find('[')
    if start_index == -1:
        print("No JSON found")
        exit(1)
        
    data = json.loads(content[start_index:])



    any_types = []
    ban_ts_comment = []
    empty_object = []

    for file in data:
        path = file['filePath']
        for msg in file['messages']:
            rule = msg.get('ruleId')
            if rule == '@typescript-eslint/no-explicit-any':
                any_types.append(f"{path}:{msg['line']}")
            elif rule == '@typescript-eslint/ban-ts-comment':
                ban_ts_comment.append(f"{path}:{msg['line']}")
            elif rule == '@typescript-eslint/no-empty-object-type':
                empty_object.append(f"{path}:{msg['line']}")

    print("=== NO EXPLICIT ANY (" + str(len(any_types)) + ") ===")
    for p in any_types[:10]:
        print(p)

    print("\n=== BAN TS COMMENT (" + str(len(ban_ts_comment)) + ") ===")
    for o in ban_ts_comment[:10]:
        print(o)

    print("\n=== NO EMPTY OBJECT (" + str(len(empty_object)) + ") ===")
    for o in empty_object[:10]:
        print(o)


except Exception as e:
    print(e)

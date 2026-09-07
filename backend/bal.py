import sys

def analyze(path):
    s = open(path, encoding='utf-8').read()
    stack = []
    pairs = {')': '(', '}': '{', ']': '[' }
    for i, ch in enumerate(s):
        if ch in '({[':
            stack.append((ch, i))
        elif ch in ')}]':
            expect = pairs[ch]
            if not stack or stack[-1][0] != expect:
                print('MISMATCH at char', i, 'line', s.count('\n', 0, i) + 1, 'unexpected', repr(ch), 'stack-top', stack[-1] if stack else None)
                if stack:
                    stack.pop()
            else:
                stack.pop()
    for ch, i in stack:
        print('UNCLOSED', repr(ch), 'at char', i, 'line', s.count('\n', 0, i) + 1)

analyze(sys.argv[1])
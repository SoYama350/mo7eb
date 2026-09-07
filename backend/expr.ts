import { readFileSync } from 'fs';
const s = readFileSync(process.argv[2]!, 'utf8');
const stack: { c: string; i: number }[] = [];
const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
for (let i =  0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '(' || ch === '[' || ch === '{') stack.push({ c: ch, i });
    else if (ch === ')' || ch === ']' || ch === '}') {
        const top = stack.pop();
        if (!top || top.c !== pairs[ch]) {
            const line = s.slice(0, i).split('\n').length;
            console.log(`MISMATCH line ${line} char ${i} got ${ch} want ${top ? top.c : 'nothing'}`);
        }
    }
    // count braces separately when mismatch appears
    if (ch === '}') {
        let o = 0;
        for (let j =  0; j <= i; j++) if (s[j] === '{') o++;
        if (o ===  0) console.log(`  ^ orphan '}' at line ${s.slice(0, i).split('\n').length}`);
    }
}
for (const t of stack) console.log(`UNCLOSED ${t.c} at char ${t.i} line ${s.slice(0, t.i).split('\n').length}`);
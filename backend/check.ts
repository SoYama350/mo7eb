import { readFileSync } from 'fs';
const s = readFileSync(process.argv[2]!, 'utf8');
const count = (c: string) => s.split(c).length - 1;
console.log(`lineas=${s.split('\n').length} paren(${count('(')}/${count(')')}) brace(${count('{')}/${count('}')}) brackets(${count('[')}/${count(']')})`);
console.log(/[\u4e00-\u9fff\uff01-\uffee\u3000-\u303f]/.test(s) ? 'CJK FOUND' : 'no-cjk');
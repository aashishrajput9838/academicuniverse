console.log('TEST START');
const x: any = 123;
console.log('typeof x:', typeof x);
console.log('x.replace is function?', typeof x.replace === 'function');
try {
  const result = x.replace(/a/, 'b');
  console.log('replace succeeded:', result);
} catch (err) {
  console.error('replace failed:', err);
}
console.log('TEST END');

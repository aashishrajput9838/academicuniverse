import fs from 'fs';
import path from 'path';

const filePath = path.join(__dirname, '..', 'dataset', 'Category_1_Marksheets', 'MS_PILOT_001.png');
console.log('Testing file:', filePath, 'Exists:', fs.existsSync(filePath));
if (fs.existsSync(filePath)) {
  const buf = fs.readFileSync(filePath);
  console.log('File size:', buf.length, 'bytes');
  console.log('Header string:', buf.toString('utf-8'));
}

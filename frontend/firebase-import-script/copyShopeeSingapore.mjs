// Run without --apply first. Only the two explicitly named Singapore collections can be written.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, runTransaction, Timestamp } from 'firebase/firestore';
import { buildVariantMapping, copySingaporeRows } from '../src/lib/shopeeSingapore.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2).filter(a => a !== '--apply');
if (args.length !== 2) throw new Error('Pass Malaysia.xlsx and Singapore.xlsx paths, optionally --apply.');
const env = Object.fromEntries(fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/).filter(l => l.includes('=')).map(l => {
  const i = l.indexOf('=');
  return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^['"]|['"]$/g, '')];
}));
const db = getFirestore(initializeApp({ apiKey: env.VITE_FIREBASE_API_KEY, projectId: env.VITE_FIREBASE_PROJECT_ID }));
const readSheet = filename => {
  const workbook = XLSX.readFile(filename);
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
  if (rows[2]?.[2] !== 'Variation ID' || rows[2]?.[5] !== 'SKU') throw new Error('Unexpected spreadsheet columns');
  return rows.slice(6).filter(r => r[0]);
};
const mapping = buildVariantMapping(...args.map(readSheet));
const pairs = [
  ['shopeeProdActPriceCalc', 'shopeeSingaporeProdActPriceCalc'],
  ['shopeeOrgProductInfo', 'shopeeSingaporeOrgProductInfo'],
];
const read = async name => (await getDocs(collection(db, name))).docs.map(d => ({ ...d.data(), _docId: d.id })).sort((a,b) => a._docId.localeCompare(b._docId));
const hash = rows => crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex');
const output = path.join(root, 'singapore-migration.local');
fs.mkdirSync(output, { recursive: true });
const plans = [];
for (const [source, target] of pairs) {
  if ((await read(target)).length) throw new Error(`${target} is not empty; refusing to overwrite.`);
  const original = await read(source);
  if (!original.length) throw new Error(`${source} is empty; aborting.`);
  const result = copySingaporeRows(original, mapping);
  fs.writeFileSync(path.join(output, `${source}.before.json`), JSON.stringify(original, null, 2));
  fs.writeFileSync(path.join(output, `${target}.json`), JSON.stringify(result.rows, null, 2));
  plans.push({ source, target, originalHash: hash(original), ...result });
}
const report = plans.map(({ source, target, originalHash, rows, changed, unresolved }) => ({ source, target, originalHash, count: rows.length, changed, unresolved }));
fs.writeFileSync(path.join(output, 'mapping-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.map(({ unresolved, ...r }) => ({ ...r, unresolved: unresolved.length })), null, 2));
if (process.argv.includes('--apply')) {
  for (const plan of plans) {
    if (hash(await read(plan.source)) !== plan.originalHash) throw new Error('Source changed since preview; retry with a fresh preview.');
  }
  for (const plan of plans) {
    if (!pairs.some(([, target]) => target === plan.target)) throw new Error('Forbidden destination');
    for (let i = 0; i < plan.rows.length; i += 200) {
      const chunk = plan.rows.slice(i, i + 200);
      await runTransaction(db, async transaction => {
        const refs = chunk.map(row => doc(db, plan.target, row._docId));
        const existing = await Promise.all(refs.map(ref => transaction.get(ref)));
        if (existing.some(snapshot => snapshot.exists())) throw new Error('Destination record exists; refusing overwrite');
        chunk.forEach((row, index) => {
          const { _docId, _localId, _updatedAt, ...data } = row;
          transaction.set(refs[index], { ...data, _updatedAt: Timestamp.now() });
        });
      });
    }
    const saved = await read(plan.target);
    const clean = row => { const { _localId, _updatedAt, ...data } = row; return data; };
    const canonical = value => JSON.stringify(value, Object.keys(value).sort());
    if (saved.length !== plan.rows.length || saved.some((row,i) => canonical(clean(row)) !== canonical(clean(plan.rows[i])))) throw new Error('Destination verification failed');
    console.log(`Verified ${plan.target}: ${saved.length} records`);
  }
  for (const plan of plans) {
    if (hash(await read(plan.source)) !== plan.originalHash) throw new Error('Source changed during migration; review source snapshot.');
    console.log(`Verified unchanged source: ${plan.source}`);
  }
}
process.exit(0);

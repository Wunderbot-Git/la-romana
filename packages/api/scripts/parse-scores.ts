/**
 * Script to parse the score sheets from the Excel file
 * Run with: npx ts-node scripts/parse-scores.ts
 */

import * as XLSX from 'xlsx';
import * as path from 'path';

const EXCEL_PATH = path.join(__dirname, '../../../Ryder Par 00 (2) copy.xlsx');

function main() {
    console.log('Reading Excel file:', EXCEL_PATH);
    const workbook = XLSX.readFile(EXCEL_PATH);

    // Parse Front9_Scores
    console.log('\n=== Front9_Scores Sheet ===');
    const front9Sheet = workbook.Sheets['Front9_Scores'];
    const front9Raw = XLSX.utils.sheet_to_json(front9Sheet, { header: 1 }) as unknown[][];

    console.log('Number of rows:', front9Raw.length);
    console.log('\nFirst 20 rows:');
    for (let i = 0; i < Math.min(20, front9Raw.length); i++) {
        console.log(`Row ${i}:`, front9Raw[i]?.slice(0, 15));
    }

    // Parse Back9_Scores
    console.log('\n\n=== Back9_Scores Sheet ===');
    const back9Sheet = workbook.Sheets['Back9_Scores'];
    const back9Raw = XLSX.utils.sheet_to_json(back9Sheet, { header: 1 }) as unknown[][];

    console.log('Number of rows:', back9Raw.length);
    console.log('\nFirst 20 rows:');
    for (let i = 0; i < Math.min(20, back9Raw.length); i++) {
        console.log(`Row ${i}:`, back9Raw[i]?.slice(0, 15));
    }
}

main();

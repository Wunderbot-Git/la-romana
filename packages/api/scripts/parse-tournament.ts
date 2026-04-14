/**
 * Script to parse the Ryder Par 00 Excel file and output seed data
 * Run with: npx ts-node scripts/parse-tournament.ts
 */

import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const EXCEL_PATH = path.join(__dirname, '../../../Ryder Par 00 (2) copy.xlsx');

interface PlayerData {
    name: string;
    handicap: number;
    team: 'red' | 'blue';
}

interface FlightData {
    name: string;
    redPlayers: string[];
    bluePlayers: string[];
}

interface ScoreData {
    playerName: string;
    hole: number;
    grossScore: number;
}

function parseExcel() {
    console.log('Reading Excel file:', EXCEL_PATH);

    if (!fs.existsSync(EXCEL_PATH)) {
        console.error('File not found:', EXCEL_PATH);
        process.exit(1);
    }

    const workbook = XLSX.readFile(EXCEL_PATH);

    console.log('\nAll Sheet names:', workbook.SheetNames);

    const possibleSheets = workbook.SheetNames.filter(n => n.includes('Score') || n.includes('Back') || n.includes('Scramble'));
    console.log('\nRelevant Sheets:', possibleSheets);

    possibleSheets.forEach(name => {
        console.log(`\n--- Sheet: ${name} ---`);
        const sheet = workbook.Sheets[name];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (json.length > 0) {
            console.log('Header:', json[0]);
            console.log('First Row:', json[1]);
        }
    });
}

parseExcel();

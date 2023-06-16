import fs from 'fs';
import csvParser from 'csv-parser';

const filePath = './villes_france.csv';

const readableStream = fs.createReadStream(filePath, 'utf-8');

const cities: string[] = [];

readableStream.pipe(csvParser())
    .on('data', (row: any) => {
        if (row['618'] > 5000) {
            cities.push(row['Ozan']);
        }
    })
    .on('end', () => {
        const jsonData = JSON.stringify(cities, null, 2);
        fs.writeFile('cities.json', jsonData, 'utf-8', (err) => {
            if (err) {
                console.error('Error writing JSON file:', err);
            } else {
                console.log('JSON file written successfully.');
            }
        });
    })
    .on('error', (error: Error) => {
        console.error('Error parsing CSV file:', error);
    });
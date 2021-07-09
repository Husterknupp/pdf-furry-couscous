#!/usr/bin/env node

const yargs = require('yargs/yargs');
const {
    hideBin,
} = require('yargs/helpers'); /* hide meta args (https://nodejs.org/en/knowledge/command-line/how-to-parse-command-line-arguments/) */

const { sync } = require('glob');

const { copyFileSync, statSync, renameSync, unlinkSync } = require('fs');
const { execSync } = require('child_process');

// Todo
//  Using book pages, bt don't n'up them doesn't allow different trimmings for odd/even
//  Using book pages, bt don't halve and n'up them will print on portrait A4
// Todo (aus Todos.txt Datei)
//  Leerzeichen durch ___ ersetzen, aber Ende zurück (skript geht nicht, aber mit mode vermutlich egal)
//  Fix für nur eine Seite

function parseArguments(argsRaw) {
    return yargs(argsRaw)
        .option('file-glob', {
            alias: 'f',
            type: 'string' /* array, boolean, count, number, string */,
            description:
                "is the file, e.g. input.pdf or '*.pdf' (sort multiple files oldest first)",
            default: 'input.pdf',
        })
        .option('scale-factor', {
            alias: 's',
            type: 'number',
            description: 'apply zoom to input file',
            default: 1,
        })
        .option('halve', {
            alias: 'h',
            type: 'boolean',
            description: 'is needed(!) to halve scans with two pages',
            default: false,
        })
        .option('trim', {
            alias: 't',
            type: 'number',
            description: 'trims the pages and moves them towards the fold line (in cm)',
            default: 0,
        })
        .option('n-up', {
            alias: 'n',
            type: 'number',
            description:
                'will n-up pages in the end (number of columns)' /* https://en.wikipedia.org/wiki/N-up */,
            default: 1,
            choices: [1, 2],
        })
        .wrap(110 /* give --help examples some space */)
        .example([
            ["$0 -f '*.pdf' -s 0.9 -t 5 -h -n 1", 'For two paged scans like books'],
            ["$0 -f '*.pdf' -s 0.9 -t 5 -h -n 1", 'For one paged scans (A5)'],
            ["$0 -f '*.pdf' -s 0.9 -t 5 -h -n 0", 'For one paged scans (A4)'],
        ])
        .epilog("Let's go ...").argv;
}

function findFiles(glob) {
    return sync(glob)
        .map(fileName => {
            return { fileName, dateModified: statSync(fileName).mtime.getTime() };
        })
        .sort((file1, file2) => /* oldest first */ file1.dateModified - file2.dateModified);
}

const DRY_RUN = 'dryRun';
function execute(command, maybeDryRun) {
    // stderr is sent to stderr of parent process (see options.stdio)
    if (maybeDryRun === DRY_RUN) {
        console.log(execSync(`echo '${command}'`).toString());
    } else {
        console.log(execSync(command).toString());
    }
}

// PDF TOOLS
//  mutool, pdftk, pdfjam
//  (install binaries yourself)
async function run() {
    const { fileGlob, halve, scaleFactor, trim, nUp } = parseArguments(hideBin(process.argv));
    // console.log('args:', { fileGlob, scaleFactor, halve, trim, nUp });

    findFiles(fileGlob).forEach(file => {
        console.log(`-------------`);
        console.log(`Starting with ${file.fileName}`);
        console.log(`-------------`);

        // todo this is not needed I think - remove?
        // create a copy to work with (in case we fuck up something)
        // copyFileSync(file.fileName, 'base.pdf');

        if (halve) {
            console.log(`Splitting into half`);
            execute(`mutool poster -y 2 ${file.fileName} halved.pdf`, DRY_RUN);
        }

        console.log('Splitting into odd/even to trim these differently');
        if (halve) {
            execute(`pdftk halved.pdf cat 1-endodd output odd.pdf`, DRY_RUN);
            execute(`pdftk halved.pdf cat 2-endeven output even.pdf`, DRY_RUN);
        } else {
            execute(`pdftk ${file.fileName} cat 1-endodd output odd.pdf`, DRY_RUN);
            execute(`pdftk ${file.fileName} cat 2-endeven output even.pdf`, DRY_RUN);
        }

        console.log('Scaling');
        execute(`pdfjam --suffix scaled --scale ${scaleFactor} odd.pdf`, DRY_RUN);
        execute(`pdfjam --suffix scaled --scale ${scaleFactor} even.pdf`, DRY_RUN);

        console.log('Trimming');
        if (nUp) {
            // center the text
            execute(
                `pdfjam --suffix trimmed --trim "${trim}cm 0cm 0cm 0cm" even-scaled.pdf`,
                DRY_RUN
            );
            execute(
                `pdfjam --suffix trimmed --trim "0cm 0cm ${trim}cm 0cm" odd-scaled.pdf`,
                DRY_RUN
            );
        } else {
            // move to right to lay the hand on the tablet
            execute(
                `pdfjam --suffix trimmed --trim "0cm 0cm ${trim}cm 0cm" even-scaled.pdf`,
                DRY_RUN
            );
            execute(
                `pdfjam --suffix trimmed --trim "0cm 0cm ${trim}cm 0cm" odd-scaled.pdf`,
                DRY_RUN
            );
        }

        // create a new document
        console.log('Combining');
        execute(
            `pdftk A=odd-scaled-trimmed.pdf B=even-scaled-trimmed.pdf shuffle A B output combined.pdf`,
            DRY_RUN
        );

        // create the new output file
        if (nUp) {
            console.log('Creating two pages per sheet');
            // todo originally file name was `--outfile ${file/.pdf/}_scaled.pdf`, here and in the else branch
            //  (what does the /.pdf/ do?)
            execute(
                `pdfjam --nup 2x1 combined.pdf --landscape --a4paper --outfile ${
                    file.fileName
                }_scaled.pdf`,
                DRY_RUN
            );
        } else {
            console.log(`mv combined.pdf ${file}_scaled.pdf`);
            // renameSync('combined.pdf', `${file.fileName}_scaled.pdf`);
        }

        console.log('Cleaning up');
        [
            'base.pdf',
            'input-scaled.pdf',
            'halved.pdf',
            'odd.pdf',
            'odd-scaled.pdf',
            'odd-scaled-trimmed.pdf',
            'even.pdf',
            'even-scaled.pdf',
            'even-scaled-trimmed.pdf',
            'combined.pdf',
        ].forEach(tmpFile => {
            unlinkSync(tmpFile);
        });
    });

    return `



Done. Created a new document with scale factor ${scaleFactor} and move pages ${trim}cm to the fold line...
Now scroll through your document to check if the settings are fine...`;
}

run()
    .then(console.log)
    .catch(console.error);

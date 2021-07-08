#!/usr/bin/env node

const yargs = require('yargs/yargs');
const {
    hideBin,
} = require('yargs/helpers'); /* hide meta args (https://nodejs.org/en/knowledge/command-line/how-to-parse-command-line-arguments/) */

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
            description: "is the file, e.g. input.pdf or '*.pdf'",
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

async function run() {
    const { fileGlob, scaleFactor, halve, trim, nUp } = parseArguments(hideBin(process.argv));
    console.log('args:', { fileGlob, scaleFactor, halve, trim, nUp });

    // todo continue: start working with $file

    return 'done.';
}

run()
    .then(console.log)
    .catch(console.error);

// ...
// find . -name "$file" -print0 | xargs -0 ls -tr | while read file;
// do
//     echo "-------------"
// echo "Starting with $file"
// echo "-------------"
//
// # create a copy to work with
//     cp $file base.pdf
//
// # halve book scans
// if [ $halve = 1 ]; then
// echo "Splitting into half"
// mutool poster -y 2 $file halved.pdf
// fi
//
// # split odd and even pages
// # just do it to simplify the code (even when not needed, e.g. for a simple "Scale A4 and move left" example)
// echo "Splitting into odd/even to trim these differently"
// if [ $halve = 1 ]; then
// pdftk halved.pdf cat 1-endodd output odd.pdf
// pdftk halved.pdf cat 2-endeven output even.pdf
// else
// pdftk $file cat 1-endodd output odd.pdf
// pdftk $file cat 2-endeven output even.pdf
// fi
//
// # scale the pages
// echo "Scaling"
// pdfjam --suffix scaled --scale ${scale} odd.pdf
// pdfjam --suffix scaled --scale ${scale} even.pdf
//
// #trim the pages
// echo "Trimming"
// if [ $nup = 1 ]; then #center the text
// pdfjam --suffix trimmed --trim "${trim}cm 0cm 0cm 0cm" even-scaled.pdf
// pdfjam --suffix trimmed --trim "0cm 0cm ${trim}cm 0cm" odd-scaled.pdf
// else # move to right to lay the hand on the tablet
// pdfjam --suffix trimmed --trim "0cm 0cm ${trim}cm 0cm" even-scaled.pdf
// pdfjam --suffix trimmed --trim "0cm 0cm ${trim}cm 0cm" odd-scaled.pdf
// fi
//
// # create a new document
// echo "Combining"
// pdftk A=odd-scaled-trimmed.pdf B=even-scaled-trimmed.pdf shuffle A B output combined.pdf
//
// # create the new output file
// if [ $nup = 1 ]; then
// echo "Creating two pages per sheet"
// pdfjam --nup 2x1 combined.pdf --landscape --a4paper --outfile ${file/.pdf/}_scaled.pdf
// else
// mv combined.pdf ${file/.pdf/}_scaled.pdf
// fi
//
// echo "Cleaning up"
// rm base.pdf input-scaled.pdf halved.pdf odd.pdf odd-scaled.pdf odd-scaled-trimmed.pdf even.pdf even-scaled.pdf even-scaled-trimmed.pdf combined.pdf
//
// done
//
// echo ""
// echo ""
// echo ""
// echo "Done. Created a new document with scale factor \"${scale}\" and move pages \"${trim}cm\" to the foldline..."
// echo "Now scroll through your document to check if the settings are fine..."

#!/bin/bash

#Todos
# Using book pages, bt don't n'up them doesn't allow different trimmings for odd/even
# Using book pages, bt don't halve and n'up them will print on portrait A4

echo "Usage example (input.pdf)"
echo "for two paged scans like books: ./pdf-scaler.sh -f '*.pdf' -s 0.9 -t 5 -h 1 -n 1"
echo "for one paged scans (A5) ./pdf-scaler.sh -f '*.pdf' -s 0.9 -t 5 -h 0 -n 1"
echo "for one paged scans (A4) ./pdf-scaler.sh -f '*.pdf' -s 0.9 -t 5 -h 0 -n 0"
echo "** -f (string) is the file, e.g. input.pdf or '*.pdf'"
echo "** -s (decimal) is the scale factor"
echo "** -t (cm) trims the pages and moves them to the foldline"
echo "** -h (boolean) is needed(!) to halve scans with two pages"
echo "** -n (boolean) if pages should be n2up'ed at the end"
echo ""
echo "Let's go..."
echo ""

# set defaults
file=input.pdf
halve=0
scale=1
trim=0
nup=0

# and override from cli if given
while getopts ":f:s:t:h:n:" flag
do
    case ${flag} in
        (f) file=${OPTARG};;
        (s) scale=${OPTARG};;
        (t) trim=${OPTARG};;
        (h) halve=${OPTARG};;
        (n) nup=${OPTARG};;
    esac
done


find . -name "$file" -print0 | xargs -0 ls -tr | while read file;
do
    echo "-------------"
    echo "Starting with $file"
    echo "-------------"

    # create a copy to work with
    cp $file base.pdf

    # halve book scans
    if [ $halve = 1 ]; then
      echo "Splitting into half"
      mutool poster -y 2 $file halved.pdf
    fi

    # split odd and even pages
    # just do it to simplify the code (even when not needed, e.g. for a simple "Scale A4 and move left" example)
    echo "Splitting into odd/even to trim these differently"
    if [ $halve = 1 ]; then
      pdftk halved.pdf cat 1-endodd output odd.pdf
      pdftk halved.pdf cat 2-endeven output even.pdf
    else
      pdftk $file cat 1-endodd output odd.pdf
      pdftk $file cat 2-endeven output even.pdf
    fi

    # scale the pages
    echo "Scaling"
    pdfjam --suffix scaled --scale ${scale} odd.pdf
    pdfjam --suffix scaled --scale ${scale} even.pdf

    #trim the pages
    echo "Trimming"
    if [ $nup = 1 ]; then #center the text
      pdfjam --suffix trimmed --trim "${trim}cm 0cm 0cm 0cm" even-scaled.pdf
      pdfjam --suffix trimmed --trim "0cm 0cm ${trim}cm 0cm" odd-scaled.pdf
    else # move to right to lay the hand on the tablet
      pdfjam --suffix trimmed --trim "0cm 0cm ${trim}cm 0cm" even-scaled.pdf
      pdfjam --suffix trimmed --trim "0cm 0cm ${trim}cm 0cm" odd-scaled.pdf
    fi

    # create a new document
    echo "Combining"
    pdftk A=odd-scaled-trimmed.pdf B=even-scaled-trimmed.pdf shuffle A B output combined.pdf

    # create the new output file
    if [ $nup = 1 ]; then
      echo "Creating two pages per sheet"
      pdfjam --nup 2x1 combined.pdf --landscape --a4paper --outfile ${file/.pdf/}_scaled.pdf
    else
      mv combined.pdf ${file/.pdf/}_scaled.pdf
    fi

    echo "Cleaning up"
    rm base.pdf input-scaled.pdf halved.pdf odd.pdf odd-scaled.pdf odd-scaled-trimmed.pdf even.pdf even-scaled.pdf even-scaled-trimmed.pdf combined.pdf

done

echo ""
echo ""
echo ""
echo "Done. Created a new document with scale factor \"${scale}\" and move pages \"${trim}cm\" to the foldline..."
echo "Now scroll through your document to check if the settings are fine..."

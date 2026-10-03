#!/bin/sh
# מעלה את מספר הגרסה בכל הקבצים — להריץ לפני כל העלאה
cd "$(dirname "$0")"
old=$(tr -d '[:space:]' < version.txt)
new=$((old + 1))
sed -i "s/?v=$old\"/?v=$new\"/g; s/SITE_VERSION = '$old'/SITE_VERSION = '$new'/" index.html
printf '%s\n' "$new" > version.txt
echo "version $old -> $new"

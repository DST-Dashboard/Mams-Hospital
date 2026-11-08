# Raw dataset (not committed)

Put the five The Things Stack exports here to rebuild `data/processed/`:

    mams-hospital_n1_week.json … mams-hospital_n5_week.json

Then run `npm run data:build`. The processed output is already committed, so you only need these files if you want to rebuild or re-validate. Keep the originals somewhere safe — they are the evidence trail (`data/processed/manifest.json` stores their SHA-256).

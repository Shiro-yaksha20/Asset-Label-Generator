# Asset Label Generator

A free, open-source static web app for generating printable asset labels with QR codes from CSV/Excel files. It runs entirely in the browser (no backend), provides a live label preview, tiles labels onto A4/A3 sheets, and exports to PDF or PNG.

## Live Demo

- GitHub Pages: https://shiro-yaksha20.github.io/Asset-Label-Generator/


## How to Use

1. Upload an asset data file (`.csv`, `.xlsx`, or `.xls`).
2. Optionally upload a PNG logo, then set QR link / company / footer text.
3. Choose label size, sheet size, and toggle sections (company name, details row, footer).
4. Preview labels and export as PDF or PNG.

## Input Format

Use these column headers (case-insensitive):

| Header | Required | Description |
|---|---|---|
| `Asset ID` | Yes | Unique asset identifier |
| `Serial Number` | Yes | Device serial number |
| `Device Type` | No | Device category (e.g. Laptop) |
| `Department` | No | Owning department |
| `Location` | No | Physical location |

Rows missing `Asset ID` or `Serial Number` are skipped with warnings.

## Local Development

No build step is required.

1. Clone the repository.
2. Open `index.html` in a browser.
3. Start using the app.

## Hosting on GitHub Pages

1. Push this project to a GitHub repository.
2. Go to **Settings → Pages**.
3. Set source to **Deploy from a branch**.
4. Select the `main` branch and root (`/`) folder.
5. Save and wait for deployment.

## License

MIT (see `LICENSE`).

## Contributing

Contributions are welcome. Please open an issue for bugs/feature ideas and submit focused pull requests.

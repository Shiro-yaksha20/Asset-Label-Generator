(function initDataModule(global) {
  const LabelGen = global.LabelGen || (global.LabelGen = {});

  const REQUIRED_HEADERS = {
    assetId: ["asset id"],
    serialNumber: ["serial number"]
  };

  const OPTIONAL_HEADERS = {
    deviceType: ["device type"],
    department: ["department"],
    location: ["location"]
  };

  function normalizeHeader(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function normalizeCell(value) {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value).trim();
  }

  function findColumnIndex(headers, acceptedNames) {
    for (let index = 0; index < headers.length; index += 1) {
      if (acceptedNames.includes(headers[index])) {
        return index;
      }
    }

    return -1;
  }

  function buildColumnMap(rawHeaderRow) {
    const normalizedHeaders = rawHeaderRow.map(normalizeHeader);
    const map = {};

    for (const [key, accepted] of Object.entries(REQUIRED_HEADERS)) {
      const index = findColumnIndex(normalizedHeaders, accepted);
      if (index === -1) {
        throw new Error(`Missing required column header: ${accepted[0]}`);
      }
      map[key] = index;
    }

    for (const [key, accepted] of Object.entries(OPTIONAL_HEADERS)) {
      map[key] = findColumnIndex(normalizedHeaders, accepted);
    }

    return map;
  }

  function rowToAsset(row, columnMap) {
    return {
      assetId: normalizeCell(row[columnMap.assetId]),
      serialNumber: normalizeCell(row[columnMap.serialNumber]),
      deviceType: columnMap.deviceType >= 0 ? normalizeCell(row[columnMap.deviceType]) : "",
      department: columnMap.department >= 0 ? normalizeCell(row[columnMap.department]) : "",
      location: columnMap.location >= 0 ? normalizeCell(row[columnMap.location]) : ""
    };
  }

  function parseRows(matrix) {
    if (!Array.isArray(matrix) || matrix.length === 0) {
      return {
        rows: [],
        warnings: ["Input file appears to be empty."]
      };
    }

    const headerRow = Array.isArray(matrix[0]) ? matrix[0] : [];
    const columnMap = buildColumnMap(headerRow);
    const rows = [];
    const warnings = [];

    for (let rowIndex = 1; rowIndex < matrix.length; rowIndex += 1) {
      const sourceRow = Array.isArray(matrix[rowIndex]) ? matrix[rowIndex] : [];
      const parsed = rowToAsset(sourceRow, columnMap);

      if (!parsed.assetId || !parsed.serialNumber) {
        warnings.push(`Skipped row ${rowIndex + 1}: Asset ID and Serial Number are required.`);
        continue;
      }

      rows.push(parsed);
    }

    return { rows, warnings };
  }

  async function parseAssetFile(file) {
    if (!file) {
      return {
        rows: [],
        warnings: ["No file selected."]
      };
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      return {
        rows: [],
        warnings: ["No worksheet found in the uploaded file."]
      };
    }

    const firstSheet = workbook.Sheets[firstSheetName];
    const matrix = XLSX.utils.sheet_to_json(firstSheet, {
      header: 1,
      raw: false,
      defval: ""
    });

    const result = parseRows(matrix);
    console.info("[LabelGen:data] Parsed rows", result.rows);
    return result;
  }

  LabelGen.Data = {
    parseAssetFile,
    parseRows,
    normalizeHeader
  };
})(window);

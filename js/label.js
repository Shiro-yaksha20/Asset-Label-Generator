(function initLabelModule(global) {
  const LabelGen = global.LabelGen || (global.LabelGen = {});

  const LABEL_SIZE_PRESETS = {
    "extra-small": { widthMm: 38, heightMm: 19, name: "Extra Small" },
    small: { widthMm: 50, heightMm: 25, name: "Small" },
    medium: { widthMm: 63, heightMm: 38, name: "Medium" },
    large: { widthMm: 100, heightMm: 50, name: "Large" },
    "a4-full": { widthMm: 210, heightMm: 297, name: "A4 Full Page" },
    "a3-full": { widthMm: 297, heightMm: 420, name: "A3 Full Page" },
  };

  const SHEET_SIZES = {
    A4: { widthMm: 210, heightMm: 297 },
    A3: { widthMm: 297, heightMm: 420 },
  };

  const PLACEHOLDER_LOGO_PATH = "assets/placeholder-logo.png";

  function getLabelDimensions(labelSize, customWidthMm, customHeightMm) {
    if (labelSize === "custom") {
      const widthMm = Number(customWidthMm) || 50;
      const heightMm = Number(customHeightMm) || 25;
      return { widthMm, heightMm, name: "Custom" };
    }

    return LABEL_SIZE_PRESETS[labelSize] || LABEL_SIZE_PRESETS.small;
  }

  function mmToPx(mm) {
    return mm * (96 / 25.4);
  }

  function toPxByHeight(heightMm, percent) {
    return mmToPx(heightMm) * (percent / 100);
  }

  function createSectionGap(heightMm) {
    return `${toPxByHeight(heightMm, 3)}px`;
  }

  function fitTextToWidth(
    element,
    maxWidthPx,
    initialFontSizePx,
    minFontSizePx,
  ) {
    element.style.fontSize = initialFontSizePx + "px";
    while (
      element.scrollWidth > maxWidthPx &&
      parseFloat(element.style.fontSize) > minFontSizePx
    ) {
      element.style.fontSize = parseFloat(element.style.fontSize) - 0.5 + "px";
    }
  }

  function applyAutoShrink(label, dimensions) {
    const heightMm = dimensions.heightMm;

    const company = label.querySelector(".label-company");
    if (company) {
      fitTextToWidth(
        company,
        company.clientWidth,
        toPxByHeight(heightMm, 8),
        toPxByHeight(heightMm, 3),
      );
    }

    const assetId = label.querySelector(".label-asset-id");
    if (assetId) {
      fitTextToWidth(
        assetId,
        assetId.clientWidth,
        toPxByHeight(heightMm, 20),
        toPxByHeight(heightMm, 7),
      );
    }

    const details = label.querySelector(".label-details");
    if (details) {
      fitTextToWidth(
        details,
        details.clientWidth,
        toPxByHeight(heightMm, 7),
        toPxByHeight(heightMm, 4),
      );
    }

    const footer = label.querySelector(".label-footer");
    if (footer) {
      fitTextToWidth(
        footer,
        footer.clientWidth,
        toPxByHeight(heightMm, 6),
        toPxByHeight(heightMm, 3),
      );
    }
  }

  function buildDetailsText(row) {
    const parts = [];

    if (row.deviceType) {
      parts.push(`Type: ${row.deviceType}`);
    }
    if (row.department) {
      parts.push(`Dept: ${row.department}`);
    }
    if (row.location) {
      parts.push(`Loc: ${row.location}`);
    }

    return parts.join(" | ");
  }

  function createHeader(row, options, heightMm) {
    const header = document.createElement("div");
    header.className = "label-header";
    header.style.height = `${toPxByHeight(heightMm, 22)}px`;

    const logo = document.createElement("img");
    logo.className = "label-logo";
    logo.src = options.logoDataUrl || PLACEHOLDER_LOGO_PATH;
    logo.alt = "Company logo";

    const logoMaxHeightPx = toPxByHeight(heightMm, 18);

    if (options.showCompanyName) {
      header.classList.add("with-company");
      header.style.alignItems = "center";

      logo.style.flexShrink = "0";
      logo.style.maxWidth = "30%";
      logo.style.maxHeight = `${logoMaxHeightPx}px`;
      logo.style.width = "auto";
      logo.style.height = "auto";

      const company = document.createElement("div");
      company.className = "label-company";
      company.textContent = options.companyName || "";
      company.style.flexGrow = "1";
      company.style.fontSize = `${toPxByHeight(heightMm, 8)}px`;

      header.append(logo, company);
      return header;
    }

    logo.style.width = "100%";
    logo.style.maxHeight = `${logoMaxHeightPx}px`;
    logo.style.objectFit = "contain";
    header.appendChild(logo);
    return header;
  }

  async function createMainBody(row, options, heightMm) {
    const main = document.createElement("div");
    main.className = "label-main";

    const textWrap = document.createElement("div");
    textWrap.className = "label-main-text";

    const assetId = document.createElement("div");
    assetId.className = "label-asset-id";
    assetId.textContent = row.assetId || "N/A";
    assetId.style.fontSize = `${toPxByHeight(heightMm, 20)}px`;

    const serial = document.createElement("div");
    serial.className = "label-serial";
    serial.textContent = `S/N: ${row.serialNumber || "N/A"}`;
    serial.style.fontSize = `${toPxByHeight(heightMm, 9)}px`;

    textWrap.append(assetId, serial);

    const qrWrap = document.createElement("div");
    qrWrap.className = "label-qr";
    const qrSizePx = toPxByHeight(heightMm, 38);
    qrWrap.style.width = `${qrSizePx}px`;
    qrWrap.style.height = `${qrSizePx}px`;

    const qrCanvas = await LabelGen.QR.generateQrCanvas(
      options.qrLink || "",
      qrSizePx,
    );
    qrWrap.appendChild(qrCanvas);

    main.append(textWrap, qrWrap);
    return main;
  }

  function createDetailsRow(row, options, heightMm) {
    if (!options.showDetails) {
      return null;
    }

    const text = buildDetailsText(row);
    if (!text) {
      return null;
    }

    const details = document.createElement("div");
    details.className = "label-details";
    details.textContent = text;
    details.style.fontSize = `${toPxByHeight(heightMm, 7)}px`;
    details.style.padding = `${toPxByHeight(heightMm, 1.5)}px ${toPxByHeight(heightMm, 2)}px`;
    return details;
  }

  function createFooter(options, heightMm) {
    if (!options.showFooter || !options.footerText) {
      return null;
    }

    const footer = document.createElement("div");
    footer.className = "label-footer";
    footer.textContent = options.footerText;
    footer.style.fontSize = `${toPxByHeight(heightMm, 6)}px`;
    footer.style.paddingTop = `${toPxByHeight(heightMm, 1.5)}px`;
    return footer;
  }

  async function renderLabel(row, options) {
    const safeRow = row || {
      assetId: "PE-LAP-000001",
      serialNumber: "CND3500P9R",
      deviceType: "Laptop",
      department: "IT",
      location: "ADMIN OFFICE",
    };

    const dimensions = getLabelDimensions(
      options.labelSize,
      options.customWidthMm,
      options.customHeightMm,
    );

    const label = document.createElement("div");
    label.className = "asset-label";
    label.style.width = `${dimensions.widthMm}mm`;
    label.style.height = `${dimensions.heightMm}mm`;

    const paddingPx = toPxByHeight(dimensions.heightMm, 4);
    label.style.padding = `${paddingPx}px`;
    label.style.gap = createSectionGap(dimensions.heightMm);

    const header = createHeader(safeRow, options, dimensions.heightMm);
    const main = await createMainBody(safeRow, options, dimensions.heightMm);
    const details = createDetailsRow(safeRow, options, dimensions.heightMm);
    const footer = createFooter(options, dimensions.heightMm);

    label.appendChild(header);
    label.appendChild(main);

    if (details) {
      label.appendChild(details);
    }

    if (footer) {
      label.appendChild(footer);
    }

    label.__labelDimensions = dimensions;
    return label;
  }

  LabelGen.Label = {
    LABEL_SIZE_PRESETS,
    SHEET_SIZES,
    getLabelDimensions,
    mmToPx,
    toPxByHeight,
    buildDetailsText,
    fitTextToWidth,
    applyAutoShrink,
    renderLabel,
    PLACEHOLDER_LOGO_PATH,
  };
})(window);

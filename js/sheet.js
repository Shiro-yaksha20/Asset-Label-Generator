(function initSheetModule(global) {
  const LabelGen = global.LabelGen || (global.LabelGen = {});

  const SHEET_MARGIN_MM = 5;
  const LABEL_GAP_MM = 2;
  const FULL_PAGE_PRESETS = new Set(["a4-full", "a3-full"]);

  function isFullPageLabel(labelSize) {
    return FULL_PAGE_PRESETS.has(labelSize);
  }

  function getSheetDimensions(sheetSize) {
    return (
      LabelGen.Label.SHEET_SIZES[sheetSize] || LabelGen.Label.SHEET_SIZES.A4
    );
  }

  function calculateGrid(labelDimensions, options) {
    const sheetDimensions = getSheetDimensions(options.sheetSize);

    if (
      labelDimensions.widthMm > sheetDimensions.widthMm ||
      labelDimensions.heightMm > sheetDimensions.heightMm
    ) {
      return {
        error: "Label larger than sheet — pick A3 or a smaller label",
      };
    }

    if (isFullPageLabel(options.labelSize)) {
      return {
        sheetDimensions,
        columns: 1,
        rows: 1,
        perPage: 1,
        marginMm: 0,
        gapMm: 0,
        fullPage: true,
      };
    }

    const usableWidth = sheetDimensions.widthMm - SHEET_MARGIN_MM * 2;
    const usableHeight = sheetDimensions.heightMm - SHEET_MARGIN_MM * 2;

    const columns = Math.floor(
      (usableWidth + LABEL_GAP_MM) / (labelDimensions.widthMm + LABEL_GAP_MM),
    );
    const rows = Math.floor(
      (usableHeight + LABEL_GAP_MM) / (labelDimensions.heightMm + LABEL_GAP_MM),
    );

    if (columns < 1 || rows < 1) {
      return {
        error: "Label larger than sheet — pick A3 or a smaller label",
      };
    }

    return {
      sheetDimensions,
      columns,
      rows,
      perPage: columns * rows,
      marginMm: SHEET_MARGIN_MM,
      gapMm: LABEL_GAP_MM,
      fullPage: false,
    };
  }

  function getLabelPosition(indexInPage, layout, labelDimensions) {
    const col = indexInPage % layout.columns;
    const row = Math.floor(indexInPage / layout.columns);

    return {
      xMm: layout.marginMm + col * (labelDimensions.widthMm + layout.gapMm),
      yMm: layout.marginMm + row * (labelDimensions.heightMm + layout.gapMm),
    };
  }

  function createSheetPage(sheetDimensions) {
    const page = document.createElement("div");
    page.className = "sheet-page";
    page.style.width = `${sheetDimensions.widthMm}mm`;
    page.style.height = `${sheetDimensions.heightMm}mm`;
    page.style.position = "relative";
    page.style.overflow = "hidden";
    return page;
  }

  function createRenderSurface() {
    const surface = document.createElement("div");
    surface.className = "sheet-render-surface";
    document.body.appendChild(surface);
    return surface;
  }

  async function buildSheetPages(rows, options) {
    const labelDimensions = LabelGen.Label.getLabelDimensions(
      options.labelSize,
      options.customWidthMm,
      options.customHeightMm,
    );

    const layout = calculateGrid(labelDimensions, options);
    if (layout.error) {
      return {
        pages: [],
        labelDimensions,
        layout,
        error: layout.error,
      };
    }

    const safeRows = rows.length ? rows : [];
    if (!safeRows.length) {
      return {
        pages: [],
        labelDimensions,
        layout,
        error: "No asset rows available for export.",
      };
    }

    const pages = [];
    const renderSurface = createRenderSurface();

    try {
      const totalPages = Math.ceil(safeRows.length / layout.perPage);

      for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
        const page = createSheetPage(layout.sheetDimensions);
        const start = pageIndex * layout.perPage;
        const end = Math.min(start + layout.perPage, safeRows.length);

        for (let rowIndex = start; rowIndex < end; rowIndex += 1) {
          const indexInPage = rowIndex - start;
          const row = safeRows[rowIndex];
          const label = await LabelGen.Label.renderLabel(row, options);
          const position = getLabelPosition(
            indexInPage,
            layout,
            labelDimensions,
          );

          label.style.position = "absolute";
          label.style.left = `${position.xMm}mm`;
          label.style.top = `${position.yMm}mm`;

          page.appendChild(label);
          LabelGen.Label.applyAutoShrink(label, labelDimensions);
        }

        renderSurface.appendChild(page);
        pages.push(page);
      }

      return {
        pages,
        labelDimensions,
        layout,
        error: "",
      };
    } catch (error) {
      renderSurface.remove();
      throw error;
    }
  }

  function cleanupRenderedPages(pages) {
    if (!pages || pages.length === 0) {
      return;
    }

    const surface = pages[0].parentElement;
    if (surface) {
      surface.remove();
    }
  }

  LabelGen.Sheet = {
    SHEET_MARGIN_MM,
    LABEL_GAP_MM,
    isFullPageLabel,
    getSheetDimensions,
    calculateGrid,
    getLabelPosition,
    buildSheetPages,
    cleanupRenderedPages,
  };
})(window);

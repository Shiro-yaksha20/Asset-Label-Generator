(function initExportModule(global) {
  const LabelGen = global.LabelGen || (global.LabelGen = {});

  function getDateStamp() {
    return new Date().toISOString().slice(0, 10);
  }

  async function elementToCanvas(element) {
    return html2canvas(element, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        const dataUrl = canvas.toDataURL("image/png");
        const binary = atob(dataUrl.split(",")[1]);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }

        resolve(new Blob([bytes], { type: "image/png" }));
      }, "image/png");
    });
  }

  async function exportPdf(rows, options, setWarning) {
    if (!rows.length) {
      setWarning("No asset rows available for export.");
      return;
    }

    const labelDimensions = LabelGen.Label.getLabelDimensions(
      options.labelSize,
      options.customWidthMm,
      options.customHeightMm,
    );

    const layout = LabelGen.Sheet.calculateGrid(labelDimensions, options);
    if (layout.error) {
      setWarning(layout.error);
      return;
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      unit: "mm",
      format: options.sheetSize === "A4" ? "a4" : "a3",
      orientation: "portrait",
    });

    const renderSurface = document.createElement("div");
    renderSurface.className = "sheet-render-surface";
    document.body.appendChild(renderSurface);

    try {
      for (let index = 0; index < rows.length; index += 1) {
        if (index > 0 && index % layout.perPage === 0) {
          pdf.addPage();
        }

        const label = await LabelGen.Label.renderLabel(rows[index], options);
        renderSurface.appendChild(label);
        LabelGen.Label.applyAutoShrink(label, labelDimensions);

        const canvas = await elementToCanvas(label);
        const imageData = canvas.toDataURL("image/png");
        const indexInPage = index % layout.perPage;
        const position = LabelGen.Sheet.getLabelPosition(
          indexInPage,
          layout,
          labelDimensions,
        );

        pdf.addImage(
          imageData,
          "PNG",
          position.xMm,
          position.yMm,
          labelDimensions.widthMm,
          labelDimensions.heightMm,
        );

        label.remove();
      }

      pdf.save(`asset-labels-${getDateStamp()}.pdf`);
      setWarning("");
    } finally {
      renderSurface.remove();
    }
  }

  async function exportPng(rows, options, setWarning) {
    if (!rows.length) {
      setWarning("No asset rows available for export.");
      return;
    }

    const built = await LabelGen.Sheet.buildSheetPages(rows, options);
    if (built.error) {
      setWarning(built.error);
      return;
    }

    const { pages } = built;

    try {
      if (pages.length === 1) {
        const singleCanvas = await elementToCanvas(pages[0]);
        const singleBlob = await canvasToBlob(singleCanvas);
        downloadBlob(singleBlob, "asset-labels-sheet-1.png");
        setWarning("");
        return;
      }

      const zip = new JSZip();
      for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
        const canvas = await elementToCanvas(pages[pageIndex]);
        const blob = await canvasToBlob(canvas);
        zip.file(`asset-labels-sheet-${pageIndex + 1}.png`, blob);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadBlob(zipBlob, `asset-labels-${getDateStamp()}.zip`);
      setWarning("");
    } finally {
      LabelGen.Sheet.cleanupRenderedPages(pages);
    }
  }

  LabelGen.Export = {
    exportPdf,
    exportPng,
  };
})(window);

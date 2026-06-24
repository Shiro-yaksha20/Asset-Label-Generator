(function initAppModule(global) {
  const LabelGen = global.LabelGen || (global.LabelGen = {});

  const SAMPLE_ROW = {
    assetId: "PE-LAP-000001",
    serialNumber: "CND3500P9R",
    deviceType: "Laptop",
    department: "IT",
    location: "ADMIN OFFICE",
  };

  const state = {
    rows: [],
    currentIndex: 0,
    warnings: [],
    runtimeWarning: "",
    logoDataUrl: "",
  };

  const el = {
    assetFile: document.getElementById("assetFile"),
    logoFile: document.getElementById("logoFile"),
    qrLink: document.getElementById("qrLink"),
    companyName: document.getElementById("companyName"),
    footerText: document.getElementById("footerText"),
    labelSize: document.getElementById("labelSize"),
    customSizeInputs: document.getElementById("customSizeInputs"),
    customWidth: document.getElementById("customWidth"),
    customHeight: document.getElementById("customHeight"),
    sheetSize: document.getElementById("sheetSize"),
    showCompanyName: document.getElementById("showCompanyName"),
    showDetails: document.getElementById("showDetails"),
    showFooter: document.getElementById("showFooter"),
    warningBox: document.getElementById("warningBox"),
    prevLabel: document.getElementById("prevLabel"),
    nextLabel: document.getElementById("nextLabel"),
    previewCount: document.getElementById("previewCount"),
    labelDimensions: document.getElementById("labelDimensions"),
    previewViewport: document.getElementById("previewViewport"),
    previewCanvas: document.getElementById("previewCanvas"),
    exportPdf: document.getElementById("exportPdf"),
    exportPng: document.getElementById("exportPng"),
  };

  function currentRowsCount() {
    return state.rows.length;
  }

  function getCurrentRow() {
    if (state.rows.length === 0) {
      return SAMPLE_ROW;
    }

    return state.rows[state.currentIndex] || state.rows[0];
  }

  function getRenderOptions() {
    return {
      qrLink: el.qrLink.value.trim(),
      companyName: el.companyName.value.trim(),
      footerText: el.footerText.value.trim(),
      labelSize: el.labelSize.value,
      customWidthMm: Number(el.customWidth.value),
      customHeightMm: Number(el.customHeight.value),
      sheetSize: el.sheetSize.value,
      showCompanyName: el.showCompanyName.checked,
      showDetails: el.showDetails.checked,
      showFooter: el.showFooter.checked,
      logoDataUrl: state.logoDataUrl,
    };
  }

  function updateWarningBox() {
    const messages = [...state.warnings];
    if (state.runtimeWarning) {
      messages.unshift(state.runtimeWarning);
    }

    el.warningBox.textContent = messages.join("\n");
  }

  function setRuntimeWarning(message) {
    state.runtimeWarning = message || "";
    updateWarningBox();
  }

  function updateNavUi() {
    const total = currentRowsCount();

    if (total === 0) {
      el.previewCount.textContent = "Showing label 0 of 0";
      el.prevLabel.disabled = true;
      el.nextLabel.disabled = true;
      return;
    }

    el.previewCount.textContent = `Showing label ${state.currentIndex + 1} of ${total}`;
    el.prevLabel.disabled = total <= 1;
    el.nextLabel.disabled = total <= 1;
  }

  function updateDimensionsText(dimensions) {
    el.labelDimensions.textContent = `Label: ${dimensions.widthMm} × ${dimensions.heightMm} mm`;
  }

  function updateCustomSizeVisibility() {
    const isCustom = el.labelSize.value === "custom";
    el.customSizeInputs.classList.toggle("hidden", !isCustom);
  }

  function fitLabelInViewport(label) {
    const viewportWidth = el.previewViewport.clientWidth - 32;
    const viewportHeight = el.previewViewport.clientHeight - 32;
    const labelWidth = label.offsetWidth;
    const labelHeight = label.offsetHeight;

    if (
      !labelWidth ||
      !labelHeight ||
      viewportWidth <= 0 ||
      viewportHeight <= 0
    ) {
      el.previewCanvas.style.transform = "scale(1)";
      return;
    }

    const scale = Math.min(
      1,
      viewportWidth / labelWidth,
      viewportHeight / labelHeight,
    );
    el.previewCanvas.style.transform = `scale(${scale})`;
  }

  async function renderPreview() {
    const options = getRenderOptions();
    const dimensions = LabelGen.Label.getLabelDimensions(
      options.labelSize,
      options.customWidthMm,
      options.customHeightMm,
    );

    updateDimensionsText(dimensions);

    const layoutCheck = LabelGen.Sheet.calculateGrid(dimensions, options);
    if (layoutCheck.error) {
      setRuntimeWarning(layoutCheck.error);
    } else {
      setRuntimeWarning("");
    }

    const label = await LabelGen.Label.renderLabel(getCurrentRow(), options);

    el.previewCanvas.innerHTML = "";
    el.previewCanvas.appendChild(label);

    LabelGen.Label.applyAutoShrink(label, dimensions);
    fitLabelInViewport(label);
  }

  async function handleAssetFileChange() {
    const file = el.assetFile.files && el.assetFile.files[0];
    if (!file) {
      state.rows = [];
      state.warnings = [];
      state.currentIndex = 0;
      updateNavUi();
      setRuntimeWarning("");
      await renderPreview();
      return;
    }

    try {
      const result = await LabelGen.Data.parseAssetFile(file);
      state.rows = result.rows;
      state.warnings = result.warnings;
      state.currentIndex = 0;
      updateNavUi();
      setRuntimeWarning("");
      await renderPreview();
    } catch (error) {
      state.rows = [];
      state.warnings = [error.message || "Failed to parse the selected file."];
      state.currentIndex = 0;
      updateNavUi();
      setRuntimeWarning("");
      await renderPreview();
    }
  }

  async function handleLogoFileChange() {
    const file = el.logoFile.files && el.logoFile.files[0];
    if (!file) {
      state.logoDataUrl = "";
      await renderPreview();
      return;
    }

    const looksLikePng =
      file.type === "image/png" || file.name.toLowerCase().endsWith(".png");

    if (!looksLikePng) {
      setRuntimeWarning("Logo must be a PNG file.");
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    state.logoDataUrl = dataUrl;
    setRuntimeWarning("");
    await renderPreview();
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read logo file."));
      reader.readAsDataURL(file);
    });
  }

  async function handlePrev() {
    if (state.rows.length <= 1) {
      return;
    }

    state.currentIndex =
      (state.currentIndex - 1 + state.rows.length) % state.rows.length;
    updateNavUi();
    await renderPreview();
  }

  async function handleNext() {
    if (state.rows.length <= 1) {
      return;
    }

    state.currentIndex = (state.currentIndex + 1) % state.rows.length;
    updateNavUi();
    await renderPreview();
  }

  async function handleExportPdf() {
    if (!LabelGen.Export || typeof LabelGen.Export.exportPdf !== "function") {
      setRuntimeWarning("Export module is not ready yet.");
      return;
    }

    await LabelGen.Export.exportPdf(
      state.rows,
      getRenderOptions(),
      setRuntimeWarning,
    );
  }

  async function handleExportPng() {
    if (!LabelGen.Export || typeof LabelGen.Export.exportPng !== "function") {
      setRuntimeWarning("Export module is not ready yet.");
      return;
    }

    await LabelGen.Export.exportPng(
      state.rows,
      getRenderOptions(),
      setRuntimeWarning,
    );
  }

  function bindEvents() {
    el.assetFile.addEventListener("change", () => {
      handleAssetFileChange();
    });

    el.logoFile.addEventListener("change", () => {
      handleLogoFileChange();
    });

    [
      el.qrLink,
      el.companyName,
      el.footerText,
      el.sheetSize,
      el.showCompanyName,
      el.showDetails,
      el.showFooter,
      el.customWidth,
      el.customHeight,
    ].forEach((input) => {
      input.addEventListener("input", () => {
        renderPreview();
      });
      input.addEventListener("change", () => {
        renderPreview();
      });
    });

    el.labelSize.addEventListener("change", () => {
      updateCustomSizeVisibility();
      renderPreview();
    });

    el.prevLabel.addEventListener("click", () => {
      handlePrev();
    });

    el.nextLabel.addEventListener("click", () => {
      handleNext();
    });

    el.exportPdf.addEventListener("click", () => {
      handleExportPdf();
    });

    el.exportPng.addEventListener("click", () => {
      handleExportPng();
    });

    global.addEventListener("resize", () => {
      const label = el.previewCanvas.firstElementChild;
      if (label) {
        fitLabelInViewport(label);
      }
    });
  }

  async function init() {
    updateCustomSizeVisibility();
    updateNavUi();
    setRuntimeWarning("");
    bindEvents();
    await renderPreview();
  }

  init();
})(window);

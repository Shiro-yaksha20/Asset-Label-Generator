(function initQrModule(global) {
  const LabelGen = global.LabelGen || (global.LabelGen = {});

  function createPlaceholderCanvas(sizePx) {
    const canvas = document.createElement("canvas");
    const safeSize = Math.max(16, Math.floor(sizePx));
    canvas.width = safeSize;
    canvas.height = safeSize;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, safeSize, safeSize);
      ctx.strokeStyle = "#9ca3af";
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, safeSize - 2, safeSize - 2);
      ctx.fillStyle = "#6b7280";
      ctx.font = `${Math.max(8, Math.floor(safeSize * 0.16))}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("QR", safeSize / 2, safeSize / 2);
    }

    return canvas;
  }

  async function generateQrCanvas(url, sizePx) {
    if (!url) {
      return createPlaceholderCanvas(sizePx);
    }

    const safeSize = Math.max(16, Math.floor(sizePx));
    const container = document.createElement("div");
    container.style.width = `${safeSize}px`;
    container.style.height = `${safeSize}px`;

    container.innerHTML = "";
    new QRCode(container, {
      text: url,
      width: safeSize,
      height: safeSize,
    });

    return container;
  }

  LabelGen.QR = {
    generateQrCanvas,
    createPlaceholderCanvas,
  };
})(window);

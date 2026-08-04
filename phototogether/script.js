const photo1Input = document.getElementById("photo1");
const photo2Input = document.getElementById("photo2");
const preview1 = document.getElementById("preview1");
const preview2 = document.getElementById("preview2");
const generateBtn = document.getElementById("generateBtn");
const duplicateBtn = document.getElementById("duplicateBtn");
const clearBtn = document.getElementById("clearBtn");
const downloadBtn = document.getElementById("downloadBtn");
const outputCanvas = document.getElementById("outputCanvas");
const ctx = outputCanvas.getContext("2d");

let image1 = null;
let image2 = null;
let watermark = null;

function loadImageFromFile(file, callback) {
  if (!file) {
    callback(null);
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => callback(image);
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function setPreview(image, previewElement) {
  if (!image) {
    previewElement.src = "";
    previewElement.alt = "Nenhuma imagem selecionada";
    return;
  }
  previewElement.src = image.src;
  previewElement.alt = "Prévia da imagem selecionada";
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const length = binary.length;
  const array = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) {
    array[i] = binary.charCodeAt(i);
  }
  return array;
}

function createPdfBlobFromJpegDataUrl(dataUrl, width, height) {
  const [header, base64] = dataUrl.split(",");
  if (!base64) {
    throw new Error("Dados da imagem inválidos para gerar o PDF.");
  }
  const imageBytes = base64ToUint8Array(base64);
  const encoder = new TextEncoder();
  const chunks = [];
  const offsets = [];
  let position = 0;

  function pushChunk(chunk) {
    offsets.push(position);
    chunks.push(chunk);
    position += chunk.length;
  }

  pushChunk(encoder.encode("%PDF-1.3\n"));
  pushChunk(encoder.encode("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"));
  pushChunk(encoder.encode("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"));
  pushChunk(encoder.encode(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /ProcSet [/PDF /ImageC] /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`));
  const imageHeader = encoder.encode(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`);
  pushChunk(imageHeader);
  pushChunk(imageBytes);
  pushChunk(encoder.encode("\nendstream\nendobj\n"));
  const contentStream = "q\n" + width + " 0 0 " + height + " 0 0 cm\n/Im0 Do\nQ\n";
  const contentBytes = encoder.encode(contentStream);
  pushChunk(encoder.encode(`5 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`));
  pushChunk(contentBytes);
  pushChunk(encoder.encode("\nendstream\nendobj\n"));

  const xrefStart = position;
  let xref = "xref\n0 " + (offsets.length + 1) + "\n0000000000 65535 f \n";
  for (const offset of offsets) {
    xref += offset.toString().padStart(10, "0") + " 00000 n \n";
  }
  pushChunk(encoder.encode(xref));
  const trailer = `trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  pushChunk(encoder.encode(trailer));

  return new Blob(chunks, { type: "application/pdf" });
}

function createPdfBlobFromCanvas(canvas) {
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  return createPdfBlobFromJpegDataUrl(dataUrl, canvas.width, canvas.height);
}

function drawImageCover(image, x, y, width, height) {
  const ratio = Math.max(width / image.width, height / image.height);
  const scaledWidth = image.width * ratio;
  const scaledHeight = image.height * ratio;
  const offsetX = x + (width - scaledWidth) / 2;
  const offsetY = y + (height - scaledHeight) / 2;
  ctx.drawImage(image, offsetX, offsetY, scaledWidth, scaledHeight);
}

function drawImageContain(image, x, y, width, height, context = ctx) {
  const ratio = Math.min(width / image.width, height / image.height);
  const scaledWidth = image.width * ratio;
  const scaledHeight = image.height * ratio;
  const offsetX = x + (width - scaledWidth) / 2;
  const offsetY = y + (height - scaledHeight) / 2;
  context.drawImage(image, offsetX, offsetY, scaledWidth, scaledHeight);
}

function clearPhotos() {
  image1 = null;
  image2 = null;
  photo1Input.value = "";
  photo2Input.value = "";
  preview1.src = "";
  preview1.alt = "GENIA Nenhuma imagem selecionada";
  preview2.src = "";
  preview2.alt = "Nenhuma imagem selecionada";
  downloadBtn.disabled = true;
  drawLayout();
}

function drawLayout() {
  const width = outputCanvas.width;
  const height = outputCanvas.height;
  const padding = 32;
  const imageWidth = (width - padding * 3) / 2;
  const imageHeight = height - padding * 3 - 80;
  const boxHeight = imageHeight;

  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = "#f8f8f8";
  ctx.fillRect(0, 0, width, height);

  if (watermark) {
    const logoSize = Math.min(width, height) * 0.16;
    ctx.globalAlpha = 0.08;
    ctx.drawImage(
      watermark,
      width - padding - logoSize,
      height - padding - logoSize,
      logoSize,
      logoSize
    );
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = "rgba(17, 17, 23, 0.88)";
  ctx.fillRect(padding, padding, width - padding * 2, height - padding * 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 2;
  ctx.strokeRect(padding, padding, width - padding * 2, height - padding * 2);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px Segoe UI";
  ctx.fillText("weareghost.sbs", padding + 18, padding + 42);

  const imageBoxY = padding + 80;
  const imageBox1X = padding + 18;
  const imageBox2X = padding + 18 + imageWidth + padding;

  ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
  ctx.fillRect(imageBox1X, imageBoxY, imageWidth, boxHeight);
  ctx.fillRect(imageBox2X, imageBoxY, imageWidth, boxHeight);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.strokeRect(imageBox1X, imageBoxY, imageWidth, boxHeight);
  ctx.strokeRect(imageBox2X, imageBoxY, imageWidth, boxHeight);

  if (image1) {
    drawImageCover(image1, imageBox1X, imageBoxY, imageWidth, boxHeight);
  }

  if (image2) {
    drawImageCover(image2, imageBox2X, imageBoxY, imageWidth, boxHeight);
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
  ctx.font = "600 18px Segoe UI";
  ctx.fillText("Foto 1", imageBox1X + 14, imageBoxY - 18);
  ctx.fillText("Foto 2", imageBox2X + 14, imageBoxY - 18);
}

function updatePreview() {
  setPreview(image1, preview1);
  setPreview(image2, preview2);
  downloadBtn.disabled = !(image1 && image2);
}

photo1Input.addEventListener("change", (event) => {
  loadImageFromFile(event.target.files[0], (img) => {
    image1 = img;
    updatePreview();
  });
});

photo2Input.addEventListener("change", (event) => {
  loadImageFromFile(event.target.files[0], (img) => {
    image2 = img;
    updatePreview();
  });
});

duplicateBtn.addEventListener("click", () => {
  if (!image1) {
    alert("Selecione primeiro a foto 1 para duplicar.");
    return;
  }
  const copy = new Image();
  copy.onload = () => {
    image2 = copy;
    updatePreview();
  };
  copy.src = image1.src;
});

clearBtn.addEventListener("click", () => {
  clearPhotos();
});

generateBtn.addEventListener("click", () => {
  if (!image1 || !image2) {
    alert("BURRINHA !! Por favor selecione as duas fotos antes de gerar a visualização.");
    return;
  }
  drawLayout();
  downloadBtn.disabled = false;
});

downloadBtn.addEventListener("click", () => {
  if (!image1 || !image2) {
    alert("Por favor selecione as duas fotos e gere a visualização antes de baixar.");
    return;
  }
  try {
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = 2400;
    exportCanvas.height = 1600;
    const exportCtx = exportCanvas.getContext("2d");
    exportCtx.fillStyle = "#ffffff";
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    const halfWidth = exportCanvas.width / 2;
    drawImageContain(image1, 0, 0, halfWidth, exportCanvas.height, exportCtx);
    drawImageContain(image2, halfWidth, 0, halfWidth, exportCanvas.height, exportCtx);

    const dataUrl = exportCanvas.toDataURL("image/jpeg", 1.0);
    const pdfBlob = createPdfBlobFromJpegDataUrl(dataUrl, exportCanvas.width, exportCanvas.height);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(pdfBlob);
    link.download = "juntar-fotos.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error(error);
    alert("Erro ao gerar o PDF. Tente novamente.");
  }
});

function loadWatermark() {
  const logo = new Image();
  logo.src = "./public/WEAREGHOST.png";
  logo.onload = () => {
    watermark = logo;
    drawLayout();
  };
}

loadWatermark();
updatePreview();

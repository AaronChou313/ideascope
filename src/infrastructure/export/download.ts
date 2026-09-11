export function downloadText(filename: string, type: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  queueMicrotask(() => URL.revokeObjectURL(url));
}

export function downloadBytes(filename: string, type: string, content: Uint8Array) {
  const url = URL.createObjectURL(new Blob([content as Uint8Array<ArrayBuffer>], { type }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; anchor.click();
  queueMicrotask(() => URL.revokeObjectURL(url));
}

export async function downloadPngOrSvg(filename: string, svg: string, maxDimension = 8192) {
  const match = svg.match(/width="(\d+)" height="(\d+)"/);
  const width = Number(match?.[1] ?? 0);
  const height = Number(match?.[2] ?? 0);
  if (!width || !height || width > maxDimension || height > maxDimension) {
    downloadText(`${filename}.svg`, "image/svg+xml", svg);
    return { format: "svg" as const, reason: "图尺寸超过浏览器安全栅格化上限。" };
  }
  const image = new Image();
  const source = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("SVG 栅格化失败。")); image.src = source; });
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("浏览器不支持 Canvas 导出。");
    context.drawImage(image, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("PNG 编码失败。")), "image/png"));
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${filename}.png`; anchor.click();
    queueMicrotask(() => URL.revokeObjectURL(url));
    return { format: "png" as const, reason: null };
  } finally { URL.revokeObjectURL(source); }
}

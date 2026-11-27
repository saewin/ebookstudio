'use client'

export interface RenderedPdfSlide {
  pageNo: number
  blob: Blob
  filename: string
}

/**
 * Upload a rendered slide image or Blob to /api/upload and return its persistent URL.
 */
export async function uploadSlideImage(
  fileOrBlob: Blob,
  filename: string
): Promise<string> {
  const mimeType =
    fileOrBlob.type && fileOrBlob.type.startsWith('image/')
      ? fileOrBlob.type
      : 'image/jpeg'

  const uploadFile =
    fileOrBlob instanceof File && fileOrBlob.type === mimeType
      ? fileOrBlob
      : new File([fileOrBlob], filename, { type: mimeType })

  const formData = new FormData()
  formData.append('file', uploadFile)

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  })

  const json = await res.json().catch(() => null)
  if (!res.ok || !json?.success || !json?.url) {
    throw new Error(json?.error || `อัปโหลดภาพ ${filename} ไม่สำเร็จ (${res.status})`)
  }

  return json.url as string
}

/**
 * Render all pages of a PDF slide deck (e.g. NotebookLM PDF) client-side into crisp JPEG blobs.
 * Dynamically imports pdfjs-dist so SSR never touches browser-only DOMMatrix APIs.
 */
export async function renderPdfToSlideBlobs(
  file: File,
  onProgress?: (done: number, total: number) => void
): Promise<RenderedPdfSlide[]> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

  const buffer = await file.arrayBuffer()
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
  })
  const pdf = await loadingTask.promise

  const total = pdf.numPages
  const results: RenderedPdfSlide[] = []

  const safePrefix =
    file.name
      .replace(/\.pdf$/i, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 20) || 'notebooklm'

  for (let pageNo = 1; pageNo <= total; pageNo++) {
    const page = await pdf.getPage(pageNo)
    const baseViewport = page.getViewport({ scale: 1 })
    const scale = Math.min(2.5, Math.max(1.2, 1920 / Math.max(1, baseViewport.width)))
    const viewport = page.getViewport({ scale })

    const renderCanvas = document.createElement('canvas')
    renderCanvas.width = Math.round(viewport.width)
    renderCanvas.height = Math.round(viewport.height)

    const outputCanvas = document.createElement('canvas')
    outputCanvas.width = renderCanvas.width
    outputCanvas.height = renderCanvas.height

    try {
      await page.render({
        canvas: renderCanvas,
        viewport,
      }).promise

      const outCtx = outputCanvas.getContext('2d')
      if (!outCtx) {
        throw new Error('ไม่สามารถสร้าง Canvas สำหรับแปลงหน้า PDF ได้')
      }
      outCtx.fillStyle = '#ffffff'
      outCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height)
      outCtx.drawImage(renderCanvas, 0, 0)

      const blob = await new Promise<Blob>((resolve, reject) => {
        outputCanvas.toBlob(
          (result) => {
            if (result) resolve(result)
            else reject(new Error(`แปลงหน้า ${pageNo} เป็นภาพไม่สำเร็จ`))
          },
          'image/jpeg',
          0.9
        )
      })

      const pageTag = String(pageNo).padStart(2, '0')
      results.push({
        pageNo,
        blob,
        filename: `${safePrefix}-p${pageTag}.jpg`,
      })
      onProgress?.(pageNo, total)
    } finally {
      renderCanvas.width = 0
      renderCanvas.height = 0
      outputCanvas.width = 0
      outputCanvas.height = 0
      page.cleanup()
    }
  }

  await pdf.destroy()
  return results
}

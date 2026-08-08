/** Längste Kante des gespeicherten Bildes. */
const MAX_EDGE = 2048

/** JPEG-Qualität. 0.85 ist die Grenze, ab der man auf einem Handydisplay nichts mehr sieht. */
const QUALITY = 0.85

/**
 * Nimmt den aktuellen Videoframe ab und gibt ihn als JPEG zurück.
 *
 * Die Vorgängerversion forderte 4096×4096 an, zog den Frame als base64-String aus
 * react-webcam und baute daraus byteweise ein Blob. Das ergab auf einer Feier Fotos von
 * mehreren Megabyte, die über das überlastete WLAN kaum hochzubekommen waren, und ältere
 * iPhones gingen dabei am Speicher ein. Hier wird direkt auf die Zielgrösse skaliert und
 * über canvas.toBlob ausgegeben — ohne base64-Umweg.
 */
export async function captureFrame(video: HTMLVideoElement): Promise<Blob> {
  const { videoWidth, videoHeight } = video
  if (!videoWidth || !videoHeight) {
    throw new Error('Die Kamera liefert noch kein Bild.')
  }

  // Ein beendeter Track lässt Breite und Höhe stehen: ohne diese Prüfung würde das
  // letzte eingefrorene Bild abgegriffen und als frisches Foto hochgeladen.
  const stream = video.srcObject
  if (stream instanceof MediaStream && !stream.getVideoTracks().some(track => track.readyState === 'live')) {
    throw new Error('Die Kamera wurde unterbrochen. Bitte kurz neu starten.')
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(videoWidth, videoHeight))
  const width = Math.round(videoWidth * scale)
  const height = Math.round(videoHeight * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Das Bild konnte nicht verarbeitet werden.')

  context.drawImage(video, 0, 0, width, height)

  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/jpeg', QUALITY),
  )

  if (!blob) throw new Error('Das Bild konnte nicht gespeichert werden.')
  return blob
}

/**
 * Bereitet eine aus der Galerie gewählte Datei genauso auf wie ein frisch geknipstes
 * Foto: herunterskaliert und als JPEG. Das nimmt gleichzeitig HEIC-Bildern von iPhones
 * das Format-Problem ab — was der Browser anzeigen kann, kann er auch zeichnen.
 */
export async function prepareFile(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)

    const context = canvas.getContext('2d')
    if (!context) throw new Error('Das Bild konnte nicht verarbeitet werden.')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', QUALITY),
    )
    if (!blob) throw new Error('Das Bild konnte nicht gespeichert werden.')
    return blob
  } finally {
    bitmap.close()
  }
}

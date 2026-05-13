export interface ZipEntry {
  name: string
  data: Uint8Array
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i += 1) {
    let c = i
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function dosDateTime(date: Date): { dosTime: number; dosDate: number } {
  const dosTime =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    (Math.floor(date.getSeconds() / 2) & 0x1f)
  const dosDate =
    (((date.getFullYear() - 1980) & 0x7f) << 9) |
    (((date.getMonth() + 1) & 0x0f) << 5) |
    (date.getDate() & 0x1f)
  return { dosTime, dosDate }
}

function encodeName(name: string): Uint8Array {
  return new TextEncoder().encode(name)
}

interface CentralRecord {
  nameBytes: Uint8Array
  crc: number
  size: number
  offset: number
  dosTime: number
  dosDate: number
}

export function buildZipBlob(entries: ZipEntry[]): Blob {
  const now = new Date()
  const { dosTime, dosDate } = dosDateTime(now)

  const localParts: Uint8Array[] = []
  const centralRecords: CentralRecord[] = []
  let offset = 0

  for (const entry of entries) {
    const nameBytes = encodeName(entry.name)
    const data = entry.data
    const crc = crc32(data)
    const size = data.length

    const localHeader = new ArrayBuffer(30 + nameBytes.length)
    const view = new DataView(localHeader)
    const bytes = new Uint8Array(localHeader)

    view.setUint32(0, 0x04034b50, true)
    view.setUint16(4, 20, true)
    view.setUint16(6, 0, true)
    view.setUint16(8, 0, true)
    view.setUint16(10, dosTime, true)
    view.setUint16(12, dosDate, true)
    view.setUint32(14, crc, true)
    view.setUint32(18, size, true)
    view.setUint32(22, size, true)
    view.setUint16(26, nameBytes.length, true)
    view.setUint16(28, 0, true)
    bytes.set(nameBytes, 30)

    localParts.push(bytes)
    localParts.push(data)

    centralRecords.push({ nameBytes, crc, size, offset, dosTime, dosDate })
    offset += bytes.length + data.length
  }

  const centralParts: Uint8Array[] = []
  let centralSize = 0
  for (const record of centralRecords) {
    const header = new ArrayBuffer(46 + record.nameBytes.length)
    const view = new DataView(header)
    const bytes = new Uint8Array(header)

    view.setUint32(0, 0x02014b50, true)
    view.setUint16(4, 20, true)
    view.setUint16(6, 20, true)
    view.setUint16(8, 0, true)
    view.setUint16(10, 0, true)
    view.setUint16(12, record.dosTime, true)
    view.setUint16(14, record.dosDate, true)
    view.setUint32(16, record.crc, true)
    view.setUint32(20, record.size, true)
    view.setUint32(24, record.size, true)
    view.setUint16(28, record.nameBytes.length, true)
    view.setUint16(30, 0, true)
    view.setUint16(32, 0, true)
    view.setUint16(34, 0, true)
    view.setUint16(36, 0, true)
    view.setUint32(38, 0, true)
    view.setUint32(42, record.offset, true)
    bytes.set(record.nameBytes, 46)

    centralParts.push(bytes)
    centralSize += bytes.length
  }

  const endRecord = new ArrayBuffer(22)
  const endView = new DataView(endRecord)
  endView.setUint32(0, 0x06054b50, true)
  endView.setUint16(4, 0, true)
  endView.setUint16(6, 0, true)
  endView.setUint16(8, centralRecords.length, true)
  endView.setUint16(10, centralRecords.length, true)
  endView.setUint32(12, centralSize, true)
  endView.setUint32(16, offset, true)
  endView.setUint16(20, 0, true)

  return new Blob(
    [...localParts, ...centralParts, new Uint8Array(endRecord)],
    { type: 'application/zip' }
  )
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

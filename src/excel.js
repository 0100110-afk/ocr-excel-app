import ExcelJS from 'exceljs'
import { COLUMNS } from './columns.js'

const pad = (n) => String(n).padStart(2, '0')

export function exportFileName(d = new Date()) {
  return (
    `export_tickets_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}_${pad(d.getMinutes())}_${pad(d.getSeconds())}.xlsx`
  )
}

// Cột num: chỉ gồm chữ số (tối đa 15 chữ số, giới hạn độ chính xác của Excel) thì ghi dạng số.
// Giá trị khác (có chữ, dấu +, để trống...) vẫn ghi dạng văn bản để không mất dữ liệu.
export function cellValue(col, raw) {
  const v = raw == null ? '' : String(raw).trim()
  if (col.num && /^\d{1,15}$/.test(v)) return Number(v)
  return v
}

// Tạo workbook theo mẫu: header nền xanh lá, chữ trắng, định dạng ô là General
export async function buildWorkbook(rows) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Worksheet')

  ws.columns = COLUMNS.map((c) => ({ key: c.key, width: c.width }))

  const header = ws.getRow(1)
  COLUMNS.forEach((c, i) => {
    const cell = header.getCell(i + 1)
    cell.value = c.header
    cell.font = { name: 'Calibri', size: 11, bold: false, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B050' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })

  rows.forEach((r, idx) => {
    const row = ws.getRow(idx + 2)
    COLUMNS.forEach((c, i) => {
      const cell = row.getCell(i + 1)
      cell.value = cellValue(c, r[c.key])
      cell.font = { name: 'Calibri', size: 11 }
      // Số cũng căn trái cho đồng đều với các cột chữ
      cell.alignment = { horizontal: 'left', vertical: 'bottom' }
    })
  })

  return wb
}

export async function downloadWorkbook(rows) {
  const wb = await buildWorkbook(rows)
  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = exportFileName()
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

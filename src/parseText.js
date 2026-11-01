import { splitAddress } from './address.js'
// Lọc dữ liệu từ đoạn văn bản copy trên trang "Chi tiết Yêu cầu" (không cần AI, chạy ngay trên trình duyệt)

const LABELS = [
  'Mã yêu cầu',
  'Mã thiết bị',
  'Trạng thái',
  'Ghi chú',
  'Tên thiết bị',
  'Ngày lắp đặt',
  'Thông tin cửa hàng',
  'Địa chỉ thiết bị',
  'Tình trạng bảo hành',
  'Thông tin giám sát bán hàng',
  'Luỹ kế hạng mục sửa chữa',
  'Lũy kế hạng mục sửa chữa',
  'Tổng chi phí sửa chữa',
  'Tổng chi phí di chuyển',
  'Tổng chi phí',
  'Loại dịch vụ',
  'Lựa chọn nhà cung cấp',
  'Lựa chọn kỹ thuật viên',
  'Thời gian dự kiến',
  'Tình trạng thiết bị',
  'Mô tả tình trạng thiết bị',
]

const norm = (s) =>
  String(s ?? '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .replace(/[:：]\s*$/, '')
    .trim()
    .toLowerCase()

const LABEL_SET = new Set(LABELS.map(norm))
const isLabel = (s) => LABEL_SET.has(norm(s))
const isPhone = (s) => /^\+?[\d\s.()-]{8,}$/.test(String(s).trim()) && /\d{8,}/.test(String(s).replace(/\D/g, ''))
const cleanPhone = (s) => String(s).replace(/[\s.()-]/g, '')

// Tách văn bản thành các dòng; nếu copy dạng "Nhãn<TAB>Giá trị" thì tách thành 2 dòng
function toLines(text) {
  const out = []
  for (const raw of String(text ?? '').replace(/\r/g, '').split('\n')) {
    const parts = raw.split('\t')
    for (const p of parts) {
      const t = p.replace(/ /g, ' ').trim()
      if (t) out.push(t)
    }
  }
  return out
}

// Giá trị ngay sau nhãn (bỏ qua nếu dòng kế tiếp lại là một nhãn khác -> ô trống)
function valueAfter(lines, i) {
  const next = lines[i + 1]
  if (next === undefined || isLabel(next)) return ''
  return next
}

// Khối "tên + số điện thoại" (Thông tin cửa hàng / giám sát bán hàng)
function contactAfter(lines, i) {
  let name = ''
  let phone = ''
  let j = i + 1
  const first = lines[j]
  if (first !== undefined && !isLabel(first)) {
    if (isPhone(first)) {
      phone = cleanPhone(first)
      j += 1
    } else {
      name = first
      j += 1
      const second = lines[j]
      if (second !== undefined && !isLabel(second) && isPhone(second)) phone = cleanPhone(second)
    }
  }
  return { name, phone }
}

function parseOne(lines) {
  const row = { maYeuCau: '', maThietBi: '', tinhTrang: '', tenGSBH: '', sdtGSBH: '', tenKhach: '', sdtKhach: '', diaChi: '', xaPhuong: '', tinhTP: '', loaiTB: '' }
  for (let i = 0; i < lines.length; i++) {
    const key = norm(lines[i])
    if (!LABEL_SET.has(key)) continue
    if (key === 'mã yêu cầu') row.maYeuCau = valueAfter(lines, i)
    else if (key === 'mã thiết bị') row.maThietBi = valueAfter(lines, i)
    else if (key === 'tên thiết bị') row.loaiTB = valueAfter(lines, i)
    else if (key === 'địa chỉ thiết bị') row.diaChi = valueAfter(lines, i)
    else if (key === 'mô tả tình trạng thiết bị') {
      // Mô tả có thể xuống nhiều dòng: lấy đến khi gặp nhãn khác hoặc hết yêu cầu
      const parts = []
      for (let j = i + 1; j < lines.length && !isLabel(lines[j]); j++) parts.push(lines[j])
      row.tinhTrang = parts.join(' ')
    }
    else if (key === 'thông tin cửa hàng') {
      const c = contactAfter(lines, i)
      row.tenKhach = c.name
      row.sdtKhach = c.phone
    } else if (key === 'thông tin giám sát bán hàng') {
      const c = contactAfter(lines, i)
      row.tenGSBH = c.name
      row.sdtGSBH = c.phone
    }
  }
  Object.assign(row, splitAddress(row.diaChi))
  return row
}

const FIELD_NAMES = {
  maYeuCau: 'Mã yêu cầu',
  maThietBi: 'Mã thiết bị',
  tinhTrang: 'Tình trạng thiết bị',
  tenGSBH: 'Tên GSBH',
  sdtGSBH: 'SĐT GSBH',
  tenKhach: 'Tên khách hàng',
  sdtKhach: 'SĐT khách hàng',
  diaChi: 'Địa chỉ',
  xaPhuong: 'Xã/Phường',
  tinhTP: 'Tỉnh/Thành phố',
  loaiTB: 'Loại thiết bị',
}

// Trả về { rows, warnings }. Dán nhiều yêu cầu liền nhau cũng được (tách tại mỗi "Mã yêu cầu").
export function parseTickets(text) {
  const lines = toLines(text)
  const starts = []
  lines.forEach((l, i) => {
    if (norm(l) === 'mã yêu cầu') starts.push(i)
  })

  const chunks = []
  if (!starts.length) chunks.push(lines)
  else starts.forEach((s, k) => chunks.push(lines.slice(s, k + 1 < starts.length ? starts[k + 1] : lines.length)))

  const rows = []
  const warnings = []
  for (const chunk of chunks) {
    const row = parseOne(chunk)
    if (!Object.values(row).some(Boolean)) continue
    rows.push(row)
    const missing = Object.keys(FIELD_NAMES).filter((k) => !row[k])
    if (missing.length) {
      warnings.push(`${row.maYeuCau || `Yêu cầu ${rows.length}`}: thiếu ${missing.map((k) => FIELD_NAMES[k]).join(', ')}`)
    }
  }
  return { rows, warnings }
}

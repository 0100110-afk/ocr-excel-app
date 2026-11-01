// Tách Xã/Phường và Tỉnh/Thành phố từ địa chỉ thiết bị (các đoạn cách nhau bằng dấu phẩy).
// - Tỉnh/Thành phố: đoạn cuối cùng.
// - Xã/Phường: đoạn cuối cùng bắt đầu bằng "Phường", "Xã" hoặc "Thị trấn" (địa chỉ hay lặp phường nhiều lần).
const WARD = /^(phường|xã|thị trấn)(?=\s|$)/i

// Làm sạch địa chỉ: bỏ đoạn trống (",,") và đoạn trùng nhau (chỉ giữ lần đầu), ví dụ "Xã A,Xã A,Hà Nội" -> "Xã A,Hà Nội"
export function cleanAddress(diaChi) {
  const seen = new Set()
  const out = []
  for (const raw of String(diaChi ?? '').split(',')) {
    const p = raw.replace(/\s+/g, ' ').trim()
    if (!p) continue
    const k = p.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(p)
  }
  return out.join(',')
}

export function splitAddress(diaChi) {
  const parts = String(diaChi ?? '')
    .split(',')
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  if (!parts.length) return { xaPhuong: '', tinhTP: '' }
  let xaPhuong = ''
  for (let i = parts.length - 1; i >= 0; i--) {
    if (WARD.test(parts[i])) {
      xaPhuong = parts[i]
      break
    }
  }
  const last = parts[parts.length - 1]
  // Nếu đoạn cuối chính là phường/xã (không có tỉnh) thì không coi đó là tỉnh
  const tinhTP = WARD.test(last) ? '' : last
  return { xaPhuong, tinhTP }
}

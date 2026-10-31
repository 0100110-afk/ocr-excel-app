// Lấy các ảnh từ clipboard (copy ảnh, Print Screen, Win+Shift+S, copy ảnh từ web...)
export function imagesFromClipboard(clipboardData) {
  const out = []
  if (!clipboardData) return out

  for (const f of Array.from(clipboardData.files || [])) {
    if (f.type && f.type.startsWith('image/')) out.push(f)
  }
  // Một số trình duyệt chỉ trả ảnh qua items
  if (!out.length) {
    for (const it of Array.from(clipboardData.items || [])) {
      if (it.kind === 'file' && it.type && it.type.startsWith('image/')) {
        const f = it.getAsFile()
        if (f) out.push(f)
      }
    }
  }
  return out
}

const pad = (n) => String(n).padStart(2, '0')

// Ảnh dán vào đều tên "image.png", đặt lại tên cho dễ phân biệt
export function pastedName(index, total, d = new Date()) {
  const t = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  return total > 1 ? `Ảnh dán ${t} (${index + 1})` : `Ảnh dán ${t}`
}

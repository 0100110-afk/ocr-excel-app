// Gọi Gemini Vision trực tiếp từ trình duyệt bằng API key người dùng nhập
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'

const PROMPT = `Đây là ảnh chụp màn hình trang "Chi tiết Yêu cầu" của hệ thống quản lý thiết bị cửa hàng (tiếng Việt).
Hãy đọc chính xác từng ký tự (giữ nguyên dấu tiếng Việt) và trích xuất các trường sau:

- maYeuCau: giá trị của "Mã yêu cầu" (ví dụ T002528)
- maThietBi: giá trị của "Mã thiết bị"
- tenGSBH: TÊN trong mục "Thông tin giám sát bán hàng" (dòng trên)
- sdtGSBH: SỐ ĐIỆN THOẠI trong mục "Thông tin giám sát bán hàng" (dòng dưới)
- tenKhach: TÊN trong mục "Thông tin cửa hàng" (dòng trên)
- sdtKhach: SỐ ĐIỆN THOẠI trong mục "Thông tin cửa hàng" (dòng dưới)
- diaChi: giá trị của "Địa chỉ thiết bị", giữ nguyên toàn bộ, kể cả dấu phẩy

Quy tắc:
- Số điện thoại là chuỗi, GIỮ NGUYÊN số 0 đầu, chỉ gồm chữ số.
- Nếu một trường không có hoặc không nhìn thấy, trả về chuỗi rỗng "".
- Không tự suy đoán hay bịa dữ liệu.
- Nếu ảnh có nhiều yêu cầu khác nhau, trả về mỗi yêu cầu một phần tử; thường chỉ có 1.
- Chỉ trả về JSON.`

const SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      maYeuCau: { type: 'STRING' },
      maThietBi: { type: 'STRING' },
      tenGSBH: { type: 'STRING' },
      sdtGSBH: { type: 'STRING' },
      tenKhach: { type: 'STRING' },
      sdtKhach: { type: 'STRING' },
      diaChi: { type: 'STRING' },
    },
    required: ['maYeuCau', 'maThietBi', 'tenGSBH', 'sdtGSBH', 'tenKhach', 'sdtKhach', 'diaChi'],
  },
}

// Thu nhỏ ảnh để gửi nhanh, nhẹ (tối đa 2000px)
export async function fileToBase64(file, maxSide = 2000) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
  return dataUrl.split(',')[1]
}

function explainError(status, body) {
  const msg = body?.error?.message || ''
  if (status === 400 && /API key/i.test(msg)) return 'API key không hợp lệ. Hãy kiểm tra lại key trong phần Cài đặt.'
  if (status === 403) return 'API key bị từ chối hoặc chưa được phép dùng. Kiểm tra lại key.'
  if (status === 404) return 'Model không tồn tại. Hãy đổi sang model khác trong Cài đặt (ví dụ gemini-flash-latest).'
  if (status === 429) return 'Hết lượt dùng miễn phí (theo phút hoặc theo ngày). Chờ một lúc rồi thử lại.'
  if (status >= 500) return 'Máy chủ Gemini đang bận, thử lại sau.'
  return msg || `Lỗi ${status}`
}

export async function extractFromImage({ file, apiKey, model, signal }) {
  const data = await fileToBase64(file)
  const url = `${ENDPOINT}/${encodeURIComponent(model)}:generateContent`

  const body = {
    contents: [
      {
        parts: [
          { inline_data: { mime_type: 'image/jpeg', data } },
          { text: PROMPT },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: SCHEMA,
    },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body),
    signal,
  })

  let json = null
  try {
    json = await res.json()
  } catch {
    /* ignore */
  }
  if (!res.ok) throw new Error(explainError(res.status, json))

  const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || ''
  if (!text) throw new Error('Gemini không trả về dữ liệu (ảnh có thể bị chặn hoặc không đọc được).')

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Không phân tích được kết quả trả về từ Gemini.')
  }
  const arr = Array.isArray(parsed) ? parsed : [parsed]
  return arr.map((r) => ({
    maYeuCau: String(r.maYeuCau ?? '').trim(),
    maThietBi: String(r.maThietBi ?? '').trim(),
    tenGSBH: String(r.tenGSBH ?? '').trim(),
    sdtGSBH: String(r.sdtGSBH ?? '').replace(/\s+/g, ''),
    tenKhach: String(r.tenKhach ?? '').trim(),
    sdtKhach: String(r.sdtKhach ?? '').replace(/\s+/g, ''),
    diaChi: String(r.diaChi ?? '').trim(),
  }))
}

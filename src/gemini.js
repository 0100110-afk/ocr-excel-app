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
- tinhTrang: nội dung của mục "Mô tả tình trạng thiết bị" (thường nằm cuối trang; nếu ảnh không chụp tới mục này thì để chuỗi rỗng)

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
      tinhTrang: { type: 'STRING' },
    },
    required: ['maYeuCau', 'maThietBi', 'tenGSBH', 'sdtGSBH', 'tenKhach', 'sdtKhach', 'diaChi', 'tinhTrang'],
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

// ---- Lỗi, thử lại, model dự phòng ----
export class GeminiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status // 0 = lỗi mạng, -1 = người dùng bấm Dừng
  }
}

const RETRYABLE = new Set([0, 429, 500, 502, 503, 504])
export const RETRY_DELAYS = [3000, 8000, 20000] // thử lại tối đa 3 lần

function explainError(status, body) {
  const raw = body?.error?.message || ''
  const detail = raw ? ` — ${raw.slice(0, 160)}` : ''
  if (status === 400 && /API key/i.test(raw)) return 'API key không hợp lệ. Hãy kiểm tra lại key trong phần Cài đặt.'
  if (status === 403) return `API key bị từ chối hoặc chưa được phép dùng (403)${detail}`
  if (status === 404) return `Model không tồn tại (404). Hãy đổi tên model trong Cài đặt${detail}`
  if (status === 429) return `Hết lượt dùng miễn phí theo phút hoặc theo ngày (429)${detail}`
  if (status >= 500) return `Máy chủ Gemini đang bận (${status})${detail}`
  return `Lỗi ${status}${detail}`
}

async function sleepCancelable(ms, shouldCancel) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    if (shouldCancel?.()) throw new GeminiError('Đã dừng.', -1)
    await new Promise((r) => setTimeout(r, Math.min(250, end - Date.now())))
  }
}

async function callGemini({ data, apiKey, model, signal }) {
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

  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
      signal,
    })
  } catch {
    throw new GeminiError('Không kết nối được tới Gemini (kiểm tra mạng).', 0)
  }

  let json = null
  try {
    json = await res.json()
  } catch {
    /* ignore */
  }
  if (!res.ok) throw new GeminiError(explainError(res.status, json), res.status)

  const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || ''
  if (!text) throw new GeminiError('Gemini không trả về dữ liệu (ảnh có thể bị chặn hoặc không đọc được).', 200)

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new GeminiError('Không phân tích được kết quả trả về từ Gemini.', 200)
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
    tinhTrang: String(r.tinhTrang ?? '').trim(),
  }))
}

// Đọc 1 ảnh: thử lại khi lỗi tạm thời, hết lần thì chuyển sang model dự phòng
export async function extractFromImage({ file, apiKey, model, fallbackModel, onStatus, shouldCancel, imageData }) {
  const data = imageData ?? (await fileToBase64(file))
  const models = [model]
  if (fallbackModel && fallbackModel !== model) models.push(fallbackModel)

  let lastErr = null
  for (let m = 0; m < models.length; m++) {
    const mdl = models[m]
    const hasNext = m < models.length - 1

    for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
      if (shouldCancel?.()) throw new GeminiError('Đã dừng.', -1)
      try {
        return await callGemini({ data, apiKey, model: mdl })
      } catch (e) {
        if (e.status === -1) throw e
        lastErr = e
        if (e.status === 404 && hasNext) break // model chính không tồn tại -> sang model dự phòng
        if (!RETRYABLE.has(e.status)) throw e // key sai, ảnh lỗi... thử lại cũng vô ích
        if (attempt < RETRY_DELAYS.length) {
          const wait = RETRY_DELAYS[attempt]
          onStatus?.(`${e.message.replace(/[.\s]+$/, '')}. Thử lại lần ${attempt + 1}/${RETRY_DELAYS.length} sau ${wait / 1000} giây...`)
          await sleepCancelable(wait, shouldCancel)
        }
      }
    }

    if (hasNext) onStatus?.(`Model ${mdl} vẫn lỗi, chuyển sang model dự phòng ${models[m + 1]}...`)
  }
  throw lastErr
}

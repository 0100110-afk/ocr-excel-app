import React, { useEffect, useMemo, useRef, useState } from 'react'
import { COLUMNS } from './columns.js'
import { extractFromImage } from './gemini.js'
import { downloadWorkbook } from './excel.js'

const LS_KEY = 'ocr_excel_gemini_key'
const LS_MODEL = 'ocr_excel_gemini_model'
const DEFAULT_MODEL = 'gemini-flash-latest'
const MODEL_SUGGESTIONS = ['gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-2.5-flash', 'gemini-3-flash-preview']

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const maskKey = (k) => (k ? `${k.slice(0, 4)}••••••••${k.slice(-4)}` : '')

function loadLS(key, fallback = '') {
  try {
    return localStorage.getItem(key) || fallback
  } catch {
    return fallback
  }
}
function saveLS(key, value) {
  try {
    if (value) localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

let uid = 0

export default function App() {
  const [apiKey, setApiKey] = useState(() => loadLS(LS_KEY))
  const [model, setModel] = useState(() => loadLS(LS_MODEL, DEFAULT_MODEL))
  const [showSettings, setShowSettings] = useState(() => !loadLS(LS_KEY))
  const [keyInput, setKeyInput] = useState('')
  const [modelInput, setModelInput] = useState(() => loadLS(LS_MODEL, DEFAULT_MODEL))
  const [showKey, setShowKey] = useState(false)

  const [items, setItems] = useState([]) // {id, file, url, status, error, rows}
  const [running, setRunning] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef(null)
  const cancelRef = useRef(false)

  useEffect(() => {
    return () => items.forEach((it) => URL.revokeObjectURL(it.url))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const allRows = useMemo(
    () => items.flatMap((it) => it.rows.map((r, i) => ({ itemId: it.id, idx: i, row: r }))),
    [items]
  )

  const pending = items.filter((it) => it.status === 'wait' || it.status === 'error').length
  const doneCount = items.filter((it) => it.status === 'done').length

  // ---- Cài đặt API key ----
  function saveSettings() {
    const k = keyInput.trim()
    const m = modelInput.trim() || DEFAULT_MODEL
    if (k) {
      setApiKey(k)
      saveLS(LS_KEY, k)
    }
    setModel(m)
    saveLS(LS_MODEL, m)
    setKeyInput('')
    setShowKey(false)
    if (k || apiKey) setShowSettings(false)
  }
  function removeKey() {
    if (!window.confirm('Xóa API key đã lưu trên trình duyệt này?')) return
    setApiKey('')
    saveLS(LS_KEY, '')
    setKeyInput('')
  }

  // ---- Thêm ảnh ----
  function addFiles(fileList) {
    const imgs = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'))
    if (!imgs.length) return
    setItems((prev) => [
      ...prev,
      ...imgs.map((file) => ({
        id: ++uid,
        file,
        url: URL.createObjectURL(file),
        status: 'wait',
        error: '',
        rows: [],
      })),
    ])
  }
  function removeItem(id) {
    setItems((prev) => {
      const it = prev.find((x) => x.id === id)
      if (it) URL.revokeObjectURL(it.url)
      return prev.filter((x) => x.id !== id)
    })
  }
  function clearAll() {
    items.forEach((it) => URL.revokeObjectURL(it.url))
    setItems([])
  }

  // ---- Đọc ảnh ----
  const patch = (id, p) => setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...p } : x)))

  async function runExtraction() {
    if (!apiKey) {
      setShowSettings(true)
      return
    }
    cancelRef.current = false
    setRunning(true)
    const todo = items.filter((it) => it.status === 'wait' || it.status === 'error')
    for (let n = 0; n < todo.length; n++) {
      if (cancelRef.current) break
      const it = todo[n]
      patch(it.id, { status: 'busy', error: '' })
      try {
        let rows
        try {
          rows = await extractFromImage({ file: it.file, apiKey, model })
        } catch (e) {
          // Gặp giới hạn theo phút -> chờ 20 giây rồi thử lại 1 lần
          if (/Hết lượt/.test(e.message) && !cancelRef.current) {
            patch(it.id, { status: 'busy', error: 'Đang chờ 20 giây do giới hạn lượt...' })
            await sleep(20000)
            patch(it.id, { error: '' })
            rows = await extractFromImage({ file: it.file, apiKey, model })
          } else throw e
        }
        patch(it.id, { status: 'done', rows, error: '' })
      } catch (e) {
        patch(it.id, { status: 'error', error: e.message || 'Lỗi không xác định' })
      }
      if (n < todo.length - 1) await sleep(1500) // tránh vượt giới hạn RPM của gói free
    }
    setRunning(false)
  }

  // ---- Sửa dữ liệu ----
  function editCell(itemId, idx, key, value) {
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId
          ? { ...it, rows: it.rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r)) }
          : it
      )
    )
  }
  function removeRow(itemId, idx) {
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, rows: it.rows.filter((_, i) => i !== idx) } : it))
    )
  }

  async function exportExcel() {
    await downloadWorkbook(allRows.map((x) => x.row))
  }

  const statusLabel = { wait: 'Chờ đọc', busy: 'Đang đọc...', done: 'Đã đọc', error: 'Lỗi' }

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>Ảnh → Excel</h1>
          <p className="sub">Tải ảnh chi tiết yêu cầu lên, app đọc dữ liệu và xuất 1 file Excel theo mẫu.</p>
        </div>
        <button className="btn ghost" onClick={() => setShowSettings((s) => !s)}>
          ⚙ API key {apiKey ? '✓' : '(chưa có)'}
        </button>
      </header>

      {showSettings && (
        <section className="card settings">
          <h2>Cài đặt Gemini API</h2>
          {apiKey ? (
            <p className="hint">
              Key đang lưu: <code>{maskKey(apiKey)}</code> (chỉ lưu trong trình duyệt này). Nhập key mới bên dưới để thay đổi.
            </p>
          ) : (
            <p className="hint">
              Chưa có key. Lấy miễn phí tại <b>aistudio.google.com</b> → Get API key → Create API key, rồi dán vào đây.
            </p>
          )}
          <label className="field">
            <span>{apiKey ? 'API key mới (để trống nếu giữ nguyên)' : 'API key'}</span>
            <div className="row">
              <input
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="AIza..."
                autoComplete="off"
                spellCheck={false}
              />
              <button className="btn ghost" type="button" onClick={() => setShowKey((s) => !s)}>
                {showKey ? 'Ẩn' : 'Hiện'}
              </button>
            </div>
          </label>
          <label className="field">
            <span>Model</span>
            <input
              list="models"
              value={modelInput}
              onChange={(e) => setModelInput(e.target.value)}
              spellCheck={false}
            />
            <datalist id="models">
              {MODEL_SUGGESTIONS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            <small>Mặc định gemini-flash-latest (tự trỏ tới bản Flash mới nhất). Nếu báo lỗi model, thử tên khác.</small>
          </label>
          <div className="row gap">
            <button className="btn primary" onClick={saveSettings} disabled={!keyInput.trim() && !apiKey}>
              Lưu
            </button>
            {apiKey && (
              <button className="btn danger" onClick={removeKey}>
                Xóa key
              </button>
            )}
            {apiKey && (
              <button className="btn ghost" onClick={() => setShowSettings(false)}>
                Đóng
              </button>
            )}
          </div>
          <p className="warn">
            Key chỉ nằm trong trình duyệt của bạn, không gửi lên máy chủ nào khác ngoài Google. Không dùng app này trên máy dùng chung.
            Gói miễn phí của Google có thể dùng ảnh để cải thiện sản phẩm, tránh up ảnh chứa thông tin nhạy cảm.
          </p>
        </section>
      )}

      <section
        className={'drop' + (dragOver ? ' over' : '')}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          addFiles(e.dataTransfer.files)
        }}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <strong>Bấm để chọn ảnh</strong> hoặc kéo thả vào đây
        <span>Chọn 1 hoặc nhiều ảnh cùng lúc. Tất cả sẽ ra chung 1 file Excel.</span>
      </section>

      {items.length > 0 && (
        <section className="card">
          <div className="bar">
            <div>
              <b>{items.length}</b> ảnh · <b>{doneCount}</b> đã đọc · <b>{allRows.length}</b> dòng dữ liệu
            </div>
            <div className="row gap">
              {running ? (
                <button className="btn danger" onClick={() => (cancelRef.current = true)}>
                  Dừng
                </button>
              ) : (
                <button className="btn primary" onClick={runExtraction} disabled={pending === 0}>
                  {pending === items.length ? `Đọc ${pending} ảnh` : `Đọc ${pending} ảnh còn lại`}
                </button>
              )}
              <button className="btn ghost" onClick={clearAll} disabled={running}>
                Xóa tất cả
              </button>
            </div>
          </div>

          <ul className="thumbs">
            {items.map((it) => (
              <li key={it.id} className={'thumb ' + it.status}>
                <img src={it.url} alt={it.file.name} />
                <div className="meta">
                  <span className="name" title={it.file.name}>
                    {it.file.name}
                  </span>
                  <span className={'badge ' + it.status}>{statusLabel[it.status]}</span>
                  {it.error && <span className="err">{it.error}</span>}
                </div>
                <button className="x" onClick={() => removeItem(it.id)} disabled={running && it.status === 'busy'} title="Bỏ ảnh này">
                  ×
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {allRows.length > 0 && (
        <section className="card">
          <div className="bar">
            <h2>Kiểm tra dữ liệu</h2>
            <button className="btn primary" onClick={exportExcel}>
              ⬇ Xuất Excel ({allRows.length} dòng)
            </button>
          </div>
          <p className="hint">Có thể sửa trực tiếp trong ô nếu đọc sai. Số điện thoại được lưu dạng văn bản để giữ số 0 đầu.</p>
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  {COLUMNS.map((c) => (
                    <th key={c.key}>{c.header}</th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {allRows.map((x, n) => (
                  <tr key={x.itemId + '-' + x.idx}>
                    <td className="num">{n + 1}</td>
                    {COLUMNS.map((c) => (
                      <td key={c.key}>
                        <input
                          className={c.key === 'diaChi' ? 'wide' : ''}
                          value={x.row[c.key]}
                          onChange={(e) => editCell(x.itemId, x.idx, c.key, e.target.value)}
                        />
                      </td>
                    ))}
                    <td>
                      <button className="x" onClick={() => removeRow(x.itemId, x.idx)} title="Xóa dòng">
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

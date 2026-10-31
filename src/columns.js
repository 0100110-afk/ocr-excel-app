// Cấu trúc cột theo file Excel mẫu (export_tickets)
export const COLUMNS = [
  { key: 'maYeuCau', header: 'Mã yêu cầu', width: 13, text: false },
  { key: 'maThietBi', header: 'Mã thiết bị', width: 13, text: false },
  { key: 'tenGSBH', header: 'Tên GSBH', width: 20, text: false },
  { key: 'sdtGSBH', header: 'SĐT GSBH', width: 14, text: true },
  { key: 'tenKhach', header: 'Tên khách hàng', width: 22, text: false },
  { key: 'sdtKhach', header: 'SĐT khách hàng', width: 17, text: true },
  { key: 'diaChi', header: 'Địa chỉ', width: 80, text: false },
]

export const emptyRow = () =>
  Object.fromEntries(COLUMNS.map((c) => [c.key, '']))

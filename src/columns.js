// Cấu trúc cột theo file Excel mẫu (export_tickets).
// num: true  -> ghi vào Excel dạng SỐ (định dạng General), không bị báo lỗi "số lưu dạng văn bản".
export const COLUMNS = [
  // width = độ rộng cột trong Excel; minW = độ rộng tối thiểu ô nhập trong bảng trên web (px)
  { key: 'maYeuCau', header: 'Mã yêu cầu', width: 13, minW: 108 },
  { key: 'maThietBi', header: 'Mã thiết bị', width: 13, num: true, minW: 116 },
  { key: 'tinhTrang', header: 'Tình trạng thiết bị', width: 34, minW: 240 },
  { key: 'tenGSBH', header: 'Tên GSBH', width: 20, minW: 140 },
  { key: 'sdtGSBH', header: 'SĐT GSBH', width: 14, num: true, minW: 120 },
  { key: 'tenKhach', header: 'Tên khách hàng', width: 22, minW: 180 },
  { key: 'sdtKhach', header: 'SĐT khách hàng', width: 17, num: true, minW: 124 },
  { key: 'diaChi', header: 'Địa chỉ', width: 80, minW: 200 },
]

export const emptyRow = () =>
  Object.fromEntries(COLUMNS.map((c) => [c.key, '']))

# Ảnh → Excel (đọc ảnh chi tiết yêu cầu, xuất Excel theo mẫu)

Web app tĩnh (React + Vite). Đọc ảnh bằng Gemini Vision, xuất file Excel gồm 7 cột:
Mã yêu cầu | Mã thiết bị | Tên GSBH | SĐT GSBH | Tên khách hàng | SĐT khách hàng | Địa chỉ

## Hai cách nhập dữ liệu
**Cách 1: Chọn ảnh** (cần API key Gemini)
1. Bấm nút **API key** ở góc phải, dán key rồi **Lưu** (đổi hoặc xóa lúc nào cũng được).
2. Chọn 1 hoặc nhiều ảnh, kéo thả, hoặc nhấn **Ctrl + V** để dán ảnh vừa copy / vừa chụp màn hình.
3. Bấm **Đọc ảnh**. Mỗi ảnh ra 1 dòng, tất cả gộp chung 1 bảng.

**Cách 2: Dán văn bản** (không cần API key, không tốn lượt Gemini)
1. Sang tab **Dán văn bản**.
2. Copy toàn bộ nội dung trang "Chi tiết Yêu cầu" (từ dòng "Mã yêu cầu") rồi dán vào ô.
3. Bấm **Lọc dữ liệu**. Dán nhiều yêu cầu liền nhau cũng được, mỗi yêu cầu ra 1 dòng.
4. Ô nào không tìm thấy dữ liệu sẽ để trống và có cảnh báo để anh/chị tự điền.

Hai cách dùng chung 1 bảng: có thể vừa đọc ảnh vừa dán văn bản, rồi xuất 1 file.

Sau đó: kiểm tra, sửa ô nếu cần, bấm **Xuất Excel**. Tên file dạng `export_tickets_2026-10-31 11_23_28.xlsx`.

## Lấy API key miễn phí
aistudio.google.com → đăng nhập Gmail → Get API key → Create API key.
Key chỉ lưu trong trình duyệt (localStorage), không nằm trong code, không lên GitHub.

## Đưa lên GitHub + Vercel
1. Giải nén, tạo repo mới trên GitHub, đẩy toàn bộ thư mục lên:
   ```
   git init
   git add .
   git commit -m "init"
   git branch -M main
   git remote add origin https://github.com/<tên-bạn>/<tên-repo>.git
   git push -u origin main
   ```
2. Vào vercel.com → Add New → Project → chọn repo vừa tạo.
3. Vercel tự nhận Vite (Build: `npm run build`, Output: `dist`). Bấm **Deploy**. Không cần biến môi trường.

## Chạy thử trên máy
```
npm install
npm run dev
```

## Lưu ý
- Model mặc định `gemini-flash-latest` (tự trỏ tới bản Flash mới nhất). Các bản 2.5 đã/đang bị Google ngừng, nếu báo lỗi model thì đổi tên model trong phần cài đặt.
- Gói free có giới hạn lượt theo phút và theo ngày. App tự cách 1,5 giây giữa các ảnh và tự chờ 20 giây thử lại 1 lần khi chạm giới hạn phút. Hết lượt ngày thì báo lỗi, những ảnh đã đọc không bị mất.
- Gói free của Google có thể dùng dữ liệu ảnh để cải thiện sản phẩm, tránh up ảnh nhạy cảm.
- Nếu ảnh đọc không đủ trường (bị cắt mất phần Thông tin giám sát bán hàng), ô tương ứng để trống để bạn tự điền. Nên chụp đủ các dòng: Mã yêu cầu, Mã thiết bị, Thông tin cửa hàng, Địa chỉ thiết bị, Thông tin giám sát bán hàng.

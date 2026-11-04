# EnglsMyOwn

App học tiếng Anh cá nhân: từ vựng theo batch, video sáu bước, báo cáo và bạn mèo Mochi. React + TypeScript + Vite, Firebase Auth/Firestore, GitHub Pages.

## Chạy preview

Node.js 24 được dùng trong CI.

```sh
npm ci
npm run dev
```

Mở URL Vite in ra (mặc định `http://127.0.0.1:5173/EnglsMyOwn/`). Khi chưa cấu hình Firebase, **chỉ dev server** dùng bộ pilot 10 cụm với bản thu người thật, hai ví dụ và nội dung học sâu; tiến độ lưu trên trình duyệt. Account settings → Preview scenario để thử học mới hoặc review hôm qua, mỗi kịch bản lưu riêng. Xem [format v2 và giới hạn kiểm chứng](docs/content/vocabulary-format-v2.md). Video để giai đoạn sau.

`npm run build` tạo bản production không chứa fixtures hoặc lối vào demo. Thiếu Firebase config sẽ hiện màn thiết lập, không mở nội dung học.

Để thử lại từ đầu, Account settings → **Reset local preview**. Nút này chỉ xuất hiện trong demo local và xóa tiến độ mẫu trên trình duyệt đó.

## Cấu hình

Theo [hướng dẫn Firebase và GitHub Pages](docs/setup.md). Project đích: `english-app-6ca48`. Không cần VPS hay service-account key trong frontend. Xem [hướng dẫn nhập XLSX](docs/content/xlsx-import.md) và file mẫu trong `outputs/firebase-xlsx/`.

## Có trong bản đầu

- Today, Words/Learn/My words, Videos, Progress, tài khoản và studio; hai theme, mobile và sidebar laptop.
- Google sign-in, chờ duyệt, thu hồi quyền; Firestore Rules bảo vệ nội dung và dữ liệu cá nhân.
- Batch 10 từ × 4 dạng, review theo vòng, thử lại câu sai, khóa học mới theo toàn bộ review, vé và bữa ăn tự ghi nhận khi hoàn thành.
- Video search/filter/save, sáu bước, chọn câu, bản dịch và quiz câu. Drive iframe điều khiển thủ công.
- Biểu đồ cột/đường, lịch tháng; số từ và thời gian hoạt động trong batch đã hoàn thành.
- Mèo có hiệu ứng thở, đổi tên/tông màu/giới tính; lửa streak mỗi 8 giây, hỗ trợ Reduce Motion.
- Manifest/icon cho Home Screen; phiên bản online, chưa có offline/service worker.

## Kiểm tra

```sh
npm test
npm run build
# Cần Java 21. Chạy emulator demo, không truy cập Firebase thật.
npm run test:rules
```

CI chạy cả ba bước. Deploy Pages chỉ chạy khi chọn **Run workflow**.

[Phần đã làm và còn lại](docs/implementation-status.md) · [Format nội dung](docs/content-import.md) · [Quy tắc học](docs/learning-rules.md) · [Quyết định kỹ thuật](docs/technical-decisions-v1.md)

# Firebase và GitHub Pages

## 1. Firebase project

1. Project hiện tại: **english-app-6ca48**, web app **english-app**. Cấu hình local nằm trong `.env.local` (được gitignore). Không cần Analytics cho pilot.
2. Authentication → Sign-in method: bật **Google**, chọn email hỗ trợ.
3. Tạo Cloud Firestore **Standard edition**, database `(default)`, Production mode. Chọn region trước khi tạo.
4. Project settings → Your apps → Web SDK configuration: sao chép `.env.example` thành `.env.local`, điền `apiKey`, `authDomain`, `projectId`, `appId` vào biến tương ứng. Khởi động lại dev server.
5. Authentication → Settings → Authorized domains: thêm `localhost`, `127.0.0.1` để thử local và `maduzzz.github.io` cho Pages. Chỉ nhập hostname, không thêm `/EnglsMyOwn/`.

Web config sẽ nằm công khai trong bundle; Rules quyết định quyền truy cập. Không đặt service-account JSON hoặc private key trong frontend/repo.

Đăng nhập dùng popup từ nút bấm. Cần thử Safari và Home Screen thực tế; cho phép popup nếu bị chặn. Chưa có redirect fallback. [Firebase Google sign-in](https://firebase.google.com/docs/auth/web/google-signin).

## 2. Deploy Rules trước nội dung

Dán `firestore.rules` vào Firestore → Rules → Publish, hoặc:

```sh
npx firebase login
npx firebase deploy --only firestore:rules --project YOUR_PROJECT_ID
```

Thay project ID thực tế. Frontend không tự deploy Rules. Không bật Test mode hoặc `allow read, write: if true` để chữa lỗi quyền.

## 3. Chỉ định quản trị viên

1. Đăng nhập Google của bạn trong app đã có config. Tài khoản sẽ chờ duyệt; app tạo `users/<UID>` với `status: pending`, `role: learner`.
2. Lấy UID ở Authentication → Users, đối chiếu đúng email của bạn.
3. Trong Firestore Console tạo document **`config/access`**, field **`ownerUid`** kiểu string bằng chính UID đó.
4. Sửa **`users/<UID>`** của bạn: `status = approved`, `role = admin`; giữ `uid`, `email`, `displayName`.
5. App mở nội dung; Account settings → Open your studio để Approve/Revoke bạn bè.

Rules kiểm tra owner UID ở config, không tin role do client tự gửi. Client không đọc/ghi được config. Không có cơ chế người đăng nhập đầu tự thành admin. Pending/revoked không đọc words/lessons. Revoke chặn truy cập tiếp theo, không thu hồi được bản sao đã tải trước đó.

Firestore không bật persistent cache; Auth có thể ghi nhớ đăng nhập. [Rules kiểm tra quyền và document liên quan](https://firebase.google.com/docs/firestore/security/rules-conditions).

## 4. Dữ liệu và Google Drive

- Theo [hướng dẫn XLSX](content/xlsx-import.md), dùng file mẫu 10 cụm hoặc chuẩn bị file theo format v2. Studio → chọn file → xem trước → Import. Draft không hiện cho learner.
- Không commit nội dung riêng tư vào repo/public/src. Mẫu trong repo chỉ để kiểm tra UI.
- Video dùng Drive file ID; iframe mở `https://drive.google.com/file/d/FILE_ID/preview`.
- Video để giai đoạn sau. Quyết định hiện tại cho scope nhỏ là Drive **Anyone with the link**; người có link vẫn xem được bên ngoài app, Firebase không thu hồi quyền xem link đó. Không có app-only access với cơ chế này.
- Firebase session không đảm bảo Google session trong iframe. Dùng **Open in Drive** khi cần đăng nhập/cấp quyền. Play, tua và mute làm trực tiếp trong player; lượt nghe/xem do người học tự xác nhận.
- Audio từ vựng cần URL phát trực tiếp trong `<audio>` trên Safari. Drive `/preview` không phải audio URL; importer chặn khi publish. Phương thức phát audio Drive vẫn phải kiểm chứng bằng file thật trước khi nhập giáo trình. Code không tự đổi quyền chia sẻ.

## 5. GitHub Pages

1. Push source khi sẵn sàng. Settings → Pages → Source: **GitHub Actions**.
2. Workflow đã có cấu hình web công khai của `english-app-6ca48`. Nếu muốn đổi project, thay cả bốn giá trị qua Settings → Secrets and variables → Actions → **Variables**: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`. Không chỉ thay một biến vì sẽ trộn cấu hình hai project.
3. Push lên `main` để chạy **Deploy GitHub Pages**, hoặc chọn **Run workflow** để chạy lại. Workflow test, chạy Rules emulator, build rồi deploy `dist`. Nếu trang trắng và HTML còn chứa `/src/main.tsx`, kiểm tra lại Source ở bước 1.
4. Mở URL deployment trả về; repo hiện tại dự kiến `https://maduzzz.github.io/EnglsMyOwn/`. Xác nhận URL ở Pages và thêm hostname vào Firebase Authorized domains.

Base path tự lấy từ tên repo. Custom domain: đổi `VITE_BASE_PATH` trong workflow thành `/`, cấu hình DNS/Pages và Firebase domain tương ứng. Hash navigation không cần server rewrite khi refresh. [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## 6. Trước khi mời bạn bè

Thử Safari và Add to Home Screen trên iPhone 12 Pro Max/17 Pro Max: Google login, pending/approved/revoked; bàn phím và safe area; 40 nhiệm vụ; background và reload/reset; phát âm US/UK/chậm; Drive Restricted, play/fullscreen/ẩn hình/mute; light/dark và Reduce Motion. Kiểm thử viewport laptop không thay thiết bị thật.

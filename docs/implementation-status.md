# Implementation status

## Ranking update (2026-11-10)

Ranking now replaces Videos in the main navigation. It offers weekly points, lifetime best streak, and monthly new words. A separate `rankings/<uid>` summary has approved-only read rules; see [Ranking pilot](ranking-implementation.md). The new Firestore Rules were published to `english-app-6ca48` on 2026-11-10. Scores remain client-calculated for this small trusted pilot.

## Pilot

Source local, chưa push/deploy/tạo cloud project. Firebase adapter sẵn nhận config; Google Auth và Drive chưa kiểm thử bằng tài khoản/media thật. Fixtures chỉ import trong DEV, không có trong production.

Firestore: `users/<uid>` là hồ sơ/quyền; `config/access` giữ owner UID; `words/<id>` và `lessons/<id>` chỉ approved đọc published; `learning/<uid>` chỉ chính chủ approved đọc/ghi, kể cả owner không đọc learning của người khác từ client.

Learning state đang là một document/user, lưu bằng transaction. Cần chuyển records/plans/videos sang subcollection trước khi dữ liệu lớn để tránh giới hạn document. Giới hạn hiện tại 2.000 batch records không bảo đảm document luôn dưới giới hạn dung lượng. Kế hoạch ngày được snapshot khi mở app; tồn là các kế hoạch đã tạo chưa xong. Ngày cũ chọn bằng seed ngày, ổn định trong ngày.

Quyền content kiểm tra ở server; điểm/vé là số liệu tự theo dõi tính từ client, chưa chống người dùng tự sửa điểm. Chưa có leaderboard tin cậy. Muốn thi đua công khai cần xác thực kết quả ở backend.

## Còn lại

- Firebase thật, deploy Rules, Auth/Pages, kiểm tra với hai account.
- Nội dung đã duyệt và audio US/UK. Phương thức audio Drive cần kiểm chứng; iframe video không giải quyết audio từ vựng.
- Quiz video theo từ/cụm đã mark, ghi âm và shadowing nâng cao. Hiện lưu qua các nút xác nhận/Next/Back và Back to videos; đóng browser ngay khi đang gõ có thể mất draft chưa lưu.
- Mèo là ảnh Imagegen với CSS breathing, màu dùng filter. Giới tính lưu được; hoa văn, tai/đầu chuyển động độc lập, ăn và hình trưởng thành cần asset/animation riêng.
- Growth thử nghiệm: new batch 10 điểm, review 7, thêm active seconds/600; tổng giới hạn theo tuổi 25/ngày, milestone 500. Học thêm tăng progress nhưng không trưởng thành trong một ngày. Đây là thông số pilot cần điều chỉnh tiếp.
- Study time chỉ tính tương tác trong batch **đã hoàn thành**, không tính video/batch bỏ dở. Tab ẩn hoặc không tương tác 60 giây thì dừng; không suy ra thời gian Drive.
- Offline, App Check/rate limiting, chỉnh batch size, phân trang content chưa làm. Ranking đã có bản pilot; điểm chưa được backend xác thực.
- Cần thử thiết bị iPhone thật, Home Screen và bàn phím Safari.

## Verification

Local verification on 2026-10-31: 17 unit tests and 8 Rules Emulator tests passed; production build passed. Browser walkthrough completed a 40-task review (including a wrong answer/retry), confirmed unlock, completed a 40-task new batch, checked automatic ticket/meal, cancel/confirm reset, and finished all six sample-video steps including saving/restoring a translation draft. Mobile viewports 428×926 and 440×956 had no horizontal overflow; desktop has a separate sidebar layout. Screenshots are in `docs/screenshots/`. These are viewport checks, not physical iPhone/Safari certification.

Build TypeScript/Vite, unit tests và Firestore Rules Emulator/Java 21 chạy local. CI chạy lại trên push/PR và trước deploy. Test rules kiểm tra pending/revoked/anonymous, chỉ đọc published, ngăn tự duyệt/tự nâng quyền, owner duyệt, dữ liệu cá nhân tách biệt.

Sau cập nhật dependency, audit không có high/critical; còn moderate trong dev dependencies Firebase CLI (OpenTelemetry/gaxios/uuid). Không ép downgrade bằng audit fix --force. Kiểm tra lại trước release.

Assets: `mochi.png` tạo bằng Imagegen cho app; icon SVG nội bộ và PNG raster từ SVG; video thumbnails CSS. Không có audio/video thật hay credential riêng trong repo.

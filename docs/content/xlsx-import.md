# Nhập từ vựng từ XLSX

File mẫu: [vocabulary-v2.xlsx](../../outputs/firebase-xlsx/vocabulary-v2.xlsx). File có sẵn 10 cụm của bộ pilot để nhập lần đầu. Muốn thêm nội dung, sao chép file rồi thay dữ liệu; giữ tên sheet và header tại dòng 1.

| Sheet | Mỗi dòng |
|---|---|
| Words | Một mục từ/nghĩa riêng; `id` ổn định, không dùng lại cho từ khác |
| Examples | Một ví dụ song ngữ; `wordId` trỏ Words.id |
| Pronunciations | Một giọng `au`, `uk` hoặc `us` của một từ; có IPA, URL audio và nguồn |
| Forms | Một dạng từ có nhãn |
| Mistakes | Một lỗi thường gặp và cách sửa |
| Related | Một cụm liên quan; `relatedWordId` tùy chọn |
| Readme | Hướng dẫn; không nhập vào database |

Tất cả sáu sheet dữ liệu phải có header. Forms, Mistakes, Related có thể không có dòng dữ liệu. Các danh sách trong ô dùng **xuống dòng**, không phân cách bằng dấu phẩy: `topicIds`, `tags`, `commonPatterns`, `acceptedSpellings`, `meaningDistractorsVi`, `recallAnswers`, `gapAnswers`, `sentenceTokens`, `arrangementAnswers`. Giữ ngày dạng `YYYY-MM-DD`. Không dùng công thức; URL là văn bản đầy đủ.

`practiceExampleId` trỏ tới Examples.id của chính từ đó. Ví dụ luyện tập cần gap và tokens; ghép tokens theo thứ tự phải tạo đúng textEn, gồm dấu câu. Đáp án gap đầu tiên phải khôi phục textEn. Phát âm phải đúng từ/cụm trong acceptedSpellings. Xem [chuẩn nội dung v2](vocabulary-format-v2.md) để biết yêu cầu chuyên môn và metadata.

1. Đăng nhập tài khoản quản trị → Account settings → Open your studio.
2. Choose XLSX or JSON file. App đọc và kiểm tra tại máy; bước này chưa ghi Firestore.
3. Sửa lỗi theo sheet/dòng nếu có. Tất cả mục phải hợp lệ trước khi hiện nút nhập.
4. Xem ID, từ, CEFR, trạng thái. `published` hiển thị cho người đã duyệt; `draft` vẫn ẩn.
5. Import reviewed content. Mặc định chặn nếu ID đã tồn tại. Chỉ bật Replace khi muốn thay **toàn bộ** dữ liệu của ID cũ, bao gồm trạng thái; các ID khác và lịch sử học được giữ.

Một lần nhập tối đa 400 mục, file 5 MB. Ghi bằng transaction: lỗi hoặc ID trùng khi chưa bật Replace sẽ không ghi một phần. Import lại cùng ID không tạo từ trùng. Không đổi ID của từ đã học vì lịch sử dùng ID để liên kết.

Workbook cũ `collocations_b1_plus_100-v3.xlsx` chưa theo chuẩn này và còn mục thiếu dữ liệu. App báo lỗi thay vì tự xuất bản các mục chưa đủ nội dung/audio. Chuyển và biên tập sang mẫu v2 trước khi nhập.

File mẫu nằm ngoài public/dist. Không đặt giáo trình riêng tư vào public hoặc commit lên repository công khai. JSON vẫn được hỗ trợ cho các công cụ biên tập tự động.

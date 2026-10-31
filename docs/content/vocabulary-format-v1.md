# Vocabulary format v1 — EnglsMyOwn

> Đã được thay thế cho nội dung mới bởi [format v2](vocabulary-format-v2.md). Quy tắc mở khóa cũ ở phần dailyAssignments dưới đây không còn áp dụng: phải hoàn thành toàn bộ review bắt buộc trước khi học batch mới.

Đề xuất cấu trúc nội dung ngày 2026-10-28. Chưa triển khai importer hoặc ghi lên Firestore.

## Đơn vị dữ liệu

Một document = một headword + một nghĩa cụ thể + một từ loại. Một từ nhiều nghĩa được tách thành nhiều mục, có ID cố định. Không dùng headword làm ID vì có thể trùng và có thể sửa chính tả. ID thật nên do công cụ biên tập cấp một lần; ID mẫu chỉ để minh họa.

UI mặc định tiếng Anh. meaningVi và bản dịch ví dụ vẫn là tiếng Việt. Đếm theo mục từ/nghĩa; nếu báo cáo đếm headword duy nhất cần tính riêng, tránh tuyên bố đã biết mọi nghĩa của một từ.

## Mức yêu cầu

- Core: cần để tạo bản nháp có nghĩa. ID có thể để công cụ nhập cấp lần đầu, sau đó phải giữ nguyên.
- Publish: cần trước khi đưa vào bài học. Có thể bỏ trống khi thu thập bản nháp.
- Publish*: điều kiện theo nhóm, xem kiểm tra xuất bản bên dưới.
- Optional: bổ sung khi hữu ích, không cần điền cho đủ.

## Sheet Vocabulary

| Trường                 | Mức cần có | Nội dung                                                                |
| ---------------------- | ---------- | ----------------------------------------------------------------------- |
| `id`                   | Core       | ID cố định của một nghĩa; không đổi khi sửa cách viết.                  |
| `headword`             | Core       | Từ/cụm từ ở dạng gốc.                                                   |
| `senseKey`             | Core       | Mã nghĩa để phân biệt các nghĩa cùng headword.                          |
| `itemType`             | Core       | word / phrase / phrasal_verb / idiom.                                   |
| `partOfSpeech`         | Core       | Từ loại của nghĩa này; không dùng phrasal_verb như từ loại.             |
| `meaningEn`            | Core       | Định nghĩa tiếng Anh đơn giản, diễn đạt riêng.                          |
| `meaningVi`            | Core       | Nghĩa tiếng Việt ngắn gọn, đúng nghĩa đang học.                         |
| `cefrLevel`            | Publish    | A1–C2 của nghĩa này; để trống khi chưa xác minh.                        |
| `cefrSource`           | Publish    | Nguồn xác minh CEFR hoặc ghi rõ editorial estimate và lý do.            |
| `topicIds`             | Publish    | ID chủ đề; nhiều mục ngăn bằng xuống dòng.                              |
| `ipaUS`                | Publish*   | IPA giọng Mỹ; ít nhất một giọng có IPA và audio khớp nhau.              |
| `audioUS`              | Publish*   | URL HTTPS audio Mỹ đọc headword; không dùng URL giả.                    |
| `ipaUK`                | Optional   | IPA giọng Anh; có thể chọn làm giọng chính thay Mỹ.                     |
| `audioUK`              | Optional   | URL HTTPS audio Anh đọc headword.                                       |
| `commonPatterns`       | Publish    | Ít nhất một cấu trúc/collocation tự nhiên; mỗi mục một dòng.            |
| `forms`                | Optional   | Biến thể chia từ, mỗi mục một dòng; không tự coi là đáp án bài nghe.    |
| `usageNotes`           | Optional   | Ngữ pháp, sắc thái, trang trọng/thân mật, lỗi thường gặp.               |
| `relatedWordIds`       | Optional   | ID từ liên quan trong thư viện; không tự coi là đồng nghĩa hoặc đáp án. |
| `tags`                 | Optional   | Nhãn bổ sung, mỗi mục một dòng.                                         |
| `acceptedSpellings`    | Publish    | Đáp án nghe/đọc chính xác, gồm headword; mỗi biến thể một dòng.         |
| `meaningDistractorsVi` | Publish    | Ba nghĩa sai khác nhau, cùng kiểu diễn đạt, không trùng nghĩa đúng.     |
| `sourceRef`            | Publish    | Nguồn nội dung/quyền sử dụng; nội dung tự soạn ghi rõ.                  |
| `sourceUrl`            | Optional   | Link tra cứu nguồn cụ thể, nếu có.                                      |
| `status`               | Core       | draft / reviewed / published / archived. Mẫu chỉ là draft.              |

## Sheet Examples

Mỗi dòng là một ví dụ, liên kết bằng wordId. Cho phép nhiều ví dụ cho một nghĩa. Câu đầu là ví dụ chính.

| Trường           | Mức cần có | Nội dung                                                           |
| ---------------- | ---------- | ------------------------------------------------------------------ |
| `wordId`         | Core       | Khóa liên kết tới Vocabulary.id.                                   |
| `exampleId`      | Core       | ID ví dụ duy nhất trong mục từ; thứ tự dòng là thứ tự hiển thị.    |
| `textEn`         | Publish    | Câu ví dụ tự nhiên; câu đầu là ví dụ chính.                        |
| `textVi`         | Publish    | Bản dịch tự nhiên đúng ngữ cảnh.                                   |
| `audioUrl`       | Optional   | Audio câu ví dụ, không phải audio headword.                        |
| `gapTemplate`    | Publish*   | Một chỗ trống {{blank}}; cần ít nhất một ví dụ có bài đục lỗ.      |
| `gapAnswers`     | Publish*   | Dạng từ đúng trong câu; mỗi đáp án được chấp nhận một dòng.        |
| `recallPromptVi` | Publish*   | Gợi ý Việt có ngữ cảnh cho bài Việt → Anh; cần ít nhất một ví dụ.  |
| `recallAnswers`  | Publish*   | Đáp án cụ thể cho gợi ý Việt; không suy từ danh sách từ liên quan. |

## Ánh xạ Excel → JSON

- Header Excel giữ nguyên tên, không dịch hoặc thêm dấu sao. Dòng đầu là header; dữ liệu bắt đầu ở dòng 2. Xóa các dòng có ID sample_ trước khi nhập thật. Importer phải từ chối prefix sample_ trong luồng xuất bản.
- Vocabulary là bảng phẳng; các cột topicIds, commonPatterns, forms, relatedWordIds, tags, acceptedSpellings, meaningDistractorsVi dùng một phần tử mỗi dòng trong ô Excel. Trim, bỏ dòng trống; không phân tách bằng dấu phẩy vì nghĩa/câu có thể chứa dấu phẩy. Giữ nguyên thứ tự.
- ipaUS/audioUS → pronunciation.us.ipa/audioUrl; ipaUK/audioUK → pronunciation.uk.ipa/audioUrl.
- Các dòng Examples được nhóm theo wordId → examples[]. exampleId → id. gapTemplate/gapAnswers → gap.template/acceptedAnswers. recallPromptVi/recallAnswers → recall.promptVi/acceptedAnswers. Các danh sách đáp án cũng dùng xuống dòng.
- Không có đủ một cặp gap hoặc recall: báo lỗi, không âm thầm bỏ nửa còn lại. Cả cặp trống thì bỏ object đó trong bản nháp.
- sentenceTokens được công cụ chuẩn bị từ textEn, gắn dấu câu với token trước, rồi biên tập kiểm tra. Không lưu thứ tự shuffle. Ứng dụng tạo thứ tự ngẫu nhiên mỗi lượt; chấm theo câu tái tạo để xử lý các token trùng nhau. v1 chỉ dùng một trật tự chuẩn và câu ngắn ít mơ hồ.
- Ô trống của chuỗi tùy chọn → null; ô danh sách trống → []; không lưu undefined. Bỏ qua dòng hoàn toàn trống. Không biến CEFR chưa biết thành A1 hoặc B1.
- schemaVersion là phiên bản cấu trúc; contentVersion là lần sửa nội dung. Hai trường do công cụ quản lý, không điền trong Excel.
- id trong JSON là khóa nhập; importer dùng nó làm document ID. Có thể không lặp id trong document Firestore.

## Bốn dạng bài

1. Nghe → gõ: audio của headword + acceptedSpellings. Audio phải khớp chính xác cách viết được chấp nhận. forms không phải đáp án nghe tự động.
2. Đục lỗ/sắp xếp: examples[].gap hoặc sentenceTokens. Đáp án có thể là dạng chia từ, không nhất thiết giống nguyên mẫu. Ví dụ she gets along → đáp án gets along.
3. Anh → chọn Việt: headword, nghĩa đúng meaningVi và ba meaningDistractorsVi đã duyệt. Với headword đa nghĩa, hiển thị thêm câu ví dụ để xác định nghĩa. Trộn vị trí đáp án khi học.
4. Việt → gõ Anh: recall.promptVi + recall.acceptedAnswers. Gợi ý phải đủ ngữ cảnh; có thể hiện câu ví dụ có chỗ trống nếu còn nhiều cách dịch hợp lý. Không đánh sai một câu trả lời hợp lý do gợi ý mơ hồ; sửa câu hỏi hoặc bổ sung đáp án đã duyệt.

Chuẩn hóa đáp án khi chấm: Unicode NFC, trim, gộp khoảng trắng và không phân biệt hoa thường; chuẩn hóa dấu nháy cong nếu cần. Không tự bỏ giới từ, stemming, chấp nhận gần đúng hoặc mọi từ đồng nghĩa. Cách xử lý lỗi gõ và số lượt thử là chính sách bài học riêng.

## Kiểm tra trước khi xuất bản

- ID duy nhất; tổ hợp headword đã chuẩn hóa + senseKey + partOfSpeech không bị lặp. exampleId duy nhất trong một mục; wordId/topicIds/relatedWordIds tham chiếu hợp lệ.
- Các trường Core và Publish có nội dung. partOfSpeech thuộc noun, verb, adjective, adverb, pronoun, determiner, preposition, conjunction, interjection hoặc other. itemType thuộc bốn giá trị trong bảng. collocation có thể là tag hoặc commonPattern.
- CEFR thuộc A1/A2/B1/B2/C1/C2, có nguồn gắn đúng nghĩa hoặc ghi rõ mức ước lượng biên tập. Không suy CEFR từ độ dài từ hay coi phrasal verb nào cũng B1/B2.
- Có ít nhất một giọng US hoặc UK với cả IPA và audio hoạt động, đã nghe kiểm tra. Giọng còn lại tùy chọn. File âm thanh nằm ở nơi lưu media, Firestore lưu tham chiếu URL. Audio tạo bằng TTS cũng cần chuẩn bị/kiểm tra trước khi xuất bản.
- Có ít nhất một commonPattern, một ví dụ Anh/Việt, một gap và một recall hoàn chỉnh. Gap có đúng một {{blank}}; thay đáp án chính phải tái tạo câu ví dụ. Chỉ tạo sentenceTokens cho ví dụ đã kiểm tra thứ tự.
- acceptedSpellings có headword, ba distractors khác nhau và không đồng nghĩa với đáp án đúng. Mọi đáp án được kiểm tra ngữ pháp/ngữ cảnh.
- Nội dung được duyệt về tính tự nhiên, nghĩa, IPA, CEFR, distractors và nguồn/quyền sử dụng trước khi chuyển draft → reviewed → published. Archived không đưa vào batch mới nhưng giữ tham chiếu lịch sử.
- Bản mẫu get along là draft. CEFR, IPA và audio cố ý để trống vì chưa xác minh. Không coi JSON mẫu là nội dung sẵn sàng xuất bản.

## Tổ chức Firestore đề xuất

`vocabulary/{wordId}`: nội dung dùng chung như JSON mẫu. Thêm createdAt, updatedAt, reviewedAt (Firestore Timestamp), reviewedBy; công cụ/server thiết lập. examples và patterns là mảng nhỏ có giới hạn biên tập; không nhét lịch sử học vào document này.

`topics/{topicId}`: tên chủ đề, mô tả, thứ tự hiển thị.

`batches/{batchId}`: orderedWordIds (10 ID theo cấu hình hiện tại), topicId, title, status. Một mục từ có thể xuất hiện ở nhiều batch, nên không gắn một batchId độc quyền lên từ. Tránh gán lại từ đã học như từ mới.

`users/{uid}/wordProgress/{wordId}`: firstLearnedAt, lastStudiedAt, lastReviewedAt, nextReviewAt (nếu thuật toán dùng), isSaved, correctCount, incorrectCount, firstBatchId, contentVersionSeen; có thể thêm thống kê theo exerciseType. Trường mastery chỉ thêm khi đã chốt cách tính, không suy ra từ việc mở chi tiết.

`users/{uid}/dailyAssignments/{localDate}`: timezone, yesterdayReviewWordIds, olderDayReviewWordIds, completedReviewWordIds, newBatchIds. Chốt snapshot ID để thay đổi nội dung/batch sau này không làm sai điều kiện mở khóa. Hoàn thành review toàn bộ từ hôm trước mới mở batch mới; review ngày cũ hơn là phần riêng của mục tiêu ngày. Không có từ hôm trước thì không bị khóa. Chỉ một lần review hợp lệ theo chính sách bài học mới được tính.

`users/{uid}/studySessions/{sessionId}`: thời gian bắt đầu/kết thúc, activeSeconds, wordIds, batchId, kết quả theo bài; dùng cho báo cáo thời gian thực học. Không tính thời gian mở tab mà không học.

Chỉ công cụ quản trị được sửa nội dung chung. Người dùng đã được duyệt đọc nội dung published và sửa dữ liệu cá nhân của mình theo Security Rules. Chuyển trạng thái reviewed/published phải qua kiểm tra của công cụ, không tin ô Excel tự khai báo. Đặc tả này chưa tạo Security Rules hoặc chốt thuật toán ôn.

Firestore hỗ trợ document chứa map/array và subcollection. Tham khảo chính thức: https://firebase.google.com/docs/firestore/data-model và https://firebase.google.com/docs/firestore/manage-data/structure-data .

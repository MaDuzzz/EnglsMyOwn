# Vocabulary v2 — pilot ngày 31/10/2026

Định dạng chuẩn là JSON trong `content/vocabulary-pilot-v2.json`; kiểu TypeScript ở `src/lib/vocabulary.ts`. File Excel 100 mục gốc được giữ nguyên. Bộ pilot chọn 10 ID từ file gốc và biên tập lại nội dung/bài tập. Không tự chuyển các mục chưa được duyệt thành nội dung xuất bản.

## Cấu trúc nhập

Envelope: `{ "schemaVersion": 2, "words": [...], "lessons": [] }`. `lessons` có thể bỏ qua khi chỉ nhập từ vựng. Studio nhận JSON; chưa nhập trực tiếp XLSX/CSV. Khi thu thập bằng bảng tính, giữ hai bảng Words và Examples; chuyển thành các mảng JSON trước khi nhập.

Một mục = một headword + senseKey + partOfSpeech, giữ ID ổn định. `schemaVersion: 2`, `contentVersion` là số nguyên dương. `status` hiện hỗ trợ `draft` hoặc `published`. Chỉ nội dung published được tải cho người học đã được duyệt.

| Nhóm | Trường |
|---|---|
| Định danh | id, headword, senseKey, itemType, partOfSpeech |
| Nghĩa | meaningEn, meaningVi |
| Cấp độ | cefrLevel, cefrStatus (estimated/verified/unverified), cefrSource |
| Phân loại | topicIds[], topic, tags[], register (neutral/formal/informal) |
| Phát âm | pronunciation.us/uk/au: ipa, ipaStatus, audioUrl, audioText, voiceType, speaker, sourceUrl, license, licenseUrl, checkedAt, checkMethod |
| Cách dùng | commonPatterns[], forms[{label,text}], usageNotes, usageNotesVi |
| Học sâu | commonMistakes[{incorrect,correct,explanationVi}], relatedExpressions[{text,relation,noteVi,wordId?}] |
| Ví dụ | examples[{id,context,textEn,textVi,targetText,audioUrl?,gap?,sentenceTokens?,arrangementAnswers?}] |
| Bài tập | practiceExampleId, acceptedSpellings[], meaningDistractorsVi[], recall{promptVi,acceptedAnswers[],explanationVi} |
| Nguồn | sourceRef, sourceUrl, reviewedAt |

`itemType` nhận word, phrase, collocation, phrasal_verb, idiom. `partOfSpeech` dùng từ loại ngữ pháp như verb/noun, không dùng verb_phrase. Mọi danh sách phải là mảng thực; không ghép bằng dấu phẩy. Trường tùy chọn có thể bỏ hoặc null theo kiểu, không lưu undefined lên Firestore.

`practiceExampleId` chọn ví dụ có gap và sentenceTokens. Gap có đúng một `{{blank}}`; đáp án chính thay vào phải tái tạo câu ví dụ. `targetText` lưu nguyên văn phần cần tô nổi, kể cả dạng chia hoặc tân ngữ xen giữa cụm. `sentenceTokens` tái tạo ví dụ theo thứ tự chuẩn; các thứ tự khác phải ghi rõ trong arrangementAnswers và sử dụng cùng bộ từ. UI đặt dấu kết câu ở cuối khi người học ráp câu.

Recall yêu cầu cụm từ ở dạng gốc, có số từ/chữ đầu hoặc ngữ cảnh đủ rõ; không yêu cầu dịch cả câu rồi chấm bằng một cụm. Forms và relatedExpressions không tự trở thành đáp án. Chấm không phân biệt hoa/thường, khoảng trắng thừa hoặc dấu nháy cong/thẳng; vẫn yêu cầu đúng chính tả và dạng chia.

## Audio và nguồn

Bộ pilot có 7 bản thu Australia, 2 US, 1 UK (Southern England), lấy từ Wikimedia Commons/Lingua Libre. Từng mục có tác giả, trang file và giấy phép CC BY-SA 4.0 hoặc CC0 1.0. Không sửa file gốc; phát chậm chỉ thay playbackRate. Credits có trong thẻ học và My words. Không dùng speechSynthesis thay bản thu.

Cả 10 URL được kiểm tra GET Range và trả `206 audio/mpeg`. Đây là kiểm tra tài nguyên, không thay việc thẩm định bằng tai hay kiểm tra trên iPhone thật. `checkMethod` ghi đúng phạm vi kiểm tra. Không đánh dấu là đã được chuyên gia/người dùng nghe duyệt. IPA là phiên âm rộng do biên tập, UI ghi Broad IPA; CEFR là ước lượng học tập, UI ghi estimated. Cần tiếp tục thẩm định trước khi xem bộ này là giáo trình chuẩn hóa chuyên môn.

Publish cần ít nhất một giọng có IPA và audio HTTPS hợp lệ, hoặc `audioMode: "on-demand"` cùng IPA US. Giọng còn lại tùy chọn. Validator loại link example.com và Drive preview, kiểm tra audioText khớp đáp án nghe, nguồn/giấy phép và thông tin kiểm tra cho các bản thu khai báo trong dữ liệu. Chế độ on-demand tạo URL Youdao rồi Google Translate TTS từ headword lúc phát; nếu cả hai lỗi, app thử giọng thiết bị. Các endpoint này có thể thay đổi hoặc giới hạn truy cập. Kiểm tra cấu trúc không tự chứng minh audio luôn còn hoạt động. Audio player có loading, lỗi/retry, phát chậm giữ cao độ và dừng khi chuyển mục/ẩn app. Màn nghe không hiện từ, IPA, credits chứa tên cụm hoặc nghĩa trước khi chấm.

## Firestore và tương thích

Studio dùng `storedWord()` để lưu bản canonical v2, không lưu lặp các trường suy ra như exampleEn/gapAnswers. Khi tải dữ liệu, `projectWord()` tạo projection phục vụ bài tập. Vẫn đọc format phẳng cũ và canonical v1. V2 là chuẩn dùng cho nội dung mới; tài liệu v1 chỉ dùng tham khảo/migration.

Quy tắc mở khóa không đổi: phải xong **toàn bộ review bắt buộc** (hôm qua, ngày cũ được chọn và phần tồn) mới mở batch mới. Batch 10 từ, 40 nhiệm vụ; sai quay lại, không cộng trùng tiến độ. Chỉ hoàn thành batch mới ghi nhận từ/vé.

## Thử bản pilot

Chạy `npm run dev`, vào Words → Start learning. Trong Account settings → Preview scenario có:

- Learn ten new phrases: bắt đầu với 10 mục chưa học.
- Review yesterday’s ten phrases: mô phỏng đã học 10 mục hôm qua, để thử bốn vòng review ngay.

Hai kịch bản lưu tiến độ riêng. Dữ liệu preview cũ vẫn giữ tại khóa cũ, không bị xóa. Reset local preview chỉ reset kịch bản đang chọn. Bộ pilot có một batch: sau khi học hết sẽ chưa có batch mới khác; sau review cần xuất bản thêm 10 mục để học tiếp và hoàn tất mục tiêu ngày gồm review + học mới.

Bộ dữ liệu được import động chỉ ở DEV. Production cần Firebase đã cấu hình, Google login và quyền approved; nội dung học được đọc từ Firestore. Không đặt JSON học tập vào public. Chưa deploy hoặc import lên Firebase trong lượt triển khai này.

## Kiểm tra bản pilot — 2026-10-31

- `npm test`: 22 bài kiểm tra đạt; 8 bài Firestore Rules bỏ qua vì chưa chạy emulator.
- `npm run build`: đạt. Vite còn cảnh báo kích thước chunk Firebase lớn hơn 500 kB.
- Thử qua giao diện đủ 40 nhiệm vụ học mới và 40 nhiệm vụ review; kiểm tra ghi nhận từ, vé và bữa ăn khi đủ mục tiêu.
- Bản thu đầu tiên phát hết trong trình duyệt; cả 10 URL vượt kiểm tra HTTP nêu trên. Chưa nghe thẩm định toàn bộ bản thu.
- Màn chi tiết ở viewport 428 × 926 không tràn ngang; đã kiểm tra giao diện light/dark. Chưa kiểm tra trên iPhone thật.
- Kiểm tra output production không chứa các chuỗi nhận diện của bộ pilot DEV. Chưa kiểm tra tích hợp Firebase thực tế.

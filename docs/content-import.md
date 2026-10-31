# Content import

Nội dung mới dùng [format v2](content/vocabulary-format-v2.md), mẫu hoàn chỉnh tại `content/vocabulary-pilot-v2.json`. Studio nhận JSON và lưu canonical v2, giữ đủ ví dụ, forms, usage notes và audio attribution. Chỉ cần một giọng có IPA + audio thật; US/UK/AU được ghi đúng theo nguồn. Các mô tả projection/publish v1 bên dưới chỉ áp dụng khi đọc dữ liệu cũ; yêu cầu cả US và UK đã được thay thế.

Studio nhận `{ "words": [...], "lessons": [...] }`, tối đa 400 document/lần. Validate chỉ kiểm tra; Import ghi Firestore batch và **thay document có cùng ID**. Giữ bản gốc và kiểm tra preview. Demo local không ghi Firestore.

## Words

Dùng [format thu thập đã chốt](content/vocabulary-format-v1.md) và [mẫu draft](content/vocabulary.example.json). Mỗi từ/mỗi nghĩa có ID ổn định. Bọc mẫu trong mảng `words`, có thể để `lessons: []`.

Importer giữ field gốc và thêm projection: `topic` từ `topicIds[0]`, `commonPattern` từ pattern đầu; `ipaUS/ipaUK/audioUS/audioUK` từ pronunciation; `exampleEn/exampleVi/gapTemplate/gapAnswers/recallPromptVi/recallAnswers` từ example đầu tiên. Pilot luyện một example mỗi từ; các example khác vẫn giữ để mở rộng. Cũng chấp nhận format phẳng `Word` trong `src/lib/model.ts`.

Draft canonical có thể để CEFR null. Publish cần A1–C2, `cefrSource`, `sourceRef`, IPA US/UK, HTTPS audio đã kiểm chứng, ba nghĩa nhiễu khác nhau, đúng một `{{blank}}` và đáp án cho từng dạng bài. ID `sample_`/`demo_` không được publish. Validator kiểm tra cấu trúc; người quản trị phải thẩm định ngữ nghĩa, nguồn, bản quyền và CEFR. Không tự suy đoán IPA.

Publish theo nhóm tối thiểu 10 từ. Pilot lấy thứ tự document ID, chưa cá nhân hóa độ khó. Tránh xóa/unpublish từ đã nằm trong review đang dùng.

## Videos

```json
{
  "words": [],
  "lessons": [
    {
      "id": "conversation_001",
      "title": "Catching up with a friend",
      "topic": "Friendship",
      "level": "B1",
      "duration": "2:18",
      "driveFileId": "",
      "palette": "cafe",
      "status": "draft",
      "lines": [
        {
          "id": "line_01",
          "time": "0:04",
          "en": "How have you been?",
          "vi": "Dạo này bạn thế nào?"
        }
      ]
    }
  ]
}
```

Thay nội dung ví dụ bằng transcript/timestamps/CEFR đã kiểm tra. Cần file ID hợp lệ để publish. Thumbnail hiện là CSS, chưa trích frame Drive. Quiz luyện từ đầu các câu đã lưu; chọn từ/cụm mục tiêu và liên kết My words sẽ bổ sung sau.

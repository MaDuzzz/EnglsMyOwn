# Đánh giá dữ liệu từ vựng và UI cho bản phát hành đầu

Ngày kiểm tra: 31/10/2026. Phạm vi: ưu tiên học mới, review và My words; video để giai đoạn sau. Đây là đánh giá và đề xuất, chưa thay đổi schema chính thức, mã ứng dụng hoặc workbook nguồn.

Nguồn: `/Users/dungtm/dungtm/github_code/EnglsMyOwn/vocab_data/collocations_b1_plus_100-v3.xlsx`, sheet `Collocations & Exercises B1+`, vùng `A1:AD101`. Đây là Excel, không phải CSV.

Đã kiểm tra cấu trúc toàn bộ 100 dòng, đối chiếu importer/UI hiện tại, kiểm tra HTTP sáu URL audio và rà soát một số nội dung tiếng Anh. Chưa thẩm định chuyên môn toàn bộ 100 mục, toàn bộ IPA hoặc nghe thử trên iPhone; các mẫu audio được kiểm tra trả về 404 nên chưa thể nghe.

## Kết luận

Khung dữ liệu có đủ phần lớn thông tin học tập cần thiết. Chưa nên import nguyên trạng để xuất bản: audio mẫu không hoạt động, prompt recall không khớp loại đáp án, có lỗi nội dung, và kiểu dữ liệu chưa khớp importer. Ưu tiên sửa chất lượng và chuyển đổi dữ liệu trước khi tăng số lượng từ.

## Những gì đang tốt

- 100 bản ghi, 30 cột, không có ô trống trong 3.000 giá trị; không trùng `id`, `headword`, `senseKey` trong file.
- Có nghĩa Anh/Việt, loại mục từ, từ loại, CEFR, IPA/audio US/UK, patterns, forms, usage notes, ví dụ song ngữ và dữ liệu cho bài tập.
- Cả 100 template có một `{{gap}}`; thay bằng `gapAnswers` tái tạo được câu `textEn` khi bỏ qua hoa/thường và chuẩn hóa khoảng trắng. Đây là kiểm tra cấu trúc, chưa chứng minh câu hỏi tốt về sư phạm.
- Mỗi mục có ba nghĩa nhiễu khác nhau về chuỗi ký tự. Vẫn cần kiểm tra độ hợp lý và tránh đáp án đồng nghĩa.

## Các vấn đề cần xử lý

| Mức | Phát hiện | Cách xử lý đề xuất |
|---|---|---|
| Trước phát hành | 100/100 `recallPromptVi` yêu cầu dịch cả câu, nhưng `recallAnswers` chỉ là headword | Đổi thành yêu cầu nhớ từ/cụm từ, có ngữ cảnh đủ rõ. Nếu giữ bài dịch nguyên câu thì phải thiết kế bài tập và đáp án riêng. |
| Trước phát hành | 6/6 URL phát âm lấy mẫu trả 404; 100/100 audio câu dùng `audio.example.com` | Thay bằng asset thật, kiểm tra phát âm đúng cả cụm và giọng. Chưa có thì để thiếu có chủ đích trong draft, không tạo link giả. |
| Trước phát hành | Có lỗi nghĩa và hướng dẫn dùng từ | Rà soát trước publish; xem ví dụ cụ thể bên dưới. |
| Trước import | 26 CEFR dạng khoảng: 22 `A2-B1`, 3 `A1-A2`, 1 `B1-B2` | Chọn cấp học dựa trên thẩm định hoặc ghi unverified ở draft; không tự lấy cấp đầu/cuối. Các mục còn lại: 40 B1, 34 B2. |
| Trước import | `relatedWordIds` có 200 giá trị, không giá trị nào trỏ tới ID trong bộ 100 từ | Nếu là từ liên quan dạng chữ thì dùng `relatedTerms`/`relatedExpressions`; chỉ dùng ID khi thực sự liên kết tới mục từ. Chưa kết luận chúng không tồn tại trong một bộ dữ liệu ngoài file. |
| Trước import | Array đang là chuỗi, dùng dấu phẩy, `;`, `|` không đồng nhất; `{{gap}}` khác `{{blank}}` trong app | Importer chuyển đổi theo từng cột và báo lỗi theo dòng. Không tách `/` tùy tiện vì nó có thể là một phần pattern. |
| Trước import | Thiếu `status`, thông tin nguồn nội dung và phiên bản | Import thành draft; công cụ quản trị kiểm tra rồi mới cho xuất bản. |
| Chất lượng học | 50 câu không chứa nguyên văn headword do chia thì, chèn bổ ngữ hoặc đổi đại từ | Đây không tự động là lỗi. Giữ đáp án riêng cho từng câu; lưu phần mục tiêu và giải thích ngữ pháp, không sinh gap bằng cách replace nguyên mẫu. |
| UX | Ví dụ dài 12–20 từ, trung vị 15 | Tách ví dụ đọc hiểu sâu và câu luyện sắp xếp ngắn hơn; hoặc dùng các cụm được biên tập làm token. Không ép 20 chip vào màn hình bằng cách giảm cỡ chữ. |

`cefrSource` hiện chỉ là tên các nguồn ghép chung như Oxford/NGSL/EVP, chưa có tham chiếu cho từng cụm và nghĩa. Chưa đủ để khẳng định CEFR của cả collocation đã được xác minh. Tên file B1+ cũng chưa phản ánh các mục đang mang khoảng A1–A2/A2–B1.

### Ví dụ nội dung cần sửa

| Ô/dòng | Nội dung | Nhận xét |
|---|---|---|
| F49, `make a mistake` | “To do something incorrectly or accurately.” | “or accurately” làm nghĩa tự mâu thuẫn. Đề xuất: “To do something incorrectly.” |
| Q69, `strong accent` | Hướng dẫn không dùng `thick` với `accent` | Sai: Oxford ghi nhận “a heavy/thick accent”. Bỏ quy tắc cấm này. [Oxford](https://www.oxfordlearnersdictionaries.com/us/definition/american_english/accent_1). |
| X66, `key factor` | “the most key factor” | Không phù hợp làm câu mẫu tự nhiên. Đề xuất viết lại với “a key factor”, đồng bộ gap và bản dịch. |
| X74, `keep a secret` | “until official announcement” | Sửa thành “until the official announcement” trong ngữ cảnh câu này. |
| Dòng 86–87 | `minimize/minimise`, `fulfil/fulfill` được nêu trong notes nhưng chưa có trong đáp án | Bổ sung biến thể chính tả tương ứng cho nghe, recall và gap; không tự chấp nhận mọi dạng chia của từ. |
| Dòng 101, `raise capital` | Gap đáp án là “raised five million dollars”, để “in capital” ở ngoài | Chưa kiểm tra đúng cụm mục tiêu. Viết lại câu/gap để đáp án luyện `raise capital` với dạng chia phù hợp. |
| Dòng 41, `take advantage of` | Gộp nghĩa tận dụng cơ hội và lợi dụng người khác | Tách mục theo nghĩa hoặc phân rõ nghĩa chính/khác. Mỗi câu hỏi phải xác định một nghĩa bằng ngữ cảnh. |

Một số `commonPatterns` đang chứa cả cụm liên quan/trái nghĩa, ví dụ `meet a deadline`, `miss a deadline`, `tight deadline`. Nên phân biệt cấu trúc dùng từ với cụm liên quan. `itemType` cũng đang ghi tất cả là collocation; cần thống nhất phân loại khi gặp phrasal verb và idiom, và phân biệt loại đơn vị từ vựng với từ loại.

### Kết quả kiểm tra audio

Kiểm tra GET có Range, không chỉ kiểm tra đuôi `.mp3`. Cả sáu mẫu trả HTTP 404, `Content-Type: text/html`, body 162 byte.

| Mục | Giọng | URL đã kiểm tra |
|---|---|---|
| colloc-001 | US | `https://kaikki.org/media/en/us/take_responsibility.mp3` |
| colloc-001 | UK | `https://kaikki.org/media/en/uk/take_responsibility.mp3` |
| colloc-050 | US | `https://kaikki.org/media/en/us/do_research.mp3` |
| colloc-050 | UK | `https://kaikki.org/media/en/uk/do_research.mp3` |
| colloc-100 | US | `https://kaikki.org/media/en/us/raise_capital.mp3` |
| colloc-100 | UK | `https://kaikki.org/media/en/uk/raise_capital.mp3` |

Các URL phát âm khác có cùng dạng đường dẫn nhưng chưa được kiểm tra riêng; không kết luận đã kiểm tra toàn bộ 200 link.

Wiktextract cung cấp thông tin phát âm trong `sounds`, gồm `mp3_url`/`ogg_url` và nhãn giọng. Cần lấy URL asset thật; không suy đường dẫn bằng cách ghép tên cụm từ vào một mẫu URL. Nguồn: [tài liệu Wiktextract — Pronunciation](https://github.com/tatuylonen/wiktextract/blob/master/README.md#pronunciation).

Trước khi cho một từ vào batch có bài nghe: phải có ít nhất một giọng được kiểm tra phát đúng toàn bộ cụm từ, đúng nội dung đáp án; thử nút phát thường/chậm trên Safari và webapp iPhone. HTTP 200 và MIME audio chỉ là bước đầu, không thay việc nghe và thử phát trên thiết bị. Giọng thứ hai và audio câu có thể bổ sung sau; UI phải phản ánh đúng giọng nào sẵn có. TTS chuẩn bị sẵn cũng là một nguồn có thể dùng nếu ghi rõ loại giọng và duyệt chất lượng.

## Format đề xuất

Giữ các trường có giá trị học tập; chuẩn hóa trước khi thêm cột. File nhập liệu là định dạng biên tập, không cần giống hệt document Firestore. Công cụ chuyển đổi phải có phiên bản và xác thực schema.

| Nhóm | Trường giữ/chỉnh | Bổ sung đề xuất |
|---|---|---|
| Định danh | `id`, `headword`, `senseKey`, `itemType`, `partOfSpeech` | Một mục gắn với một nghĩa mục tiêu. Có thể bổ sung enum `collocation` nếu chọn cách phân loại này; đồng bộ docs, importer và UI. |
| Nghĩa/cấp độ | `meaningEn`, `meaningVi`, `cefrLevel`, `cefrSource` | `cefrStatus` (estimated/verified), `cefrSourceUrl` khi có nguồn cụ thể. |
| Chủ đề | `topicIds`, `tags` | Dùng danh mục thống nhất; tránh tạo nhiều tag cùng nghĩa. |
| Phát âm | `ipaUS`, `ipaUK`, `audioUS`, `audioUK` → map `pronunciation.us/uk` | `audioText`, `voiceType`, `sourceUrl`, `license`, `verifiedAt` theo asset khi có; không tự bịa nguồn/giấy phép. |
| Cách sử dụng | `commonPatterns`, `forms`, `usageNotes` → mảng/đối tượng có cấu trúc | `register` (neutral/formal/informal), `usageNotesVi`, `commonMistakes[]` gồm sai/đúng/giải thích. Không bắt buộc tất cả mục đều có lỗi phổ biến. |
| Liên hệ | `relatedWordIds` chỉ khi ID thực; nếu là chữ chuyển thành `relatedExpressions[]` | `text`, `relation` (synonym/antonym/related/contrast), `noteVi`, `wordId` tùy chọn. Không mặc định hai cụm liên quan thay thế được nhau. |
| Ví dụ | `exampleId`, `wordId`, `textEn`, `textVi`, `audioUrl` → `examples[]` | Nhãn ngữ cảnh và phần cần highlight; thêm ví dụ đời thường bên cạnh ví dụ công việc khi hữu ích. Một ví dụ tốt đủ cho release đầu, schema hỗ trợ nhiều ví dụ. |
| Bài tập | `acceptedSpellings`, `meaningDistractorsVi`, `gapTemplate`, `gapAnswers`, `recallPromptVi`, `recallAnswers` | `answerExplanationVi`, câu/token riêng cho sắp xếp khi ví dụ dài; đáp án tương đương cần được biên tập. |
| Quản trị | Hiện còn thiếu | `schemaVersion`, `contentVersion`, `status`, `sourceRef`, `sourceUrl`, `reviewedAt`; timestamps và trạng thái duyệt do công cụ quản trị thiết lập. |

`id` và `wordId` trùng nhau ở cả 100 dòng. Nếu giữ mỗi dòng là một mục từ với một ví dụ, có thể bỏ `wordId` trùng. Khi có nhiều ví dụ, nên dùng sheet `Words` và `Examples`; lúc đó `Examples.wordId` là khóa liên kết cần thiết. Tương đương hai CSV nếu muốn thu thập bằng CSV. Chưa cần bổ sung etymology, ảnh minh họa hay nhiều trường thống kê để phát hành.

Forms nên có nhãn như past/past participle/-ing/plural thay vì chỉ liệt kê nhiều chuỗi. Các trường thiếu thông tin phải để null/không có trong draft thay vì điền nội dung chưa được xác minh.

## Đối chiếu với ứng dụng hiện tại

- `src/lib/model.ts`: kiểu `Word` phục vụ hiển thị hiện chủ yếu là các trường phẳng, một pattern và một ví dụ; chưa có kiểu hiển thị forms, usage notes và quan hệ giữa các từ.
- `src/lib/content.ts`: nhận JSON, chưa có bộ nhập Excel/CSV. Projection giữ nội dung gốc nhưng chỉ chọn pattern/ví dụ đầu tiên. File hiện tại cần adapter cho tên cột, mảng, pronunciation, example và marker gap.
- Validator yêu cầu `{{blank}}`, CEFR một mức, `status`, và nguồn nội dung khi published. Regex HTTPS không chứng minh audio có tồn tại hoặc đúng nội dung.
- `src/components/Session.tsx`: thẻ giới thiệu chưa hiển thị forms/usage notes/related expressions; bài sắp xếp tách toàn bộ ví dụ thành từng từ; feedback chưa giải thích cụ thể cách chia từ trong câu.
- `src/App.tsx`: My words detail có nghĩa/pattern/ví dụ nhưng chưa có nút audio và nội dung học sâu như trên.
- Có khác biệt giữa đặc tả và code: `docs/content/vocabulary-format-v1.md` cho phép ít nhất một giọng đã duyệt, còn validator publish yêu cầu cả US và UK; trạng thái xuất bản và phân loại cũng cần thống nhất khi triển khai schema.
- Đặc tả format cũ có đoạn quy tắc mở khóa theo review hôm qua. Khi cập nhật tài liệu phải giữ quy tắc mới đã chốt: hoàn thành toàn bộ review bắt buộc rồi mới mở batch mới; không dùng việc sửa format để đổi lại hành vi này.

## Đề xuất UI

Giữ thiết kế light/dark, đường đi trong phiên học và bốn dạng bài. Bổ sung chiều sâu ở thẻ giới thiệu và trang chi tiết; dữ liệu phục vụ quản trị không cần xuất hiện như trường kỹ thuật cho người học.

1. **Meaning & pronunciation**: từ/cụm từ, từ loại, cấp độ, IPA và nút US/UK theo audio thực có; nghĩa Anh/Việt luôn dễ tìm. Nút phát có loading/error/retry rõ ràng.
2. **How to use it**: common patterns, ví dụ song ngữ, highlight cụm mục tiêu đúng dạng chia. Nếu có nhiều ví dụ, người học có thể chuyển giữa các ngữ cảnh.
3. **Explore more**: các mục mở rộng `Word forms`, `Usage notes`, `Common mistakes`, `Related expressions`. Cho phép xem toàn bộ nội dung có sẵn; chỉ ẩn nhóm không có dữ liệu. Nghĩa và ví dụ chính không bị giấu sau nhiều thao tác.
4. Nút `Practice this phrase`/`Practice this word` rõ ràng, có khoảng đệm cuối trang và vùng an toàn. Không bắt buộc đọc hết phần mở rộng mới được luyện.
5. **My words detail** dùng cùng thành phần nội dung, có audio và đủ thông tin như lúc học mới; nội dung dài nên dùng trang chi tiết hoặc sheet đủ cao có cuộn, không thu nhỏ chữ.
6. **Phản hồi bài tập**: đáp án đúng, chỗ sai và giải thích ngắn, ví dụ vì sao dùng `raised` thay `raise`. Với màn nghe, tiếp tục không lộ từ, IPA hay nghĩa trước khi chấm.
7. **Sắp xếp câu**: ưu tiên câu luyện ngắn được biên tập; ví dụ đọc hiểu dài vẫn giữ trong chi tiết. Chấp nhận các thứ tự đã duyệt nếu câu có nhiều cách sắp xếp đúng, hoặc biên tập câu để tránh mơ hồ.
8. **Admin import**: chọn file → preview dữ liệu chuyển đổi → báo lỗi theo dòng/cột → lưu draft → duyệt/publish. Độ đầy đủ cấu trúc và tình trạng audio cần hiển thị riêng với kết quả kiểm duyệt ngôn ngữ.

Đây là đề xuất bố cục, chưa phải mockup/implementation mới. Cần kiểm tra nội dung dài, bàn phím và safe area trên hai kích thước iPhone mục tiêu khi triển khai.

## Thứ tự để phát hành sớm

1. Chuẩn hóa format và sửa lỗi prompt, ngữ nghĩa, spelling variants; giữ nội dung chưa duyệt ở draft.
2. Chuẩn bị audio thật và rà soát kỹ một tập nhỏ 10–20 mục để thử trọn luồng học/review; mở rộng dần bộ 100 mục sau khi quy trình ổn.
3. Làm adapter Excel/CSV, mở rộng Word detail/intro và feedback theo dữ liệu đã chuẩn hóa; giữ nguyên quy tắc batch/ticket đã chốt.
4. Cấu hình Firebase Auth/Firestore/quyền phê duyệt, kiểm tra import và bảo vệ nội dung; thử nghe, chấm bài và review ngày kế tiếp trên iPhone webapp.
5. Đưa bản từ vựng vào sử dụng trước; chưa cần triển khai thêm video để đạt mục tiêu release này.

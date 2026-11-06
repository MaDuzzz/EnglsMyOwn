# Các giai đoạn trưởng thành — concept v2

Ngày chốt thiết kế: 2026-11-07. Người dùng đã duyệt mèo v2, chó v2, hổ v2 và sư tử v1 theo phong cách mềm mại, gần thật, biểu cảm hiền. Đây là thiết kế ngoại hình đã chốt, chưa phải asset animation hoặc ngoại hình đã tích hợp vào app online.

## Bộ ảnh

- [Mèo — v2](cat-stages-v2.png)
- [Chó — v2](dog-stages-v2.png)
- [Sư tử đực — v1 đã được duyệt](lion-stages-v1.png)
- [Hổ — v2](tiger-stages-v2.png)
- [Prompt Imagegen ban đầu](prompts.md)
- [Prompt chỉnh hai giai đoạn cuối](revision-v2-prompts.md)

## Điều chỉnh theo phản hồi

Sư tử v1 đã được người dùng duyệt và giữ nguyên. Với mèo, chó và hổ, ba giai đoạn đầu giữ tạo hình đã có; sửa Young adult và Adult để có sự trưởng thành rõ về hình thái. Ba bảng v2 cũng đã được người dùng xác nhận. Các file v1 được giữ làm lịch sử tham chiếu.

Hai giai đoạn cuối trong bản v2 được dựng gần cùng chiều cao để có thể đánh giá sự thay đổi độc lập với kích thước:

| Loài | Young adult | Adult |
| --- | --- | --- |
| Mèo | Thân thanh, chân thon, má hẹp hơn, lông thân mượt và đuôi gọn. | Ngực và thân đầy đặn, mặt rộng và mõm rõ hơn, lông cổ/ngực dày, đuôi bông rộng. |
| Chó | Dáng chân dài và mảnh, ngực hẹp, lông tai và chân còn gọn. | Ngực nở và vai đầy hơn, mặt/mõm trưởng thành, lông tai dài gợn, yếm ngực và lông chân/đuôi phong phú. |
| Hổ | Vai hẹp, cổ thanh, mặt dài và tai còn nổi rõ. | Vai/ngực rộng, cổ chắc, chân và bàn chân dày, đầu/mõm rộng, mắt có tỷ lệ trưởng thành, lông má rõ. |

Giữ màu lông, mảng trắng/vằn và nét nhận diện của cùng cá thể. Bản chỉnh được tạo bằng Imagegen từ từng bảng v1; ba giai đoạn đầu giữ nhất quán về tạo hình, không có cam kết khớp từng pixel giữa các lần render.

## Năm giai đoạn

| ID | Nhãn giao diện | Ngoại hình |
| --- | --- | --- |
| newborn | Newborn | Sơ sinh nhỏ xíu, nằm thấp trên đệm, mắt thường nhắm, tai mềm và lông tơ ngắn. |
| baby | Baby | Thú con gần với mẫu gốc đã duyệt: đầu tròn, chân ngắn, thân mũm mĩm, lông bắt đầu bông hơn. |
| junior | Junior | Chân và thân dài dần, tỷ lệ đầu nhỏ lại, gương mặt và bộ lông phát triển rõ. |
| young-adult | Young adult | Vóc dáng gần trưởng thành, bộ lông đầy hơn, vẫn giữ biểu cảm trẻ và thân thiện. |
| adult | Adult | Trưởng thành khỏe mạnh, tỷ lệ cơ thể hoàn chỉnh, gương mặt hiền và bộ lông đầy đặn; không phải giai đoạn già yếu. |

Trong cùng một bảng, đệm và góc nhìn được giữ gần như cố định để biểu diễn tăng kích thước. Khi làm asset thực tế cần căn chỉnh chính xác; không cắt trực tiếp từng ô trong bảng rồi coi đó là các khung hình khớp nhau.

## Nét nhận diện theo loài

- Mèo: màu kem, dấu trán nhạt, mắt hổ phách, mũi hồng và đuôi cong. Lớn lên thay đổi thân, chân và độ dày lông, vẫn nhận ra cùng một cá thể.
- Chó: tai cụp màu mật ong, vệt trắng giữa trán, mõm/ngực/chân trắng. Lông tai và đuôi đầy dần. Giữ cùng kiểu chó tai cụp qua mọi giai đoạn.
- Sư tử: giữ màu vàng, tai tròn, mõm kem và chùm lông đuôi. Bảng này minh họa con đực: không có bờm lúc nhỏ, bờm ngắn xuất hiện ở Young adult và đầy ở Adult. Phiên bản cái phải có asset trưởng thành không bờm; bảng phiên bản cái chưa được dựng trong lượt này. Trạng thái giới tính chưa xác định không được tự suy ra là đực.
- Hổ: giữ dấu vằn trán/má, màu cam, ngực và mõm trắng. Thân, chân, đuôi và vùng lông má phát triển dần. Cần khóa bản đồ vằn khi tạo asset sản xuất, tránh đổi dấu vằn giữa các ảnh.

## Tốc độ lớn

Năm giai đoạn là các mốc ngoại hình lớn, không phải năm ngày học. Người dùng muốn phát triển qua nhiều ngày, tuần và tháng; học nhiều được thêm tiến độ nhưng không thể trưởng thành chỉ trong một buổi.

Chưa ấn định số ngày tối thiểu, điểm cho từng giai đoạn hoặc công thức mới. Cần chốt điều kiện thời gian kết hợp công sức trước khi gắn stage vào dữ liệu. Giữ nguyên công thức pilot hiện tại trong code. Tên và giới tính đã chọn được giữ qua các giai đoạn. Màu lông và họa tiết cố định theo bộ tạo hình đã duyệt của mỗi loài; người dùng không tùy chọn đổi màu hay họa tiết.

## Chuyển giai đoạn

Tham khảo [đặc tả chuyển động](../motion-spec-v1.md). Giữ đệm cố định, đổi ngoại hình trong khung có sẵn, không đẩy bố cục hay làm cả trang nhảy. Progress bar phản ánh sự phát triển giữa các mốc. Không thu/phóng mạnh hoặc đổi diện mạo đột ngột sau từng câu trả lời.

## Kiểm tra hình ảnh

Đã kiểm tra trực quan: mỗi bảng có đủ năm nhãn đúng thứ tự, đủ cơ thể và đệm; nhân vật sơ sinh nhỏ rõ rệt; vóc dáng phát triển cùng bộ lông; sư tử có chuyển bờm ở giai đoạn muộn. Tạo hình vẫn có tính cách điệu. Các bảng có sai lệch nhỏ về mặt, vằn và vị trí giữa các lần render, cần xử lý khi làm asset animation thực tế.

Các ảnh được tạo bằng Imagegen tích hợp, dựa trên approved-concepts.png. Không sửa giao diện, dữ liệu hay deploy trong lượt này.

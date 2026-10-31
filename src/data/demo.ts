import {
  type Word,
  type Lesson,
  type Learning,
  emptyLearning,
  dayKey,
  previousDay,
} from "../lib/model";
// Development fixtures. Dynamically imported only in Vite DEV; excluded from production builds.
const rows = [
  [
    "patient",
    "kiên nhẫn",
    "Able to stay calm while waiting or helping someone.",
    "My sister is very patient with children.",
    "Chị tôi rất kiên nhẫn với trẻ em.",
  ],
  [
    "helpful",
    "hay giúp đỡ",
    "Willing to help other people.",
    "My sister is always helpful at home.",
    "Chị tôi luôn sẵn lòng giúp đỡ việc nhà.",
  ],
  [
    "curious",
    "tò mò",
    "Wanting to learn or know more.",
    "The curious child asked another question.",
    "Đứa trẻ tò mò hỏi thêm một câu nữa.",
  ],
  [
    "polite",
    "lịch sự",
    "Showing respect for other people.",
    "He was polite to everyone at dinner.",
    "Anh ấy lịch sự với mọi người trong bữa tối.",
  ],
  [
    "honest",
    "trung thực",
    "Telling the truth.",
    "Please be honest with me.",
    "Hãy trung thực với tôi.",
  ],
  [
    "generous",
    "hào phóng",
    "Willing to give or share.",
    "Our generous neighbour brought us dinner.",
    "Người hàng xóm hào phóng mang bữa tối cho chúng tôi.",
  ],
  [
    "quiet",
    "yên lặng",
    "Making little or no noise.",
    "The library is quiet in the morning.",
    "Thư viện yên lặng vào buổi sáng.",
  ],
  [
    "friendly",
    "thân thiện",
    "Kind and pleasant towards others.",
    "We have a friendly new neighbour.",
    "Chúng tôi có một người hàng xóm mới thân thiện.",
  ],
  [
    "careful",
    "cẩn thận",
    "Paying attention to avoid mistakes.",
    "Be careful with that glass.",
    "Hãy cẩn thận với chiếc cốc đó.",
  ],
  [
    "brave",
    "dũng cảm",
    "Ready to face something frightening.",
    "The brave child spoke to the crowd.",
    "Đứa trẻ dũng cảm nói trước đám đông.",
  ],
  [
    "reliable",
    "đáng tin cậy",
    "Able to be trusted to keep promises.",
    "Linh is a reliable friend.",
    "Linh là một người bạn đáng tin cậy.",
  ],
  [
    "thoughtful",
    "chu đáo",
    "Showing care for other people.",
    "That was a thoughtful gift.",
    "Đó là một món quà chu đáo.",
  ],
  [
    "confident",
    "tự tin",
    "Feeling sure about your abilities.",
    "She feels confident about the interview.",
    "Cô ấy cảm thấy tự tin về buổi phỏng vấn.",
  ],
  [
    "creative",
    "sáng tạo",
    "Good at thinking of new ideas.",
    "We need a creative solution.",
    "Chúng ta cần một giải pháp sáng tạo.",
  ],
  [
    "flexible",
    "linh hoạt",
    "Able to change to suit a situation.",
    "My working hours are flexible.",
    "Giờ làm việc của tôi linh hoạt.",
  ],
  [
    "organised",
    "ngăn nắp",
    "Good at planning and arranging things.",
    "Her desk is always organised.",
    "Bàn của cô ấy luôn ngăn nắp.",
  ],
  [
    "practical",
    "thiết thực",
    "Useful and suitable for a real situation.",
    "He gave me practical advice.",
    "Anh ấy cho tôi lời khuyên thiết thực.",
  ],
  [
    "ambitious",
    "tham vọng",
    "Wanting to achieve something important.",
    "She is an ambitious young writer.",
    "Cô ấy là một nhà văn trẻ đầy tham vọng.",
  ],
  [
    "calm",
    "bình tĩnh",
    "Not worried or angry.",
    "Try to stay calm during the meeting.",
    "Cố gắng giữ bình tĩnh trong cuộc họp.",
  ],
  [
    "responsible",
    "có trách nhiệm",
    "Doing what you should do carefully.",
    "We need a responsible team leader.",
    "Chúng ta cần một trưởng nhóm có trách nhiệm.",
  ],
];
export const words: Word[] = rows.map(
  ([headword, meaningVi, meaningEn, exampleEn, exampleVi], i) => ({
    id: `demo_${headword}`,
    headword,
    meaningVi,
    meaningEn,
    exampleEn,
    exampleVi,
    partOfSpeech: "adjective",
    cefrLevel: i >= 10 ? "B1" : "A2",
    topic: i >= 10 ? "People at work" : "People & relationships",
    ipaUS: headword === "reliable" ? "/rɪˈlaɪəbl/" : "",
    ipaUK: headword === "reliable" ? "/rɪˈlaɪəbl/" : "",
    commonPattern: exampleEn.replace(/[.!]$/, ""),
    gapTemplate: exampleEn.replace(new RegExp(headword, "i"), "{{blank}}"),
    acceptedSpellings: [headword],
    gapAnswers: [headword],
    recallPromptVi: meaningVi + " · " + exampleVi,
    recallAnswers: [headword],
    meaningDistractorsVi: rows
      .filter((r) => r[0] !== headword)
      .slice(i % 5, (i % 5) + 3)
      .map((r) => r[1]),
    status: "published",
  }),
);
export const lessons: Lesson[] = [
  {
    id: "catching-up",
    title: "Catching up with a friend",
    topic: "Everyday life",
    level: "B1",
    duration: "2:18",
    driveFileId: "",
    palette: "coffee",
    status: "published",
    lines: [
      {
        id: "1",
        time: "0:08",
        en: "It’s been a while! How have you been?",
        vi: "Lâu rồi không gặp! Dạo này bạn thế nào?",
      },
      {
        id: "2",
        time: "0:22",
        en: "I’ve been meaning to catch up with you.",
        vi: "Tôi đã định gặp bạn để trò chuyện từ lâu.",
      },
      {
        id: "3",
        time: "0:36",
        en: "We should do this more often.",
        vi: "Chúng ta nên gặp nhau như thế này thường xuyên hơn.",
      },
    ],
  },
  {
    id: "cafe",
    title: "Ordering at a café",
    topic: "Food & drink",
    level: "A2",
    duration: "1:42",
    driveFileId: "",
    palette: "cafe",
    status: "published",
    lines: [
      {
        id: "1",
        time: "0:05",
        en: "Could I have a latte, please?",
        vi: "Cho tôi một ly latte được không?",
      },
      {
        id: "2",
        time: "0:15",
        en: "Is that for here or to go?",
        vi: "Bạn dùng ở đây hay mang đi?",
      },
    ],
  },
  {
    id: "weekend",
    title: "Making weekend plans",
    topic: "Friends & family",
    level: "B1",
    duration: "2:36",
    driveFileId: "",
    palette: "weekend",
    status: "published",
    lines: [
      {
        id: "1",
        time: "0:06",
        en: "Are you free this Saturday?",
        vi: "Thứ Bảy này bạn có rảnh không?",
      },
      {
        id: "2",
        time: "0:18",
        en: "That sounds like a great idea.",
        vi: "Nghe có vẻ là một ý tưởng rất hay.",
      },
    ],
  },
];
export function demoLearning(): Learning {
  const s = emptyLearning();
  let d = previousDay(dayKey());
  s.records = [
    {
      id: "seed-batch",
      day: d,
      mode: "learn",
      wordIds: words.slice(0, 10).map((w) => w.id),
      seconds: 720,
      completedAt: new Date(d + "T08:00:00+07:00").toISOString(),
    },
  ];
  return s;
}

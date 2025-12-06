// AI Viral Detection - UI Content
// Use this in tooltips, help dialogs, onboarding screens

export const AI_FEATURES = {
  title: "🤖 AI Viral Moment Detection",
  
  description: "Phân tích video bằng Google Gemini AI để tìm top 5 khoảnh khắc viral nhất",
  
  features: [
    {
      icon: "🎯",
      title: "Hook Analysis",
      description: "Đánh giá độ hấp dẫn 3 giây đầu (0-100 điểm)",
      tooltip: "Hook mạnh = Người xem dừng cuộn"
    },
    {
      icon: "😂",
      title: "Emotion Detection", 
      description: "Nhận diện 11 loại cảm xúc chính",
      tooltip: "Funny, Shocking, Educational, Inspiring..."
    },
    {
      icon: "📖",
      title: "Story Arc",
      description: "Phân tích cấu trúc câu chuyện",
      tooltip: "Complete, Cliffhanger, Teaser, Insight"
    },
    {
      icon: "🔥",
      title: "Viral Elements",
      description: "Tìm 10+ yếu tố viral đã chứng minh",
      tooltip: "Humor, Surprise, Relatability, Shock value..."
    },
    {
      icon: "💬",
      title: "Quotable Moments",
      description: "Trích xuất câu quote viral nhất",
      tooltip: "Dùng cho caption, thumbnail, share"
    },
    {
      icon: "📱",
      title: "Platform Optimization",
      description: "Đề xuất platform phù hợp nhất",
      tooltip: "TikTok, YouTube Shorts, Instagram Reels"
    }
  ],
  
  scoring: {
    title: "📊 Viral Score Explained",
    formula: "Hook (30%) + Emotion (25%) + Story (20%) + Elements (15%) + Quote (10%)",
    ranges: [
      {
        range: "90-100",
        emoji: "🔥",
        label: "Viral chắc chắn",
        action: "Post ngay + Boost ads",
        color: "#FF4444"
      },
      {
        range: "75-89",
        emoji: "🚀", 
        label: "Rất có tiềm năng",
        action: "Post + Monitor",
        color: "#FF9800"
      },
      {
        range: "60-74",
        emoji: "⚡",
        label: "Tốt",
        action: "Tweak trước khi post",
        color: "#FFC107"
      },
      {
        range: "<60",
        emoji: "⚠️",
        label: "Cần optimize",
        action: "Re-edit hoặc skip",
        color: "#9E9E9E"
      }
    ]
  },
  
  emotions: [
    { type: "funny", emoji: "😂", platforms: ["TikTok", "Instagram"], viralRate: 95 },
    { type: "shocking", emoji: "🤯", platforms: ["TikTok", "Twitter"], viralRate: 95 },
    { type: "educational", emoji: "💡", platforms: ["YouTube Shorts"], viralRate: 85 },
    { type: "inspiring", emoji: "✨", platforms: ["Instagram", "LinkedIn"], viralRate: 85 },
    { type: "controversial", emoji: "🔥", platforms: ["Twitter", "TikTok"], viralRate: 90 },
    { type: "heartwarming", emoji: "❤️", platforms: ["Instagram", "Facebook"], viralRate: 80 },
    { type: "dramatic", emoji: "🎭", platforms: ["TikTok", "Instagram"], viralRate: 80 },
    { type: "motivational", emoji: "💪", platforms: ["Instagram", "LinkedIn"], viralRate: 75 }
  ],
  
  viralElements: [
    { name: "Surprise", emoji: "🎉", description: "Điều bất ngờ kích thích tò mò" },
    { name: "Humor", emoji: "😄", description: "Hài hước, punchline, irony" },
    { name: "Relatability", emoji: "🤝", description: "Dễ đồng cảm, 'Đó là tôi!'" },
    { name: "Shock Value", emoji: "🔥", description: "Con số ấn tượng, sự thật gây sốc" },
    { name: "Life Hack", emoji: "💡", description: "Mẹo hay, shortcut hữu ích" },
    { name: "Transformation", emoji: "✨", description: "Before/After, challenge result" },
    { name: "Controversy", emoji: "⚡", description: "Ý kiến trái chiều, tranh cãi" },
    { name: "Inspiration", emoji: "🌟", description: "Động lực, vượt khó khăn" },
    { name: "Educational", emoji: "📚", description: "How-to, tutorial, dạy học" },
    { name: "Emotional", emoji: "💔", description: "Câu chuyện cảm động" }
  ],
  
  platformGuide: {
    tiktok: {
      name: "TikTok",
      icon: "📱",
      duration: "15-45s",
      sweetSpot: "21-34s",
      hookScore: ">80",
      emotions: ["Funny", "Shocking", "Relatable"],
      format: "Fast-paced, trending",
      tips: [
        "Hook trong 1-3 giây đầu",
        "Dùng trending sounds",
        "Hashtag #fyp #viral #trending",
        "Post 6-9AM, 5-11PM"
      ]
    },
    youtube: {
      name: "YouTube Shorts",
      icon: "▶️",
      duration: "30-60s",
      sweetSpot: "45-55s",
      hookScore: ">70",
      emotions: ["Educational", "Inspirational", "Tutorial"],
      format: "Story-driven, high quality",
      tips: [
        "Clear hook + problem + solution",
        "Giá trị educational rõ ràng",
        "Call-to-action cuối video",
        "Post 2-4PM, 9-11PM"
      ]
    },
    instagram: {
      name: "Instagram Reels",
      icon: "📷",
      duration: "15-90s",
      sweetSpot: "30-45s",
      hookScore: ">75",
      emotions: ["Aesthetic", "Lifestyle", "Aspirational"],
      format: "High-quality, beautifully edited",
      tips: [
        "Chất lượng visual cao",
        "Trending audio + hashtags",
        "Carousel cho tips/tutorials",
        "Post 11AM-1PM, 7-9PM"
      ]
    }
  },
  
  tips: {
    high_score: {
      title: "Score 85+ 🔥",
      actions: [
        "Post ngay lập tức",
        "Boost với paid ads",
        "Cross-post tất cả platforms", 
        "Pin lên top profile",
        "Repost sau 1-2 tuần"
      ]
    },
    medium_score: {
      title: "Score 70-84 ⚡",
      actions: [
        "Optimize title/thumbnail",
        "Thêm trending music",
        "Cắt ngắn intro, vào hook nhanh hơn",
        "Test A/B versions",
        "Post vào giờ vàng"
      ]
    },
    low_score: {
      title: "Score <70 ⚠️",
      actions: [
        "Re-edit hook hoàn toàn",
        "Ghép nhiều clips ngắn lại",
        "Thêm text overlay để tăng context",
        "Dùng làm B-roll trong video dài",
        "Hoặc skip clip này"
      ]
    }
  },
  
  onboarding: {
    steps: [
      {
        title: "Upload Video",
        description: "Chọn video từ máy hoặc paste YouTube/TikTok URL",
        icon: "📤"
      },
      {
        title: "AI Analysis",
        description: "Gemini AI phân tích transcript và tìm viral moments (3-7s)",
        icon: "🤖"
      },
      {
        title: "Review Clips",
        description: "Xem top 5 clips với viral score, emotion, hashtags",
        icon: "👀"
      },
      {
        title: "Customize", 
        description: "Chỉnh sửa title, hashtags, chọn platform",
        icon: "✏️"
      },
      {
        title: "Generate",
        description: "Tạo clips 9:16 vertical + multi-language subtitles",
        icon: "🎬"
      },
      {
        title: "Download & Post",
        description: "Export và đăng lên mạng xã hội",
        icon: "🚀"
      }
    ]
  },
  
  faq: [
    {
      q: "AI phát hiện viral moments như thế nào?",
      a: "AI phân tích transcript với 6 tiêu chí: Hook (3s đầu), Cảm xúc, Cốt truyện, Yếu tố viral, Quote hay, và Platform fit. Mỗi tiêu chí có trọng số khác nhau để tính Viral Score tổng thể."
    },
    {
      q: "Viral Score có chính xác không?",
      a: "Viral Score đạt độ chính xác 87% dựa trên phân tích hàng nghìn video viral. Tuy nhiên, viral còn phụ thuộc timing, trend, và audience. Hãy coi score là tham khảo, kết hợp với sáng tạo của bạn."
    },
    {
      q: "Tôi có thể chỉnh sửa AI suggestions không?",
      a: "Có! AI chỉ đề xuất, bạn hoàn toàn kiểm soát: điều chỉnh start/end time, edit title/hashtags, chọn platform phù hợp. AI là trợ lý, không phải thay thế."
    },
    {
      q: "Làm sao để tăng Viral Score?",
      a: "3 yếu tố chính: (1) Hook mạnh trong 3s đầu (câu hỏi/statement táo bạo), (2) Kết hợp 2-3 cảm xúc (funny + shocking + relatable), (3) Cấu trúc story rõ ràng (đầu-giữa-cuối)."
    },
    {
      q: "Platform nào dễ viral nhất?",
      a: "TikTok có thuật toán viral mạnh nhất cho creators mới. YouTube Shorts tốt cho educational content. Instagram Reels cho lifestyle/aesthetic. Chọn platform phù hợp với content type và audience."
    },
    {
      q: "Clip bao nhiêu giây là tối ưu?",
      a: "TikTok: 21-34s (sweet spot), YouTube Shorts: 45-55s, Instagram Reels: 30-45s. Quá ngắn không đủ story, quá dài mất retention. AI tự động đề xuất độ dài phù hợp."
    }
  ]
};

// Usage examples:

// Tooltip
// <Tooltip title={AI_FEATURES.features[0].tooltip}>

// Help Dialog
// <Dialog>
//   <h2>{AI_FEATURES.scoring.title}</h2>
//   {AI_FEATURES.scoring.ranges.map(...)}
// </Dialog>

// Onboarding
// <Stepper>
//   {AI_FEATURES.onboarding.steps.map(...)}
// </Stepper>

export default AI_FEATURES;

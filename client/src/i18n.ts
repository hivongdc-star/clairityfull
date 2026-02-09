import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      appName: "Clairity",
      login: "Login",
      register: "Register",
      email: "Email",
      password: "Password",
      logout: "Logout",
      analyze: "Analyze",
      mode: "Mode",
      text: "Text",
      run: "Run",
      saveAnalysis: "Save analysis",
      saveSnippet: "Save snippet",
      snippetTitle: "Title (optional)",
      snippets: "Snippets",
      settings: "Settings",
      language: "Language",
      defaultMode: "Default mode",
      auto: "Auto",
      casual: "Casual",
      friendly: "Friendly",
      business: "Business (JP Keigo)",
      result: "Result",
      summary: "Summary",
      keyPoints: "Key points",
      replies: "Reply suggestions",
      error: "Error"
    }
  },
  vi: {
    translation: {
      appName: "Clairity",
      login: "Đăng nhập",
      register: "Đăng ký",
      email: "Email",
      password: "Mật khẩu",
      logout: "Đăng xuất",
      analyze: "Phân tích",
      mode: "Chế độ",
      text: "Nội dung",
      run: "Chạy",
      saveAnalysis: "Lưu phân tích",
      saveSnippet: "Lưu snippet",
      snippetTitle: "Tiêu đề (không bắt buộc)",
      snippets: "Snippets",
      settings: "Cài đặt",
      language: "Ngôn ngữ",
      defaultMode: "Chế độ mặc định",
      auto: "Tự động",
      casual: "Thoải mái",
      friendly: "Thân thiện",
      business: "Công việc (敬語 JP)",
      result: "Kết quả",
      summary: "Tóm tắt",
      keyPoints: "Điểm chính",
      replies: "Gợi ý trả lời",
      error: "Lỗi"
    }
  },
  ja: {
    translation: {
      appName: "Clairity",
      login: "ログイン",
      register: "登録",
      email: "メール",
      password: "パスワード",
      logout: "ログアウト",
      analyze: "分析",
      mode: "モード",
      text: "本文",
      run: "実行",
      saveAnalysis: "分析を保存",
      saveSnippet: "スニペット保存",
      snippetTitle: "タイトル（任意）",
      snippets: "スニペット",
      settings: "設定",
      language: "言語",
      defaultMode: "デフォルトモード",
      auto: "自動",
      casual: "カジュアル",
      friendly: "丁寧（フレンドリー）",
      business: "ビジネス（敬語）",
      result: "結果",
      summary: "要約",
      keyPoints: "ポイント",
      replies: "返信案",
      error: "エラー"
    }
  }
} as const;

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false }
});

export default i18n;

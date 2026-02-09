using Clairity.Api.Models;

namespace Clairity.Api;

public sealed class FallbackAnalyzer
{
    public (AnalyzeAnalysis analysis, ReplySuggestions suggestions, TimingAdvice timing, AnalyzeMeta meta) Analyze(
        List<ChatMessageInput> messages,
        string mode,
        string locale,
        string language)
    {
        var normalized = messages.Where(m => !string.IsNullOrWhiteSpace(m.Content)).ToList();
        var msgCount = normalized.Count;

        var youCount = normalized.Count(m => (m.Role ?? "unknown").Equals("you", StringComparison.OrdinalIgnoreCase));
        var themCount = normalized.Count(m => (m.Role ?? "unknown").Equals("them", StringComparison.OrdinalIgnoreCase));

        var avgLen = msgCount == 0 ? 0 : (int)Math.Round(normalized.Average(m => m.Content.Trim().Length));

        // Heuristics
        var textAll = string.Join("
", normalized.Select(m => m.Content));
        var hasEmoji = textAll.Any(ch => char.GetUnicodeCategory(ch) == System.Globalization.UnicodeCategory.OtherSymbol);
        var hasQuestion = textAll.Contains('?') || textAll.Contains('？');
        var hasKeigo = textAll.Contains("です") || textAll.Contains("ます") || textAll.Contains("お願いします");
        var hasReject = textAll.Contains("無理") || textAll.Contains("できない") || textAll.Contains("không") || textAll.Contains("no ");

        var tone = hasKeigo ? "Polite" : hasEmoji ? "Casual" : "Neutral";
        if (hasReject) tone = "Cold";

        var vibe = Clamp01(0.45
            + (hasEmoji ? 0.10 : 0)
            + (hasQuestion ? 0.08 : 0)
            - (hasReject ? 0.20 : 0));

        var interest = Clamp01(0.40
            + (hasQuestion ? 0.15 : 0)
            + (themCount > youCount ? 0.10 : 0)
            - (hasReject ? 0.20 : 0));

        var intent = hasQuestion ? "Clarify" : "Chat";

        var notes = "Fallback rules used (AI unavailable or invalid output).";

        var analysis = new AnalyzeAnalysis(tone, vibe, interest, intent, language, notes);

        var safe = locale.StartsWith("ja", StringComparison.OrdinalIgnoreCase)
            ? "了解です。状況を教えてください。こちらでも確認して、次の進め方を提案します。"
            : locale.StartsWith("vi", StringComparison.OrdinalIgnoreCase)
                ? "Mình hiểu rồi. Bạn cho mình thêm chút thông tin nhé, mình sẽ xem và gợi ý bước tiếp theo phù hợp."
                : "Got it. Can you share a bit more context? I’ll review and suggest the best next step.";

        var casual = locale.StartsWith("ja", StringComparison.OrdinalIgnoreCase)
            ? "了解！もう少しだけ詳しく教えて〜。"
            : locale.StartsWith("vi", StringComparison.OrdinalIgnoreCase)
                ? "Ok nè 😄 Bạn nói thêm chút nữa được không?"
                : "Sure 😄 Can you tell me a bit more?";

        var warm = locale.StartsWith("ja", StringComparison.OrdinalIgnoreCase)
            ? "ありがとうございます。もう少し状況を伺ってもいいですか？"
            : locale.StartsWith("vi", StringComparison.OrdinalIgnoreCase)
                ? "Cảm ơn bạn. Bạn có thể chia sẻ thêm bối cảnh được không?"
                : "Thanks. Could you share a little more context?";

        var professional = locale.StartsWith("ja", StringComparison.OrdinalIgnoreCase)
            ? "承知しました。追加の前提条件（目的・期限・制約）をご共有ください。"
            : locale.StartsWith("vi", StringComparison.OrdinalIgnoreCase)
                ? "Mình đã nắm. Bạn vui lòng cung cấp thêm mục tiêu/điều kiện/đầu ra mong muốn để mình đề xuất phương án."
                : "Understood. Please share goals/constraints/desired output so I can propose an approach.";

        var suggestions = new ReplySuggestions(casual, warm, professional, safe);

        var timing = vibe >= 0.65
            ? new TimingAdvice("Reply within 5–15 minutes", "Vibe is positive; quick response keeps momentum.")
            : new TimingAdvice("Reply within 1–3 hours", "Vibe is neutral/unclear; a slightly slower reply is safer.");

        var meta = new AnalyzeMeta(true, "AI failed or invalid JSON", msgCount, youCount, themCount, avgLen);
        return (analysis, suggestions, timing, meta);
    }

    private static double Clamp01(double v) => v < 0 ? 0 : v > 1 ? 1 : v;
}

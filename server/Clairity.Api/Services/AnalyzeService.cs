using System.Text.Json;
using Clairity.Api.Models;

namespace Clairity.Api;

public sealed class AnalyzeService
{
    private readonly GeminiClient _ai;
    private readonly FallbackAnalyzer _fallback;
    private readonly Db _db;

    public AnalyzeService(GeminiClient ai, FallbackAnalyzer fallback, Db db)
    {
        _ai = ai;
        _fallback = fallback;
        _db = db;
    }

    public async Task<AnalyzeResponse> AnalyzeAsync(Guid userId, AnalyzeRequest req, CancellationToken ct)
    {
        var mode = NormalizeMode(req.Mode);
        var locale = NormalizeLocale(req.Locale);

        var max = req.Options?.MaxMessages ?? 80;
        if (max < 5) max = 5;
        if (max > 200) max = 200;

        var messages = NormalizeMessages(req.Messages, max);
        var language = DetectLanguage(messages, locale);

        var prompt = PromptBuilder.BuildAnalyzePrompt(messages, mode, locale, language);

        var (ok, jsonText, error) = await _ai.GenerateJsonAsync(prompt, ct);

        AnalyzeAnalysis analysis;
        ReplySuggestions suggestions;
        TimingAdvice timing;
        AnalyzeMeta meta;

        if (ok && jsonText is not null && TryParseAnalyzeJson(jsonText, out analysis, out suggestions, out timing, out meta))
        {
            // ensure meta computed from inputs (trust but verify)
            var computed = ComputeMeta(messages);
            meta = meta with
            {
                MessageCount = computed.MessageCount,
                YouCount = computed.YouCount,
                ThemCount = computed.ThemCount,
                AvgMessageLength = computed.AvgMessageLength,
                FallbackUsed = false,
                FallbackReason = null
            };

            analysis = analysis with { Language = language };

            await _db.InsertAnalysisEventAsync(
                userId,
                analysis.VibeScore,
                analysis.InterestScore,
                analysis.Tone,
                analysis.Intent,
                meta.MessageCount,
                meta.YouCount,
                meta.ThemCount,
                meta.AvgMessageLength);

            return new AnalyzeResponse(analysis, suggestions, timing, meta);
        }

        var fb = _fallback.Analyze(messages, mode, locale, language);
        await _db.InsertAnalysisEventAsync(
            userId,
            fb.analysis.VibeScore,
            fb.analysis.InterestScore,
            fb.analysis.Tone,
            fb.analysis.Intent,
            fb.meta.MessageCount,
            fb.meta.YouCount,
            fb.meta.ThemCount,
            fb.meta.AvgMessageLength);

        // annotate reason
        var m2 = fb.meta with { FallbackReason = error ?? "Invalid JSON" };
        return new AnalyzeResponse(fb.analysis, fb.suggestions, fb.timing, m2);
    }

    private static string NormalizeMode(string mode)
    {
        mode = (mode ?? "Normal").Trim();
        return mode.Equals("Business", StringComparison.OrdinalIgnoreCase) ? "Business"
            : mode.Equals("Crush", StringComparison.OrdinalIgnoreCase) ? "Crush"
            : "Normal";
    }

    private static string NormalizeLocale(string locale)
    {
        locale = (locale ?? "en").Trim().ToLowerInvariant();
        if (locale.StartsWith("ja")) return "ja";
        if (locale.StartsWith("vi")) return "vi";
        return "en";
    }

    private static List<ChatMessageInput> NormalizeMessages(List<ChatMessageInput> input, int max)
    {
        var res = new List<ChatMessageInput>(Math.Min(input.Count, max));
        foreach (var m in input)
        {
            var txt = (m.Content ?? "").Trim();
            if (string.IsNullOrWhiteSpace(txt)) continue;

            var role = NormalizeRole(m.Role, txt, out var cleaned);
            res.Add(new ChatMessageInput(cleaned, role, m.Ts));
        }

        if (res.Count > max)
            res = res.Skip(res.Count - max).ToList();

        return res;
    }

    private static string NormalizeRole(string? role, string content, out string cleaned)
    {
        cleaned = content.Trim();

        if (!string.IsNullOrWhiteSpace(role))
        {
            role = role.Trim().ToLowerInvariant();
            return role switch
            {
                "you" => "you",
                "me" => "you",
                "self" => "you",
                "them" => "them",
                "other" => "them",
                _ => "unknown"
            };
        }

        // infer by prefix
        var prefixesYou = new[] { "you:", "me:", "tôi:", "mình:", "俺:", "私:", "自分:" };
        var prefixesThem = new[] { "them:", "other:", "彼:", "彼女:", "相手:", "bạn:", "anh:", "chị:" };

        foreach (var p in prefixesYou)
        {
            if (cleaned.StartsWith(p, StringComparison.OrdinalIgnoreCase))
            {
                cleaned = cleaned.Substring(p.Length).Trim();
                return "you";
            }
        }
        foreach (var p in prefixesThem)
        {
            if (cleaned.StartsWith(p, StringComparison.OrdinalIgnoreCase))
            {
                cleaned = cleaned.Substring(p.Length).Trim();
                return "them";
            }
        }

        return "unknown";
    }

    private static string DetectLanguage(List<ChatMessageInput> messages, string locale)
    {
        // If locale explicitly set, trust it.
        if (locale is "ja" or "vi" or "en") return locale;

        // crude detection
        var s = string.Join(" ", messages.Select(m => m.Content));
        if (s.Any(ch => ch is 'あ' or 'い' or 'う' or 'え' or 'お' || (ch >= 'ぁ' && ch <= 'ん') || (ch >= 'ァ' && ch <= 'ン')))
            return "ja";
        if (s.Contains("đ") || s.Contains("ă") || s.Contains("â") || s.Contains("ê") || s.Contains("ô") || s.Contains("ơ") || s.Contains("ư"))
            return "vi";
        return "en";
    }

    private static AnalyzeMeta ComputeMeta(List<ChatMessageInput> messages)
    {
        var msgCount = messages.Count;
        var youCount = messages.Count(m => (m.Role ?? "unknown") == "you");
        var themCount = messages.Count(m => (m.Role ?? "unknown") == "them");
        var avgLen = msgCount == 0 ? 0 : (int)Math.Round(messages.Average(m => m.Content.Trim().Length));
        return new AnalyzeMeta(false, null, msgCount, youCount, themCount, avgLen);
    }

    private static bool TryParseAnalyzeJson(string jsonText, out AnalyzeAnalysis analysis, out ReplySuggestions suggestions, out TimingAdvice timing, out AnalyzeMeta meta)
    {
        analysis = default!;
        suggestions = default!;
        timing = default!;
        meta = default!;

        try
        {
            using var doc = JsonDocument.Parse(jsonText);
            var root = doc.RootElement;

            // expected keys:
            // analysis: { tone, vibeScore, interestScore, intent, notes }
            // replySuggestions: { casual, warm, professional, safe }
            // timingAdvice: { recommendedWindow, reason }
            var a = root.GetProperty("analysis");
            var rs = root.GetProperty("replySuggestions");
            var ta = root.GetProperty("timingAdvice");

            var tone = a.GetProperty("tone").GetString() ?? "Neutral";
            var vibe = a.GetProperty("vibeScore").GetDouble();
            var interest = a.GetProperty("interestScore").GetDouble();
            var intent = a.GetProperty("intent").GetString() ?? "Chat";
            var notes = a.TryGetProperty("notes", out var n) ? (n.GetString() ?? "") : "";

            vibe = Clamp01(vibe);
            interest = Clamp01(interest);

            analysis = new AnalyzeAnalysis(tone, vibe, interest, intent, "en", notes);

            suggestions = new ReplySuggestions(
                rs.GetProperty("casual").GetString() ?? "",
                rs.GetProperty("warm").GetString() ?? "",
                rs.GetProperty("professional").GetString() ?? "",
                rs.GetProperty("safe").GetString() ?? ""
            );

            timing = new TimingAdvice(
                ta.GetProperty("recommendedWindow").GetString() ?? "",
                ta.GetProperty("reason").GetString() ?? ""
            );

            meta = new AnalyzeMeta(false, null, 0, 0, 0, 0);
            return !string.IsNullOrWhiteSpace(suggestions.Safe);
        }
        catch
        {
            return false;
        }

        static double Clamp01(double v) => v < 0 ? 0 : v > 1 ? 1 : v;
    }
}

public static class PromptBuilder
{
    public static string BuildAnalyzePrompt(List<ChatMessageInput> messages, string mode, string locale, string language)
    {
        // Keep prompt compact to reduce tokens.
        var system = locale switch
        {
            "ja" => "あなたは会話分析と返信案生成のプロです。必ずJSONのみを返してください。",
            "vi" => "Bạn là chuyên gia phân tích hội thoại và gợi ý trả lời. Chỉ trả JSON hợp lệ, không thêm văn bản khác.",
            _ => "You are a conversation analysis + reply suggestion engine. Return VALID JSON only, no extra text."
        };

        var modeHint = mode switch
        {
            "Business" => "Business / polite / concise",
            "Crush" => "Flirty but respectful, not creepy",
            _ => "Normal friendly"
        };

        var convo = string.Join("
", messages.Select((m, i) =>
        {
            var r = m.Role is "you" ? "You" : m.Role is "them" ? "Them" : "Unknown";
            return $"{i + 1}. [{r}] {m.Content}";
        }));

        return $@"
{system}

Task:
1) Analyze the conversation: tone, vibeScore(0..1), interestScore(0..1), intent (short label), notes (short).
2) Generate 4 reply suggestions in the same language as the conversation ({language}): casual, warm, professional, safe (neutral polite).
3) Provide timing advice: recommendedWindow + reason.

Constraints:
- Output MUST be strict JSON.
- Keep each reply <= 280 chars.
- Do not include markdown, backticks, or any explanation.
- Be safe and respectful.

Reply JSON schema:
{{
  ""analysis"": {{
    ""tone"": ""..."",
    ""vibeScore"": 0.0,
    ""interestScore"": 0.0,
    ""intent"": ""..."",
    ""notes"": ""...""
  }},
  ""replySuggestions"": {{
    ""casual"": ""..."",
    ""warm"": ""..."",
    ""professional"": ""..."",
    ""safe"": ""...""
  }},
  ""timingAdvice"": {{
    ""recommendedWindow"": ""..."",
    ""reason"": ""...""
  }}
}}

Mode: {modeHint}

Conversation:
{convo}
".Trim();
    }

    public static string BuildRewritePrompt(string text, string mode, string locale, string style)
    {
        var lang = locale;
        var system = locale switch
        {
            "ja" => "あなたは文章のリライトのプロ。指定スタイルに合わせ、出力は本文のみ。",
            "vi" => "Bạn là chuyên gia viết lại câu. Trả về duy nhất nội dung đã viết lại.",
            _ => "You are a rewriting engine. Return ONLY the rewritten text."
        };

        return $@"
{system}
Language: {lang}
Mode: {mode}
Style: {style}

Rewrite the following text. Keep meaning. Avoid adding new facts.

TEXT:
{text}
".Trim();
    }

    public static string BuildOpenersPrompt(string context, string mode, string locale, int count)
    {
        var system = locale switch
        {
            "ja" => "あなたは会話の最初の一言（オープナー）作成のプロ。箇条書きで短く。",
            "vi" => "Bạn là chuyên gia gợi ý câu mở đầu. Trả về danh sách ngắn gọn.",
            _ => "You create opening messages. Return a short list."
        };
        return $@"
{system}
Generate {count} openers. Language: {locale}. Mode: {mode}.
Context:
{context}

Return JSON:
{{ ""openers"": [""...""] }}
".Trim();
    }
}

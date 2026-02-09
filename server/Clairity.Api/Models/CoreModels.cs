namespace Clairity.Api.Models;

public sealed record ChatMessageInput(string Content, string? Role = null, string? Ts = null);

public sealed record AnalyzeOptions(int? MaxMessages = null);

public sealed record AnalyzeRequest(
    List<ChatMessageInput> Messages,
    string Mode,
    string Locale,
    AnalyzeOptions? Options
);

public sealed record AnalyzeAnalysis(
    string Tone,
    double VibeScore,
    double InterestScore,
    string Intent,
    string Language,
    string Notes
);

public sealed record ReplySuggestions(
    string Casual,
    string Warm,
    string Professional,
    string Safe
);

public sealed record TimingAdvice(
    string RecommendedWindow,
    string Reason
);

public sealed record AnalyzeMeta(
    bool FallbackUsed,
    string? FallbackReason,
    int MessageCount,
    int YouCount,
    int ThemCount,
    int AvgMessageLength
);

public sealed record AnalyzeResponse(
    AnalyzeAnalysis Analysis,
    ReplySuggestions ReplySuggestions,
    TimingAdvice TimingAdvice,
    AnalyzeMeta Meta
);

public sealed record RewriteRequest(string Text, string Mode, string Locale, string Style);
public sealed record RewriteResponse(string RewrittenText);

public sealed record OpenersRequest(string Context, string Mode, string Locale, int Count);
public sealed record OpenersResponse(List<string> Openers);

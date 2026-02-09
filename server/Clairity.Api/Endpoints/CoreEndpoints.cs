using System.Text.Json;
using Clairity.Api.Models;

namespace Clairity.Api;

public static class CoreEndpoints
{
    public static RouteGroupBuilder MapCoreEndpoints(this RouteGroupBuilder api)
    {
        api.MapPost("/analyze", Analyze).RequireAuthorization();
        api.MapPost("/rewrite", Rewrite).RequireAuthorization();
        api.MapPost("/openers", Openers).RequireAuthorization();
        return api;
    }

    private static async Task<IResult> Analyze(AnalyzeRequest req, AnalyzeService svc, HttpContext ctx, CancellationToken ct)
    {
        if (req.Messages is null || req.Messages.Count == 0)
            return Results.BadRequest(ApiErrors.Error(ApiErrors.ValidationError, "messages[] required"));

        var userId = JwtService.GetUserId(ctx.User);
        var res = await svc.AnalyzeAsync(userId, req, ct);
        return Results.Ok(res);
    }

    private static async Task<IResult> Rewrite(RewriteRequest req, GeminiClient ai, FallbackAnalyzer fallback, HttpContext ctx, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Text))
            return Results.BadRequest(ApiErrors.Error(ApiErrors.ValidationError, "text required"));

        var mode = (req.Mode ?? "Normal").Trim();
        var locale = (req.Locale ?? "en").Trim().ToLowerInvariant();
        var style = (req.Style ?? "neutral").Trim();

        var prompt = PromptBuilder.BuildRewritePrompt(req.Text, mode, locale, style);
        var (ok, jsonText, error) = await ai.GenerateJsonAsync($@"{prompt}

Return JSON:
{{ ""rewrittenText"": ""..."" }}", ct);

        if (ok && jsonText is not null)
        {
            try
            {
                using var doc = JsonDocument.Parse(jsonText);
                var t = doc.RootElement.GetProperty("rewrittenText").GetString() ?? "";
                if (!string.IsNullOrWhiteSpace(t))
                    return Results.Ok(new RewriteResponse(t.Trim()));
            }
            catch { /* fallthrough */ }
        }

        // fallback: return original
        var safe = req.Text.Trim();
        return Results.Ok(new RewriteResponse(safe));
    }

    private static async Task<IResult> Openers(OpenersRequest req, GeminiClient ai, HttpContext ctx, CancellationToken ct)
    {
        var count = req.Count <= 0 ? 5 : req.Count > 12 ? 12 : req.Count;
        var prompt = PromptBuilder.BuildOpenersPrompt(req.Context ?? "", req.Mode ?? "Normal", req.Locale ?? "en", count);

        var (ok, jsonText, error) = await ai.GenerateJsonAsync(prompt, ct);
        if (ok && jsonText is not null)
        {
            try
            {
                using var doc = JsonDocument.Parse(jsonText);
                var arr = doc.RootElement.GetProperty("openers").EnumerateArray().Select(x => x.GetString() ?? "").Where(s => !string.IsNullOrWhiteSpace(s)).Take(count).ToList();
                if (arr.Count > 0)
                    return Results.Ok(new OpenersResponse(arr));
            }
            catch { /* fallthrough */ }
        }

        // fallback openers
        var locale = (req.Locale ?? "en").ToLowerInvariant();
        var list = new List<string>();
        for (var i = 0; i < count; i++)
        {
            list.Add(locale.StartsWith("ja") ? "最近どう？" :
                     locale.StartsWith("vi") ? "Dạo này bạn thế nào?" :
                     "Hey, how have you been?");
        }
        return Results.Ok(new OpenersResponse(list));
    }
}

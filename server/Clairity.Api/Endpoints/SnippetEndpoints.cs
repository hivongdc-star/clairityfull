using System.Text.Json;
using Clairity.Api.Models;

namespace Clairity.Api;

public static class SnippetEndpoints
{
    public static RouteGroupBuilder MapSnippetEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/snippets").RequireAuthorization();
        g.MapPost("", Save);
        g.MapGet("", List);
        g.MapGet("/{id}", Get);
        g.MapDelete("/{id}", Delete);
        return api;
    }

    private static async Task<IResult> Save(SaveSnippetRequest req, Db db, HttpContext ctx)
    {
        if (string.IsNullOrWhiteSpace(req.Title) || string.IsNullOrWhiteSpace(req.RawText))
            return Results.BadRequest(ApiErrors.Error(ApiErrors.ValidationError, "title and rawText required"));

        var userId = JwtService.GetUserId(ctx.User);

        var norm = JsonSerializer.Serialize(req.NormalizedMessages, JsonOpts.Default);
        var analysis = JsonSerializer.Serialize(req.Analysis, JsonOpts.Default);
        var sugg = JsonSerializer.Serialize(req.Suggestions, JsonOpts.Default);

        var id = await db.InsertSnippetAsync(userId, req.Title.Trim(), req.RawText, norm, analysis, sugg, req.Tags);
        return Results.Ok(new SaveSnippetResponse(id.ToString()));
    }

    private static async Task<IResult> List(Db db, HttpContext ctx)
    {
        var userId = JwtService.GetUserId(ctx.User);
        var items = await db.ListSnippetsAsync(userId, 100);

        var dto = items.Select(x => new SnippetListItem(
            x.Id.ToString(),
            x.Title,
            x.CreatedAt.ToString("O"),
            x.Tags
        )).ToList();

        return Results.Ok(dto);
    }

    private static async Task<IResult> Get(string id, Db db, HttpContext ctx)
    {
        if (!Guid.TryParse(id, out var gid))
            return Results.BadRequest(ApiErrors.Error(ApiErrors.ValidationError, "invalid id"));

        var userId = JwtService.GetUserId(ctx.User);
        var row = await db.GetSnippetAsync(userId, gid);
        if (row is null) return Results.NotFound(ApiErrors.Error(ApiErrors.NotFound, "not found"));

        var norm = JsonSerializer.Deserialize<object>(row.NormalizedJson, JsonOpts.Default) ?? new object();
        var analysis = JsonSerializer.Deserialize<object>(row.AnalysisJson, JsonOpts.Default) ?? new object();
        var sugg = JsonSerializer.Deserialize<object>(row.SuggestionsJson, JsonOpts.Default) ?? new object();

        var dto = new SnippetDetail(
            row.Id.ToString(),
            row.Title,
            row.RawText,
            norm,
            analysis,
            sugg,
            row.Tags,
            row.CreatedAt.ToString("O")
        );

        return Results.Ok(dto);
    }

    private static async Task<IResult> Delete(string id, Db db, HttpContext ctx)
    {
        if (!Guid.TryParse(id, out var gid))
            return Results.BadRequest(ApiErrors.Error(ApiErrors.ValidationError, "invalid id"));

        var userId = JwtService.GetUserId(ctx.User);
        var ok = await db.DeleteSnippetAsync(userId, gid);
        return ok ? Results.Ok(new { ok = true }) : Results.NotFound(ApiErrors.Error(ApiErrors.NotFound, "not found"));
    }
}

internal static class JsonOpts
{
    public static readonly JsonSerializerOptions Default = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };
}

namespace Clairity.Api.Models;

public sealed record SaveSnippetRequest(
    string Title,
    string RawText,
    object NormalizedMessages,
    object Analysis,
    object Suggestions,
    string[]? Tags
);

public sealed record SaveSnippetResponse(string Id);

public sealed record SnippetListItem(string Id, string Title, string CreatedAt, string[] Tags);

public sealed record SnippetDetail(
    string Id,
    string Title,
    string RawText,
    object NormalizedMessages,
    object Analysis,
    object Suggestions,
    string[] Tags,
    string CreatedAt
);

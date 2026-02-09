namespace Clairity.Api;

public static class ApiErrors
{
    public const string TokenExpired = "TOKEN_EXPIRED";
    public const string Unauthorized = "UNAUTHORIZED";
    public const string ValidationError = "VALIDATION_ERROR";
    public const string Conflict = "CONFLICT";
    public const string NotFound = "NOT_FOUND";
    public const string AiError = "AI_ERROR";
    public const string DbError = "DB_ERROR";

    public static object Error(string code, string message, object? details = null)
        => new { error = new { code, message, details } };
}

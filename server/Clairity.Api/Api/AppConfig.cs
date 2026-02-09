namespace Clairity.Api;

public sealed class AppConfig
{
    public required string DatabaseUrl { get; init; }
    public required string JwtIssuer { get; init; }
    public required string JwtAudience { get; init; }
    public required string JwtSigningKey { get; init; }
    public int JwtAccessMinutes { get; init; } = 15;
    public int JwtRefreshDays { get; init; } = 30;

    public required string AiApiKey { get; init; }
    public required string AiModel { get; init; }
    public int AiTimeoutSeconds { get; init; } = 30;
    public bool DbAutoInit { get; init; } = true;

    public static AppConfig LoadFromEnvironment()
    {
        static string Req(string key)
            => Environment.GetEnvironmentVariable(key) ?? throw new InvalidOperationException($"Missing env: {key}");

        var signingKey = Req("JWT_SIGNING_KEY");
        if (signingKey.Length < 32)
            throw new InvalidOperationException("JWT_SIGNING_KEY must be at least 32 characters");

        var accessMin = TryInt("JWT_ACCESS_MINUTES", 15);
        var refreshDays = TryInt("JWT_REFRESH_DAYS", 30);

        return new AppConfig
        {
            DatabaseUrl = Req("DATABASE_URL"),
            JwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "clairity",
            JwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? "clairity",
            JwtSigningKey = signingKey,
            JwtAccessMinutes = accessMin,
            JwtRefreshDays = refreshDays,
            AiApiKey = Req("AI_API_KEY"),
            AiModel = Environment.GetEnvironmentVariable("AI_MODEL") ?? "gemini-2.0-flash",
            AiTimeoutSeconds = TryInt("AI_TIMEOUT_SECONDS", 30),
            DbAutoInit = TryBool("DB_AUTO_INIT", true)
        };

        static int TryInt(string key, int def)
            => int.TryParse(Environment.GetEnvironmentVariable(key), out var v) ? v : def;

        static bool TryBool(string key, bool def)
        {
            var v = Environment.GetEnvironmentVariable(key);
            if (v is null) return def;
            return v.Equals("1") || v.Equals("true", StringComparison.OrdinalIgnoreCase) || v.Equals("yes", StringComparison.OrdinalIgnoreCase);
        }
    }
}

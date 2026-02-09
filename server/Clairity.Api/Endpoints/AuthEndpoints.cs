using Clairity.Api.Models;

namespace Clairity.Api;

public static class AuthEndpoints
{
    public static RouteGroupBuilder MapAuthEndpoints(this RouteGroupBuilder api)
    {
        var auth = api.MapGroup("/auth");

        auth.MapPost("/register", Register);
        auth.MapPost("/login", Login);
        auth.MapPost("/refresh", Refresh);
        auth.MapPost("/logout", Logout).RequireAuthorization();

        api.MapGet("/me", Me).RequireAuthorization();

        return api;
    }

    private static async Task<IResult> Register(RegisterRequest req, Db db, PasswordHasher hasher, JwtService jwt, AppConfig cfg, HttpContext ctx)
    {
        var email = (req.Email ?? "").Trim().ToLowerInvariant();
        var pass = req.Password ?? "";

        if (email.Length < 5 || !email.Contains('@') || pass.Length < 8)
            return Results.BadRequest(ApiErrors.Error(ApiErrors.ValidationError, "Invalid email or password"));

        var existing = await db.FindUserIdByEmailAsync(email);
        if (existing is not null)
            return Results.Conflict(ApiErrors.Error(ApiErrors.Conflict, "Email already registered"));

        var userId = Guid.NewGuid();
        var hash = hasher.Hash(pass);
        await db.CreateUserAsync(userId, email, hash);

        return await IssueTokensAsync(db, jwt, cfg, userId, email, ctx);
    }

    private static async Task<IResult> Login(LoginRequest req, Db db, PasswordHasher hasher, JwtService jwt, AppConfig cfg, HttpContext ctx)
    {
        var email = (req.Email ?? "").Trim().ToLowerInvariant();
        var pass = req.Password ?? "";

        if (email.Length < 5 || !email.Contains('@') || pass.Length < 1)
            return Results.BadRequest(ApiErrors.Error(ApiErrors.ValidationError, "Invalid credentials"));

        var user = await db.GetUserByEmailAsync(email);
        if (user is null || !hasher.Verify(pass, user.Value.passwordHash))
            return Results.Unauthorized(ApiErrors.Error(ApiErrors.Unauthorized, "Invalid credentials"));

        return await IssueTokensAsync(db, jwt, cfg, user.Value.id, email, ctx);
    }

    private static async Task<IResult> Refresh(RefreshRequest req, Db db, JwtService jwt, AppConfig cfg, HttpContext ctx)
    {
        if (string.IsNullOrWhiteSpace(req.RefreshToken))
            return Results.BadRequest(ApiErrors.Error(ApiErrors.ValidationError, "Missing refresh token"));

        var hash = Db.Sha256Base64Url(req.RefreshToken);
        var rt = await db.GetRefreshTokenByHashAsync(hash);
        if (rt is null)
            return Results.Unauthorized(ApiErrors.Error(ApiErrors.Unauthorized, "Invalid refresh token"));

        if (rt.Value.revokedAt is not null || rt.Value.expiresAt < DateTimeOffset.UtcNow)
            return Results.Unauthorized(ApiErrors.Error(ApiErrors.Unauthorized, "Expired refresh token"));

        var email = await db.GetUserEmailByIdAsync(rt.Value.userId) ?? "";
        if (string.IsNullOrWhiteSpace(email))
            return Results.Unauthorized(ApiErrors.Error(ApiErrors.Unauthorized, "User not found"));

        // rotate: revoke old, issue new
        var newPlain = TokenGen.NewRefreshTokenPlain();
        var newHash = Db.Sha256Base64Url(newPlain);
        var newId = Guid.NewGuid();

        await db.RevokeRefreshTokenAsync(rt.Value.tokenId, newId);

        var (access, exp) = jwt.CreateAccessToken(rt.Value.userId, email);

        var ip = ctx.Connection.RemoteIpAddress?.ToString();
        var ua = ctx.Request.Headers.UserAgent.ToString();
        await db.StoreRefreshTokenAsync(newId, rt.Value.userId, newHash, DateTimeOffset.UtcNow.AddDays(cfg.JwtRefreshDays), ip, ua);

        return Results.Ok(new AuthResponse(access, newPlain, (int)(exp - DateTimeOffset.UtcNow).TotalSeconds));
    }

    private static async Task<IResult> Logout(RefreshRequest req, Db db)
    {
        if (string.IsNullOrWhiteSpace(req.RefreshToken))
            return Results.BadRequest(ApiErrors.Error(ApiErrors.ValidationError, "Missing refresh token"));

        var hash = Db.Sha256Base64Url(req.RefreshToken);
        var rt = await db.GetRefreshTokenByHashAsync(hash);
        if (rt is null) return Results.Ok(new { ok = true });

        await db.RevokeRefreshTokenAsync(rt.Value.tokenId);
        return Results.Ok(new { ok = true });
    }

    private static IResult Me(HttpContext ctx)
    {
        var uid = JwtService.GetUserId(ctx.User);
        var email = JwtService.GetEmail(ctx.User);
        return Results.Ok(new MeResponse(uid.ToString(), email, DateTimeOffset.UtcNow.ToString("O")));
    }

    private static async Task<IResult> IssueTokensAsync(Db db, JwtService jwt, AppConfig cfg, Guid userId, string email, HttpContext ctx)
    {
        var (access, exp) = jwt.CreateAccessToken(userId, email);

        var refreshPlain = TokenGen.NewRefreshTokenPlain();
        var refreshHash = Db.Sha256Base64Url(refreshPlain);
        var refreshId = Guid.NewGuid();

        var ip = ctx.Connection.RemoteIpAddress?.ToString();
        var ua = ctx.Request.Headers.UserAgent.ToString();

        await db.StoreRefreshTokenAsync(refreshId, userId, refreshHash, DateTimeOffset.UtcNow.AddDays(cfg.JwtRefreshDays), ip, ua);

        return Results.Ok(new AuthResponse(access, refreshPlain, (int)(exp - DateTimeOffset.UtcNow).TotalSeconds));
    }
}

public static class TokenGen
{
    public static string NewRefreshTokenPlain()
    {
        var bytes = System.Security.Cryptography.RandomNumberGenerator.GetBytes(32);
        return Db.Base64UrlEncode(bytes);
    }
}

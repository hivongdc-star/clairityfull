namespace Clairity.Api.Models;

public sealed record RegisterRequest(string Email, string Password);
public sealed record LoginRequest(string Email, string Password);
public sealed record RefreshRequest(string RefreshToken);
public sealed record AuthResponse(string AccessToken, string RefreshToken, int ExpiresInSeconds, string TokenType = "Bearer");
public sealed record MeResponse(string Id, string Email, string CreatedAt);

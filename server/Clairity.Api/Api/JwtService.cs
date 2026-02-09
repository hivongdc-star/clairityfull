using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace Clairity.Api;

public sealed class JwtService
{
    private readonly AppConfig _cfg;
    private readonly SymmetricSecurityKey _key;
    private readonly SigningCredentials _creds;

    public JwtService(AppConfig cfg)
    {
        _cfg = cfg;
        _key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(cfg.JwtSigningKey));
        _creds = new SigningCredentials(_key, SecurityAlgorithms.HmacSha256);
    }

    public (string token, DateTimeOffset expiresAt) CreateAccessToken(Guid userId, string email)
    {
        var now = DateTimeOffset.UtcNow;
        var exp = now.AddMinutes(_cfg.JwtAccessMinutes);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, email),
            new Claim("uid", userId.ToString()),
        };

        var jwt = new JwtSecurityToken(
            issuer: _cfg.JwtIssuer,
            audience: _cfg.JwtAudience,
            claims: claims,
            notBefore: now.UtcDateTime,
            expires: exp.UtcDateTime,
            signingCredentials: _creds);

        return (new JwtSecurityTokenHandler().WriteToken(jwt), exp);
    }

    public static Guid GetUserId(ClaimsPrincipal user)
    {
        var s = user.FindFirstValue("uid") ?? user.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return Guid.Parse(s ?? throw new InvalidOperationException("Missing uid"));
    }

    public static string GetEmail(ClaimsPrincipal user)
        => user.FindFirstValue(JwtRegisteredClaimNames.Email) ?? "";
}

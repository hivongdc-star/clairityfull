\
using System.Net;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Clairity.Api;

EnvLoader.TryLoadDotEnv(".env");

var builder = WebApplication.CreateBuilder(args);

var cfg = AppConfig.LoadFromEnvironment();

// Logging
builder.Logging.ClearProviders();
builder.Logging.AddConsole();

// Services
builder.Services.AddSingleton(cfg);
builder.Services.AddSingleton<Db>();
builder.Services.AddSingleton<PasswordHasher>();
builder.Services.AddSingleton<JwtService>();
builder.Services.AddHttpClient<GeminiClient>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(cfg.AiTimeoutSeconds);
});
builder.Services.AddSingleton<FallbackAnalyzer>();
builder.Services.AddSingleton<AnalyzeService>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = cfg.JwtIssuer,
            ValidateAudience = true,
            ValidAudience = cfg.JwtAudience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(cfg.JwtSigningKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(15)
        };

        options.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = context =>
            {
                if (context.Exception is SecurityTokenExpiredException)
                {
                    context.HttpContext.Items["auth_error"] = ApiErrors.TokenExpired;
                }
                return Task.CompletedTask;
            },
            OnChallenge = async context =>
            {
                // Suppress the default WWW-Authenticate header formatting
                context.HandleResponse();

                if (context.Response.HasStarted) return;

                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                context.Response.ContentType = "application/json";

                var code = context.HttpContext.Items.TryGetValue("auth_error", out var v)
                    ? (string?)v
                    : ApiErrors.Unauthorized;

                var payload = ApiErrors.Error(code ?? ApiErrors.Unauthorized, "Unauthorized");
                await context.Response.WriteAsJsonAsync(payload);
            }
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddEndpointsApiExplorer();

builder.Services.AddCors(options =>
{
    options.AddPolicy("default", p => p
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowAnyOrigin());
});

var app = builder.Build();

// Ensure DB schema if configured
await app.Services.GetRequiredService<Db>().InitIfNeededAsync();

app.UseCors("default");

// Static SPA
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/health/live", () => Results.Ok(new { status = "live" }));
app.MapGet("/health/ready", async (Db db) =>
{
    var ok = await db.PingAsync();
    return ok ? Results.Ok(new { status = "ready" }) : Results.StatusCode(503);
});

// API group
var api = app.MapGroup("/api/v1");
api.MapAuthEndpoints();
api.MapCoreEndpoints();
api.MapSnippetEndpoints();
api.MapDashboardEndpoints();

// SPA fallback
app.MapFallbackToFile("index.html");

app.Run();


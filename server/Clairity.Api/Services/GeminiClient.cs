using System.Net;
using System.Text;
using System.Text.Json;

namespace Clairity.Api;

public sealed class GeminiClient
{
    private readonly HttpClient _http;
    private readonly AppConfig _cfg;

    public GeminiClient(HttpClient http, AppConfig cfg)
    {
        _http = http;
        _cfg = cfg;
    }

    public async Task<(bool ok, string? jsonText, string? error)> GenerateJsonAsync(string prompt, CancellationToken ct)
    {
        // Gemini REST endpoint (models.generateContent)
        // https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key=...
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{_cfg.AiModel}:generateContent?key={Uri.EscapeDataString(_cfg.AiApiKey)}";

        var body = new
        {
            contents = new object[]
            {
                new {
                    role = "user",
                    parts = new object[] { new { text = prompt } }
                }
            },
            generationConfig = new
            {
                responseMimeType = "application/json",
                temperature = 0.35,
                maxOutputTokens = 1200
            }
        };

        var payload = JsonSerializer.Serialize(body);

        for (var attempt = 0; attempt < 3; attempt++)
        {
            try
            {
                using var req = new HttpRequestMessage(HttpMethod.Post, url)
                {
                    Content = new StringContent(payload, Encoding.UTF8, "application/json")
                };
                using var resp = await _http.SendAsync(req, ct);

                if ((int)resp.StatusCode >= 500 || resp.StatusCode == HttpStatusCode.TooManyRequests)
                {
                    await Task.Delay(Backoff(attempt), ct);
                    continue;
                }

                var txt = await resp.Content.ReadAsStringAsync(ct);
                if (!resp.IsSuccessStatusCode)
                    return (false, null, $"HTTP {(int)resp.StatusCode}: {TrimForLog(txt)}");

                using var doc = JsonDocument.Parse(txt);
                var root = doc.RootElement;

                if (!root.TryGetProperty("candidates", out var candidates) || candidates.GetArrayLength() == 0)
                    return (false, null, "No candidates returned");

                var cand0 = candidates[0];
                if (!cand0.TryGetProperty("content", out var contentEl))
                    return (false, null, "Missing candidates[0].content");

                if (!contentEl.TryGetProperty("parts", out var parts) || parts.GetArrayLength() == 0)
                    return (false, null, "Missing candidates[0].content.parts");

                var textEl = parts[0].GetProperty("text");
                var jsonText = textEl.GetString();

                if (string.IsNullOrWhiteSpace(jsonText))
                    return (false, null, "Empty text from model");

                return (true, jsonText, null);
            }
            catch (TaskCanceledException) when (!ct.IsCancellationRequested)
            {
                // timeout
                await Task.Delay(Backoff(attempt), ct);
            }
            catch (Exception ex)
            {
                await Task.Delay(Backoff(attempt), ct);
                if (attempt == 2) return (false, null, ex.Message);
            }
        }

        return (false, null, "Unknown AI error");
    }

    private static TimeSpan Backoff(int attempt)
        => attempt switch
        {
            0 => TimeSpan.FromMilliseconds(250),
            1 => TimeSpan.FromMilliseconds(750),
            _ => TimeSpan.FromMilliseconds(1500)
        };

    private static string TrimForLog(string s)
    {
        s = s.Replace("
", " ").Replace("
", " ").Trim();
        return s.Length <= 180 ? s : s[..180] + "...";
    }
}

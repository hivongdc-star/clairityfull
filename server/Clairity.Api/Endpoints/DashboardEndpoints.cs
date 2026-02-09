using Clairity.Api.Models;

namespace Clairity.Api;

public static class DashboardEndpoints
{
    public static RouteGroupBuilder MapDashboardEndpoints(this RouteGroupBuilder api)
    {
        api.MapGet("/dashboard", Get).RequireAuthorization();
        return api;
    }

    private static async Task<IResult> Get(HttpContext ctx, Db db)
    {
        var userId = JwtService.GetUserId(ctx.User);

        var range = ctx.Request.Query["range"].ToString();
        var days = range switch
        {
            "7d" => 7,
            "30d" => 30,
            "90d" => 90,
            _ => 30
        };

        var from = DateTimeOffset.UtcNow.AddDays(-days);

        var trend = await db.GetVibeTrendAsync(userId, from);
        var summary = await db.GetDashboardSummaryAsync(userId, from);

        var initiativeDen = (double)(summary.YouCountSum + summary.ThemCountSum);
        var initiative = initiativeDen <= 0 ? 0 : summary.YouCountSum / initiativeDen;

        var trendDto = trend.Select(p => new DashboardPointDto(
            p.DayUtc.ToString("yyyy-MM-dd"),
            Math.Round(p.VibeAvg, 3),
            Math.Round(p.InterestAvg, 3),
            Math.Round(p.MsgCountAvg, 2),
            Math.Round(p.AvgLengthAvg, 2)
        )).ToList();

        var summaryDto = new DashboardSummaryDto(
            Math.Round(summary.VibeAvg, 3),
            Math.Round(summary.InterestAvg, 3),
            Math.Round(summary.MsgCountAvg, 2),
            Math.Round(summary.AvgLengthAvg, 2),
            Math.Round(initiative, 3)
        );

        return Results.Ok(new DashboardResponse(trendDto, summaryDto));
    }
}

namespace Clairity.Api.Models;

public sealed record DashboardPointDto(string DayUtc, double VibeAvg, double InterestAvg, double MsgCountAvg, double AvgLengthAvg);
public sealed record DashboardSummaryDto(double VibeAvg, double InterestAvg, double MsgCountAvg, double AvgLengthAvg, double InitiativeRatio);
public sealed record DashboardResponse(List<DashboardPointDto> Trend, DashboardSummaryDto Summary);

using System.Data;
using System.Security.Cryptography;
using System.Text;
using Npgsql;

namespace Clairity.Api;

public sealed class Db
{
    private readonly AppConfig _cfg;
    private readonly string _connString;

    public Db(AppConfig cfg)
    {
        _cfg = cfg;
        _connString = BuildNpgsqlConnectionString(cfg.DatabaseUrl);
    }

    public async Task<bool> PingAsync()
    {
        try
        {
            await using var conn = new NpgsqlConnection(_connString);
            await conn.OpenAsync();
            await using var cmd = new NpgsqlCommand("select 1", conn);
            var r = await cmd.ExecuteScalarAsync();
            return r is not null;
        }
        catch
        {
            return false;
        }
    }

    public async Task InitIfNeededAsync()
    {
        if (!_cfg.DbAutoInit) return;

        await using var conn = new NpgsqlConnection(_connString);
        await conn.OpenAsync();

        var sql = @"
create table if not exists users (
  id uuid primary key,
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists refresh_tokens (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz null,
  replaced_by uuid null,
  created_ip text null,
  created_ua text null
);

create table if not exists snippets (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  raw_text text not null,
  normalized_json jsonb not null,
  analysis_json jsonb not null,
  suggestions_json jsonb not null,
  tags text[] null,
  created_at timestamptz not null default now()
);

create index if not exists idx_snippets_user_created on snippets(user_id, created_at desc);

create table if not exists analysis_events (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  vibe_score double precision not null,
  interest_score double precision not null,
  tone text not null,
  intent text not null,
  message_count int not null,
  you_count int not null,
  them_count int not null,
  avg_length int not null
);

create index if not exists idx_analysis_events_user_created on analysis_events(user_id, created_at);
";

        await using var cmd = new NpgsqlCommand(sql, conn);
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<Guid?> FindUserIdByEmailAsync(string email)
    {
        await using var conn = new NpgsqlConnection(_connString);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand("select id from users where email = @e", conn);
        cmd.Parameters.AddWithValue("e", email);
        var o = await cmd.ExecuteScalarAsync();
        return o is Guid g ? g : null;
    }

    public async Task<(Guid id, string passwordHash)?> GetUserByEmailAsync(string email)
    {
        await using var conn = new NpgsqlConnection(_connString);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand("select id, password_hash from users where email=@e", conn);
        cmd.Parameters.AddWithValue("e", email);
        await using var rd = await cmd.ExecuteReaderAsync(CommandBehavior.SingleRow);
        if (!await rd.ReadAsync()) return null;
        return (rd.GetGuid(0), rd.GetString(1));
    }

    public async Task CreateUserAsync(Guid id, string email, string passwordHash)
    {
        await using var conn = new NpgsqlConnection(_connString);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand("insert into users(id,email,password_hash) values(@id,@e,@p)", conn);
        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("e", email);
        cmd.Parameters.AddWithValue("p", passwordHash);
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task StoreRefreshTokenAsync(Guid tokenId, Guid userId, string tokenHash, DateTimeOffset expiresAt, string? ip, string? ua)
    {
        await using var conn = new NpgsqlConnection(_connString);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(@"insert into refresh_tokens(id,user_id,token_hash,expires_at,created_ip,created_ua)
values(@id,@u,@h,@ex,@ip,@ua)", conn);
        cmd.Parameters.AddWithValue("id", tokenId);
        cmd.Parameters.AddWithValue("u", userId);
        cmd.Parameters.AddWithValue("h", tokenHash);
        cmd.Parameters.AddWithValue("ex", expiresAt.UtcDateTime);
        cmd.Parameters.AddWithValue("ip", (object?)ip ?? DBNull.Value);
        cmd.Parameters.AddWithValue("ua", (object?)ua ?? DBNull.Value);
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<(Guid tokenId, Guid userId, DateTimeOffset expiresAt, DateTimeOffset? revokedAt)?> GetRefreshTokenByHashAsync(string tokenHash)
    {
        await using var conn = new NpgsqlConnection(_connString);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(@"select id, user_id, expires_at, revoked_at
from refresh_tokens where token_hash=@h", conn);
        cmd.Parameters.AddWithValue("h", tokenHash);
        await using var rd = await cmd.ExecuteReaderAsync(CommandBehavior.SingleRow);
        if (!await rd.ReadAsync()) return null;

        var id = rd.GetGuid(0);
        var uid = rd.GetGuid(1);
        var ex = rd.GetDateTime(2);
        DateTimeOffset? rv = rd.IsDBNull(3) ? null : new DateTimeOffset(rd.GetDateTime(3), TimeSpan.Zero);
        return (id, uid, new DateTimeOffset(ex, TimeSpan.Zero), rv);
    }

    public async Task RevokeRefreshTokenAsync(Guid tokenId, Guid? replacedBy = null)
    {
        await using var conn = new NpgsqlConnection(_connString);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(@"update refresh_tokens set revoked_at=now(), replaced_by=@rb where id=@id and revoked_at is null", conn);
        cmd.Parameters.AddWithValue("id", tokenId);
        cmd.Parameters.AddWithValue("rb", (object?)replacedBy ?? DBNull.Value);
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<Guid> InsertSnippetAsync(Guid userId, string title, string rawText, string normalizedJson, string analysisJson, string suggestionsJson, string[]? tags)
    {
        var id = Guid.NewGuid();
        await using var conn = new NpgsqlConnection(_connString);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(@"insert into snippets(id,user_id,title,raw_text,normalized_json,analysis_json,suggestions_json,tags)
values(@id,@u,@t,@r,@n::jsonb,@a::jsonb,@s::jsonb,@tags)", conn);
        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("u", userId);
        cmd.Parameters.AddWithValue("t", title);
        cmd.Parameters.AddWithValue("r", rawText);
        cmd.Parameters.AddWithValue("n", normalizedJson);
        cmd.Parameters.AddWithValue("a", analysisJson);
        cmd.Parameters.AddWithValue("s", suggestionsJson);
        cmd.Parameters.AddWithValue("tags", (object?)tags ?? DBNull.Value);
        await cmd.ExecuteNonQueryAsync();
        return id;
    }

    public async Task<List<SnippetListRow>> ListSnippetsAsync(Guid userId, int limit = 50)
    {
        var res = new List<SnippetListRow>();
        await using var conn = new NpgsqlConnection(_connString);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(@"select id, title, created_at, tags from snippets where user_id=@u order by created_at desc limit @l", conn);
        cmd.Parameters.AddWithValue("u", userId);
        cmd.Parameters.AddWithValue("l", limit);
        await using var rd = await cmd.ExecuteReaderAsync();
        while (await rd.ReadAsync())
        {
            var id = rd.GetGuid(0);
            var title = rd.GetString(1);
            var created = rd.GetDateTime(2);
            string[]? tags = rd.IsDBNull(3) ? null : (string[])rd.GetValue(3);
            res.Add(new SnippetListRow(id, title, new DateTimeOffset(created, TimeSpan.Zero), tags ?? Array.Empty<string>()));
        }
        return res;
    }

    public async Task<SnippetDetailRow?> GetSnippetAsync(Guid userId, Guid snippetId)
    {
        await using var conn = new NpgsqlConnection(_connString);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(@"select id, title, raw_text, normalized_json::text, analysis_json::text, suggestions_json::text, tags, created_at
from snippets where user_id=@u and id=@id", conn);
        cmd.Parameters.AddWithValue("u", userId);
        cmd.Parameters.AddWithValue("id", snippetId);

        await using var rd = await cmd.ExecuteReaderAsync(CommandBehavior.SingleRow);
        if (!await rd.ReadAsync()) return null;

        var id = rd.GetGuid(0);
        var title = rd.GetString(1);
        var raw = rd.GetString(2);
        var norm = rd.GetString(3);
        var analysis = rd.GetString(4);
        var sugg = rd.GetString(5);
        string[]? tags = rd.IsDBNull(6) ? null : (string[])rd.GetValue(6);
        var created = rd.GetDateTime(7);

        return new SnippetDetailRow(id, title, raw, norm, analysis, sugg, tags ?? Array.Empty<string>(), new DateTimeOffset(created, TimeSpan.Zero));
    }

    public async Task<bool> DeleteSnippetAsync(Guid userId, Guid snippetId)
    {
        await using var conn = new NpgsqlConnection(_connString);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand("delete from snippets where user_id=@u and id=@id", conn);
        cmd.Parameters.AddWithValue("u", userId);
        cmd.Parameters.AddWithValue("id", snippetId);
        var n = await cmd.ExecuteNonQueryAsync();
        return n > 0;
    }

    public async Task InsertAnalysisEventAsync(Guid userId, double vibe, double interest, string tone, string intent, int msgCount, int youCount, int themCount, int avgLen)
    {
        await using var conn = new NpgsqlConnection(_connString);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(@"insert into analysis_events(id,user_id,vibe_score,interest_score,tone,intent,message_count,you_count,them_count,avg_length)
values(@id,@u,@v,@i,@t,@in,@mc,@yc,@tc,@al)", conn);
        cmd.Parameters.AddWithValue("id", Guid.NewGuid());
        cmd.Parameters.AddWithValue("u", userId);
        cmd.Parameters.AddWithValue("v", vibe);
        cmd.Parameters.AddWithValue("i", interest);
        cmd.Parameters.AddWithValue("t", tone);
        cmd.Parameters.AddWithValue("in", intent);
        cmd.Parameters.AddWithValue("mc", msgCount);
        cmd.Parameters.AddWithValue("yc", youCount);
        cmd.Parameters.AddWithValue("tc", themCount);
        cmd.Parameters.AddWithValue("al", avgLen);
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<List<DashboardPoint>> GetVibeTrendAsync(Guid userId, DateTimeOffset fromUtc)
    {
        // daily average
        var res = new List<DashboardPoint>();
        await using var conn = new NpgsqlConnection(_connString);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(@"
select date_trunc('day', created_at) as d, avg(vibe_score) as v, avg(interest_score) as i, avg(message_count) as mc, avg(avg_length) as al
from analysis_events
where user_id=@u and created_at >= @from
group by 1
order by 1 asc
", conn);
        cmd.Parameters.AddWithValue("u", userId);
        cmd.Parameters.AddWithValue("from", fromUtc.UtcDateTime);
        await using var rd = await cmd.ExecuteReaderAsync();
        while (await rd.ReadAsync())
        {
            var d = rd.GetDateTime(0);
            var vibe = rd.GetDouble(1);
            var interest = rd.GetDouble(2);
            var msgCount = rd.GetDouble(3);
            var avgLen = rd.GetDouble(4);
            res.Add(new DashboardPoint(new DateTimeOffset(d, TimeSpan.Zero), vibe, interest, msgCount, avgLen));
        }
        return res;
    }

    public async Task<DashboardSummary> GetDashboardSummaryAsync(Guid userId, DateTimeOffset fromUtc)
    {
        await using var conn = new NpgsqlConnection(_connString);
        await conn.OpenAsync();

        await using var cmd = new NpgsqlCommand(@"
select 
  avg(vibe_score) as vibe,
  avg(interest_score) as interest,
  avg(message_count) as msgCount,
  avg(avg_length) as avgLen,
  sum(you_count) as youCount,
  sum(them_count) as themCount
from analysis_events
where user_id=@u and created_at >= @from
", conn);
        cmd.Parameters.AddWithValue("u", userId);
        cmd.Parameters.AddWithValue("from", fromUtc.UtcDateTime);

        await using var rd = await cmd.ExecuteReaderAsync(CommandBehavior.SingleRow);
        if (!await rd.ReadAsync())
            return new DashboardSummary(0, 0, 0, 0, 0, 0);

        double vibe = rd.IsDBNull(0) ? 0 : rd.GetDouble(0);
        double interest = rd.IsDBNull(1) ? 0 : rd.GetDouble(1);
        double msgCount = rd.IsDBNull(2) ? 0 : rd.GetDouble(2);
        double avgLen = rd.IsDBNull(3) ? 0 : rd.GetDouble(3);
        long youCount = rd.IsDBNull(4) ? 0 : rd.GetInt64(4);
        long themCount = rd.IsDBNull(5) ? 0 : rd.GetInt64(5);

        return new DashboardSummary(vibe, interest, msgCount, avgLen, youCount, themCount);
    }


public async Task<string?> GetUserEmailByIdAsync(Guid userId)
{
    await using var conn = new NpgsqlConnection(_connString);
    await conn.OpenAsync();
    await using var cmd = new NpgsqlCommand("select email from users where id=@id", conn);
    cmd.Parameters.AddWithValue("id", userId);
    var o = await cmd.ExecuteScalarAsync();
    return o?.ToString();
}

    public static string Sha256Base64Url(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Base64UrlEncode(bytes);
    }

    public static string Base64UrlEncode(byte[] data)
        => Convert.ToBase64String(data).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static string BuildNpgsqlConnectionString(string databaseUrl)
    {
        // Accept postgresql://user:pass@host:port/db?sslmode=require
        // Convert to Npgsql key-value connection string.
        if (!Uri.TryCreate(databaseUrl, UriKind.Absolute, out var uri))
            throw new InvalidOperationException("DATABASE_URL must be a valid absolute URL");

        var userInfo = uri.UserInfo.Split(':', 2);
        var user = Uri.UnescapeDataString(userInfo.Length > 0 ? userInfo[0] : "");
        var pass = Uri.UnescapeDataString(userInfo.Length > 1 ? userInfo[1] : "");

        var db = uri.AbsolutePath.Trim('/');
        if (string.IsNullOrWhiteSpace(db)) db = "postgres";

        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.Port > 0 ? uri.Port : 5432,
            Username = user,
            Password = pass,
            Database = db,
            SslMode = SslMode.Require,
            TrustServerCertificate = true,
            Pooling = true
        };

        // Parse query params
        var query = uri.Query;
        if (!string.IsNullOrWhiteSpace(query))
        {
            foreach (var part in query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
            {
                var kv = part.Split('=', 2);
                var k = Uri.UnescapeDataString(kv[0]);
                var v = Uri.UnescapeDataString(kv.Length > 1 ? kv[1] : "");

                if (k.Equals("sslmode", StringComparison.OrdinalIgnoreCase) && Enum.TryParse<SslMode>(v, true, out var ssl))
                    builder.SslMode = ssl;
                if (k.Equals("trust_server_certificate", StringComparison.OrdinalIgnoreCase))
                    builder.TrustServerCertificate = v == "1" || v.Equals("true", StringComparison.OrdinalIgnoreCase);
            }
        }

        return builder.ConnectionString;
    }
}

public sealed record SnippetListRow(Guid Id, string Title, DateTimeOffset CreatedAt, string[] Tags);
public sealed record SnippetDetailRow(Guid Id, string Title, string RawText, string NormalizedJson, string AnalysisJson, string SuggestionsJson, string[] Tags, DateTimeOffset CreatedAt);

public sealed record DashboardPoint(DateTimeOffset DayUtc, double VibeAvg, double InterestAvg, double MsgCountAvg, double AvgLengthAvg);
public sealed record DashboardSummary(double VibeAvg, double InterestAvg, double MsgCountAvg, double AvgLengthAvg, long YouCountSum, long ThemCountSum);

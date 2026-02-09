using System.Text;

namespace Clairity.Api;

public static class EnvLoader
{
    public static void TryLoadDotEnv(string path)
    {
        if (!File.Exists(path)) return;

        foreach (var rawLine in File.ReadAllLines(path, Encoding.UTF8))
        {
            var line = rawLine.Trim();
            if (string.IsNullOrWhiteSpace(line) || line.StartsWith("#")) continue;
            var idx = line.IndexOf('=');
            if (idx <= 0) continue;

            var key = line.Substring(0, idx).Trim();
            var val = line.Substring(idx + 1).Trim();

            // strip quotes
            if ((val.StartsWith('"') && val.EndsWith('"')) || (val.StartsWith(''') && val.EndsWith(''')))
                val = val.Substring(1, val.Length - 2);

            // don't overwrite real environment variables
            if (Environment.GetEnvironmentVariable(key) is null)
                Environment.SetEnvironmentVariable(key, val);
        }
    }
}

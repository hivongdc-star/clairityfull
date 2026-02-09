using System.Security.Cryptography;

namespace Clairity.Api;

public sealed class PasswordHasher
{
    private const int SaltSize = 16;
    private const int KeySize = 32;
    private const int Iterations = 150_000;

    public string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var key = Rfc2898DeriveBytes.Pbkdf2(
            password,
            salt,
            Iterations,
            HashAlgorithmName.SHA256,
            KeySize);

        return $"pbkdf2_sha256${Iterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(key)}";
    }

    public bool Verify(string password, string stored)
    {
        try
        {
            var parts = stored.Split('$', 4);
            if (parts.Length != 4) return false;
            if (parts[0] != "pbkdf2_sha256") return false;
            var it = int.Parse(parts[1]);
            var salt = Convert.FromBase64String(parts[2]);
            var key = Convert.FromBase64String(parts[3]);

            var key2 = Rfc2898DeriveBytes.Pbkdf2(
                password,
                salt,
                it,
                HashAlgorithmName.SHA256,
                key.Length);

            return CryptographicOperations.FixedTimeEquals(key, key2);
        }
        catch
        {
            return false;
        }
    }
}

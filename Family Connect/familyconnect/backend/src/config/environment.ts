// Read when needed, after dotenv.config(), rather than embedding a signing key.
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret?.trim()) throw new Error('JWT_SECRET must be configured in the backend environment.');
  return secret;
}

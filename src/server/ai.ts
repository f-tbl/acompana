import "server-only";

/**
 * El AI Gateway se autentica solo en Vercel (OIDC). En local hace falta AI_GATEWAY_API_KEY
 * (o `vercel env pull`, que trae VERCEL_OIDC_TOKEN). Sin credenciales se usan los respaldos.
 */
export function gatewayDisponible() {
  return !!(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL);
}

import { NextResponse } from 'next/server';
import { clearAccessTokenCookie } from '@/lib/access-token-cookie';

// Déconnexion locale : le contrat de BFF_Project n'expose pas de route de déconnexion, et le front ne
// contacte aucun autre BFF. Le cookie de session est effacé ; le middleware renvoie ensuite vers Login.
export function POST() {
  return clearAccessTokenCookie(new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } }));
}

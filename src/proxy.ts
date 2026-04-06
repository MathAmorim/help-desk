import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default function proxy(request: NextRequest) {
    const isMaintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";
    const { pathname } = request.nextUrl;

    // Se estiver em modo de manutenção, redireciona tudo para /manutencao
    // Exceto chamadas para a própria página de manutenção, assets estáticos (_next) e APIs vitais
    if (isMaintenanceMode) {
        if (
            pathname.startsWith("/manutencao") ||
            pathname.startsWith("/_next") ||
            pathname.includes("favicon.ico") ||
            pathname.includes(".png") ||
            pathname.includes(".jpg")
        ) {
            return NextResponse.next();
        }

        const url = request.nextUrl.clone();
        url.pathname = "/manutencao";
        return NextResponse.redirect(url);
    }

    // Se NÃO estiver em modo de manutenção e o usuário tentar acessar /manutencao, redireciona para a home
    if (!isMaintenanceMode && pathname.startsWith("/manutencao")) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
};

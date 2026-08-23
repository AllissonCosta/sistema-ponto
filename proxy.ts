import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define que apenas as rotas que começam com /painel precisam de proteção/login
const isProtectedRoute = createRouteMatcher(['/painel(.*)']);

export default clerkMiddleware(async (auth, req) => {
  // Se a rota for protegida (painel), exige autenticação. Caso contrário, libera geral.
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Padrão do Next.js para ignorar arquivos estáticos e internos
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|tff|woff2?|ico|csv|docx?|xlsx?)).*)',
    '/(api|trpc)(.*)',
  ],
};
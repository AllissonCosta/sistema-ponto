import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define quais rotas são protegidas
const isProtectedRoute = createRouteMatcher(['/painel(.*)']);

// Adicionamos o "async" antes de (auth, req)
export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    // Nova sintaxe da versão 6 do Clerk
    await auth.protect(); 
  }
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
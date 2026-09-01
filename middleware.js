// src/edgeone/middleware.ts
var config = { matcher: "/" };
function middleware(context) {
  const url = new URL(context.request.url);
  if (url.pathname === "/" && url.searchParams.has("domain")) {
    return context.rewrite("/api/lookup?" + url.searchParams.toString());
  }
  return context.next();
}
export {
  config,
  middleware
};

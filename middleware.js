// src/edgeone/middleware.ts
var config = { matcher: "/" };
function middleware(context) {
  return context.next();
}
export {
  config,
  middleware
};

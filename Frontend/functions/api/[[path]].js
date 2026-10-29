export async function onRequest({ request, env, params }) {
  const path = (params.path || []).join("/");
  const search = new URL(request.url).search;
  const target = env.BACKEND_URL.replace(/\/$/, "") + "/api/" + path + search;
  return fetch(new Request(target, request));
}
import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, readToken } from "./token";

export { SESSION_COOKIE, sessionToken, verifyPassword } from "./token";

export async function currentUser() {
  return readToken((await cookies()).get(SESSION_COOKIE.name)?.value);
}

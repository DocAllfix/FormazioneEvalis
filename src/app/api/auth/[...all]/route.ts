// Route handler better-auth: espone tutti gli endpoint di auth/organizzazione
// sotto /api/auth/* (signup, login, logout, inviti, org, ...). Modulo 1.

import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);

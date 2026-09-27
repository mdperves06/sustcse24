import { apiRoute, readJson, searchParamsObject } from "@/lib/api";
import { createStudent, listStudents } from "@/services/admin-users";

/** GET /api/admin/users?q=&role=&status=active|disabled&flag=&deleted=1&page= */
export const GET = apiRoute(async ({ req, actor }) => listStudents(actor, searchParamsObject(req)));

/** POST /api/admin/users — { roll, fullName, studentId?, email? }. Password = roll, must change at first sign-in. */
export const POST = apiRoute(async ({ req, actor }) => createStudent(actor, await readJson(req)));

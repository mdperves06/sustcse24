import { apiRoute, searchParamsObject } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { formToObject, getFile } from "@/lib/forms";
import { createResource, listResources } from "@/services/resources";

/** GET /api/resources?q=&category=&course=&sort=newest|downloads&page= */
export const GET = apiRoute(async ({ req, actor }) => {
  return listResources(actor, searchParamsObject(req));
});

/** POST /api/resources — multipart/form-data: title, course, category, description?, and `file` OR `url`. */
export const POST = apiRoute(async ({ req, actor }) => {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new AppError("Send the resource as multipart/form-data.", 400);
  }
  const input = formToObject(form);
  delete input.file;
  return createResource(actor, input, getFile(form, "file"));
});

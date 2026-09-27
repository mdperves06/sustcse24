import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { NotFoundError } from "@/lib/errors";
import type { Viewer } from "@/lib/privacy";
import { getProject } from "@/services/projects";

/** Loads a project for a page, turning "not found" into the 404 page. */
export const loadProject = cache(async (viewer: Viewer, id: string) => {
  try {
    return await getProject(viewer, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
});

import { randomUUID } from "crypto";

/** Short, collision-safe id used as the primary key for every table in this app. */
export function newId(prefix?: string): string {
  const id = randomUUID();
  return prefix ? `${prefix}_${id}` : id;
}

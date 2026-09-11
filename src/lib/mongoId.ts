/** MongoDB ObjectId as 24 hex chars */
export function isMongoObjectId(id: string | undefined | null): boolean {
  return !!id && /^[a-f\d]{24}$/i.test(id);
}

export type UserOwnedResource = {
  userId: string;
};

export class OwnershipError extends Error {
  readonly code = "OWNERSHIP_MISMATCH";
  readonly status = 404;

  constructor(resourceName = "recurso") {
    super(`No se encontró ${resourceName} para este usuario.`);
    this.name = "OwnershipError";
  }
}

export function isOwnedByUser<TResource extends UserOwnedResource>(
  resource: TResource | null | undefined,
  userId: string,
): resource is TResource {
  return resource?.userId === userId;
}

export function assertOwnedByUser<TResource extends UserOwnedResource>(
  resource: TResource | null | undefined,
  userId: string,
  resourceName?: string,
): asserts resource is TResource {
  if (!isOwnedByUser(resource, userId)) {
    throw new OwnershipError(resourceName);
  }
}

export function filterOwnedByUser<TResource extends UserOwnedResource>(
  resources: readonly TResource[],
  userId: string,
): TResource[] {
  return resources.filter((resource) => isOwnedByUser(resource, userId));
}

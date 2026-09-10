import { IdeaScopeDatabase, ideaScopeDatabase } from "./ideascope-database";

export class WriterLeaseService {
  constructor(private readonly db: IdeaScopeDatabase = ideaScopeDatabase, private readonly now = () => Date.now()) {}
  async acquire(workspaceId: string, ownerId: string, ttlMs = 15_000) {
    return this.db.transaction("rw", this.db.writerLeases, async () => {
      const current = await this.db.writerLeases.get(workspaceId);
      if (current && current.ownerId !== ownerId && current.expiresAt > this.now()) return false;
      await this.db.writerLeases.put({ workspaceId, ownerId, expiresAt: this.now() + ttlMs });
      return true;
    });
  }
  async renew(workspaceId: string, ownerId: string, ttlMs = 15_000) {
    const current = await this.db.writerLeases.get(workspaceId);
    if (!current || current.ownerId !== ownerId || current.expiresAt <= this.now()) return false;
    await this.db.writerLeases.put({ ...current, expiresAt: this.now() + ttlMs });
    return true;
  }
  async release(workspaceId: string, ownerId: string) {
    const current = await this.db.writerLeases.get(workspaceId);
    if (current?.ownerId === ownerId) await this.db.writerLeases.delete(workspaceId);
  }
}

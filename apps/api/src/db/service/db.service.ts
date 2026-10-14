import { Injectable, OnModuleDestroy } from '@nestjs/common';
import type { Pool } from 'pg';
import { createDb, type Db } from '../client';

@Injectable()
export class DbService implements OnModuleDestroy {
  readonly db: Db;
  private readonly pool: Pool;

  constructor() {
    const { db, pool } = createDb();
    this.db = db;
    this.pool = pool;
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}

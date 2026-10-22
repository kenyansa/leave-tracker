import { MigrationInterface } from 'typeorm';
import { Init1792663799531 } from './1792663799531-Init';
import { RefreshTokens1792670524255 } from './1792670524255-RefreshTokens';

export const migrations: (new () => MigrationInterface)[] = [
  Init1792663799531,
  RefreshTokens1792670524255,
];

import fs from 'fs';
import path from 'path';
import { initializeDatabase, AppDataSource } from './config/database';

async function runSeed() {
  await initializeDatabase();

  const seedPath = path.resolve(process.cwd(), '..', 'database', 'seed.sql');
  const seedSql = fs.readFileSync(seedPath, 'utf8');

  await AppDataSource.query(seedSql);
  console.log('✅ Seed executado com sucesso.');

  await AppDataSource.destroy();
}

runSeed().catch((error) => {
  console.error('❌ Erro ao executar seed:', error);
  process.exit(1);
});

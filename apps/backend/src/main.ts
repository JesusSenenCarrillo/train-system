import {parse as parseEnvFile} from 'dotenv';
import 'reflect-metadata';
import {NestFactory} from '@nestjs/core';
import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {AppModule} from './app.module';

function findWorkspaceRoot(startDir: string): string {
  let currentDir = startDir;

  while (true) {
    if (existsSync(resolve(currentDir, 'nx.json')) && existsSync(resolve(currentDir, 'package.json'))) {
      return currentDir;
    }

    const parentDir = resolve(currentDir, '..');
    if (parentDir === currentDir) {
      return startDir;
    }

    currentDir = parentDir;
  }
}

const workspaceRoot = findWorkspaceRoot(process.cwd());
const initialEnvKeys = new Set(Object.keys(process.env));

for (const envFile of [resolve(workspaceRoot, '.env'), resolve(workspaceRoot, '.env.local')]) {
  if (!existsSync(envFile)) {
    continue;
  }

  const parsedEnv = parseEnvFile(readFileSync(envFile));
  for (const [key, value] of Object.entries(parsedEnv)) {
    if (!initialEnvKeys.has(key)) {
      process.env[key] = value;
    }
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  await app.listen(3000);
}

bootstrap();

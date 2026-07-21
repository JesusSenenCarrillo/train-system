import {config as loadEnvFile} from 'dotenv';
import 'reflect-metadata';
import {NestFactory} from '@nestjs/core';
import {resolve} from 'node:path';
import {AppModule} from './app.module';

const envFiles = [
  resolve(process.cwd(), '.env.local'),
  resolve(process.cwd(), '..', '.env.local'),
];

for (const envFile of envFiles) {
  loadEnvFile({ path: envFile });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  await app.listen(3000);
}

bootstrap();

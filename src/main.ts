import { HttpAdapterHost, NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.setGlobalPrefix('api');
  app.enableCors();

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  const httpAdapter = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));
  app.useGlobalInterceptors(new TransformInterceptor(new Reflector()));

  const port = process.env.PORT ?? 3000;

  await app.listen(port);
  Logger.log(`Application is running on: http://localhost:${port}`);
}

bootstrap().catch((error) => {
  Logger.error('Error during application bootstrap', error);
  process.exit(1);
});

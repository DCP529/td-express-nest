import { NestFactory } from '@nestjs/core';
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as cookieParser from 'cookie-parser';
import * as bodyParser from 'body-parser';

async function start() {
  const PORT = process.env.PORT || 5000;

  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: [process.env.CLIENT_URL, 'https://www.agroprombank.com'],
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true
    }
  });
  // app.enableCors({
  //   origin: '*',
  //   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  //   credentials: true
  // })
  app.use(bodyParser.json({ limit: '30mb' }));
  app.use(cookieParser());

  const config = new DocumentBuilder()
    .setTitle('TD Market')
    .setDescription('Документация Rest API')
    .setVersion('1.0.0')
    .addTag('Ilya Dvorchuk')
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('/api/docs', app, document)

  // app.useGlobalPipes(new ValidationPipe());

  await app.listen(PORT, () => console.log(`Server Ok start, PORT = ${PORT} ${process.env.CLIENT_URL}`))
}

start()

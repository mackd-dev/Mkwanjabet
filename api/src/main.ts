import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });
  const config = app.get(ConfigService);
  app.setGlobalPrefix("api/v1");
  app.use(helmet());
  app.enableCors({
    origin: (config.get<string>("CORS_ORIGINS") ?? "").split(",").map(v => v.trim()).filter(Boolean),
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  if (config.get<string>("SWAGGER_ENABLED") !== "false") {
    const doc = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle("MkwanjaBet API").setVersion("1.0").addBearerAuth().build());
    SwaggerModule.setup("docs", app, doc);
  }
  const port = Number(config.get("PORT") ?? 4010);
  await app.listen(port, "0.0.0.0");
  console.log(`MkwanjaBet API listening on ${port}`);
}
bootstrap();

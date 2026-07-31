import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class OperatorControlsService {
  constructor(private readonly db: PrismaService) {}

  settings() {
    return this.db.operatorSettings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    });
  }

  startOfDay() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }
}

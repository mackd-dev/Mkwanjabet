import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AuditService {
  constructor(private readonly db: PrismaService) {}
  record(actorId:string,action:string,entityType:string,entityId?:string|null,before?:unknown,after?:unknown,metadata?:unknown){
    return this.db.adminAuditLog.create({data:{actorId,action,entityType,entityId:entityId??null,before:before as Prisma.InputJsonValue,after:after as Prisma.InputJsonValue,metadata:metadata as Prisma.InputJsonValue}});
  }
}

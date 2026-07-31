import { Module } from "@nestjs/common";
import { AuditService } from "./audit.service";
import { AdminAuditInterceptor } from "./admin-audit.interceptor";
@Module({providers:[AuditService,AdminAuditInterceptor],exports:[AuditService,AdminAuditInterceptor]})
export class AuditModule {}

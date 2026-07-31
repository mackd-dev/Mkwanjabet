import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, mergeMap } from "rxjs";
import { AuditService } from "./audit.service";

@Injectable()
export class AdminAuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}
  intercept(context: ExecutionContext,next: CallHandler):Observable<unknown>{
    const request=context.switchToHttp().getRequest<{method:string;route?:{path?:string};url:string;params?:Record<string,string>;body?:unknown;user?:{id?:string;role?:string}}>();
    if(request.method==="GET"||request.user?.role!=="ADMIN")return next.handle();
    return next.handle().pipe(mergeMap(async result=>{
      const route=request.route?.path??request.url.split("?")[0];
      const targetId=request.params?.id??request.params?.reference??null;
      await this.audit.record(request.user?.id??"unknown",request.method+" "+route,route.split("/")[1]??"admin",targetId,null,result,{body:request.body});
      return result;
    }));
  }
}

import { Global, Module } from "@nestjs/common";
import { OperatorControlsService } from "./operator-controls.service";

@Global()
@Module({ providers: [OperatorControlsService], exports: [OperatorControlsService] })
export class OperatorControlsModule {}

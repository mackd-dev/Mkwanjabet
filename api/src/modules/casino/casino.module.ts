import { Module } from "@nestjs/common";
import { CasinoController } from "./casino.controller";
import { CasinoService } from "./casino.service";
import { DemoCasinoProviderAdapter } from "./adapters/demo-casino-provider.adapter";

@Module({ controllers: [CasinoController], providers: [CasinoService, DemoCasinoProviderAdapter] })
export class CasinoModule {}
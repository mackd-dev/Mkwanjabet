import { Module } from "@nestjs/common";
import { SonicPesaController } from "./sonicpesa.controller";
import { SonicPesaService } from "./sonicpesa.service";
import { WalletController } from "./wallet.controller";
@Module({controllers:[WalletController,SonicPesaController],providers:[SonicPesaService]})
export class WalletModule {}

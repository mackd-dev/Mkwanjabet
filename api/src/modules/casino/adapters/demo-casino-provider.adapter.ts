import { Injectable } from "@nestjs/common";
import { CasinoProviderAdapter, CasinoLaunchInput, CasinoLaunchResult } from "./casino-provider.adapter";

@Injectable()
export class DemoCasinoProviderAdapter implements CasinoProviderAdapter {
  code = "demo";

  async launch(input: CasinoLaunchInput): Promise<CasinoLaunchResult> {
    const providerSessionId = `demo-${input.game.slug}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      providerSessionId,
      launchUrl: `/games/demo/${input.game.slug}?session=${encodeURIComponent(providerSessionId)}`,
      metadata: {
        demo: true,
        game: input.game.slug,
        startingBalanceTzs: input.playMoneyBalanceTzs,
        message: "Demo play-money session only. No wallet debit or credit was processed.",
      },
    };
  }
}
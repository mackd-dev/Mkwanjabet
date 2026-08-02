import { CasinoGame, CasinoProvider } from "@prisma/client";

export type CasinoLaunchInput = {
  game: CasinoGame;
  provider: CasinoProvider;
  userId?: string;
  playMoneyBalanceTzs: number;
};

export type CasinoLaunchResult = {
  providerSessionId: string;
  launchUrl: string;
  metadata?: Record<string, unknown>;
};

export interface CasinoProviderAdapter {
  code: string;
  launch(input: CasinoLaunchInput): Promise<CasinoLaunchResult>;
}
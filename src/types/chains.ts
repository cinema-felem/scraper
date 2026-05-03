export const CINEMA_CHAINS = ['gv', 'shaw', 'carnival', 'eaglewing', 'filmhouse', 'sfs'] as const
export type CinemaChain = typeof CINEMA_CHAINS[number]

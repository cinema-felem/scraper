export const CINEMA_CHAINS = ['gv', 'shaw', 'carnival', 'eaglewing', 'filmhouse', 'sfs', 'oldham', 'alliancefrancaise', 'capitol'] as const
export type CinemaChain = typeof CINEMA_CHAINS[number]

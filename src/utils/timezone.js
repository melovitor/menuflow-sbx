const timezoneByState = {
  AC: 'America/Rio_Branco',
  AM: 'America/Manaus',
  MT: 'America/Cuiaba',
  MS: 'America/Campo_Grande',
  RO: 'America/Porto_Velho',
  RR: 'America/Boa_Vista',
  PA: 'America/Belem',
  AP: 'America/Belem',
  TO: 'America/Araguaina',
  MA: 'America/Fortaleza',
  PI: 'America/Fortaleza',
  CE: 'America/Fortaleza',
  RN: 'America/Fortaleza',
  PB: 'America/Fortaleza',
  PE: 'America/Recife',
  AL: 'America/Maceio',
  SE: 'America/Maceio',
  BA: 'America/Bahia',
  default: 'America/Sao_Paulo',
}

export const getTimezoneByState = (state) =>
  timezoneByState[state] || timezoneByState['default']

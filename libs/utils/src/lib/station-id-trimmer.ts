/**
 * Removes a leading zero from a station identifier when present.
 *
 * Some Renfe feeds prefix station codes with a zero; this normalizer keeps the canonical code.
 *
 * @param id - The raw station id, which may be `null`.
 * @returns The trimmed station id, or `null` if the input was `null`.
 */
export const trimStationId = (id: string | null): string | null => {
   if (!!id) {
       return id.charAt(0) === '0' ? id.substring(1) : id;
   }
   return id
}
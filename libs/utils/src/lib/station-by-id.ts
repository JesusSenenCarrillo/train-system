import {STATION_NAMES} from './station-names';

/**
 * Resolves a station name from its identifier.
 *
 * @param id - The station id to look up. Optional or `null`.
 * @returns The station name if found, otherwise an empty string.
 */
export const getStationNameById = (id?: string | null): string => {
    if (!id) return '';
    return STATION_NAMES[id] ?? '';
}
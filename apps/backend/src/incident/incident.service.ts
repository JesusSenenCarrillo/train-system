import {Injectable} from '@nestjs/common';
import {Incident, IncidentPayload} from '@train-system/shared-types';

@Injectable()
export class IncidentService {
  private incidents: Incident[] = [
    {
      id: 1,
      externalId: 'AVISO_501418',
      source: 'GTFS_RT',
      trainId: null,
      stationId: null,
      routeIds: [
        '10T0035C5',
        '10T0036C5',
        '10T0047C5',
        '10T0048C5',
        '10T0101C5',
        '10T0102C5',
        '10T0017C5',
        '10T0018C5',
      ],
      type: 'service_alert',
      description:
          'Ascensor de la estación de La Serna, con acceso a la vía 2 sentido Fuenlabrada-Huamenes, se encuentra fuera de servicio',
      language: 'es',
      startedAt: new Date(1784137560 * 1000).toISOString(),
      endedAt: null,
      updatedAt: new Date().toISOString(),
      status: 'active',
      metadata: {
        category: 'accessibility',
      },
      raw: {
        id: 'AVISO_501418',
        alert: {
          activePeriod: [
            {
              start: '1784137560',
            },
          ],
          informedEntity: [
            {routeId: '10T0035C5'},
            {routeId: '10T0036C5'},
            {routeId: '10T0047C5'},
            {routeId: '10T0048C5'},
            {routeId: '10T0101C5'},
            {routeId: '10T0102C5'},
            {routeId: '10T0017C5'},
            {routeId: '10T0018C5'},
          ],
          descriptionText: {
            translation: [
              {
                text: 'Ascensor de la estación de La Serna, con acceso a la vía 2 sentido Fuenlabrada-Huamenes, se encuentra fuera de servicio',
                language: 'es',
              },
            ],
          },
        },
      },
    },
  ];

  create(payload: IncidentPayload): Incident {
    const alert = payload.alert;
    const firstPeriod = alert?.activePeriod?.[0];
    const firstTranslation = alert?.descriptionText?.translation?.[0];
    const routeIds = (alert?.informedEntity ?? [])
        .map((item) => item.routeId)
        .filter((value): value is string => Boolean(value));

    const incident: Incident = alert
        ? {
          id: this.incidents.length + 1,
          externalId: payload.id ?? null,
          source: 'GTFS_RT',
          trainId: payload.trainId ? String(payload.trainId) : null,
          stationId: payload.stationId ? String(payload.stationId) : null,
          routeIds,
          type: payload.type ?? 'service_alert',
          description: firstTranslation?.text ?? payload.description ?? 'Service alert',
          language: firstTranslation?.language ?? null,
          startedAt: firstPeriod?.start
              ? new Date(Number(firstPeriod.start) * 1000).toISOString()
              : new Date().toISOString(),
          endedAt: firstPeriod?.end
              ? new Date(Number(firstPeriod.end) * 1000).toISOString()
              : null,
          updatedAt: new Date().toISOString(),
          status: 'active',
          metadata: null,
          raw: payload as Record<string, unknown>,
        }
        : {
          id: this.incidents.length + 1,
          externalId: null,
          source: 'MANUAL',
          trainId: payload.trainId ? String(payload.trainId) : null,
          stationId: payload.stationId ? String(payload.stationId) : null,
          routeIds: [],
          type: payload.type ?? 'manual',
          description: payload.description ?? 'Manual incident',
          language: null,
          startedAt: new Date().toISOString(),
          endedAt: null,
          updatedAt: new Date().toISOString(),
          status: 'active',
          metadata: null,
          raw: payload as Record<string, unknown>,
        };

    this.incidents.push(incident);
    return incident;
  }

  findAll(): Incident[] {
    return this.incidents;
  }

  findOne(id: number): Incident | undefined {
    return this.incidents.find((incident) => incident.id === id);
  }
}

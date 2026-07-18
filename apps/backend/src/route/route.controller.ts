import {Controller, Get, Inject} from '@nestjs/common';
import {RouteService} from './route.service';

@Controller('routes')
export class RouteController {
  @Inject(RouteService)
  private readonly routeService!: RouteService;

  @Get()
  findAll() {
    return this.routeService.findAll();
  }
}

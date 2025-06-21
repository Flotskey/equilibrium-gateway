import { Body, Controller, HttpCode, Logger, Post, Req, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from 'src/auth/api-key.guard';
import { GatewayOrder } from 'src/models/gateway-order.model';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateOrdersDto } from './dto/create-orders.dto';
import { EditOrderDto } from './dto/edit-order.dto';
import { PrivateExchangeService } from './private-exchange.service';

@Controller('exchanges/private')
@UseGuards(ApiKeyGuard)
export class PrivateExchangeController {
  constructor(private privateExchangeService: PrivateExchangeService) {}

  private readonly logger = new Logger(PrivateExchangeController.name);

  @Post('order')
  @HttpCode(200)
  async createOrder(@Body() dto: CreateOrderDto, @Req() req): Promise<GatewayOrder> {
    dto.userId = req.userId;
    return this.privateExchangeService.createOrder(dto);
  }

  @Post('order/batch')
  @HttpCode(200)
  async createOrders(@Body() dto: CreateOrdersDto, @Req() req): Promise<GatewayOrder[]> {
    dto.userId = req.userId;
    return this.privateExchangeService.createOrders(dto);
  }

  @Post('order/edit')
  @HttpCode(200)
  async editOrder(@Body() dto: EditOrderDto, @Req() req): Promise<GatewayOrder> {
    dto.userId = req.userId;
    return this.privateExchangeService.editOrder(dto);
  }

  @Post('order/cancel')
  @HttpCode(200)
  async cancelOrder(@Body() dto: CancelOrderDto, @Req() req): Promise<Record<string, any>> {
    dto.userId = req.userId;
    return this.privateExchangeService.cancelOrder(dto);
  }
}

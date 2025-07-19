import { Body, Controller, Delete, HttpCode, Logger, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { GatewayOrder } from 'src/exchange/dto/gateway-order.dto';
import { CcxtTrade } from 'src/models/ccxt';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateOrdersDto } from './dto/create-orders.dto';
import { EditOrderDto } from './dto/edit-order.dto';
import { FetchOrdersDto } from './dto/fetch-orders.dto';
import { FetchTradesDto } from './dto/fetch-trades.dto';
import { RemoveConnectionDto } from './dto/remove-connection.dto';
import { PrivateExchangeService } from './private-exchange.service';

@Controller('exchanges/private')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
export class PrivateExchangeController {
  constructor(private privateExchangeService: PrivateExchangeService) {}

  private readonly logger = new Logger(PrivateExchangeController.name);

  @Post('connection')
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'The private connection has been successfully created.' })
  async createConnection(
    @Body() dto: CreateConnectionDto,
    @Req() req: Request & { user: DecodedIdToken }
  ): Promise<void> {
    dto.userId = req.user.uid;
    return this.privateExchangeService.createConnection(dto);
  }

  @Delete('connection')
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'The private connection has been successfully removed.' })
  async removeConnection(
    @Body() dto: RemoveConnectionDto,
    @Req() req: Request & { user: DecodedIdToken }
  ): Promise<void> {
    dto.userId = req.user.uid;
    return this.privateExchangeService.removeConnection(dto);
  }

  @Post('order')
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'The created order.', type: GatewayOrder })
  async createOrder(
    @Body() dto: CreateOrderDto,
    @Req() req: Request & { user: DecodedIdToken }
  ): Promise<GatewayOrder> {
    dto.userId = req.user.uid;
    return this.privateExchangeService.createOrder(dto);
  }

  @Post('order/batch')
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'A list of created orders.', type: [GatewayOrder] })
  async createOrders(
    @Body() dto: CreateOrdersDto,
    @Req() req: Request & { user: DecodedIdToken }
  ): Promise<GatewayOrder[]> {
    dto.userId = req.user.uid;
    return this.privateExchangeService.createOrders(dto);
  }

  @Post('order/edit')
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'The edited order.', type: GatewayOrder })
  async editOrder(@Body() dto: EditOrderDto, @Req() req: Request & { user: DecodedIdToken }): Promise<GatewayOrder> {
    dto.userId = req.user.uid;
    return this.privateExchangeService.editOrder(dto);
  }

  @Post('order/cancel')
  @HttpCode(200)
  @ApiResponse({
    status: 200,
    description: 'The response from the exchange after attempting to cancel the order.',
    type: Object
  })
  async cancelOrder(
    @Body() dto: CancelOrderDto,
    @Req() req: Request & { user: DecodedIdToken }
  ): Promise<Record<string, any>> {
    dto.userId = req.user.uid;
    return this.privateExchangeService.cancelOrder(dto);
  }

  @Post('orders')
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'A list of orders.', type: [GatewayOrder] })
  async fetchOrders(
    @Body() dto: FetchOrdersDto,
    @Req() req: Request & { user: DecodedIdToken }
  ): Promise<GatewayOrder[]> {
    dto.userId = req.user.uid;
    return this.privateExchangeService.fetchOrders(dto);
  }

  @Post('trades')
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'A list of user trades.', type: Object })
  async fetchTrades(@Body() dto: FetchTradesDto, @Req() req: Request & { user: DecodedIdToken }): Promise<CcxtTrade[]> {
    dto.userId = req.user.uid;
    return this.privateExchangeService.fetchTrades(dto);
  }
}

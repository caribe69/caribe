import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { ChatService } from './chat.service';

class SendMsgDto {
  @IsInt() toId: number;
  @IsString() @MinLength(1) texto: string;
  @IsOptional() @IsString() tipo?: string;
  @IsOptional() metadata?: any;
}

@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly service: ChatService) {}

  @Get('contactos')
  contactos(@CurrentUser() user: JwtPayload) {
    return this.service.contactos(user);
  }

  @Get('inbox')
  inbox(@CurrentUser() user: JwtPayload) {
    return this.service.inbox(user);
  }

  @Get('with/:userId')
  conversacion(
    @CurrentUser() user: JwtPayload,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.service.conversacion(user, userId);
  }

  @Post('send')
  send(@CurrentUser() user: JwtPayload, @Body() dto: SendMsgDto) {
    return this.service.send(user, dto);
  }

  @Patch('read/:userId')
  marcarLeido(
    @CurrentUser() user: JwtPayload,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.service.marcarLeido(user, userId);
  }
}

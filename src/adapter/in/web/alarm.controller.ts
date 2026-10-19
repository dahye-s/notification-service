import { CreateAlarmRequestDto } from '@adapter/in/web/dto/request/create-alarm.request.dto';
import { GetAlarmListRequestDto } from '@adapter/in/web/dto/request/get-alarm-list.request.dto';
import { AlarmDetailResponseDto } from '@adapter/in/web/dto/response/alarm-detail.response.dto';
import { AlarmResponseDto } from '@adapter/in/web/dto/response/alarm.response.dto';
import {
    CANCEL_ALARM_USE_CASE,
    type CancelAlarmUseCase,
} from '@core/alarm/application/port/in/cancel-alarm.use-case';
import {
    CREATE_ALARM_USE_CASE,
    type CreateAlarmUseCase,
} from '@core/alarm/application/port/in/create-alarm.use-case';
import {
    GET_ALARM_LIST_USE_CASE,
    type GetAlarmListUseCase,
} from '@core/alarm/application/port/in/get-alarm-list.use-case';
import {
    GET_ALARM_USE_CASE,
    type GetAlarmUseCase,
} from '@core/alarm/application/port/in/get-alarm.use-case';
import {
    SEND_ALARM_USE_CASE,
    type SendAlarmUseCase,
} from '@core/alarm/application/port/in/send-alarm.use-case';
import { OutputMessage } from '@global/constant/output-message.enum';
import { CommonResponseDto, PageDto } from '@global/dto/common.response.dto';
import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Inject,
    Param,
    ParseUUIDPipe,
    Post,
    Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('alarms')
@Controller('alarms')
export class AlarmController {
    constructor(
        @Inject(CREATE_ALARM_USE_CASE) private readonly createAlarm: CreateAlarmUseCase,
        @Inject(GET_ALARM_LIST_USE_CASE) private readonly getAlarmList: GetAlarmListUseCase,
        @Inject(GET_ALARM_USE_CASE) private readonly getAlarm: GetAlarmUseCase,
        @Inject(SEND_ALARM_USE_CASE) private readonly sendAlarm: SendAlarmUseCase,
        @Inject(CANCEL_ALARM_USE_CASE) private readonly cancelAlarm: CancelAlarmUseCase,
    ) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: '알림 생성' })
    async create(@Body() dto: CreateAlarmRequestDto) {
        const alarm = await this.createAlarm.execute(dto);

        return new CommonResponseDto(
            HttpStatus.CREATED,
            OutputMessage.CREATE_ALARM_SUCCESS,
            AlarmResponseDto.of(alarm),
        );
    }

    @Get()
    @ApiOperation({ summary: '알림 목록 조회' })
    async list(@Query() dto: GetAlarmListRequestDto) {
        const { items, total } = await this.getAlarmList.execute(dto);

        return new CommonResponseDto(
            HttpStatus.OK,
            OutputMessage.GET_ALARM_LIST_SUCCESS,
            PageDto.of(items.map(AlarmResponseDto.of), dto.page, dto.size, total),
        );
    }

    @Get(':id')
    @ApiOperation({ summary: '알림 단건 조회 (진행률 포함)' })
    async detail(@Param('id', ParseUUIDPipe) id: string) {
        const result = await this.getAlarm.execute(id);

        return new CommonResponseDto(
            HttpStatus.OK,
            OutputMessage.GET_ALARM_SUCCESS,
            AlarmDetailResponseDto.of(result),
        );
    }

    /** 발송은 워커가 비동기로 처리하므로 202로 접수만 알린다 */
    @Post(':id/send')
    @HttpCode(HttpStatus.ACCEPTED)
    @ApiOperation({ summary: '발송 시작' })
    async send(@Param('id', ParseUUIDPipe) id: string) {
        const alarm = await this.sendAlarm.execute({ alarmId: id });

        return new CommonResponseDto(HttpStatus.ACCEPTED, OutputMessage.SEND_ALARM_ACCEPTED, {
            id: alarm.id,
            status: alarm.status,
        });
    }

    @Post(':id/cancel')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '발송 취소' })
    async cancel(@Param('id', ParseUUIDPipe) id: string) {
        const { alarm, cancelledCount } = await this.cancelAlarm.execute({ alarmId: id });

        return new CommonResponseDto(HttpStatus.OK, OutputMessage.CANCEL_ALARM_SUCCESS, {
            id: alarm.id,
            status: alarm.status,
            cancelledCount,
        });
    }
}

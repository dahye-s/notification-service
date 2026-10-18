import { AlarmStatus } from '@core/alarm/domain/alarm-status';
import { AlarmType } from '@core/alarm/domain/alarm-type';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class GetAlarmListRequestDto {
    @ApiPropertyOptional({ enum: AlarmStatus })
    @IsOptional()
    @IsEnum(AlarmStatus)
    status?: AlarmStatus;

    @ApiPropertyOptional({ enum: AlarmType })
    @IsOptional()
    @IsEnum(AlarmType)
    type?: AlarmType;

    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page: number = 1;

    @ApiPropertyOptional({ default: 20, maximum: 100 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    size: number = 20;
}

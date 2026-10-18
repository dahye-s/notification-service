import { AlarmType, URGENT_MAX_RECIPIENTS } from '@core/alarm/domain/alarm-type';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsEnum,
    IsOptional,
    IsString,
    Length,
    MinLength,
} from 'class-validator';

export class CreateAlarmRequestDto {
    @ApiProperty({ enum: AlarmType })
    @IsEnum(AlarmType)
    type: AlarmType;

    @ApiProperty({ maxLength: 200 })
    @IsString()
    @Length(1, 200)
    title: string;

    @ApiProperty()
    @IsString()
    @MinLength(1)
    body: string;

    @ApiPropertyOptional({ type: [String], description: 'URGENT일 때만 (1~100개)' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @ArrayMinSize(1)
    @ArrayMaxSize(URGENT_MAX_RECIPIENTS)
    recipientIds?: string[];
}

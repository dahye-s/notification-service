import { OutputMessage } from '@global/constant/output-message.enum';
import { CommonResponseDto } from '@global/dto/common.response.dto';
import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
    @Get()
    @ApiOperation({ summary: '헬스체크' })
    check() {
        return new CommonResponseDto(HttpStatus.OK, OutputMessage.HEALTH_OK, {
            status: 'ok',
        });
    }
}

import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Success' })
  message: string;

  data: T;

  @ApiProperty({ example: '2025-12-20T04:39:19.987Z' })
  timestamp: string;
}

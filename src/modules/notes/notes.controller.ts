import { Body, Controller, Post, UseGuards, Request } from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('notes')
@ApiBearerAuth()
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  create(@Body() createNoteDto: CreateNoteDto, @Request() req: any) {
    const userId = req.user?.id || null;
    return this.notesService.create(createNoteDto, userId);
  }
}

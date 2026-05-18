import { Body, Controller, Get, Patch, Param, Post, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { AccessNoteDto } from './dto/access-note.dto';
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

  @Post(':slug/access')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtAuthGuard)
  access(@Param('slug') slug: string, @Body() accessNoteDto: AccessNoteDto, @Request() req: any) {
    const userId = req.user?.id || null;
    return this.notesService.findOneBySlug(slug, accessNoteDto.password, userId);
  }

  @Patch(':slug')
  @UseGuards(OptionalJwtAuthGuard)
  update(@Param('slug') slug: string, @Body() updateNoteDto: UpdateNoteDto, @Request() req: any) {
    const userId = req.user?.id || null;
    return this.notesService.update(slug, updateNoteDto, userId);
  }
}

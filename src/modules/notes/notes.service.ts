import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan } from 'typeorm';
import { Note } from './entities/note.entity';
import { CreateNoteDto } from './dto/create-note.dto';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private notesRepository: Repository<Note>,
  ) {}

  private generateSlug(length = 10): string {
    return randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
  }

  async create(createNoteDto: CreateNoteDto, userId?: string | null): Promise<Note> {
    const { slug, content, isLocked, password, expiresAt } = createNoteDto;

    let noteSlug = slug || this.generateSlug();
    
    // Check if slug is already taken
    const existingNote = await this.notesRepository.findOne({ where: { slug: noteSlug } });
    if (existingNote) {
      if (slug) {
        throw new ConflictException('Slug is already in use');
      }
      noteSlug = this.generateSlug(); // Try once more with a new random slug
    }

    let hashedPassword = password;
    if (isLocked && password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    let expirationDate = expiresAt ? new Date(expiresAt) : new Date();
    if (!expiresAt) {
      expirationDate.setDate(expirationDate.getDate() + 1);
    }

    const note = this.notesRepository.create({
      slug: noteSlug,
      content,
      isLocked: !!isLocked,
      password: hashedPassword,
      expiresAt: expirationDate,
      userId: userId || null,
    });

    try {
      return await this.notesRepository.save(note);
    } catch (error) {
      throw new InternalServerErrorException('Failed to create note');
    }
  }

  async findOneBySlug(slug: string): Promise<Note | null> {
    const now = new Date();
    return this.notesRepository.findOne({ 
      where: { 
        slug, 
        expiresAt: MoreThan(now) 
      } 
    });
  }

  async claimNote(slug: string, userId: string): Promise<void> {
    const note = await this.notesRepository.findOne({ where: { slug, userId: IsNull() } });
    if (note) {
      note.userId = userId;
      await this.notesRepository.save(note);
    }
  }
}

import { Injectable, ConflictException, InternalServerErrorException, UnauthorizedException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan } from 'typeorm';
import { Note } from './entities/note.entity';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
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

    let noteSlug = slug;
    
    if (!noteSlug) {
      let isUnique = false;
      let retries = 0;
      while (!isUnique && retries < 5) {
        noteSlug = this.generateSlug();
        const existingNote = await this.notesRepository.findOne({ where: { slug: noteSlug } });
        if (!existingNote) {
          isUnique = true;
        }
        retries++;
      }
      
      if (!isUnique) {
        throw new InternalServerErrorException('Failed to generate a unique slug');
      }
    } else {
      // Check if user-provided slug is already taken
      const existingNote = await this.notesRepository.findOne({ where: { slug: noteSlug } });
      if (existingNote) {
        throw new ConflictException('Slug is already in use');
      }
    }

    let expirationDate: Date | null;
    if (expiresAt === undefined) {
      expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 1);
    } else if (expiresAt === null) {
      if (!userId) {
        throw new ForbiddenException('Guest notes cannot be permanent. Please set an expiration date.');
      }
      expirationDate = null;
    } else {
      expirationDate = new Date(expiresAt);
    }
    const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

    const note = this.notesRepository.create({
      slug: noteSlug,
      content,
      isLocked: !!isLocked || !!password,
      password: hashedPassword,
      expiresAt: expirationDate as any,
      userId: userId || null,
    });

    try {
      return await this.notesRepository.save(note);
    } catch (error) {
      throw new InternalServerErrorException('Failed to create note');
    }
  }

  async findOneBySlug(slug: string, password?: string): Promise<Note> {
    const now = new Date();
    const note = await this.notesRepository
      .createQueryBuilder('note')
      .where('note.slug = :slug', { slug })
      .andWhere('note.expiresAt > :now', { now })
      .addSelect('note.password')
      .getOne();

    if (!note) {
      throw new NotFoundException('Note not found or has expired');
    }

    if (note.isLocked) {
      if (!password) {
        throw new UnauthorizedException('Password is required for this note');
      }

      const isPasswordValid = await bcrypt.compare(password, note.password || '');
      if (!isPasswordValid) {
        throw new UnauthorizedException('Incorrect password');
      }
    }
    // Delete password before returning
    delete note.password;

    return note;
  }

  async update(oldSlug: string, updateNoteDto: UpdateNoteDto, userId?: string | null): Promise<Note> {
    const { slug, content, isLocked, password, expiresAt, currentPassword } = updateNoteDto;

    const note = await this.notesRepository
      .createQueryBuilder('note')
      .where('note.slug = :slug', { slug: oldSlug })
      .addSelect('note.password')
      .getOne();

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    // Security Check: UserId (Ownership)
    if (note.userId && note.userId !== userId) {
      throw new ForbiddenException('You do not have permission to update this note');
    }

    // Security Check: Locked Note (Password required)
    if (note.isLocked) {
      if (!currentPassword) {
        throw new UnauthorizedException('Current password is required to update this locked note');
      }
      const isPasswordValid = await bcrypt.compare(currentPassword, note.password || '');
      if (!isPasswordValid) {
        throw new UnauthorizedException('Incorrect current password');
      }
    }

    // Slug Update: Check Uniqueness
    if (slug && slug !== oldSlug) {
      const existingNote = await this.notesRepository.findOne({ where: { slug } });
      if (existingNote) {
        throw new ConflictException('New slug already in use');
      }
      note.slug = slug;
    }

    // Update fields
    if (content !== undefined) note.content = content;
    if (isLocked !== undefined) note.isLocked = isLocked;

    if (expiresAt !== undefined) {
      if (expiresAt === null) {
        if (!note.userId && !userId) {
          throw new ForbiddenException('Guest notes cannot be permanent. Please set an expiration date.');
        }
        note.expiresAt = null as any;
      } else {
        note.expiresAt = new Date(expiresAt);
      }
    }

    // Password Update: Hash new password
    if (password) {
      note.password = await bcrypt.hash(password, 10);
      note.isLocked = true; // Automatically lock if new password is set
    } else if (isLocked === false) {
      note.password = undefined; // Clear password if unlocked
    }

    return await this.notesRepository.save(note);
  }

  async claimNote(slug: string, userId: string): Promise<void> {
    const note = await this.notesRepository.findOne({ where: { slug, userId: IsNull() } });
    if (note) {
      note.userId = userId;
      await this.notesRepository.save(note);
    }
  }
}

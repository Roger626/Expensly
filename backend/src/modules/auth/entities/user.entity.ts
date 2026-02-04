import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class UserEntity {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  name: string;

  @Expose()
  role: string;

  @Expose()
  organizationId: string;

  @Expose()
  isActive: boolean;

  @Expose()
  createdAt: Date;

  // Campos excluidos de la respuesta
  passwordHash?: string;
  
  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}

import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class OrganizationEntity {
  @Expose()
  id: string;

  @Expose()
  razonSocial: string;

  @Expose()
  ruc: string;

  @Expose()
  dv: string;

  @Expose()
  plan: string;

  @Expose()
  fechaRegistro: Date;

  constructor(partial: Partial<OrganizationEntity>) {
    Object.assign(this, partial);
  }
}

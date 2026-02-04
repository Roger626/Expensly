import { Exclude, Expose, Type } from 'class-transformer';
import { UserEntity } from './user.entity';
import { OrganizationEntity } from './organization.entity';

@Exclude()
export class AuthResponseEntity {
  @Expose()
  accessToken: string;

  @Expose()
  @Type(() => UserEntity)
  user: UserEntity;

  constructor(partial: Partial<AuthResponseEntity>) {
    Object.assign(this, partial);
  }
}

@Exclude()
export class OnboardingResponseEntity {
  @Expose()
  @Type(() => OrganizationEntity)
  organization: OrganizationEntity;

  @Expose()
  @Type(() => AuthResponseEntity)
  authData: AuthResponseEntity;

  constructor(partial: Partial<OnboardingResponseEntity>) {
    Object.assign(this, partial);
  }
}

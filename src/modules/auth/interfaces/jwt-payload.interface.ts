import { UserType } from 'src/common/constants/user-type.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  userType: UserType;
  iat?: number;
  exp?: number;
}

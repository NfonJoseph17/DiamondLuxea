import { Role } from '../../common/constants/roles';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

export interface JwtUserPayload {
  id: string;
  email: string;
  role: Role;
}

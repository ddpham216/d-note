import { PermissionType } from 'src/common/constants/permission.enum';
import { RoleType } from 'src/common/constants/role.enum';

export const INITIAL_ROLES_PERMISSIONS = {
  [RoleType.ADMIN]: [...Object.values(PermissionType)],
  [RoleType.MANAGER]: [],
  [RoleType.EDITOR_IN_CHIEF]: [],
  [RoleType.EDITOR]: [],
  [RoleType.STAFF]: [],
  [RoleType.COLLABORATOR]: [],
  [RoleType.USER]: [],
};

const roles = require("../config/roles.json");

class Permissions {
  constructor() {
    this.persmissions = [];
  }
  getPermissionsByRoleName(roleName) {
    const role = roles.roles.find((r) => r.name === roleName);
    return role ? role.permissions : [];
  }
}

module.exports = Permissions;

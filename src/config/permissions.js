const commands = require("./commands");

const rolePermissions = {
  admin: [
    commands.GET_PROFILE,
    commands.LIST_USERS,
    commands.UPDATE_USER_STATUS,
    commands.CREATE_STORE_CATEGORY,
    commands.CREATE_DEAL_CATEGORY,
    commands.CREATE_STORE,
    commands.UPDATE_STORE,
    commands.LIST_STORES,
    commands.LIST_USER_STORES,
    commands.GET_STORE,
    commands.LIST_STORE_DEALS,
    commands.CREATE_REDEMPTION_QR,
    commands.GET_ORDER_DETAILS,
    commands.VERIFY_REDEMPTION_QR,
    commands.USE_REDEMPTION_QR,
    commands.CREATE_DEAL,
    commands.LIST_DEALS,
    commands.GET_DEAL,
    commands.ADD_DEAL_IMAGE,
    commands.CREATE_AD,
    commands.LIST_ADS,
    commands.CREATE_SUBSCRIPTION_PLAN,
    commands.LIST_SUBSCRIPTION_PLANS,
    commands.CREATE_NOTIFICATION,
    commands.MY_NOTIFICATIONS,
    commands.MARK_NOTIFICATION_AS_READ
  ],
  vendor: [
    commands.GET_PROFILE,
    commands.CREATE_STORE,
    commands.UPDATE_STORE,
    commands.LIST_STORES,
    commands.LIST_USER_STORES,
    commands.GET_STORE,
    commands.LIST_STORE_DEALS,
    commands.CREATE_REDEMPTION_QR,
    commands.GET_ORDER_DETAILS,
    commands.VERIFY_REDEMPTION_QR,
    commands.USE_REDEMPTION_QR,
    commands.CREATE_DEAL,
    commands.LIST_DEALS,
    commands.GET_DEAL,
    commands.ADD_DEAL_IMAGE,
    commands.CREATE_AD,
    commands.LIST_ADS,
    commands.LIST_SUBSCRIPTION_PLANS,
    commands.MY_NOTIFICATIONS,
    commands.MARK_NOTIFICATION_AS_READ
  ],
  public_user: [
    commands.GET_PROFILE,
    commands.LIST_STORES,
    commands.LIST_USER_STORES,
    commands.GET_STORE,
    commands.LIST_STORE_DEALS,
    commands.CREATE_REDEMPTION_QR,
    commands.GET_ORDER_DETAILS,
    commands.LIST_DEALS,
    commands.GET_DEAL,
    commands.LIST_ADS,
    commands.LIST_SUBSCRIPTION_PLANS,
    commands.MY_NOTIFICATIONS,
    commands.MARK_NOTIFICATION_AS_READ
  ]
};

const hasPermission = (role, command) => {
  return (rolePermissions[role] || []).includes(command);
};

module.exports = {
  rolePermissions,
  hasPermission
};
